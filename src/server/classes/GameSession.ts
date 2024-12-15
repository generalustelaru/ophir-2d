import { PlayerCountables, PrivateState, ProcessedMoveRule, StateBundle, WssMessage } from "../server_types";
import { HexId, PlayerColor, Player, SharedState, ClientRequest, GoodId, LocationAction, MovementDetails, DropItemDetails, DiceSix, RepositioningDetails, CargoManifest, MarketKey, ItemId, MarketSaleDetails, Trade, LocationId, PickupLocationId, MetalPurchaseDetails, ChatDetails, ChatEntry } from "../../shared_types";
import { ToolService } from '../services/ToolService';
import serverConstants from "../server_constants";

const { TRADE_DECK_B } = serverConstants;
const SERVER_NAME = 'GameBot';
const MAX_FAVOR = 6;

type RegistryItem = { id: PlayerColor, influence: DiceSix };

export class GameSession {

    private privateState: PrivateState;
    private sharedState: SharedState;
    private tools: ToolService;
    private idleCheckInterval: NodeJS.Timeout | null = null;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        this.privateState = bundle.privateState;
        this.sharedState = bundle.sharedState;
        this.tools = ToolService.getInstance();
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

    // MARK: ACTION SWITCH
    public processAction(request: ClientRequest): WssMessage {
        const id = request.playerColor;
        const action = request.message.action;

        if (action === 'get_status'){
            return this.processStatusRequest();
        }

        if (!id) {
            return { error: 'No player ID provided' };
        }

        this.updateTimestamp(id);

        switch (action) {
            case 'chat':
                return this.processChat(request) ? this.sharedState : { error: `Could not process chat message on ${id}` };
            case 'spend_favor':
                return this.processFavorSpending(id) ? this.sharedState : { error: `Could not process favor spending on ${id}` };
            case 'move':
                return this.processMove(request) ? this.sharedState : { error: `Could not process move on ${id}` };
            case 'reposition':
                return this.processRepositioning(request) ? this.sharedState : { error: `Could process repositioning on ${id}` };
            case 'pickup_good':
                return this.processGoodPickup(id) ? this.sharedState : { error: `Could not process pickup on ${id}` };
            case 'sell_goods':
                return this.processGoodsTrade(request) ? this.sharedState : { error: `Could not process sale sale on ${id}` };
            case 'donate_goods':
                return this.processGoodsTrade(request) ? this.sharedState : { error: `Could not process trade on ${id}` };
            case 'buy_metals':
                return this.processMetalTrade(request) ? this.sharedState : { error: `Could not process metal purchase on ${id}` };
            case 'donate_metals':
                return this.processMetalDonation(request) ? this.sharedState : { error: `Could not process donation on ${id}` };
            case 'end_turn':
                return this.processEndTurn(id) ? this.sharedState : { error: `Could not process turn end on ${id}` };
            case 'upgrade_hold':
                return this.processUpgrade(id) ? this.sharedState : { error: `Could not process upgrade on ${id}` };
            case 'drop_item':
                return this.processItemDrop(request) ? this.sharedState : { error: `Could not process item drop on ${id}` };
            default:
                return { error: `Unknown action on ${id}` };
        }
    }

    private processStatusRequest(): SharedState {
        const statusUpdate = this.tools.getCopy(this.sharedState);
        statusUpdate.isStatusResponse = true;

        return statusUpdate;
    }

