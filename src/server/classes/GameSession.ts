import process from 'process';
import { DataDigest, PlayerCountables, StateBundle } from "../server_types";
import {
    GameState, ClientRequest, TradeGood, LocationAction, MarketSlotKey, ItemName, GameStateResponse, ZoneName,
    LocationName, GoodsLocationName, ChatEntry, ServerMessage, CargoMetal, Metal, ErrorResponse, Action, Coordinates,
} from "../../shared_types";
import serverConstants from "../server_constants";
import { ValidatorService } from "../services/validation/ValidatorService";
import { GameStateHandler } from "../data_classes/GameState";
import { PlayerHandler } from '../data_classes/Player';
import { IDLE_CHECKS } from "../configuration";
import { PrivateStateHandler } from '../data_classes/PrivateState';

const { TRADE_DECK_B } = serverConstants;
const serverName = String(process.env.SERVER_NAME);

type Probable<T> = { err: true, message: string } | { err?: false, data: T };

export class GameSession {

    private privateState: PrivateStateHandler;
    private state: GameStateHandler;
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private validator: ValidatorService;

    constructor(bundle: StateBundle) {
        (global as any).myInstance = this;
        this.privateState = bundle.privateState;
        this.state = bundle.gameState;
        this.validator = new ValidatorService();
        const activePlayer = this.state.getActivePlayer();

        if (!activePlayer) {
            throw new Error('No active player found');
        }

        console.info('Game session created');

        if(IDLE_CHECKS)
            this.startIdleChecks();
    }

    public getState(): GameState {
        return this.state.toDto();
    }

    public getSessionOwner() {
        return this.state.getSessionOwner();
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

        if (action === Action.get_status) {
            return this.processStatusRequest();
        }

        if (!playerColor)
            return this.issueErrorResponse('No player ID provided');

        const playerObject = this.state.getPlayer(playerColor);

        if (!playerObject)
            return this.issueErrorResponse(`Player does not exist: ${playerColor}`);

        const player = new PlayerHandler(playerObject);
        player.refreshTimeStamp();

        const digest: DataDigest = { player, payload }

        if (action == Action.chat)
            return this.processChat(digest);

        if (!player.isActivePlayer())
            return this.issueErrorResponse(`It is not [${player.getIdentity().name}]'s turn!`);

        const actionsWhileFrozen: Array<Action> = [
            Action.drop_item,
            Action.reposition,
            Action.reposition_rival,
            Action.move_rival,
            Action.end_rival_turn,
            Action.shift_market,
        ];

        if (player.isFrozen() && !actionsWhileFrozen.includes(action))
            return this.issueErrorResponse(`[${player.getIdentity().name}] is handling rival and cannot act.`)

        switch (action) {
            case Action.spend_favor:
                return this.processFavorSpending(digest);
            case Action.move:
                return this.processMove(digest);
            case Action.move_rival:
                return this.processMove(digest, true);
            case Action.reposition:
                return this.processRepositioning(digest);
                case Action.reposition_rival:
                return this.processRepositioning(digest, true);
            case Action.load_good:
                return this.processLoadGood(digest);
            case Action.make_trade:
                return this.processGoodsTrade(digest);
            case Action.buy_metals:
                return this.processMetalPurchase(digest);
            case Action.donate_metals:
                return this.processMetalDonation(digest);
            case Action.end_turn:
                return this.processEndTurn(digest);
            case Action.end_rival_turn:
                return this.processRivalTurn(digest);
            case Action.shift_market:
                return this.processRivalTurn(digest, true);
            case Action.upgrade_cargo:
                return this.processUpgrade(digest);
            case Action.drop_item:
                return this.processItemDrop(digest);
            default:
                return this.issueErrorResponse(`Unknown action: ${action}`);
        }
    }

    private processStatusRequest(): GameStateResponse {
        const stateDto = this.state.toDto()
        stateDto.isStatusResponse = true;

        return { game: stateDto };
    }

    // MARK: CHAT
    private processChat(data: DataDigest) {
        const { player , payload } = data;
        const chatPayload = this.validator.validateChatPayload(payload);

        if (!chatPayload)
            return this.validationErrorResponse();

        const { id, name } = player.getIdentity();
        this.state.addChatEntry({
            id,
            name,
            message: chatPayload.input,
        });

        return this.issueStateResponse(player);
    }

