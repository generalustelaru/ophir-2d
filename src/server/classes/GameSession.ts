import { PlayerCountables, PrivateState, ProcessedMoveRule, StateBundle } from "../server_types";
import {
    HexId, PlayerColor, Player, SharedState, ClientRequest, GoodName, LocationAction, MovementPayload, DropItemPayload,
    DiceSix, RepositioningPayload, CargoInventory, MarketSlotKey, ItemName, GoodsTradePayload, Trade, LocationName,
    GoodLocationName, MetalPurchasePayload, ChatEntry, ServerMessage, CargoMetalName, MetalName, ChatPayload,
    MessagePayload,
} from "../../shared_types";
import { ToolService } from '../services/ToolService';
import serverConstants from "../server_constants";

const { TRADE_DECK_B } = serverConstants;
const SERVER_NAME = 'GameBot';
const MAX_FAVOR = 6;

type RegistryItem = { id: PlayerColor, influence: DiceSix };
type DataDigest = { player: Player, payload: MessagePayload }

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolService;
    private idleCheckInterval: NodeJS.Timeout | null = null;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;
        this.tools = new ToolService();
        const activePlayer = this.sharedState.players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        this.setTurnStartCondition(activePlayer);

        console.info('Game session created');

        this.startIdleChecks();
    }

    public getState(): SharedState {
        return this.sharedState;
    }

    public getPrivateState(): PrivateState {
        return this.privateState;
    }

    // MARK: ACTION SWITCH
    public processAction(request: ClientRequest): ServerMessage {
        const color = request.playerColor;
        const message = request.message;

        if (message.action === 'get_status') {
            return this.processStatusRequest();
        }

        if (!color) {
            const errorMessage = 'No player ID provided';
            console.error(errorMessage);

            return { error: errorMessage }
        }

        const player = this.sharedState.players.find(player => player.id === color);

        if (!player) {
            const errorMessage = `Player does not exist: ${color}`;
            console.error(errorMessage);

            return { error: errorMessage }
        }

        this.updateTimestamp(player);

        const data: DataDigest = { player, payload: message.payload }

        switch (message.action) {
            case 'chat':
                return this.processChat(data) ? this.sharedState : { error: `Could not process chat message on ${color}` };
            case 'spend_favor':
                return this.processFavorSpending(data) ? this.sharedState : { error: `Could not process favor spending on ${color}` };
            case 'move':
                return this.processMove(data) ? this.sharedState : { error: `Could not process move on ${color}` };
            case 'reposition':
                return this.processRepositioning(data) ? this.sharedState : { error: `Could process repositioning on ${color}` };
            case 'load_good':
                return this.processLoadGood(data) ? this.sharedState : { error: `Could not process load on ${color}` };
            case 'trade_goods':
                return this.processGoodsTrade(data) ? this.sharedState : { error: `Could not process trade on ${color}` };
            case 'buy_metals':
                return this.processMetalPurchase(data) ? this.sharedState : { error: `Could not process metal purchase on ${color}` };
            case 'donate_metals':
                return this.processMetalDonation(data) ? this.sharedState : { error: `Could not process donation on ${color}` };
            case 'end_turn':
                return this.processEndTurn(data) ? this.sharedState : { error: `Could not process turn end on ${color}` };
            case 'upgrade_hold':
                return this.processUpgrade(data) ? this.sharedState : { error: `Could not process upgrade on ${color}` };
            case 'drop_item':
                return this.processItemDrop(data) ? this.sharedState : { error: `Could not process item drop on ${color}` };
            default:
                return { error: `Unknown action on ${color}` };
        }
    }

    private processStatusRequest(): SharedState {
        const statusUpdate = this.tools.getCopy(this.sharedState);
        statusUpdate.isStatusResponse = true;

        return statusUpdate;
    }

    // MARK: CHAT
    private processChat(data: DataDigest): boolean {
        const { player, payload } = data;
        const chatDetails = payload as ChatPayload;

        const chatEntry = { id: player.id, name: player.name ?? player.id, message: chatDetails.input };
        this.sharedState.sessionChat.push(chatEntry);

        return true;
    }

    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: SERVER_NAME, message };
        this.sharedState.sessionChat.push(chatEntry);
    }

    // MARK: MOVE
    private processMove(data: DataDigest): boolean {
        const details = data.payload as MovementPayload;
        const player = data.player;
        const departure = player.hexagon.hexId;
        const destination = details.hexId;
        const locationName = this.sharedState.setup.mapPairings[destination].name;
        const remainingMoves = player.moveActions;
        const hexMoveRule = this.privateState.moveRules.find(rule => rule.from === departure) as ProcessedMoveRule;

        if (!hexMoveRule.allowed.includes(destination) || remainingMoves === 0) {
            return false;
        }

        player.moveActions = remainingMoves - 1;

        const registry = this.getPortRegistry(destination);
        const sailSuccess = !registry || player.privilegedSailing
            ? true
            : this.processInfluenceRoll(player, registry);

        if (sailSuccess) {
            player.hexagon = {
                hexId: destination,
                position: details.position,
                location: this.getLocationName(destination),
            };
            player.allowedMoves = (
                this.privateState.moveRules
                    .find(rule => rule.from === destination)?.allowed
                    .filter(move => move !== departure) as Array<HexId>
            );
            player.isAnchored = true;
            player.locationActions = this.getLocationActions(player, destination);
        } else {
            this.addServerMessage(`${player.name} was blocked from sailing towards the ${locationName}`);
        }

        if (player.moveActions === 0 && !sailSuccess) {
            player.isAnchored = true;
            player.locationActions = null;
            this.addServerMessage(`${player.name} also ran out of moves and cannot act further`);
        }

        return true;
    }
    // MARK: REPOSITIONING
    private processRepositioning(data: DataDigest): boolean {
        const details = data.payload as RepositioningPayload;
        const player = data.player;

        player.hexagon.position = details.repositioning;

        return true;
    }
    // MARK: FAVOR
    private processFavorSpending(data: DataDigest): boolean {
        const player = data.player;

        const { isActive, favor, privilegedSailing } = player;

        if (isActive && favor > 0 && privilegedSailing === false) {
            player.favor -= 1;
            player.privilegedSailing = true;
            player.isAnchored = true;
            this.addServerMessage(`${player.name} spent favor to remain anchored or sail without influence roll`);

            return true;
        }

        console.error('Could not process favor',{isActive, favor, privilegedSailing})

        return false;
    }
    // MARK: DROP ITEM
    private processItemDrop(data: DataDigest): boolean {
        const details = data.payload as DropItemPayload
        const player = data.player;

        const newCargo = this.unloadItem(player.cargo, details.item);

        if (!newCargo) {
            console.error(`Could not drop item for ${player.id}`);

            return false;
        }

        const hasCargo = Boolean(newCargo.find(item => item !== 'empty'));

        player.cargo = newCargo;
        player.hasCargo = hasCargo;
        player.feasibleTrades = hasCargo ? this.pickFeasibleTrades(newCargo) : [];

        this.addServerMessage(`${player.name} just threw ${details.item} overboard`);

        return true;
    }
    // MARK: LOAD GOOD
    private processLoadGood(data: DataDigest): boolean {
        const player = data.player;

        if (
            !player.isAnchored
            || !player.locationActions?.includes('load_good')
            || !this.hasCargoRoom(player, 'load_good')
        ) {
            console.error(`Cannot load goods for ${player.id}`, player);

            return false;
        }

        const locationId = this.sharedState.setup.mapPairings[player.hexagon.hexId].name;
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationId)) {
            console.error(`Cannot pick up goods from ${locationId}`);
            return false;
        }

        const localGood = serverConstants.LOCATION_GOODS[locationId as GoodLocationName];

        const newCargo = this.loadItem(player.cargo, localGood);

        if (!newCargo)
            return false;

        player.cargo = newCargo;
        player.hasCargo = true;
        player.moveActions = 0;
        player.locationActions = this.removeAction(player.locationActions, 'load_good');
        player.feasibleTrades = this.pickFeasibleTrades(player.cargo);

        this.addServerMessage(`${player.name} picked up ${localGood}`);

        return true;
    }
    // MARK: GOODS TRADE
    private processGoodsTrade(data: DataDigest): boolean {
        const player = data.player;
        const details = data.payload as GoodsTradePayload;
        const { slot, location } = details;

        if (
            !player.locationActions?.includes('trade_goods')
            || player.hexagon.location !== location
            || !player.feasibleTrades.includes(slot)
            || !player.isAnchored
        ) {
            console.error(`Conditions for trade not satisfied for ${player.id}`);

            return false;
        }

        const trade = this.sharedState.marketOffer[slot];

        switch (location) {
            case 'market':
                const modifier = this.sharedState.setup.marketFluctuations[slot];
                player.coins += trade.reward.coins + modifier;
                this.addServerMessage(`${player.name} sold goods for ${trade.reward.coins + modifier} coins`);
                break;
            case 'temple':
                const reward = trade.reward.favorAndVp;
                player.favor = Math.min(MAX_FAVOR, player.favor + reward);
                this.privateState.gameStats.find(p => p.id === player.id)!.vp += reward;
                this.addServerMessage(`${player.name} donated goods for ${reward} favor and ${reward} VP`);
                console.info(this.privateState.gameStats);
                break;
            default:
                console.error(`Unknown trade location: ${location}`);
                return false;
        }

        const newCargo = (() => {
            let cargo = this.tools.getCopy(player.cargo);

            for (const goodId of trade.request) {
                const result =  this.unloadItem(cargo, goodId);

                if (!result)
                    return null;

                cargo = result;
            }

            return cargo;
        })();

        if (!newCargo) {
            console.error(`Could not match cargo item to trade request: ${player.cargo}`);
            return false;
        }

        player.cargo = newCargo;
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.locationActions = this.removeAction(player.locationActions, 'trade_goods');
        player.moveActions = 0;

        // Update market offer
        const market = this.sharedState.marketOffer;

        market.deckSize -= 1;
        market.slot_3 = market.slot_2;
        market.slot_2 = market.slot_1;
        market.slot_1 = market.future;

        const tradeDeck = ((): Array<Trade> => {

            // Load trade deck B if required
            if (this.privateState.tradeDeck.length === 0 && this.sharedState.marketOffer.deckId === 'A') {
                this.privateState.tradeDeck = this.tools.getCopy(TRADE_DECK_B);
                this.sharedState.marketOffer.deckId = 'B';
                this.addServerMessage('Market deck B is now in play');
            }

            return this.privateState.tradeDeck;
        })();

        const pick = Math.floor(Math.random() * tradeDeck.length);
        const newTrade = tradeDeck.splice(pick, 1).shift() || null;

        if (newTrade) {
            market.future = newTrade;
            const players = this.sharedState.players;

            players.forEach(player => {
                player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
            });
        } else {
            this.addServerMessage('Market deck is empty! Game has ended.');
            this.sharedState.gameStatus = 'ended';
            this.sharedState.gameResults = this.compileGameResults();
        }

        return true;
    }
    // MARK: METAL PURCHASE
    private processMetalPurchase(data: DataDigest): boolean {
        const player = data.player;
        const details = data.payload as MetalPurchasePayload;

        if (
            false === !!player.locationActions?.includes('buy_metals')
            || false === player.isAnchored
            || false === this.hasCargoRoom(player, 'buy_metals')
        ) {
            console.error(`Player ${player?.id} cannot buy metals`);
            return false;
        }

        const templeStatus = this.sharedState.templeStatus;
        const metalCost = (() => {
            switch (details.metal) {
                case 'gold': return templeStatus.tier.goldCost;
                case 'silver': return templeStatus.tier.silverCost;
                default: return null;
            }
        })();
        const playerAmount = (() => {
            switch (details.currency) {
                case 'coins': return player.coins;
                case 'favor': return player.favor;
                default: return null;
            }
        })();

        if (!metalCost || !playerAmount) {
            console.error(`No such cost or player amount found: ${metalCost}, ${player}`);
            return false;
        }

        const remainder = playerAmount - metalCost[details.currency];

        if (remainder < 0) {
            console.error(`Player ${player.id} cannot afford metal purchase`);

            return false;
        }

        switch (details.currency) {
            case 'coins':
                player.coins = remainder;
                this.addServerMessage(`${player.name} bought ${details.metal} for ${metalCost.coins} coins`);
                break;
            case 'favor':
                player.favor = remainder;
                this.addServerMessage(`${player.name} bought ${details.metal} for ${metalCost.favor} favor`);
                break;
            default:
                console.error(`Unknown currency: ${details.currency}`);
                return false;
        }

        const newCargo = this.loadItem(player.cargo, details.metal);

        if (!newCargo)
            return false;

        player.cargo = newCargo;
        player.hasCargo = true;
        player.moveActions = 0;

        return true;
    }
    // MARK: DONATE METALS
    private processMetalDonation(data: DataDigest): boolean {
        const player = data.player;
        const details = data.payload as MetalPurchasePayload;

        if (
            false === !!player.locationActions?.includes('donate_metals')
            || false === player.isAnchored
            || false === player.cargo.includes(details.metal)
        ) {
            console.error(`Player ${player?.id} cannot donate ${details.metal}`);
            return false;
        }

        const reward = details.metal === 'gold' ? 10 : 5
        this.privateState.gameStats.find(p => p.id === player.id)!.vp += reward;
        this.addServerMessage(`${player.name} donated ${details.metal} for ${reward} VP`);
        console.info(this.privateState.gameStats);

        const newCargo = this.unloadItem(player.cargo, details.metal);

        if (!newCargo)
            return false;

        player.cargo = newCargo;
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.moveActions = 0;

        const newStatus = this.tools.getCopy(this.sharedState.templeStatus);
        newStatus.levelCompletion += 1;
        newStatus.donations.push(details.metal);

        if (newStatus.levelCompletion === 3) {
            newStatus.currentLevel += 1;
            const newPrices = this.privateState.costTiers.shift();
            this.addServerMessage('Temple level has been upgraded');

            if (newPrices && newStatus.currentLevel < newStatus.maxLevel) {
                newStatus.tier = newPrices;
                newStatus.levelCompletion = 0;
                this.addServerMessage('Metal prices have increased');
            } else {
                player.locationActions = null;
                this.sharedState.gameStatus = 'ended';
                this.sharedState.gameResults = this.compileGameResults();
                this.addServerMessage('The temple construction is complete! Game has ended.');
                this.addServerMessage(JSON.stringify(this.sharedState.gameResults));
            }
        }

        this.sharedState.templeStatus = newStatus;

        return true;
    }
    // MARK: END TURN
    private processEndTurn(data: DataDigest): boolean {
        const player = data.player;

        if (player.isActive && player.isAnchored) {
            const activePlayer = this.passActiveStatus();
            this.addServerMessage(`${activePlayer.name} is now active!`);

            return true;
        }

        return false;
    }
    // MARK: UPGRADE HOLD
    private processUpgrade(data: DataDigest): boolean {
        const player = data.player;

        if (
            player.locationActions?.includes('upgrade_hold')
            && player.coins >= 2
            && player.cargo.length < 4
        ) {
            player.coins -= 2;
            player.cargo.push('empty');
            player.locationActions = this.removeAction(player.locationActions, 'upgrade_hold');
            player.moveActions = 0;

            this.addServerMessage(`${player.name} upgraded their hold`);

            return true;
        }

        return false;
    }

    // MARK: Helper methods
    private getPortRegistry(destinationHex: HexId): Array<RegistryItem> | false {
        const registry: Array<RegistryItem> = [];
        const players = this.sharedState.players;

        players.forEach(player => {
            if (player.hexagon.hexId === destinationHex) {
                registry.push({ id: player.id, influence: player.influence });
            }
        });

        if (registry.length === 0) {
            return false;
        }

        return registry;
    }

    private processInfluenceRoll(activePlayer: Player, registry: Array<RegistryItem>): boolean {
        let canMove = true;

        activePlayer.influence = Math.ceil(Math.random() * 6) as DiceSix;
        let highestInfluence = activePlayer.influence;

        registry.forEach(item => {
            if (item.influence > highestInfluence) {
                canMove = false;
                highestInfluence = item.influence;
            }
        });

        if (canMove) {
            this.addServerMessage(`${activePlayer.name} rolled a ${activePlayer.influence} and sailed successfully!`);
            return true;
        }

        registry.forEach(item => {
            const player = this.sharedState.players.find(player => player.id === item.id);

            if (player?.influence === highestInfluence) {
                player.influence -= 1;
            }
        });

        return false;
    }

    private passActiveStatus(): Player {
        const players = this.sharedState.players;
        const activePlayer = players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        activePlayer.isActive = false;
        activePlayer.locationActions = null;
        activePlayer.privilegedSailing = false;

        const nextToken = activePlayer.turnOrder === players.length
            ? 1
            : activePlayer.turnOrder + 1;

        const nextActivePlayer = players.find(player => player.turnOrder === nextToken);

        if (nextActivePlayer) {
            nextActivePlayer.isActive = true;
            this.setTurnStartCondition(nextActivePlayer);

            return nextActivePlayer;
        }

        return activePlayer;
    }

    private setTurnStartCondition(player: Player): void {

        player.isAnchored = false;
        player.privilegedSailing = false;
        player.moveActions = 2;
        player.locationActions = this.getLocationActions(player);
        player.timeStamp = Date.now();

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.hexagon.hexId
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as Array<HexId>;
    }

    private removeAction(actions: Array<LocationAction>, toRemove: LocationAction): Array<LocationAction> | null {
        const index = actions.indexOf(toRemove);

        if (index === -1) {
            return null;
        }

        actions.splice(index, 1);

        if (actions.length === 0) {
            return null;
        }

        return actions;
    }

    private getLocationActions(player: Player, hexId: HexId | null = null): Array<LocationAction> | null {
        const location = this.tools.getCopy((
            this.sharedState.setup.mapPairings[hexId || player.hexagon.hexId]
        ));

        return location.actions;
    }

    private getLocationName(hexId: HexId): LocationName {
        const location = this.tools.getCopy((
            this.sharedState.setup.mapPairings[hexId]
        ));

        return location.name;
    }

    private hasCargoRoom(player: Player, action: LocationAction): boolean {
        if (action !== 'buy_metals' && action !== 'load_good') {
            console.error(`Incompatible settlement action: ${action}`);

            return false;
        }

        const cargo = player.cargo;
        const emptySlots = cargo.filter(item => item === 'empty').length;
        const cargoReq = action === 'load_good' ? 1 : 2;

        return emptySlots >= cargoReq;
    }

    private pickFeasibleTrades(playerCargo: CargoInventory) {
        const market = this.tools.getCopy(this.sharedState.marketOffer);
        const cargo = this.tools.getCopy(playerCargo);
        const nonGoods: Array<ItemName> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];

        const slots: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasible: Array<MarketSlotKey> = [];

        slots.forEach(key => {
            const unfilledGoods = market[key].request;

            for (let i = 0; i < cargo.length; i++) {

                if (nonGoods.includes(cargo[i])) {
                    continue;
                }

                const carriedGood = cargo[i] as GoodName;
                const match = unfilledGoods.indexOf(carriedGood);

                if (match !== -1) {
                    unfilledGoods.splice(match, 1);
                }
            }

            if (unfilledGoods.length === 0) {
                feasible.push(key);
            }
        });

        return feasible;
    }

    private loadItem(cargo: CargoInventory, item: ItemName): CargoInventory | null {
        const filled = cargo.filter(item => item !== 'empty') as CargoInventory;
        const empty = cargo.filter(item => item === 'empty') as CargoInventory;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex === -1) {
            console.error('Could not find an empty slot to load item',{cargo})
        }

        const metalNames: CargoInventory = ['gold', 'silver'];

        if (metalNames.includes(item)) {

            if (this.sharedState.itemSupplies.metals[item as MetalName] < 1) {
                console.error(`No ${item} available for loading`);

                return null;
            }

            if (orderedCargo[emptyIndex + 1] !== 'empty') {
                console.error('Not enough empty slots for storing metal')

                return null;
            }

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetalName;

            this.sharedState.itemSupplies.metals[item as MetalName] -= 1;

        } else {

            if (this.sharedState.itemSupplies.goods[item as GoodName] < 1) {
                console.error(`No ${item} available for loading`);

                return null;
            }

            orderedCargo[emptyIndex] = item;

            this.sharedState.itemSupplies.goods[item as GoodName] -= 1;
        }

        return orderedCargo;
    }

    private unloadItem(cargo: CargoInventory, item: ItemName): CargoInventory | null {
        const newCargo = this.tools.getCopy(cargo);
        const itemIndex = newCargo.indexOf(item);

        if (itemIndex === -1) {
            console.error('Cannot drop item', {cargo,item});

            return null;
        }

        newCargo.splice(itemIndex, 1, 'empty');

        const controlGroup: Array<ItemName> = ['gold', 'silver'];

        if (controlGroup.includes(item)) {
            newCargo.splice(itemIndex + 1, 1, 'empty');
            this.sharedState.itemSupplies.metals[item as MetalName] += 1;
        } else {
            this.sharedState.itemSupplies.goods[item as GoodName] += 1;
        }

        return newCargo;
    }

    private compileGameResults(): Array<PlayerCountables> {
        const players = this.sharedState.players;
        const gameStats = this.privateState.gameStats;

        gameStats.forEach(player => {
            const playerState = players.find(p => p.id === player.id);

            if (!playerState) {
                console.error(`No player found for ${player.id}`);
                return;
            }

            player.gold = ((): number => {
                return playerState.cargo.filter(item => item === 'gold').length;
            })();

            player.silver = ((): number => {
                return playerState.cargo.filter(item => item === 'silver').length;
            })();

            player.vp += (player.gold * 5) + (player.silver * 3);

            player.favor = playerState.favor;
            player.coins = playerState.coins;
        });

        return gameStats;
    }

    private updateTimestamp(activePlayer: Player): void {
        activePlayer.isIdle = false;
        activePlayer.timeStamp = Date.now();
    }

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.sharedState.players.find(player => player.isActive);

            if (!activePlayer) {
                console.error('No active player found');
                return;
            }

            const timeNow = Date.now();

            if (timeNow - activePlayer.timeStamp > 60000 && !activePlayer.isIdle) {
                activePlayer.isIdle = true;
                this.addServerMessage(`${activePlayer.name} is idle`);
                // this.processEndTurn(activePlayer.id);
            }

        }, 60000);
    }

    public wipeSession(): null {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
        delete (global as any).myInstance;

        return null;
    }
}
