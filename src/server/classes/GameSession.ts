import process from 'process';
import { DataDigest, PlayerCountables, PrivateState, ProcessedMoveRule, StateBundle } from "../server_types";
import {
    ZoneName, PlayerColor, Player, SharedState, ClientRequest, TradeGood, LocationAction,
    DiceSix, CargoInventory, MarketSlotKey, ItemName, TradePayload, Trade, LocationName,
    GoodsLocationName, MetalPurchasePayload, ChatEntry, ServerMessage, CargoMetal, Metal,
    ErrorResponse,
    MetalDonationPayload,
} from "../../shared_types";
import { ToolService } from '../services/ToolService';
import serverConstants from "../server_constants";
import { ValidatorService } from "../services/validation/ValidatorService";
import { SharedStateStore } from "../data_classes/SharedStateStore";

const { TRADE_DECK_B } = serverConstants;
const serverName = String(process.env.SERVER_NAME);
const MAX_FAVOR = 6;
const IDLE_CHECKS = Boolean(process.env.IDLE_CHECKS);

type Probable<T> = { err: true, data: string } | { err: false, data: T };

export class GameSession {

    private privateState: PrivateState;
    private state: SharedStateStore;
    private tools: ToolService;
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private validator: ValidatorService;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        this.privateState = bundle.privateState;
        this.state = bundle.sharedState;
        this.tools = new ToolService();
        this.validator = new ValidatorService();
        const activePlayer = this.state.getActivePlayer();

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        this.setTurnStartCondition(activePlayer);

        console.info('Game session created');