    // MARK: MOVE
    private processMove(data: DataDigest, isRivalShip: boolean = false) {
        const { player, payload } = data;
        const movementPayload = this.validator.validateMovementPayload(payload);

        if (!movementPayload)
            return this.validationErrorResponse();

        const target = movementPayload.zoneId;
        const locationName = this.state.getLocationName(target);

        if (isRivalShip)
            return this.processRivalMovement(target, locationName, movementPayload.position, player);

        if (!player.isDestinationValid(target) || !player.getMoves() || player.handlesRival()) {
            return this.issueErrorResponse(
                'Movement not alowed.',
                { target, moves: player.getMoves() },
            );
        }

        const hasSailed = (() => {
            player.spendMove();
            const playersInZone = this.state.getPlayersByZone(target);

            const rival = this.state.getRivalData()
            const rivalInfluence = rival.isIncluded && rival.bearings.seaZone === target
                    ? rival.influence
                    : 0;

            if ((!playersInZone.length && !rivalInfluence) || player.isPrivileged())
                return true;

            player.rollInfluence();
            const blockingPlayers = playersInZone.filter(
                p => p.influence > player.getInfluence()
            );

            if (!blockingPlayers.length && player.getInfluence() >= rivalInfluence)
                return true;

            this.state.trimInfluenceByZone(target, rivalInfluence);
            this.addServerMessage(
                `${player.getIdentity().name} was blocked from sailing. Influence at the [${locationName}] was trimmed.`
            );

            return false;
        })();

        if (hasSailed) {
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.state.getLocationName(target),
            });

            player.setAnchoredActions(this.state.getLocationActions(target));

            if (player.getMoves() > 0) {
                const nextDestinations = this.privateState.getDestinations(target);

                player.setDestinationOptions(
                    nextDestinations.filter(zone => zone !== player.getOvernightZone())
                );
            }

