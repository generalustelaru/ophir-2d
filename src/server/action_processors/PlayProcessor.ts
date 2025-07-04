import {
    ZoneName, LocationName, Coordinates, GoodsLocationName, Action, ItemName, MarketSlotKey, TradeGood, CargoMetal,
    LocationAction, Metal, GameStateResponse,
} from '../../shared_types';
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from '../server_constants';
import { DataDigest, PlayerCountables, StateBundle } from '../server_types';
import lib, { Probable } from './library';
import { validator } from '../services/validation/ValidatorService';
import { IDLE_CHECKS } from "../configuration";

const { TRADE_DECK_B } = serverConstants;

export class PlayProcessor {
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    constructor(stateBundle: StateBundle) {
        this.playState = stateBundle.playState;
        this.privateState = stateBundle.privateState;

        if (IDLE_CHECKS)
            this.startIdleChecks();
    }

    public getState() {
        return this.playState.toDto();
    }

    // MARK: MOVE
    public processMove(digest: DataDigest, isRivalShip: boolean = false) {
        const { player, payload } = digest;

        const movementPayload = validator.validateMovementPayload(payload);

        if (!movementPayload)
            return lib.validationErrorResponse();

        const target = movementPayload.zoneId;
        const locationName = this.playState.getLocationName(target);

        if (isRivalShip)
            return this.processRivalMovement(target, locationName, movementPayload.position, player);

        if (!player.isDestinationValid(target) || !player.getMoves() || player.handlesRival()) {
            return lib.issueErrorResponse(
                'Movement not alowed.',
                { target, moves: player.getMoves() },
            );
        }

        const hasSailed = (() => {
            player.spendMove();
            const playersInZone = this.playState.getPlayersByZone(target);

            const rival = this.playState.getRivalData()
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

            this.playState.trimInfluenceByZone(target, rivalInfluence);
            this.playState.addServerMessage(
                `${player.getIdentity().name} was blocked from sailing. Influence at the [${locationName}] was trimmed.`
            );

            return false;
        })();

        if (hasSailed) {
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.playState.getLocationName(target),
            });

            player.setAnchoredActions(this.playState.getLocationActions(target));

            if (player.getMoves() > 0) {
                const nextDestinations = this.privateState.getDestinations(target);

                player.setDestinationOptions(
                    nextDestinations.filter(zone => zone !== player.getOvernightZone())
                );
            }