        if(IDLE_CHECKS)
            this.startIdleChecks();
    }

    public getState(): SharedState {
        return this.state.toDto();
    }

    public getSessionOwner() {
        return this.state.getSessionOwner();
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

        const player = this.state.getPlayer(playerColor);

        if (!player)
            return this.errorResponse(`Player does not exist: ${playerColor}`);

        player.isIdle = false;
        player.timeStamp = Date.now();

        this.state.savePlayer(player);

        const digest: DataDigest = { player , payload }

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
            case 'trade':
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
        const stateDto = this.state.toDto()
        stateDto.isStatusResponse = true;

        return stateDto;
    }

    // MARK: CHAT
    private processChat(data: DataDigest): SharedState | ErrorResponse {
        const { player , payload } = data;
        const chatPayload = this.validator.validateChatPayload(payload);

        if (!chatPayload)
            return this.validationErrorResponse();

        this.state.addChatEntry({
            id: player.id,
            name: player.name,
            message: chatPayload.input,
        });

        return this.stateResponse();
    }

    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: serverName, message };
        this.state.addChatEntry(chatEntry);
    }

    // MARK: MOVE
    private processMove(data: DataDigest): SharedState | ErrorResponse {
        const { player, payload } = data;
        const movementPayload = this.validator.validateMovementPayload(payload);
        console.log('pre', player)
        if (!movementPayload)
            return this.validationErrorResponse();

        const departure = player.bearings.seaZone;
        const destination = movementPayload.hexId;
        const locationName = this.state.getLocationName(destination);
        const remainingMoves = player.moveActions;
        const moveRule = this.privateState.moveRules.find(
            rule => rule.from === departure
        ) as ProcessedMoveRule;

        if (!moveRule.allowed.includes(destination) || remainingMoves === 0) {
            return this.errorResponse('Movement not alowed.', { destination, remainingMoves });
        }

        player.moveActions = remainingMoves - 1;
        const localInfluence = this.state.getZoneInfluenceData(destination);
        const sailSuccess = !localInfluence.length || player.privilegedSailing
            ? true
            : this.checkInfluence(player, localInfluence);

        if (sailSuccess) {
            player.bearings = {
                seaZone: destination,
                position: movementPayload.position,
                location: this.state.getLocationName(destination),
            };
            player.allowedMoves = (
                this.privateState.moveRules
                    .find(rule => rule.from === destination)?.allowed
                    .filter(move => move !== departure) as Array<ZoneName>
            );
            player.isAnchored = true;
            player.locationActions = this.state.getLocationActions(destination);
        } else {
            this.addServerMessage(`${player.name} was blocked from sailing towards the ${locationName}`);
        }

        if (player.moveActions === 0 && !sailSuccess) {
            player.isAnchored = true;
            player.locationActions = null;
            this.addServerMessage(`${player.name} also ran out of moves and cannot act further`);
        }
        console.log('process move', {player})
        this.state.savePlayer(player);

        return this.stateResponse();
    }
    // MARK: REPOSITIONING
    private processRepositioning(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateRepositioningPayload(data.payload);
        const player  = data.player;

        if (!payload)
            return this.validationErrorResponse();

        player.bearings.position = payload.repositioning;
        this.state.savePlayer(player);

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
            this.state.savePlayer(player);

            this.addServerMessage(`${player.name} spent favor to remain anchored or sail without influence roll`);

            return this.stateResponse();
        }

        return this.errorResponse(
            `Could not process favor for ${player.id}`,
            { isActive, favor, privilegedSailing },
        );
    }
    // MARK: DROP ITEM
    private processItemDrop(data: DataDigest): SharedState | ErrorResponse {
        const payload = this.validator.validateDropItemPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;
        const lighterCargo = this.unloadItem(player.cargo, payload.item);

        if (!lighterCargo)
            return this.errorResponse(`Could not drop item for ${player.id}`);

        player.hasCargo = Boolean(
            lighterCargo.find(item => item !== 'empty')
        );
        player.cargo = lighterCargo;
        player.feasibleTrades = this.pickFeasibleTrades(lighterCargo);
        this.state.savePlayer(player);

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

        const locationName = this.state.getLocationName(player.bearings.seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return this.errorResponse(`Cannot pick up goods from ${locationName}`);

        const localGood = serverConstants.LOCATION_GOODS[locationName as GoodsLocationName];

        if (localGood !== payload.tradeGood) {
            return this.errorResponse(
                `Cannot load ${payload.tradeGood} here.`,
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
        this.state.savePlayer(player);

        this.addServerMessage(`${player.name} picked up ${localGood}`);

        return this.stateResponse();
    }
    // MARK: GOODS TRADE
    private processGoodsTrade(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const details = data.payload as TradePayload; // TODO: implement validation
        const { slot, location } = details;

        if (
            !player.locationActions?.includes('trade_goods')
            || player.bearings.location !== location
            || !player.feasibleTrades.includes(slot)
            || !player.isAnchored
        ) {
            return this.errorResponse(`Conditions for trade not satisfied for ${player.id}`);
        }

        const trade = this.state.getMarketTrade(slot);

        switch (location) {
            case 'market':
                const modifier = this.state.getFluctuation(slot);
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
        this.state.savePlayer(player);

        // Update market offer
        this.state.shiftMarketCards();

        const tradeDeck = ((): Array<Trade> => {

            // Load trade deck B if required
            if (this.privateState.tradeDeck.length === 0 && this.state.isDeckA()) {
                this.privateState.tradeDeck = this.tools.getCopy(TRADE_DECK_B);

                this.state.markDeckB();

                this.addServerMessage('Market deck B is now in play');
            }

            return this.privateState.tradeDeck;
        })();

        const pick = Math.floor(Math.random() * tradeDeck.length);
        const newTrade = tradeDeck.splice(pick, 1).shift() || null;

        if (newTrade) {
            this.state.setFutureTrade(newTrade);

            for (const player of this.state.getAllPlayers()) {
                player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
                this.state.savePlayer(player);
            }

        } else {
            const result = this.compileGameResults();

            if (result.err)
                return this.errorResponse(result.data);

            this.state.setGameResults(result.data);
            this.state.setGameStatus('ended');
            this.addServerMessage('Market deck is empty! Game has ended.');
        }

        return this.stateResponse();
    }

    // MARK: METAL PURCHASE
    private processMetalPurchase(data: DataDigest): SharedState | ErrorResponse {
        const { player, payload } = data;

        const purchasePayload = payload as MetalPurchasePayload; // TODO: implement validation

        if (
            !player.locationActions?.includes('buy_metals')
            || !player.isAnchored
            || !this.hasCargoRoom(player.cargo, 2)
        ) {
            return this.errorResponse(`Player ${player?.id} cannot buy metals`);
        }

        const costs = this.state.getMetalCosts();
        const metalCost = (() => {
            switch (purchasePayload.metal) {
                case 'gold': return costs.gold;
                case 'silver': return costs.silver;
                default: return null;
            }
        })();
        const playerAmount = (() => {
            switch (purchasePayload.currency) {
                case 'coins': return player.coins;
                case 'favor': return player.favor;
                default: return null;
            }
        })();

        if (!metalCost || !playerAmount) {
            return this.errorResponse(`No such cost or player amount found: ${metalCost}, ${player}`);
        }

        const remainder = playerAmount - metalCost[purchasePayload.currency];

        if (remainder < 0) {
            return this.errorResponse(`Player ${player.id} cannot afford metal purchase`);
        }

        switch (purchasePayload.currency) {
            case 'coins':
                player.coins = remainder;
                this.addServerMessage(`${player.name} bought ${purchasePayload.metal} for ${metalCost.coins} coins`);
                break;
            case 'favor':
                player.favor = remainder;
                this.addServerMessage(`${player.name} bought ${purchasePayload.metal} for ${metalCost.favor} favor`);
                break;
            default:
                return this.errorResponse(`Unknown currency: ${purchasePayload.currency}`);
        }

        const result = this.loadItem(player.cargo, purchasePayload.metal);

        if (result.err)
            return this.errorResponse(result.data);

        player.cargo = result.data;
        player.hasCargo = true;
        player.moveActions = 0;
        this.state.savePlayer(player);

        return this.stateResponse();
    }

    // MARK: DONATE METALS
    private processMetalDonation(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const payload = data.payload as MetalDonationPayload; // TODO: implement validation

        if (
            !player.locationActions?.includes('donate_metals')
            || !player.isAnchored
            || !player.cargo.includes(payload.metal)
        ) {
            return this.errorResponse(`Player ${player?.id} cannot donate ${payload.metal}`);
        }

        const reward = payload.metal === 'gold' ? 10 : 5
        this.privateState.gameStats.find(p => p.id === player.id)!.vp += reward;
        this.addServerMessage(`${player.name} donated ${payload.metal} for ${reward} VP`);
        console.info(this.privateState.gameStats);

        const newCargo = this.unloadItem(player.cargo, payload.metal);

        if (!newCargo)
            return this.errorResponse(`Could not refresh cargo for ${player.id}`);

        player.cargo = newCargo;
        player.hasCargo = Boolean(player.cargo.find(item => item !== 'empty'));
        player.moveActions = 0;
        this.state.savePlayer(player);

        const { isNewLevel, isTempleComplete } = this.state.processMetalDonation(payload.metal);

        if (isTempleComplete) {
            player.locationActions = null;
            this.state.savePlayer(player);
            const result = this.compileGameResults();

            if (result.err)
                return this.errorResponse(result.data);

            this.addServerMessage('The temple construction is complete! Game has ended.');
            this.addServerMessage(JSON.stringify(result.data));
            this.state.registerGameEnd(result.data);

            return this.stateResponse();
        }

        const newPrices = this.privateState.costTiers.shift()?.costs;

        if (isNewLevel && newPrices) {
            this.addServerMessage('Current temple level is complete. Metal costs increase.');
            this.state.setMetalCosts(newPrices);

            return this.stateResponse();
        }

        return this.errorResponse('Donation could not be resolved', { newPrices, isNewLevel });
    }

    // MARK: END TURN
    private processEndTurn(data: DataDigest): SharedState | ErrorResponse {
        const player = data.player;
        const { isActive, isAnchored } = player;

        if (!isActive || !isAnchored)
            return this.errorResponse(`Cannot process turn for ${player.id}`, { isActive, isAnchored });

        const result = this.passActiveStatus();

        if (result.err)
            return this.errorResponse(result.data);

        const activePlayer = result.data;
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
            this.state.savePlayer(player);
            this.addServerMessage(`${player.name} upgraded their hold`);

            return this.stateResponse();
        }

        return this.errorResponse(`Could not resolve upgrade`, { coins, cargo, locationActions });
    }

    // MARK: UTILITIES

    // TODO: too many side effects. move functionality to store to be executed methodically
    private checkInfluence(activePlayer: Player, registry: { id: PlayerColor, influence: DiceSix }[]): boolean {
        let canMove = true;

        activePlayer.influence = Math.ceil(Math.random() * 6) as DiceSix;
        this.state.savePlayer(activePlayer);

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
            const player = this.state.getPlayer(item.id);

            if (player?.influence === highestInfluence) {
                player.influence -= 1;
                this.state.savePlayer(player);
            }
        });

        return false;
    }

    private passActiveStatus(): Probable<Player> {
        // const players = this.state.players;
        const activePlayer = this.state.getActivePlayer();

        if (!activePlayer)
            return this.fail('No active player found');

        activePlayer.isActive = false;
        activePlayer.locationActions = null;
        activePlayer.privilegedSailing = false;
        this.state.savePlayer(activePlayer);

        const allPlayers = this.state.getAllPlayers();
        const nextToken = activePlayer.turnOrder === allPlayers.length
            ? 1
            : activePlayer.turnOrder + 1;

        const nextActivePlayer = allPlayers.find(player => player.turnOrder === nextToken);

        if (!nextActivePlayer)
            return this.fail('Could not find the next player');

        nextActivePlayer.isActive = true;
        this.state.savePlayer(nextActivePlayer);
        this.setTurnStartCondition(nextActivePlayer);

        return this.pass(nextActivePlayer);
    }

    private setTurnStartCondition(player: Player): void {

        player.isAnchored = false;
        player.privilegedSailing = false;
        player.moveActions = 2;
        player.locationActions = this.state.getLocationActions(player.bearings.seaZone);
        player.timeStamp = Date.now();

        const rules = this.privateState.moveRules.find(
            rule => rule.from === player.bearings.seaZone
        ) as ProcessedMoveRule;

        player.allowedMoves = rules.allowed as Array<ZoneName>;
        this.state.savePlayer(player);
    }

    private removeAction(actions: Array<LocationAction>, toRemove: LocationAction): Array<LocationAction> | null {
        const index = actions.indexOf(toRemove);

        if (index === -1)
            return null; // TODO: return empty array instead, adjust consumers

        actions.splice(index, 1);

        if (actions.length === 0)
            return null;

        return actions;
    }

    private hasCargoRoom(cargo: CargoInventory, requirement: 1|2): boolean {
        const emptySlots = cargo.filter(item => item === 'empty').length;

        return (emptySlots >= requirement);
    }

    private pickFeasibleTrades(cargo: CargoInventory): Array<MarketSlotKey> {
        const market = this.state.getMarket();
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
        const supplies = this.state.getItemSupplies();

        if (metalNames.includes(item)) {

            if (supplies.metals[item as Metal] < 1)
                return this.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] !== 'empty')
                return this.fail(`Not enough empty slots for storing metal`);

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;
            this.state.removeMetal(item as Metal);

            return this.pass(orderedCargo);
        }

        const tradeGood = item as TradeGood;

        if (supplies.goods[tradeGood] < 1)
            return this.fail(`No ${item} available for loading`);

        orderedCargo[emptyIndex] = item;
        this.state.removeTradeGood(tradeGood);

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
            this.state.returnMetal(item as Metal);
        } else {
            this.state.returnTradeGood(item as TradeGood);
        }

        return newCargo;
    }

    private compileGameResults(): Probable<Array<PlayerCountables>> {
        const players = this.state.getAllPlayers();
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

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.state.getActivePlayer();

            if (!activePlayer) {
                this.errorResponse('No active player found in idle check!')
                return;
            }

            const timeNow = Date.now();

            if (timeNow - activePlayer.timeStamp > 60000 && !activePlayer.isIdle) {
                activePlayer.isIdle = true;
                this.state.savePlayer(activePlayer);
                this.addServerMessage(`${activePlayer.name} is idle`);
                // this.processEndTurn(activePlayer.id);
            }

        }, 60000);
    }

    private validationErrorResponse(){
        return this.errorResponse('Malformed request.');
    }

    private stateResponse(): SharedState {
        return this.state.toDto();
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