            if (this.state.isRivalIncluded()) {
                if (this.state.getRivalBearings()!.seaZone === player.getBearings().seaZone) {
                    this.state.enableRivalControl(this.privateState.getDestinations(target));
                    player.freeze();
                }
            }

        } else if(player.getMoves() === 0)  {
            player.setAnchoredActions([]);
            this.addServerMessage(
                `${player.getIdentity().name} also ran out of moves and cannot act further`
            );
        }

        return this.issueStateResponse(player);
    }

    private processRivalMovement(target: ZoneName, locationName: LocationName, position: Coordinates, player: PlayerHandler) {
        if (this.checkConditions([
            player.handlesRival(),
            this.state.rivalHasMoves(),
            this.state.isRivalDestinationValid(target),
        ]).err)
            return this.issueErrorResponse('Rival ship movement is illegal!', {
                player: player.toDto(), rival: this.state.getRivalData()
            });

        this.state.moveRivalShip(
            {
                seaZone: target,
                location: locationName,
                position
            },
            this.privateState.getDestinations(target),
        );

        return this.issueStateResponse(player);
    }

    // MARK: REPOSITIONING
    private processRepositioning(data: DataDigest, isRivalShip: boolean = false) {
        const { payload, player } = data;
        const repositioningPayload = this.validator.validateRepositioningPayload(payload);

        if (!repositioningPayload)
            return this.validationErrorResponse();

        const position = repositioningPayload.repositioning;

        if (isRivalShip)
            this.state.repositionRivalShip(position);
        else
            player.setBearings({...player.getBearings(), position});

        return this.issueStateResponse(player);
    }

    // MARK: FAVOR
    private processFavorSpending(data: DataDigest) {
        const { player } = data;

        if (!player.getFavor() || player.isPrivileged()) {
            return this.issueErrorResponse(
                `${player.getIdentity().name} cannot spend favor`,
                { favor: player.getFavor(), isPrivileged: player.isPrivileged() },
            );
        }

        this.addServerMessage(`${player.getIdentity().name} has spent favor`);
        player.enablePrivilege();

        return this.issueStateResponse(player);
    }

    // MARK: DROP ITEM
    private processItemDrop(data: DataDigest) {
        const payload = this.validator.validateDropItemPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;
        const result = this.unloadItem(player.getCargo(), payload.item);

        if (result.err)
            return this.issueErrorResponse(result.message, {cargo: player.getCargo()});

        player.setCargo(result.data);
        player.setTrades(this.pickFeasibleTrades(result.data));

        this.addServerMessage(`${player.getIdentity().name} ditched one ${payload.item}`);

        return this.issueStateResponse(player);
    }

    // MARK: LOAD TRADE GOOD
    private processLoadGood(data: DataDigest) {
        const payload = this.validator.validateLoadGoodPayload(data.payload);

        if (!payload)
            return this.validationErrorResponse();

        const player = data.player;

        if (!player.mayLoadGood()) {
            return this.issueErrorResponse(
                `${player.getIdentity().id} Cannot load good`,
                player.toDto(),
            );
        }

        const locationName = this.state.getLocationName(player.getBearings().seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return this.issueErrorResponse(`Cannot pick up goods from ${locationName}`);

        const localGood = serverConstants.LOCATION_GOODS[locationName as GoodsLocationName];

        if (localGood !== payload.tradeGood) {
            return this.issueErrorResponse(
                `Cannot load ${payload.tradeGood} here.`,
                {localGood, payload},
            );
        }

        const loadItem = this.loadItem(player.getCargo(), localGood);

        if (loadItem.err)
            return this.issueErrorResponse(loadItem.message);

        const removeAction = this.removeAction(player.getActions(), Action.load_good);

        if (removeAction.err)
            return this.issueErrorResponse(removeAction.message, player.getActions());

        player.setCargo(loadItem.data);
        player.clearMoves();
        player.setActions(removeAction.data);
        player.setTrades(this.pickFeasibleTrades(player.getCargo()));

        this.addServerMessage(`${player.getIdentity().name} picked up ${localGood}`);

        return this.issueStateResponse(player);
    }

    // MARK: GOODS TRADE
    private processGoodsTrade(data: DataDigest) {
        const { player, payload } = data;
        const tradePayload = this.validator.validateTradePayload(payload);

        if (!tradePayload)
            return this.validationErrorResponse();

        const { slot, location } = tradePayload;
        const {id, name} = player.getIdentity();

        if (this.checkConditions([
            player.canAct(Action.make_trade),
            player.getBearings().location == location,
            player.getTrades().includes(slot),
        ]).err) {
            return this.issueErrorResponse(`${name} cannnot trade`);
        }

        const trade = this.state.getMarketTrade(slot);

        const cargoTransfer = ((): Probable<Array<ItemName>> => {
            let cargo = player.getCargo()

            for (const tradeGood of trade.request) {
                const result = this.unloadItem(cargo, tradeGood);

                if (result.err)
                    return result;

                cargo = result.data;
            }

            return this.pass(cargo);
        })();

        if (cargoTransfer.err) {
            return this.issueErrorResponse(
                `Cannot match cargo to trade`,
                { c: player.getCargo(), t: trade.request },
            );
        }

        const actionRemoval = this.removeAction(player.getActions(), Action.make_trade);

        if (actionRemoval.err)
            return this.issueErrorResponse(actionRemoval.message, player.getActions());

        switch (location) {
            case 'market':
                const amount = trade.reward.coins + this.state.getFluctuation(slot);
                player.gainCoins(amount);
                this.addServerMessage(`${name} sold goods for ${amount} coins`);
                break;
            case 'temple':
                const reward = trade.reward.favorAndVp;
                player.gainFavor(reward);
                this.privateState.updateVictoryPoints(id, reward);
                this.addServerMessage(`${name} donated for ${reward} favor and VP`);
                console.info(this.privateState.getGameStats());
                break;
            default:
                return this.issueErrorResponse(`Unknown trade location: ${location}`);
        }

        player.setCargo(cargoTransfer.data);
        player.setActions(actionRemoval.data);
        player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: METAL PURCHASE
    // TODO: looks like it could be streamlined
    private processMetalPurchase(data: DataDigest) {
        const { player, payload } = data;
        const { name } = player.getIdentity();
        const purchasePayload = this.validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return this.validationErrorResponse();

        if (!player.mayLoadMetal())
            return this.issueErrorResponse(`Player ${name} cannot buy metals`);

        const metalCost = (() => {
            const costs = this.state.getMetalCosts();

            switch (purchasePayload.metal) {
                case 'gold': return costs.gold;
                case 'silver': return costs.silver;
                default: return null;
            }
        })();

        const playerAmount = (() => {
            switch (purchasePayload.currency) {
                case 'coins': return player.getCoinAmount()
                case 'favor': return player.getFavorAmount();
                default: return null;
            }
        })();

        if (!metalCost || !playerAmount) {
            return this.issueErrorResponse(
                `No such cost or player amount found.`,
                { currency: purchasePayload.currency, metalCost, playerAmount }
            );
        }

        const price = metalCost[purchasePayload.currency];
        const remainder = playerAmount - price;

        if (remainder < 0) {
            return this.issueErrorResponse(`Player ${name} cannot afford metal purchase`);
        }

        switch (purchasePayload.currency) {
            case 'coins':
                player.spendCoins(price);
                this.addServerMessage(`${name} bought ${purchasePayload.metal} for ${metalCost.coins} coins`);
                break;
            case 'favor':
                player.spendFavor(price)
                this.addServerMessage(`${name} bought ${purchasePayload.metal} for ${metalCost.favor} favor`);
                break;
            default:
                return this.issueErrorResponse(`Unknown currency: ${purchasePayload.currency}`);
        }

        const result = this.loadItem(player.getCargo(), purchasePayload.metal);

        if (result.err)
            return this.issueErrorResponse(result.message);

        player.setCargo(result.data);
        player.clearMoves()

        return this.issueStateResponse(player);
    }

    // MARK: DONATE METALS
    private processMetalDonation(data: DataDigest) {
        const { player, payload } = data;
        const {id, name} = player.getIdentity();
        const donationPayload = this.validator.validateMetalDonationPayload(payload);

        if (!donationPayload)
            return this.validationErrorResponse();

        if (!player.canDonateMetal(donationPayload.metal))
            return this.issueErrorResponse(`${name} cannot donate ${donationPayload.metal}`);

        const reward = donationPayload.metal === 'gold' ? 10 : 5;
        this.privateState.updateVictoryPoints(id, reward);
        this.addServerMessage(`${name} donated ${donationPayload.metal} for ${reward} VP`);
        console.info(this.privateState.getGameStats());

        const result = this.unloadItem(player.getCargo(), donationPayload.metal);

        if (result.err)
            return this.issueErrorResponse(result.message, {cargo: player.getCargo()});

        player.setCargo(result.data);
        player.clearMoves();

        const { isNewLevel, isTempleComplete } = this.state.processMetalDonation(donationPayload.metal);

        if (isTempleComplete) {
            player.clearActions();
            const result = this.compileGameResults();

            if (result.err)
                return this.issueErrorResponse('Could not conclude game session', result);

            this.addServerMessage('The temple construction is complete! Game has ended.');
            this.addServerMessage(JSON.stringify(result.data));
            this.state.registerGameEnd(result.data);

            return this.issueStateResponse(player);
        }

        if (isNewLevel) {
            const newPrices = this.privateState.drawMetalPrices();

            if (!newPrices)
                return this.issueErrorResponse('Donation could not be resolved', { newPrices, isNewLevel });

            this.state.setMetalPrices(newPrices);
            this.addServerMessage('Current temple level is complete. Metal costs increase.');
        }

        return this.issueStateResponse(player);
    }

    // MARK: END TURN
    private processEndTurn(data: DataDigest) {
        const player = data.player;
        const { turnOrder } = player.getIdentity();

        if (!player.mayEndTurn())
            return this.issueErrorResponse(`Ship is not anchored.`);

        player.deactivate();
        this.state.savePlayer(player.toDto());

        const newPlayerResult = ((): Probable<PlayerHandler> => {
            const allPlayers = this.state.getAllPlayers();
            const nextInOrder = turnOrder === allPlayers.length ? 1 : turnOrder + 1;
            const nextPlayerDto = allPlayers.find(player => player.turnOrder === nextInOrder);

            if (!nextPlayerDto)
                return this.fail('Could not find the next player');

            const nextPlayer = new PlayerHandler(nextPlayerDto);
            const { seaZone } = nextPlayer.getBearings();
            nextPlayer.activate(
                this.state.getLocationActions(seaZone),
                this.privateState.getDestinations(seaZone),
            );
            this.state.updateRival(nextPlayer.getIdentity().id);

            return this.pass(nextPlayer);
        })();

        if (newPlayerResult.err)
            return this.issueErrorResponse(newPlayerResult.message);

        const newPlayer = newPlayerResult.data;
        this.addServerMessage(`${newPlayer.getIdentity().name} is now active!`);

        return this.issueStateResponse(newPlayer);
    }

    private processRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false) {
        const rival = this.state.getRivalData();

        if (!rival.isIncluded || !rival.isControllable)
            return this.issueErrorResponse('Rival is not active!', rival);

        if (rival.moves === 2)
            return this.issueErrorResponse('Rival cannot act before moving', rival);

        this.state.concludeRivalTurn();

        const { player } = digest;
        player.unfreeze(
            this.state.getLocationActions(
                player.getBearings().seaZone,
            ),
            rival.bearings.seaZone,
        );

        if (isShiftingMarket) {

            if (this.state.getLocationName(rival.bearings.seaZone) !== 'market')
                return this.issueErrorResponse('Cannot shift market from here!', rival);

            return this.issueMarketShiftResponse(player);
        }

        return this.issueStateResponse(player);
    }

    // MARK: UPGRADE HOLD
    private processUpgrade(data: DataDigest) {
        const player = data.player;

        if (player.mayUpgradeCargo()) {
            const removeAction = this.removeAction(player.getActions(), Action.upgrade_cargo);

            if (removeAction.err)
                return this.issueErrorResponse(removeAction.message, player.getActions())

            player.spendCoins(2);
            player.addCargoSpace();
            player.setActions(removeAction.data);
            player.clearMoves();
            this.addServerMessage(`${player.getIdentity().name} upgraded their hold`);

            return this.issueStateResponse(player);
        }

        return this.issueErrorResponse(`Conditions for upgrade not met`, player.toDto());
    }

    // MARK: UTILITIES



    // MARK: removeAction
    private removeAction(actions: Array<LocationAction>, toRemove: LocationAction): Probable<Array<LocationAction>> {
        const index = actions.indexOf(toRemove);

        if (index === -1)
            return this.fail(`Action ${toRemove} does not exist in selection`);

        actions.splice(index, 1);

        return this.pass(actions);
    }

    // MARK:  pickFeasibleTrades
    private pickFeasibleTrades(cargo: Array<ItemName>): Array<MarketSlotKey> {
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

    private issueMarketShiftResponse(player: PlayerHandler) {

        const newTrade = (() => {
            const trade = this.privateState.drawTrade();

            if (trade)
                return trade;

            if (this.state.isDeckA()) {
                this.state.setLabelB();
                this.privateState.loadTradeDeck(TRADE_DECK_B);
                this.addServerMessage('Market deck B is now in play');
            }

            return this.privateState.drawTrade();
        })();

        if (!newTrade) {
            const compilation = this.compileGameResults();

            if (compilation.err)
                return this.issueErrorResponse(compilation.message);

            this.state.setGameResults(compilation.data);
            this.state.setGameStatus('ended');
            this.addServerMessage('Market deck is empty! Game has ended.');

            return this.issueStateResponse(player);
        }

        this.state.shiftMarketCards(newTrade);
        player.setTrades(this.pickFeasibleTrades(player.getCargo()));
        const activePlayerId = player.getIdentity().id;

        for (const player of this.state.getAllPlayers()) {
            if (player.id !== activePlayerId) {
                player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
                this.state.savePlayer(player);
            }
        }

        return this.issueStateResponse(player);
    }

    //  MARK: loadItem
    private loadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const filled = cargo.filter(item => item !== 'empty') as Array<ItemName>;
        const empty = cargo.filter(item => item === 'empty') as Array<ItemName>;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex === -1) {
            return this.fail('Could not find an empty slot to load item');
        }

        const metalNames: Array<ItemName> = ['gold', 'silver'];
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

    // MARK: unloadItem
    private unloadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const itemIndex = cargo.indexOf(item);

        if (itemIndex === -1)
            return this.fail('Cannot find item in cargo.');

        cargo.splice(itemIndex, 1, 'empty');

        const metals: Array<ItemName> = ['gold', 'silver'];

        if (metals.includes(item)) {
            cargo.splice(itemIndex + 1, 1, 'empty');
            this.state.returnMetal(item as Metal);
        } else {
            this.state.returnTradeGood(item as TradeGood);
        }

        return this.pass(cargo);
    }

    // MARK: compileGameResults
    private compileGameResults(): Probable<Array<PlayerCountables>> {
        const players = this.state.getAllPlayers();
        const gameStats = this.privateState.getGameStats();

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

    // MARK: startIdleChecks
    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.state.getActivePlayer();

            if (!activePlayer) {
                this.issueErrorResponse('No active player found in idle check!')
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

    // MARK: addServerMessage
    private addServerMessage(message: string): void {
        const chatEntry: ChatEntry = { id: null, name: serverName, message };
        this.state.addChatEntry(chatEntry);
    }

    // MARK: RETURN WRAPPERS

    private checkConditions(arr: Array<boolean>): Probable<true> {
        if (arr.includes(false))
            return this.fail('');
        return this.pass(true);
    }

    private validationErrorResponse(){
        return this.issueErrorResponse('Malformed request.');
    }

    private issueStateResponse(player: PlayerHandler): GameStateResponse {
        this.state.savePlayer(player.toDto());

        return { game: this.state.toDto() };
    }

    private issueErrorResponse(message: string, params?: object): ErrorResponse {
        const error = `ERROR: ${message}`;
        console.error(error, params);

        return { error };
    }

    private pass<T>(data: T): Probable<T> {
        return { data }
    }

    private fail(message: string): Probable<any> {
        return { err: true, message }
    }
}
