import { DataDigest, PlayerCountables, PrivateState, ProcessedMoveRule, StateBundle } from "../server_types";
import {
    HexId, PlayerColor, Player, SharedState, ClientRequest, TradeGood, LocationAction,
    DiceSix, CargoInventory, MarketSlotKey, ItemName, GoodsTradePayload, Trade, LocationName,
    GoodLocationName, MetalPurchasePayload, ChatEntry, ServerMessage, CargoMetal, Metal,
    ErrorResponse,
} from "../../shared_types";
import { ToolService } from '../services/ToolService';
import serverConstants from "../server_constants";
import { ValidatorService } from "../services/validation/ValidatorService";

const { TRADE_DECK_B } = serverConstants;
const SERVER_NAME = 'GameBot';
const MAX_FAVOR = 6;

type RegistryItem = { id: PlayerColor, influence: DiceSix };
type Probable<T> = { err: true, data: string } | { err: false, data: T };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolService;
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private validator: ValidatorService;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;
        this.tools = new ToolService();
        this.validator = new ValidatorService();
        const activePlayer = this.sharedState.players.find(
            player => player.isActive
        );

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

    public getSessionOwner() {
        return this.sharedState.sessionOwner;
    }

    public getPrivateState(): PrivateState {
        return this.privateState;
    }

    public wipeSession(): null {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
        delete (global as any).myInstance;

        return null;
    }

    // MARK: ACTION SWITCH
    public processAction(request: ClientRequest): ServerMessage {
        const { playerColor, message } = request;
        const { action, payload } = message;

        if (action === 'get_status') {
            return this.processStatusRequest();
        }

        if (!playerColor)
            return this.errorResponse('No player ID provided');

        const player = this.sharedState.players.find(
            player => player.id === playerColor
        );

        if (!player)
            return this.errorResponse(`Player does not exist: ${playerColor}`);

        this.updateTimestamp(player);

        const digest: DataDigest = { player, payload }

        switch (action) {
            case 'chat':
                return this.processChat(digest);
            case 'spend_favor':
                return this.processFavorSpending(digest);
            case 'move':
                return this.processMove(digest);
            case 'reposition':
                return this.processRepositioning(digest);
            case 'load_good':
                return this.processLoadGood(digest);
            case 'trade_goods':
                return this.processGoodsTrade(digest);
            case 'buy_metals':
                return this.processMetalPurchase(digest);
            case 'donate_metals':
                return this.processMetalDonation(digest);
            case 'end_turn':
                return this.processEndTurn(digest);
            case 'upgrade_hold':
                return this.processUpgrade(digest);
            case 'drop_item':
                return this.processItemDrop(digest);
            default:
                return this.errorResponse(`Unknown action: ${action}`);
        }
    }

    private processStatusRequest(): SharedState {
        const statusUpdate = this.tools.getCopy(this.sharedState);
        statusUpdate.isStatusResponse = true;

        return statusUpdate;
    }

    // MARK: CHAT
    private processChat(data: DataDigest): SharedState | ErrorResponse {
        const { player, payload } = data;
        const chatPayload = this.validator.validateChatPayload(payload);

        if (!chatPayload)
            return this.validationErrorResponse()

        const chatEntry = { id: player.id, name: player.name, message: chatPayload.input };
        this.sharedState.sessionChat.push(chatEntry);

        return this.stateResponse();
    }

    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: SERVER_NAME, message };
        this.sharedState.sessionChat.push(chatEntry);
    }

    // MARK: MOVE
    private processMove(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateMovementPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;
        const departure = player.hexagon.hexId;
        const destination = payload.hexId;
        const locationName = this.sharedState.setup.mapPairings[destination].name;
        const remainingMoves = player.moveActions;
        const hexMoveRule = this.privateState.moveRules.find(rule => rule.from === departure) as ProcessedMoveRule;

        if (!hexMoveRule.allowed.includes(destination) || remainingMoves === 0) {
            return this.errorResponse('Movement not alowed.', { destination, remainingMoves });
        }

        player.moveActions = remainingMoves - 1;

        const registry = this.getPortRegistry(destination);
        const sailSuccess = !registry || player.privilegedSailing
            ? true
            : this.checkInfluence(player, registry);

        if (sailSuccess) {
            player.hexagon = {
                hexId: destination,
                position: payload.position,
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

        return this.stateResponse();
    }
    // MARK: REPOSITIONING
    private processRepositioning(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateRepositioningPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        data.player.hexagon.position = payload.repositioning;

        return this.stateResponse();
    }
    // MARK: FAVOR
    private processFavorSpending(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const { isActive, favor, privilegedSailing } = player;

        if (isActive && favor > 0 && privilegedSailing === false) {
            player.favor -= 1;
            player.privilegedSailing = true;
            player.isAnchored = true;
            this.addServerMessage(`${player.name} spent favor to remain anchored or sail without influence roll`);

            return this.stateResponse();
        }

        return this.errorResponse(
            `Could not process favor for ${player.id}`,
            {isActive, favor, privilegedSailing}
        );
    }
    // MARK: DROP ITEM
    private processItemDrop(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateDropItemPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;
        const newCargo = this.unloadItem(player.cargo, payload.item);

        if (!newCargo) {
            return this.errorResponse(`Could not drop item for ${player.id}`);

        }

        const hasCargo = Boolean(newCargo.find(item => item !== 'empty'));
        player.cargo = newCargo;
        player.hasCargo = hasCargo;
        player.feasibleTrades = hasCargo ? this.pickFeasibleTrades(newCargo) : [];

        this.addServerMessage(`${player.name} just threw ${payload.item} overboard`);

        return this.stateResponse();
    }
    // MARK: LOAD TRADE GOOD
    private processLoadGood(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateLoadGoodPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;

        if (
            !player.isAnchored
            || !player.locationActions?.includes('load_good')
            || !this.hasCargoRoom(player.cargo, 1)
        ) {
            return this.errorResponse(`Cannot load goods for ${player.id}`, player);
        }

        const locationId = this.sharedState.setup.mapPairings[player.hexagon.hexId].name;
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationId)) {
            return this.errorResponse(`Cannot pick up goods from ${locationId}`);
        }

        const localGood = serverConstants.LOCATION_GOODS[locationId as GoodLocationName];

        if (localGood !== payload.tradeGood) {
            return this.errorResponse(
                `Cannot load goods for ${player.id}`,
                {localGood, payload},
            );
        }

        const res = this.loadItem(player.cargo, localGood);

        if (res.err)
            return this.errorResponse(res.data);

        player.cargo = res.data;
        player.hasCargo = true;
        player.moveActions = 0;
        player.locationActions = this.removeAction(player.locationActions, 'load_good');
        player.feasibleTrades = this.pickFeasibleTrades(player.cargo);

        this.addServerMessage(`${player.name} picked up ${localGood}`);

        return this.stateResponse();
    }
    // MARK: GOODS TRADE
    private processGoodsTrade(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const details = data.payload as GoodsTradePayload;
        const { slot, location } = details;

        if (
            !player.locationActions?.includes('trade_goods')
            || player.hexagon.location !== location
            || !player.feasibleTrades.includes(slot)
            || !player.isAnchored
        ) {
            return this.errorResponse(`Conditions for trade not satisfied for ${player.id}`);
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
                return this.errorResponse(`Unknown trade location: ${location}`);
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
            return this.errorResponse(`Could not match cargo item to trade request: ${player.cargo}`);
        }

        player.cargo = newCargo;
        player.hasCargo = Boolean(player.cargo.find(item => item !== 'empty'));
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
            const result = this.compileGameResults();

            if (result.err)
                return this.errorResponse(result.data);

            this.sharedState.gameResults = result.data;
            this.sharedState.gameStatus = 'ended';
            this.addServerMessage('Market deck is empty! Game has ended.');
        }

        return this.stateResponse();
    }
    // MARK: METAL PURCHASE
    private processMetalPurchase(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const details = data.payload as MetalPurchasePayload;

        if (
            false === !!player.locationActions?.includes('buy_metals')
            || false === player.isAnchored
            || false === this.hasCargoRoom(player.cargo, 2)
        ) {
            return this.errorResponse(`Player ${player?.id} cannot buy metals`);
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
            return this.errorResponse(`No such cost or player amount found: ${metalCost}, ${player}`);
        }

        const remainder = playerAmount - metalCost[details.currency];

        if (remainder < 0) {
            return this.errorResponse(`Player ${player.id} cannot afford metal purchase`);
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
                return this.errorResponse(`Unknown currency: ${details.currency}`);
        }

        const result = this.loadItem(player.cargo, details.metal);

        if (result.err)
            return this.errorResponse(result.data);

        player.cargo = result.data;
        player.hasCargo = true;
        player.moveActions = 0;

        return this.stateResponse();
    }
    // MARK: DONATE METALS
    private processMetalDonation(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const details = data.payload as MetalPurchasePayload;

        if (
            false === !!player.locationActions?.includes('donate_metals')
            || false === player.isAnchored
            || false === player.cargo.includes(details.metal)
        ) {
            return this.errorResponse(`Player ${player?.id} cannot donate ${details.metal}`);
        }

        const reward = details.metal === 'gold' ? 10 : 5
        this.privateState.gameStats.find(p => p.id === player.id)!.vp += reward;
        this.addServerMessage(`${player.name} donated ${details.metal} for ${reward} VP`);
        console.info(this.privateState.gameStats);

        const newCargo = this.unloadItem(player.cargo, details.metal);

        if (!newCargo)
            return this.errorResponse(`Could not refresh cargo for ${player.id}`);

        player.cargo = newCargo;
        player.hasCargo = Boolean(player.cargo.find(item => item !== 'empty'));
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
                const result = this.compileGameResults();

                if (result.err)
                    return this.errorResponse(result.data);

                this.sharedState.gameResults = result.data;
                player.locationActions = null;
                this.sharedState.gameStatus = 'ended';
                this.addServerMessage('The temple construction is complete! Game has ended.');
                this.addServerMessage(JSON.stringify(this.sharedState.gameResults));
            }
        }

        this.sharedState.templeStatus = newStatus;

        return this.stateResponse();
    }
    // MARK: END TURN
    private processEndTurn(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const { isActive, isAnchored } = player;

        if (!isActive || !isAnchored) {
            return this.errorResponse(
                `Cannot process turn for ${player.id}`,
                { isActive, isAnchored }
            );
        }

        const res = this.passActiveStatus();

        if (res.err)
            return this.errorResponse(res.data);

        const activePlayer = res.data;
        this.addServerMessage(`${activePlayer.name} is now active!`);

        return this.stateResponse();
    }
    // MARK: UPGRADE HOLD
    private processUpgrade(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const { coins, cargo, locationActions } = player;
        if (
            locationActions?.includes('upgrade_hold')
            && coins >= 2
            && cargo.length < 4
        ) {
            player.coins -= 2;
            player.cargo.push('empty');
            player.locationActions = this.removeAction(locationActions, 'upgrade_hold');
            player.moveActions = 0;

            this.addServerMessage(`${player.name} upgraded their hold`);

            return this.stateResponse();
        }

        return this.errorResponse(
            `Could not resolve upgrade`,
            { coins, cargo, locationActions },
        );
    }

    // MARK: UTILITIES
    private getPortRegistry(destinationHex: HexId): Array<RegistryItem> | false {
        const registry: Array<RegistryItem> = [];
        const players = this.sharedState.players;

        players.forEach(player => {
            if (player.hexagon.hexId === destinationHex) {
                registry.push({ id: player.id, influence: player.influence });
            }
        });

        if (registry.length === 0) {
            return false; // TODO: return an empty array and adjust consumers
        }

        return registry;
    }

    private checkInfluence(activePlayer: Player, registry: Array<RegistryItem>): boolean {
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
            this.addServerMessage(
                `${activePlayer.name} rolled a ${activePlayer.influence} and sailed successfully!`
            );

            return true;
        }

        registry.forEach(item => {
            const player = this.sharedState.players.find(
                player => player.id === item.id
            );

            if (player?.influence === highestInfluence) {
                player.influence -= 1;
            }
        });

        return false;
    }

    private passActiveStatus(): Probable<Player> {
        const players = this.sharedState.players;
        const activePlayer = players.find(player => player.isActive);

        if (!activePlayer)
            return this.fail('No active player found');

        activePlayer.isActive = false;
        activePlayer.locationActions = null;
        activePlayer.privilegedSailing = false;

        const nextToken = activePlayer.turnOrder === players.length
            ? 1
            : activePlayer.turnOrder + 1;

        const nextActivePlayer = players.find(player => player.turnOrder === nextToken);

        if (!nextActivePlayer)
            return this.fail('Could not find the next player');

        nextActivePlayer.isActive = true;
        this.setTurnStartCondition(nextActivePlayer);

        return this.pass(nextActivePlayer);
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
            return null; // TODO: return empty array instead, adjust consumers
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

    private hasCargoRoom(cargo: CargoInventory, requirement: 1|2): boolean {
        const emptySlots = cargo.filter(item => item === 'empty').length;

        return (emptySlots >= requirement);
    }

    private pickFeasibleTrades(playerCargo: CargoInventory): Array<MarketSlotKey> {
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

                const carriedGood = cargo[i] as TradeGood;
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

    private loadItem(cargo: CargoInventory, item: ItemName): Probable<CargoInventory> {
        const filled = cargo.filter(item => item !== 'empty') as CargoInventory;
        const empty = cargo.filter(item => item === 'empty') as CargoInventory;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex === -1) {
            return this.fail('Could not find an empty slot to load item');
        }

        const metalNames: CargoInventory = ['gold', 'silver'];

        if (metalNames.includes(item)) {

            if (this.sharedState.itemSupplies.metals[item as Metal] < 1)
                return this.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] !== 'empty')
                return this.fail(`Not enough empty slots for storing metal`);

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;

            this.sharedState.itemSupplies.metals[item as Metal] -= 1;
        } else {

            if (this.sharedState.itemSupplies.goods[item as TradeGood] < 1)
                return this.fail(`No ${item} available for loading`);

            orderedCargo[emptyIndex] = item;

            this.sharedState.itemSupplies.goods[item as TradeGood] -= 1;
        }

        return this.pass(orderedCargo);
    }

    private unloadItem(cargo: CargoInventory, item: ItemName): CargoInventory | null {
        const newCargo = this.tools.getCopy(cargo);
        const itemIndex = newCargo.indexOf(item);

        if (itemIndex === -1)
            return null;

        newCargo.splice(itemIndex, 1, 'empty');

        const controlGroup: Array<ItemName> = ['gold', 'silver'];

        if (controlGroup.includes(item)) {
            newCargo.splice(itemIndex + 1, 1, 'empty');
            this.sharedState.itemSupplies.metals[item as Metal] += 1;
        } else {
            this.sharedState.itemSupplies.goods[item as TradeGood] += 1;
        }

        return newCargo;
    }

    private compileGameResults(): Probable<Array<PlayerCountables>> {
        const players = this.sharedState.players;
        const gameStats = this.privateState.gameStats;

        for (let i = 0; i < gameStats.length; i++) {
            const playerStat = gameStats[i];
            const player = players.find(p => p.id === playerStat.id);

            if (!player) {
                return this.fail(`No player found for ${playerStat.id}`);
            }

            playerStat.gold = player.cargo.filter(item => item === 'gold').length;
            playerStat.silver = player.cargo.filter(item => item === 'silver').length;
            playerStat.vp += (playerStat.gold * 5) + (playerStat.silver * 3);
            playerStat.favor = player.favor;
            playerStat.coins = player.coins;
        }

        return this.pass(gameStats);
    }

    private updateTimestamp(activePlayer: Player): void {
        activePlayer.isIdle = false;
        activePlayer.timeStamp = Date.now();
    }

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.sharedState.players.find(player => player.isActive);

            if (!activePlayer) {
                this.errorResponse('No active player found in idle check!')
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

    private validationErrorResponse(){
        return this.errorResponse('Malformed request.');
    }

    private stateResponse(): SharedState {
        return this.sharedState;
    }
    private errorResponse(message: string, params?: object): ErrorResponse {
        const error = `ERROR: ${message}`;
        console.error(error, params);

        return { error };
    }

    private pass<T>(data: T): Probable<T> {
        return { err: false, data }
    }

    private fail(message: string): Probable<any> {
        return { err: true, data: message }
    }
}