            if (this.playState.isRivalIncluded()) {
                if (this.playState.getRivalBearings()!.seaZone === player.getBearings().seaZone) {
                    this.playState.enableRivalControl(this.privateState.getDestinations(target));
                    player.freeze();
                }
            }

        } else if (player.getMoves() === 0) {
            player.setAnchoredActions([]);
            this.playState.addServerMessage(
                `${player.getIdentity().name} also ran out of moves and cannot act further`
            );
        }

        return this.issueStateResponse(player);
    }

    public processRivalMovement(target: ZoneName, locationName: LocationName, position: Coordinates, player: PlayerHandler) {
        if (lib.checkConditions([
            player.handlesRival(),
            this.playState.rivalHasMoves(),
            this.playState.isRivalDestinationValid(target),
        ]).err)
            return lib.issueErrorResponse('Rival ship movement is illegal!', {
                player: player.toDto(), rival: this.playState.getRivalData()
            });

        this.playState.moveRivalShip(
            {
                seaZone: target,
                location: locationName,
                position
            },
            this.privateState.getDestinations(target),
        );

        return this.issueStateResponse(player);
    }

    // MARK: REPOSITION
    public processRepositioning(data: DataDigest, isRivalShip: boolean = false) {
        const { payload, player } = data;
        const repositioningPayload = validator.validateRepositioningPayload(payload);

        if (!repositioningPayload)
            return lib.validationErrorResponse();

        const position = repositioningPayload.repositioning;

        if (isRivalShip)
            this.playState.repositionRivalShip(position);
        else
            player.setBearings({ ...player.getBearings(), position });

        return this.issueStateResponse(player);
    }

    // MARK: FAVOR
    public processFavorSpending(data: DataDigest) {
        const { player } = data;

        if (!player.getFavor() || player.isPrivileged()) {
            return lib.issueErrorResponse(
                `${player.getIdentity().name} cannot spend favor`,
                { favor: player.getFavor(), isPrivileged: player.isPrivileged() },
            );
        }

        this.playState.addServerMessage(`${player.getIdentity().name} has spent favor`);
        player.enablePrivilege();

        return this.issueStateResponse(player);
    }

    // MARK: DROP ITEM
    public processItemDrop(data: DataDigest) {
        const payload = validator.validateDropItemPayload(data.payload);

        if (!payload)
            return lib.validationErrorResponse();

        const player = data.player;
        const result = this.unloadItem(player.getCargo(), payload.item);

        if (result.err)
            return lib.issueErrorResponse(result.message, { cargo: player.getCargo() });

        player.setCargo(result.data);
        player.setTrades(this.pickFeasibleTrades(result.data));

        this.playState.addServerMessage(`${player.getIdentity().name} ditched one ${payload.item}`);

        return this.issueStateResponse(player);
    }

    // MARK: LOAD GOOD
    public processLoadGood(data: DataDigest) {
        const payload = validator.validateLoadGoodPayload(data.payload);

        if (!payload)
            return lib.validationErrorResponse();

        const player = data.player;

        if (!player.mayLoadGood()) {
            return lib.issueErrorResponse(
                `${player.getIdentity().id} Cannot load good`,
                player.toDto(),
            );
        }

        const locationName = this.playState.getLocationName(player.getBearings().seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return lib.issueErrorResponse(`Cannot pick up goods from ${locationName}`);

        const localGood = serverConstants.LOCATION_GOODS[locationName as GoodsLocationName];

        if (localGood !== payload.tradeGood) {
            return lib.issueErrorResponse(
                `Cannot load ${payload.tradeGood} here.`,
                { localGood, payload },
            );
        }

        const loadItem = this.loadItem(player.getCargo(), localGood);

        if (loadItem.err)
            return lib.issueErrorResponse(loadItem.message);

        const removeAction = this.removeAction(player.getActions(), Action.load_good);

        if (removeAction.err)
            return lib.issueErrorResponse(removeAction.message, player.getActions());

        player.setCargo(loadItem.data);
        player.clearMoves();
        player.setActions(removeAction.data);
        player.setTrades(this.pickFeasibleTrades(player.getCargo()));

        this.playState.addServerMessage(`${player.getIdentity().name} picked up ${localGood}`);

        return this.issueStateResponse(player);
    }

    // MARK: TRADE
    public processGoodsTrade(data: DataDigest) {
        const { player, payload } = data;
        const tradePayload = validator.validateTradePayload(payload);

        if (!tradePayload)
            return lib.validationErrorResponse();

        const { slot, location } = tradePayload;
        const { id, name } = player.getIdentity();

        if (lib.checkConditions([
            player.canAct(Action.make_trade),
            player.getBearings().location == location,
            player.getTrades().includes(slot),
        ]).err) {
            return lib.issueErrorResponse(`${name} cannnot trade`);
        }

        const trade = this.playState.getMarketTrade(slot);

        const cargoTransfer = ((): Probable<Array<ItemName>> => {
            let cargo = player.getCargo()

            for (const tradeGood of trade.request) {
                const result = this.unloadItem(cargo, tradeGood);

                if (result.err)
                    return result;

                cargo = result.data;
            }

            return lib.pass(cargo);
        })();

        if (cargoTransfer.err) {
            return lib.issueErrorResponse(
                `Cannot match cargo to trade`,
                { c: player.getCargo(), t: trade.request },
            );
        }

        const actionRemoval = this.removeAction(player.getActions(), Action.make_trade);

        if (actionRemoval.err)
            return lib.issueErrorResponse(actionRemoval.message, player.getActions());

        switch (location) {
            case 'market':
                const amount = trade.reward.coins + this.playState.getFluctuation(slot);
                player.gainCoins(amount);
                this.playState.addServerMessage(`${name} sold goods for ${amount} coins`);
                break;
            case 'temple':
                const reward = trade.reward.favorAndVp;
                player.gainFavor(reward);
                this.privateState.updateVictoryPoints(id, reward);
                this.playState.addServerMessage(`${name} donated for ${reward} favor and VP`);
                console.info(this.privateState.getGameStats());
                break;
            default:
                return lib.issueErrorResponse(`Unknown trade location: ${location}`);
        }

        player.setCargo(cargoTransfer.data);
        player.setActions(actionRemoval.data);
        player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: BUY METAL
    // TODO: looks like it could be streamlined
    public processMetalPurchase(data: DataDigest) {
        const { player, payload } = data;
        const { name } = player.getIdentity();
        const purchasePayload = validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return lib.validationErrorResponse();

        if (!player.mayLoadMetal())
            return lib.issueErrorResponse(`Player ${name} cannot buy metals`);

        const metalCost = (() => {
            const costs = this.playState.getMetalCosts();

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
            return lib.issueErrorResponse(
                `No such cost or player amount found.`,
                { currency: purchasePayload.currency, metalCost, playerAmount }
            );
        }

        const price = metalCost[purchasePayload.currency];
        const remainder = playerAmount - price;

        if (remainder < 0) {
            return lib.issueErrorResponse(`Player ${name} cannot afford metal purchase`);
        }

        switch (purchasePayload.currency) {
            case 'coins':
                player.spendCoins(price);
                this.playState.addServerMessage(`${name} bought ${purchasePayload.metal} for ${metalCost.coins} coins`);
                break;
            case 'favor':
                player.spendFavor(price)
                this.playState.addServerMessage(`${name} bought ${purchasePayload.metal} for ${metalCost.favor} favor`);
                break;
            default:
                return lib.issueErrorResponse(`Unknown currency: ${purchasePayload.currency}`);
        }

        const result = this.loadItem(player.getCargo(), purchasePayload.metal);

        if (result.err)
            return lib.issueErrorResponse(result.message);

        player.setCargo(result.data);
        player.clearMoves()

        return this.issueStateResponse(player);
    }

    // MARK: DONATE
    public processMetalDonation(data: DataDigest) {
        const { player, payload } = data;
        const { id, name } = player.getIdentity();
        const donationPayload = validator.validateMetalDonationPayload(payload);

        if (!donationPayload)
            return lib.validationErrorResponse();

        if (!player.canDonateMetal(donationPayload.metal))
            return lib.issueErrorResponse(`${name} cannot donate ${donationPayload.metal}`);

        const reward = donationPayload.metal === 'gold' ? 10 : 5;
        this.privateState.updateVictoryPoints(id, reward);
        this.playState.addServerMessage(`${name} donated ${donationPayload.metal} for ${reward} VP`);
        console.info(this.privateState.getGameStats());

        const result = this.unloadItem(player.getCargo(), donationPayload.metal);

        if (result.err)
            return lib.issueErrorResponse(result.message, { cargo: player.getCargo() });

        player.setCargo(result.data);
        player.clearMoves();

        const { isNewLevel, isTempleComplete } = this.playState.processMetalDonation(donationPayload.metal);

        if (isTempleComplete) {
            player.clearActions();
            const result = this.compileGameResults();

            if (result.err)
                return lib.issueErrorResponse('Could not conclude game session', result);

            this.playState.addServerMessage('The temple construction is complete! Game has ended.');
            this.playState.addServerMessage(JSON.stringify(result.data));
            this.playState.registerGameEnd(result.data);

            return this.issueStateResponse(player);
        }

        if (isNewLevel) {
            const newPrices = this.privateState.drawMetalPrices();

            if (!newPrices)
                return lib.issueErrorResponse('Donation could not be resolved', { newPrices, isNewLevel });

            this.playState.setMetalPrices(newPrices);
            this.playState.addServerMessage('Current temple level is complete. Metal costs increase.');
        }

        return this.issueStateResponse(player);
    }

    // MARK: END TURN
    public processEndTurn(data: DataDigest) {
        const player = data.player;
        const { turnOrder } = player.getIdentity();

        if (!player.mayEndTurn())
            return lib.issueErrorResponse(`Ship is not anchored.`);

        player.deactivate();
        this.playState.savePlayer(player.toDto());

        const newPlayerResult = ((): Probable<PlayerHandler> => {
            const allPlayers = this.playState.getAllPlayers();
            const nextInOrder = turnOrder === allPlayers.length ? 1 : turnOrder + 1;
            const nextPlayerDto = allPlayers.find(player => player.turnOrder === nextInOrder);

            if (!nextPlayerDto)
                return lib.fail('Could not find the next player');

            const nextPlayer = new PlayerHandler(nextPlayerDto);
            const { seaZone } = nextPlayer.getBearings();
            nextPlayer.activate(
                this.playState.getLocationActions(seaZone),
                this.privateState.getDestinations(seaZone),
            );
            this.playState.updateRival(nextPlayer.getIdentity().id);

            return lib.pass(nextPlayer);
        })();

        if (newPlayerResult.err)
            return lib.issueErrorResponse(newPlayerResult.message);

        const newPlayer = newPlayerResult.data;
        this.playState.addServerMessage(`${newPlayer.getIdentity().name} is now active!`);

        return this.issueStateResponse(newPlayer);
    }

    public processRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false) {
        const rival = this.playState.getRivalData();

        if (!rival.isIncluded || !rival.isControllable)
            return lib.issueErrorResponse('Rival is not active!', rival);

        if (rival.moves === 2)
            return lib.issueErrorResponse('Rival cannot act before moving', rival);

        this.playState.concludeRivalTurn();

        const { player } = digest;
        player.unfreeze(
            this.playState.getLocationActions(
                player.getBearings().seaZone,
            ),
            rival.bearings.seaZone,
        );

        if (isShiftingMarket) {

            if (this.playState.getLocationName(rival.bearings.seaZone) !== 'market')
                return lib.issueErrorResponse('Cannot shift market from here!', rival);

            return this.issueMarketShiftResponse(player);
        }

        return this.issueStateResponse(player);
    }

    // MARK: UPGRADE
    public processUpgrade(data: DataDigest) {
        const player = data.player;

        if (player.mayUpgradeCargo()) {
            const removeAction = this.removeAction(player.getActions(), Action.upgrade_cargo);

            if (removeAction.err)
                return lib.issueErrorResponse(removeAction.message, player.getActions())

            player.spendCoins(2);
            player.addCargoSpace();
            player.setActions(removeAction.data);
            player.clearMoves();
            this.playState.addServerMessage(`${player.getIdentity().name} upgraded their hold`);

            return this.issueStateResponse(player);
        }

        return lib.issueErrorResponse(`Conditions for upgrade not met`, player.toDto());
    }

    public processChat(data: DataDigest) {
        const { player, payload } = data;
        const chatPayload = validator.validateChatPayload(payload);

        if (!chatPayload)
            return lib.validationErrorResponse();

        const { id, name } = player.getIdentity();

        this.playState.addChatEntry({
            id,
            name,
            message: chatPayload.input,
        });

        return this.issueStateResponse(player);
    }

    // MARK: PRIVATE

    private removeAction(actions: Array<LocationAction>, toRemove: LocationAction): Probable<Array<LocationAction>> {
        const index = actions.indexOf(toRemove);

        if (index === -1)
            return lib.fail(`Action ${toRemove} does not exist in selection`);

        actions.splice(index, 1);

        return lib.pass(actions);
    }

    private loadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const filled = cargo.filter(item => item !== 'empty') as Array<ItemName>;
        const empty = cargo.filter(item => item === 'empty') as Array<ItemName>;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex === -1) {
            return lib.fail('Could not find an empty slot to load item');
        }

        const metalNames: Array<ItemName> = ['gold', 'silver'];
        const supplies = this.playState.getItemSupplies();

        if (metalNames.includes(item)) {

            if (supplies.metals[item as Metal] < 1)
                return lib.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] !== 'empty')
                return lib.fail(`Not enough empty slots for storing metal`);

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;
            this.playState.removeMetal(item as Metal);

            return lib.pass(orderedCargo);
        }

        const tradeGood = item as TradeGood;

        if (supplies.goods[tradeGood] < 1)
            return lib.fail(`No ${item} available for loading`);

        orderedCargo[emptyIndex] = item;
        this.playState.removeTradeGood(tradeGood);

        return lib.pass(orderedCargo);
    }

    private unloadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const itemIndex = cargo.indexOf(item);

        if (itemIndex === -1)
            return lib.fail('Cannot find item in cargo.');

        cargo.splice(itemIndex, 1, 'empty');

        const metals: Array<ItemName> = ['gold', 'silver'];

        if (metals.includes(item)) {
            cargo.splice(itemIndex + 1, 1, 'empty');
            this.playState.returnMetal(item as Metal);
        } else {
            this.playState.returnTradeGood(item as TradeGood);
        }

        return lib.pass(cargo);
    }

    private pickFeasibleTrades(cargo: Array<ItemName>): Array<MarketSlotKey> {
        const market = this.playState.getMarket();
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

    private compileGameResults(): Probable<Array<PlayerCountables>> {
        const players = this.playState.getAllPlayers();
        const gameStats = this.privateState.getGameStats();

        for (let i = 0; i < gameStats.length; i++) {
            const playerStat = gameStats[i];
            const player = players.find(p => p.id === playerStat.id);

            if (!player) {
                return lib.fail(`No player found for ${playerStat.id}`);
            }

            playerStat.gold = player.cargo.filter(item => item === 'gold').length;
            playerStat.silver = player.cargo.filter(item => item === 'silver').length;
            playerStat.vp += (playerStat.gold * 5) + (playerStat.silver * 3);
            playerStat.favor = player.favor;
            playerStat.coins = player.coins;
        }

        return lib.pass(gameStats);
    }

    private issueMarketShiftResponse(player: PlayerHandler) {

        const newTrade = (() => {
            const trade = this.privateState.drawTrade();

            if (trade)
                return trade;

            if (this.playState.isDeckA()) {
                this.playState.setLabelB();
                this.privateState.loadTradeDeck(TRADE_DECK_B);
                this.playState.addServerMessage('Market deck B is now in play');
            }

            return this.privateState.drawTrade();
        })();

        if (!newTrade) {
            const compilation = this.compileGameResults();

            if (compilation.err)
                return lib.issueErrorResponse(compilation.message);

            this.playState.registerGameEnd(compilation.data);
            this.playState.addServerMessage('Market deck is empty! Game has ended.');

            return this.issueStateResponse(player);
        }

        this.playState.shiftMarketCards(newTrade);
        player.setTrades(this.pickFeasibleTrades(player.getCargo()));
        const activePlayerId = player.getIdentity().id;

        for (const player of this.playState.getAllPlayers()) {
            if (player.id !== activePlayerId) {
                player.feasibleTrades = this.pickFeasibleTrades(player.cargo);
                this.playState.savePlayer(player);
            }
        }

        return this.issueStateResponse(player);
    }

    private issueStateResponse(player: PlayerHandler): GameStateResponse {
        this.playState.savePlayer(player.toDto());

        return { state: this.playState.toDto() };
    }

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.playState.getActivePlayer();

            if (!activePlayer) {
                lib.issueErrorResponse('No active player found in idle check!')
                return;
            }

            const timeNow = Date.now();

            if (timeNow - activePlayer.timeStamp > 60000 && !activePlayer.isIdle) {
                activePlayer.isIdle = true;
                this.playState.savePlayer(activePlayer);
                this.playState.addServerMessage(`${activePlayer.name} is idle`);
                // TODO: broadcast a state update on this, remove client status check, convert kick button to end turn for the idler
                // this.processEndTurn(activePlayer.id);
            }

        }, 60000);
    }

    public killIdleChecks() {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
    }
}