    // MARK: CHAT
    private processChat(request: ClientRequest): boolean {
        const chatMessage = request.message.payload as ChatDetails;

        if (!chatMessage?.message) {
            console.error('No chat message found', chatMessage);

            return false;
        }
        const chatEntry = { id: request.playerColor, name: request.playerName ?? request.playerColor, message: chatMessage.message };
        this.sharedState.sessionChat.push(chatEntry);

        return true;
    }

    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: SERVER_NAME, message };
        this.sharedState.sessionChat.push(chatEntry);
    }

    // MARK: MOVE
    private processMove(request: ClientRequest): boolean {
        const details = request.message.payload as MovementDetails;
        const player = this.sharedState.players.find(player => player.id === request.playerColor);

        if (!player) {
            return false;
        }

        const departure = player.hexagon.hexId;
        const destination = details.hexId;
        const locationName = this.sharedState.setup.mapPairings[destination].id;
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
            player.hexagon = { hexId: destination, position: details.position };
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
    private processRepositioning(request: ClientRequest): boolean {
        const details = request.message.payload as RepositioningDetails;
        const player = this.sharedState.players.find(player => player.id === request.playerColor);

        if (!player) {
            console.error(`No such player found: ${request.playerColor}`);
            return false;
        }

        player.hexagon.position = details.repositioning;

        return true;
    }
    // MARK: FAVOR
    private processFavorSpending(playerColor: PlayerColor): boolean {
        const player = this.sharedState.players.find(player => player.id === playerColor);

        if (player?.isActive && player.favor > 0 && player.privilegedSailing === false) {
            player.favor -= 1;
            player.privilegedSailing = true;
            player.isAnchored = true;
            this.addServerMessage(`${player.name} spent favor to remain anchored or sail without influence roll`);

            return true;
        }

        return false;
    }
    // MARK: DROP ITEM
    private processItemDrop(request: ClientRequest): boolean {
        const details = request.message.payload as DropItemDetails

        const player = this.sharedState.players.find(player => player.id === request.playerColor);

        if (!player?.cargo || !player.cargo.includes(details.item)) {
            return false;
        }

        const manifest = this.unloadItem(player.cargo, details.item);

        if (manifest.length === 0) {
            console.error(`Could not unload item ${details.item} from ${player.id}`);
            return false;
        }

        const hasCargo = manifest.find(item => item !== 'empty') ? true : false;

        player.cargo = manifest;
        player.hasCargo = hasCargo;
        player.feasibleTrades = hasCargo ? this.pickFeasibleTrades(manifest) : [];

        this.addServerMessage(`${player.name} just threw ${details.item} overboard`);

        return true;
    }
    // MARK: PICKUP GOOD
    private processGoodPickup(playerColor: PlayerColor): boolean {
        const player = this.sharedState.players.find(player => player.id === playerColor);

        if (
            false === !!player
            || false === !!player.locationActions
            || false === player.isAnchored
            || false === player.locationActions.includes('pickup_good')
            || false === this.hasCargoRoom(player, 'pickup_good')
        ) {
            console.error(`Cannot load goods for ${playerColor}`, player);

            return false;
        }

        const locationId = this.sharedState.setup.mapPairings[player.hexagon.hexId].id;
        const nonPickupLocations: Array<LocationId> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationId)) {
            console.error(`Cannot pick up goods from ${locationId}`);
            return false;
        }

        const localGood = serverConstants.LOCATION_GOODS[locationId as PickupLocationId];

        player.cargo = this.loadItem(player.cargo, localGood);
        player.hasCargo = true;
        player.moveActions = 0;
        player.locationActions = this.removeAction(player.locationActions, 'pickup_good');
        player.feasibleTrades = this.pickFeasibleTrades(player.cargo);

        this.addServerMessage(`${player.name} picked up ${localGood}`);

        return true;
    }
    // MARK: GOODS TRADE
    private processGoodsTrade(request: ClientRequest): boolean {
        const player = this.sharedState.players.find(player => player.id === request.playerColor);
        const tradeAction = request.message.action as LocationAction;
        const details = request.message.payload as MarketSaleDetails;
        const marketKey = details.slot;

        if (
            !player?.locationActions?.includes(tradeAction)
            || false === player.feasibleTrades.includes(marketKey)
            || false === player.isAnchored
        ) {
            console.error(`Trade action ${tradeAction} not feasible for ${player?.id}`);

            return false;
        }

        const trade = this.sharedState.marketOffer[marketKey];

        switch (tradeAction) {
            case 'sell_goods':
                const modifier = this.sharedState.setup.marketFluctuations[marketKey];
                player.coins += trade.reward.coins + modifier;
                this.addServerMessage(`${player.name} sold goods for ${trade.reward.coins + modifier} coins`);
                break;
            case 'donate_goods':
                const reward = trade.reward.favorAndVp;
                player.favor = Math.min(MAX_FAVOR, player.favor + reward);
                this.privateState.gameStats.find(p => p.id === player.id)!.vp += reward;
                this.addServerMessage(`${player.name} donated goods for ${reward} favor and ${reward} VP`);
                console.info(this.privateState.gameStats);
                break;
            default:
                console.error(`Unknown trade action: ${tradeAction}`);
                return false;
        }

        const playerCargo = (() => {
            let playerCargo = this.tools.getCopy(player.cargo);

            for (const goodId of trade.request) {
                playerCargo = this.unloadItem(playerCargo, goodId);
            };

            return playerCargo;
        })();

        if (playerCargo.length === 0) {
            console.error(`Could not match cargo item to trade request: ${playerCargo}`);
            return false;
        }

        player.cargo = playerCargo;
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.locationActions = this.removeAction(player.locationActions, tradeAction);
        player.moveActions = 0;

        // Update market offer
        const isNewTrade = ((): boolean => {
            const market = this.sharedState.marketOffer;

            market.deckSize -= 1;
            market.slot_3 = market.slot_2;
            market.slot_2 = market.slot_1;
            market.slot_1 = market.future;

            // Load trade deck B if needed and not already loaded
            const tradeDeck = ((): Array<Trade> => {
                if (this.privateState.tradeDeck.length === 0 && this.sharedState.marketOffer.deckId === 'A') {
                    this.privateState.tradeDeck = this.tools.getCopy(TRADE_DECK_B);
                    this.sharedState.marketOffer.deckId = 'B';

                    this.addServerMessage('Market deck B is now in play');
                    console.info('Deck B loaded');
                }

                return this.privateState.tradeDeck;
            })();

            const pick = Math.floor(Math.random() * tradeDeck.length);
            const newTrade = tradeDeck.splice(pick, 1).shift();

            if (!newTrade) {
                return false;
            }

            market.future = newTrade;

            return true;
        })();

        if (isNewTrade) {
            const players = this.sharedState.players;

            players.forEach(player => {
                player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
            });
        } else {
            console.info('Game over!');
            this.addServerMessage('Market deck is empty! Game has ended.');
            this.sharedState.gameStatus = 'ended';
            this.sharedState.gameResults = this.compileGameResults();
        }

        return true;
    }
    // MARK: METAL PURCHASE
    private processMetalTrade(request: ClientRequest): boolean {
        const player = this.sharedState.players.find(player => player.id === request.playerColor);
        const details = request.message.payload as MetalPurchaseDetails;

        if (
            false === !!player
            || false === !!player.locationActions?.includes('buy_metals')
            || false === player.isAnchored
            || false === this.hasCargoRoom(player, 'buy_metals')
        ) {
            console.error(`Player ${player?.id} cannot buy metals`);
            return false;
        }

        const templeStatus = this.sharedState.templeStatus;
        const metalCost = (() =>{ switch (details.metal) {
            case 'gold': return templeStatus.prices.goldCost;
            case 'silver': return templeStatus.prices.silverCost;
            default: return null;
        }})();
        const playerAmount = (() => { switch (details.currency) {
            case 'coins': return player.coins;
            case 'favor': return player.favor;
            default: return null;
        }})();

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

        player.cargo = this.loadItem(player.cargo, details.metal);
        player.hasCargo = true;
        player.moveActions = 0;

        return true;
    }
    // MARK: DONATE METALS
    private processMetalDonation(request: ClientRequest): boolean {
        const player = this.sharedState.players.find(player => player.id === request.playerColor);
        const details = request.message.payload as MetalPurchaseDetails;

        if (
            false === !!player
            || false === !!player.locationActions?.includes('donate_metals')
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

        player.cargo = this.unloadItem(player.cargo, details.metal);
        player.hasCargo = player.cargo.find(item => item !== 'empty') ? true : false;
        player.moveActions = 0;

        const newStatus = this.tools.getCopy(this.sharedState.templeStatus);
        newStatus.levelCompletion += 1;
        newStatus.donations.push(details.metal);

        if (newStatus.levelCompletion === 3) {
            newStatus.currentLevel += 1;
            const newPrices = this.privateState.metalPrices.shift();
            this.addServerMessage('Temple level has been upgraded');
            if (newPrices && newStatus.currentLevel < newStatus.maxLevel) {
                newStatus.prices = newPrices;
                newStatus.levelCompletion = 0;
                this.addServerMessage('Metal prices have increased');
            } else {
                player.locationActions = null;
                this.sharedState.gameStatus = 'ended';
                this.sharedState.gameResults = this.compileGameResults();
                this.addServerMessage('The temple construction is complete! Game has ended.');
                this.addServerMessage(JSON.stringify(this.sharedState.gameResults));
                console.info('Game over!');
            }
        }

        this.sharedState.templeStatus = newStatus;

        return true;
    }
    // MARK: END TURN
    private processEndTurn(playerColor: PlayerColor): boolean {
        const player = this.sharedState.players.find(player => player.id === playerColor);

        if (player?.isActive && player.isAnchored) {
            const activePlayer = this.passActiveStatus();
            this.addServerMessage(`${activePlayer.name} is now active!`);

            return true;
        }

        return false;
    }
    // MARK: UPGRADE HOLD
    private processUpgrade(playerColor: PlayerColor): boolean {
        const player = this.sharedState.players.find(player => player.id === playerColor);

        if (
            player?.locationActions?.includes('upgrade_hold')
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

    private hasCargoRoom(player: Player, action: LocationAction): boolean {
        if (action !== 'buy_metals' && action !== 'pickup_good') {
            console.error(`Incompatible settlement action: ${action}`);

            return false;
        }

        const cargo = player.cargo;
        const emptySlots = cargo.filter(item => item === 'empty').length;
        const cargoReq = action === 'pickup_good' ? 1 : 2;

        return emptySlots >= cargoReq;
    }

    private pickFeasibleTrades(playerCargo: CargoManifest) {
        const market = this.tools.getCopy(this.sharedState.marketOffer);
        const cargo = this.tools.getCopy(playerCargo);
        const nonGoods: Array<ItemId> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];

        const slots: Array<MarketKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasable: Array<MarketKey> = [];

        slots.forEach(key => {
            const unfilledGoods = market[key].request;

            for (let i = 0; i < cargo.length; i++) {

                if (nonGoods.includes(cargo[i])) {
                    continue;
                }

                const carriedGood = cargo[i] as GoodId;
                const match = unfilledGoods.indexOf(carriedGood);

                if (match !== -1) {
                    unfilledGoods.splice(match, 1);
                }
            }

            if (unfilledGoods.length === 0) {
                feasable.push(key);
            }
        });

        return feasable;
    }

    private loadItem(cargo: CargoManifest, item: ItemId): CargoManifest {
        const filled = cargo.filter(item => item !== 'empty') as Array<ItemId>;
        const empty = cargo.filter(item => item === 'empty') as Array<ItemId>;
        const orderedCargo = filled.concat(empty);

        const firstEmpty = orderedCargo.indexOf('empty');
        orderedCargo[firstEmpty] = item;

        if (item === 'gold' || item === 'silver') {
            orderedCargo[firstEmpty + 1] = item + '_extra' as ItemId;
        }

        return orderedCargo;
    }

    private unloadItem(cargo: CargoManifest, item: ItemId): CargoManifest {
        const manifest = this.tools.getCopy(cargo);
        const manifestIndex = manifest.indexOf(item);

        if (manifestIndex === -1) {
            return [];
        }
        manifest.splice(manifestIndex, 1, 'empty');

        if (['gold', 'silver'].includes(item)) {
            manifest.splice(manifestIndex + 1, 1, 'empty');
        }

        return manifest;
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

    private updateTimestamp(activePlayerId: PlayerColor): void {
        const activePlayer = this.sharedState.players.find(player => player.id === activePlayerId);

        if (!activePlayer) {
            console.error(`Could not find active player: ${activePlayerId}`);
            return;
        }

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

        return null
    }
}
