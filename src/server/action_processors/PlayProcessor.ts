import {
    LocationName, CommodityLocationName, Action, ItemName, MarketSlotKey, Commodity, CargoMetal, PlayerColor, Metal,
    StateResponse, PlayState, SpecialistName, DiceSix, ChatEntry, PlayerEntity, LocalAction, Unique, FeasibleTrade,
    ServerMessage, PlayerCountables, FeasiblePurchase, BubbleDeed,
    Player,
} from '~/shared_types';
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from '~/server_constants';
import {
    ActionsAndDetails, Configuration, DataDigest, Probable, ActionProcessor, StateBundle, TurnEvent, UserId, UserReference,
} from '~/server_types';
import lib from './library';
import { validator } from '../services/validation/ValidatorService';
import { BackupStateHandler } from '../state_handlers/BackupStateHandler';

const { TRADE_DECK_B, COMMODITIES_BY_LOCATION } = serverConstants;
// TODO: Reduce linecount; extract utility-like functions, move deed composition to dedicated service.
export class PlayProcessor implements Unique<ActionProcessor> {
    private idleTimeout: NodeJS.Timeout | null = null;
    private configuration: Configuration;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    private backupState: BackupStateHandler;
    private transmit: (userId: UserId, message: ServerMessage) => void;
    private broadcast: (state: PlayState) => void;

    /** @throws */
    constructor(
        stateBundle: StateBundle,
        configuration: Configuration,
        broadcastCallback: (state: PlayState) => void,
        transmitCallback: (userId: UserId, message: ServerMessage) => void,
        currentPlayerReference: UserReference,
    ) {
        const { playState, privateState, backupState } = stateBundle;
        this.configuration = configuration;
        this.playState = playState;
        this.privateState = privateState;
        this.backupState = backupState;
        this.transmit = transmitCallback;
        this.broadcast = broadcastCallback;

        const { id, color } = currentPlayerReference;
        const players = this.playState.getAllPlayers();
        const currentPlayer = players.find(p => p.color == color);

        if (!currentPlayer)
            throw new Error('Cannot find not find current player!');

        const player = new PlayerHandler(currentPlayer, id);

        if (false == player.isActivePlayer()) {
            const { seaZone } = player.getBearings();

            player.activate(
                this.privateState.getDestinations(seaZone),
                player.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
            );
        }

        this.playState.savePlayer(player.toDto());
    }

    public getState() {
        return this.playState.toDto();
    }

    public getPlayerVP(color: PlayerColor) {
        return this.privateState.getPlayerVictoryPoints(color);
    }

    public getPrivateState() {
        return this.privateState.toDto();
    }

    public getBackupState() {
        return this.backupState.getState();
    }

    // MARK: MOVE
    public move(digest: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { player, payload } = digest;
        this.preserveState(player, true);

        const movementPayload = validator.validateMovementPayload(payload);

        if (!movementPayload)
            return lib.fail(lib.validationErrorMessage());

        const { zoneId: target, position } = movementPayload;
        const locationName = this.playState.getLocationName(target);

        if (isRivalShip) {
            const mayMoveRival = lib.checkConditions([
                player.isFrozen(),
                this.playState.rivalHasMoves(),
                this.playState.isRivalDestinationValid(target),
            ]);

            if (mayMoveRival.err)
                return lib.fail('Rival ship movement is illegal!');

            this.playState.moveRivalShip(
                {
                    seaZone: target,
                    location: locationName,
                    position,
                },
                this.privateState.getDestinations(target),
            );

            return this.continueTurn(player, false);
        }

        const playerMovementLegal = player.isDestinationValid(target);
        const navigatorMevementLegal = player.isNavigator() && player.isBarrierCrossing(target);

        const playerMovementAllowed = lib.checkConditions([
            player.getMoves() > 0,
            false === player.isFrozen(),
            playerMovementLegal || navigatorMevementLegal,
        ]);

        if (playerMovementAllowed.err)
            return lib.fail('Movement not alowed.');

        const hasSailed = ((): boolean => {
            player.spendMove();

            if (player.isBarrierCrossing(target)) {
                this.privateState.addDeed({
                    context: Action.move,
                    description: `used hidden passage to reach the ${locationName}`,
                });
                player.addBubbleDeed(BubbleDeed.move);

                return true;
            }

            const playersInZone = this.playState.getPlayersByZone(target);

            const rival = this.playState.getRivalData();
            const rivalInfluence = rival.isIncluded && rival.bearings.seaZone === target ? rival.influence : 0;

            if ((!playersInZone.length && !rivalInfluence) || player.isPrivileged()) {
                player.addBubbleDeed(BubbleDeed.move);

                return true;
            }

            this.clearUndo(player);

            const influenceRoll = ((): DiceSix => {
                player.rollInfluence();
                const roll = player.getInfluence();

                if (player.getSpecialistName() === SpecialistName.temple_guard) {
                    const bumpedRoll = Math.min(roll + 1, 6) as DiceSix;
                    player.setInfluence(bumpedRoll);

                    return bumpedRoll;
                }

                return roll;
            })();

            const rivalThreshold = rivalInfluence > influenceRoll ? rivalInfluence : 0;
            const blockingOpponents = playersInZone.filter(p => p.influence > influenceRoll);
            const opponentThreshold = blockingOpponents.length ? blockingOpponents.reduce((topBlocker, player) =>
                player.influence > topBlocker.influence ? player : topBlocker,
            ).influence : 0;

            const threshold = opponentThreshold || rivalThreshold;

            if (threshold) {
                this.transmit(player.getIdentity().userId, { rolled: influenceRoll, toHit: threshold });

                this.playState.trimInfluenceByZone(target, threshold);
                player.addBubbleDeed(BubbleDeed.rollFail);

                return false;
            }

            player.addBubbleDeed(BubbleDeed.rollMove);

            return true;
        })();

        if (hasSailed) {
            player.anchorShip();
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.playState.getLocationName(target),
            });

            if (player.getMoves() > 0) {
                player.setDestinationOptions(
                    this.privateState.getDestinations(target)
                        .filter(zone => zone != player.getOvernightZone()),
                );

                if (player.isNavigator()) {
                    player.setNavigatorAccess(
                        this.privateState.getNavigatorAccess(target)
                            .filter(zone => zone != player.getOvernightZone()),
                    );
                }
            } else {
                player.setDestinationOptions([]);
                player.setNavigatorAccess([]);
            }

            if (this.playState.isRivalIncluded()) {
                if (this.playState.getRivalBearings()!.seaZone == player.getBearings().seaZone) {
                    this.playState.enableRivalControl(this.privateState.getDestinations(target));
                    player.freeze();
                    this.transmit(player.getIdentity().userId, { rivalControl: null });
                }
            }

        } else if (player.getMoves() == 0) {
            this.privateState.addDeed({
                context: TurnEvent.failed_turn,
                description: 'also being out of moves--cannot act further',
            });

            return this.endTurn(digest, false);
        }

        if(player.isHarbormaster() && player.isPrivileged())
            this.privateState.clearSpentActions();

        return this.continueTurn(player, hasSailed && !player.isFrozen());
    }

    // MARK: REPOSITION
    public reposition(data: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { payload, player } = data;
        const repositioningPayload = validator.validateRepositioningPayload(payload);

        if (!repositioningPayload)
            return lib.fail(lib.validationErrorMessage());

        const position = repositioningPayload.position;

        if (isRivalShip) {
            this.playState.repositionRivalShip(position);
            this.backupState.saveRepositioning('Neutral', position);
        }
        else {
            player.setBearings({ ...player.getBearings(), position });
            this.backupState.saveRepositioning(player.getIdentity().color, position);
        }

        return this.continueTurn(player, false);
    }

    public repositionOpponent(data: DataDigest): Probable<StateResponse> {
        const { payload, refPool } = data;
        const validation = validator.validateOpponentRepositioningPayload(payload);

        if (validation.err)
            return lib.fail(lib.validationErrorMessage());

        const { color, position: repositioning } = validation.data;

        const opponentDto = this.playState.getPlayer(color);
        const opponentId = refPool.find(r => r.color == color)?.id;

        if (!opponentDto || !opponentId)
            return lib.fail('Cannot find opponent or reference.');

        const opponent = new PlayerHandler(opponentDto, opponentId);
        opponent.setBearings({ ...opponent.getBearings(), position: repositioning });

        return this.continueTurn(opponent, false);
    }

    // MARK: FAVOR
    public spendFavor(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);

        if (!player.getFavor() || player.isPrivileged())
            return lib.fail(`${player.getIdentity().name} cannot spend favor`);

        player.enablePrivilege();
        player.addBubbleDeed(BubbleDeed.privilege);

        return this.continueTurn(player);
    }

    // MARK: DROP ITEM
    public dropItem(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.preserveState(player);

        const dropPayload = validator.validateDropItemPayload(payload);

        if (!dropPayload)
            return lib.fail(lib.validationErrorMessage());

        const { item } = dropPayload;
        const result = this.unloadItem(player.getCargo(), item);

        if (result.err)
            return lib.fail(result.message);

        player.setCargo(result.data);

        return this.continueTurn(player);
    }

    // MARK: LOAD COMMODITY
    public loadCommodity(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        const { color } = player.getIdentity();
        this.preserveState(player);

        const validPayload = validator.validateLoadCommodityPayload(payload);

        if (!validPayload)
            return lib.fail(lib.validationErrorMessage());


        const { commodity, drop } = validPayload;

        if (drop) {
            for (const item of drop) {
                const result = this.unloadItem(player.getCargo(), item);

                if (result.err)
                    return lib.fail(result.message);

                player.setCargo(result.data);
            }
        }

        if (!player.mayLoadCommodity())
            return lib.fail(`${color} Cannot load commodity`);

        const locationName = this.playState.getLocationName(player.getBearings().seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return lib.fail(`Cannot pick up commodities from ${locationName}`);

        const localCommodity = serverConstants.COMMODITIES_BY_LOCATION[locationName as CommodityLocationName];

        if (localCommodity !== commodity)
            return lib.fail(`Cannot load ${commodity} here.`);

        const loadItem = this.loadItem(player.getCargo(), localCommodity);

        if (loadItem.err)
            return lib.fail(loadItem.message);

        player.setCargo(loadItem.data);
        this.privateState.addSpentAction(Action.load_commodity);
        player.addBubbleDeed(((): BubbleDeed => {
            switch (localCommodity) {
                case 'gems': return BubbleDeed.gems;
                case 'ebony': return BubbleDeed.ebony;
                case 'linen': return BubbleDeed.linen;
                default: return BubbleDeed.marble;
            }
        })());

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return this.continueTurn(player);
    }

    // MARK: SELL
    public trade(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.clearUndo(player);
        const marketSlotPayload = validator.validateMarketPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot } = marketSlotPayload;
        const { name } = player.getIdentity();

        if (lib.checkConditions([
            player.hasAction(Action.trade_commodities),
            player.getFeasibles().map(t => t.slot).includes(slot),
        ]).err) {
            return lib.fail(`${name} cannnot sell commodities`);
        }

        const { request, reward } = this.playState.getMarketTrade(slot);
        const unloadResult = this.subtractItems(player.getCargo(), request);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const coins = reward.coins + this.playState.getFluctuation(slot);

        player.setCargo(unloadResult.data);
        player.gainCoins(coins);
        this.privateState.addSpentAction(Action.trade_commodities);

        const moneyChangerAtTemple = player.isMoneychanger() && player.getBearings().location == 'temple';

        if (moneyChangerAtTemple) {
            this.privateState.addSpentAction(Action.donate_commodities);
            this.privateState.addDeed({
                context: Action.trade_commodities,
                description: 'accessed the market to trade for coins',
            });
        }

        player.addBubbleDeed(BubbleDeed.marketCoin);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.concludeGame(player, marketShift.data.countables);

        return this.continueTurn(player);
    }

    public sellAsChancellor(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.clearUndo(player);

        const chancellorPayload = validator.validateChancellorPayload(payload);

        if(!chancellorPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot, omit } = chancellorPayload;

        const maySell = lib.checkConditions([
            player.isChancellor(),
            player.hasAction(Action.trade_as_chancellor),
            !!player.getFeasibles().find(f => f.slot == slot),
        ]);

        if (!maySell)
            return lib.fail('Conditions for chancellor sale not met.');

        const { request, reward } = this.playState.getMarketTrade(slot);
        const payable = this.subtractItems(request, omit, false);

        if(payable.err)
            return lib.fail('Ommited items are not included in request');

        const cargo = this.subtractItems(player.getCargo(), payable.data);

        if(cargo.err)
            return lib.fail(cargo.message);

        const coins = reward.coins + this.playState.getFluctuation(slot);

        player.setCargo(cargo.data);
        player.spendFavor(omit.length);
        player.gainCoins(coins);
        this.privateState.addSpentAction(Action.trade_as_chancellor);
        player.clearMoves();

        if (omit.length) {
            this.privateState.addDeed({
                context: Action.trade_as_chancellor,
                description: `spent ${omit.length} favor to trade `,
            });
        }

        player.addBubbleDeed(BubbleDeed.marketCoin);
        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.concludeGame(player, marketShift.data.countables);

        return this.continueTurn(player);
    }

    public sellAsPeddler(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.clearUndo(player);

        const peddlerPayload = validator.validatePeddlerPayload(payload);

        if (!peddlerPayload)
            return lib.fail(lib.validationErrorMessage());

        const maySell = lib.checkConditions([
            player.isPeddler(),
            player.hasAction(Action.trade_commodities),
            !!player.getFeasibles().find(t => t.slot == this.playState.getReducedValueSlot()),
        ]);

        if (!maySell)
            return lib.fail('Conditions for peddler sale not met.');

        const { omit } = peddlerPayload;
        const { request, reward } = this.playState.getMarketTrade(this.playState.getReducedValueSlot());

        const payable = this.subtractItems(request, [omit], false);

        if(payable.err)
            return lib.fail(payable.message);

        const cargo = this.subtractItems(player.getCargo(), payable.data);

        if (cargo.err)
            return lib.fail(cargo.message);

        const coinReward = reward.coins - 1;
        player.setCargo(cargo.data);
        player.gainCoins(coinReward);
        player.clearMoves();

        this.privateState.addSpentAction(Action.trade_commodities);
        this.privateState.addDeed({
            context: Action.trade_as_peddler,
            description: `saved ${omit} on the reduced value trade`,
        });

        player.addBubbleDeed(BubbleDeed.marketCoin);
        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.concludeGame(player, marketShift.data.countables);

        return this.continueTurn(player);
    }

    // MARK: DONATE
    public donateCommodities(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.clearUndo(player);
        const marketSlotPayload = validator.validateMarketPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { name, color, userId: userId } = player.getIdentity();
        const { slot } = marketSlotPayload;

        if (!player.hasAction(Action.donate_commodities))
            return lib.fail(`${name} cannot donate commodities`);

        // Transaction
        const { request, reward } = this.playState.getMarketTrade(slot);
        const unloadResult = this.subtractItems(player.getCargo(), request);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const donationReward = reward.favorAndVp;

        player.gainFavor(donationReward);
        player.setCargo(unloadResult.data);
        this.privateState.addSpentAction(Action.donate_commodities);

        if (player.isMoneychanger())
            this.privateState.addSpentAction(Action.trade_commodities);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        this.privateState.updatePlayerStats(player, donationReward);

        const count = request.length;
        this.privateState.addDeed({
            context: Action.donate_commodities,
            description: `donated ${count == 1 ? 'a commodity' : 'commodities'} for ${donationReward} favor and VP`,
        });
        player.addBubbleDeed(BubbleDeed.vpFavor);

        this.transmit(userId, { vp: this.privateState.getPlayerVictoryPoints(color) });

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.concludeGame(player, marketShift.data.countables);

        return this.continueTurn(player);
    }

    // MARK: SPECIALTY
    public sellSpecialty(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);
        const specialty = player.getSpecialty();

        if (specialty && player.maySellSpecialty()) {
            const unload = this.unloadItem(player.getCargo(), specialty);

            if (unload.err)
                return lib.fail(unload.message);

            player.setCargo(unload.data);
            player.gainCoins(1);

            if (!player.getCargo().includes(specialty))
                this.privateState.addSpentAction(Action.sell_specialty);

            if (player.isMoneychanger() && player.getBearings().location == 'temple') {
                this.privateState.addSpentAction(Action.donate_commodities);
                this.privateState.addDeed({
                    context: Action.sell_specialty,
                    description: `accessed the market and sold ${specialty} for 1 coin`,
                });
            }

            player.addBubbleDeed(BubbleDeed.coin);

            if (player.isHarbormaster())
                this.updateMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return this.continueTurn(player);
        }

        return lib.fail('Player does not meet conditions for selling specialty.');
    }

    // MARK: BUY METAL
    public buyMetal(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.preserveState(player);
        const { name } = player.getIdentity();
        const purchasePayload = validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal, currency, drop } = purchasePayload;

        if (drop) {
            for (const item of drop) {
                const result = this.unloadItem(player.getCargo(), item);

                if (result.err) return lib.fail(result.message);

                player.setCargo(result.data);
            }
        }

        if (!player.mayBuyMetal())
            return lib.fail(`Player ${name} cannot buy metals`);

        const metalCost = this.playState.getMetalCosts()[metal];
        const playerAmount = currency == 'coins' ? player.getCoinAmount() : player.getFavor();

        const price = metalCost[currency];
        const remainder = playerAmount - price;

        if (remainder < 0) {
            return lib.fail(`Player ${name} cannot afford metal purchase`);
        }

        const metalLoad = this.loadItem(player.getCargo(), metal);

        if (metalLoad.err)
            return lib.fail(metalLoad.message);

        switch (currency) {
            case 'coins':
                player.spendCoins(price);
                break;
            case 'favor':
                player.spendFavor(price);
                break;
        }

        player.setCargo(metalLoad.data);
        player.registerMetalPurchase();

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        player.addBubbleDeed(metal == 'gold' ? BubbleDeed.gold : BubbleDeed.silver);

        return this.continueTurn(player);
    }

    // MARK: DONATE METAL
    public donateMetal(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.preserveState(player);
        const { color, name } = player.getIdentity();
        const donationPayload = validator.validateMetalDonationPayload(payload);

        if (!donationPayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal } = donationPayload;

        if (!player.canDonateMetal(metal))
            return lib.fail(`${name} cannot donate ${metal}`);

        const unload = this.unloadItem(player.getCargo(), metal);

        if (unload.err)
            return lib.fail(unload.message);

        player.setCargo(unload.data);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        const reward = metal == 'gold' ? 10 : 5;
        this.privateState.updatePlayerStats(player, reward);

        const isMailing = player.isPostmaster() && player.getBearings().location != 'temple';

        this.privateState.addDeed({
            context: Action.donate_metal,
            description: `${isMailing ? 'mailed' : 'donated'} ${metal} for ${reward} VP`,
        });
        player.addBubbleDeed(BubbleDeed.metalVp);

        this.transmit(
            player.getIdentity().userId,
            { vp: this.privateState.getPlayerVictoryPoints(color) },
        );

        const { isNewLevel, isTempleComplete } = this.playState.processMetalDonation(metal);

        console.info(this.privateState.getGameStats());

        if (isTempleComplete) {
            player.deactivate();
            this.clearUndo(player);
            this.playState.savePlayer(player.toDto());

            const results = this.compileGameResults();

            if (results.err)
                return lib.fail(results.message);

            this.concludeGame(player, results.data);

            this.addServerMessage(this.convertDeedsToMessage(player), { color, backup: true });
            this.addServerMessage('The temple construction is complete! Game has ended.');

            return lib.pass({ state: this.playState.toDto() });
        }

        if (isNewLevel) {
            const newPrices = this.privateState.drawMetalPrices();

            if (!newPrices)
                return lib.fail('Donation could not be resolved');

            this.playState.setMetalPrices(newPrices);
            this.addServerMessage('Current temple level is complete. Metal costs increase.');
        }

        return this.continueTurn(player);
    }

    // MARK: END TURN
    public endTurn(data: DataDigest, isVoluntary: boolean = true): Probable<StateResponse> {
        const { player, refPool } = data;
        this.clearUndo(player);
        const { turnOrder, userId: playerId } = player.getIdentity();

        if (isVoluntary && !player.isAnchored())
            return lib.fail('Ship is not anchored.');

        if (
            player.getBearings().location == 'temple'
            && player.getSpecialistName() == SpecialistName.priest
            && isVoluntary
        ) {
            this.privateState.addDeed({
                context: Action.end_turn,
                description: 'gained 1 Favor for remaining at the temple',
            });
            player.gainFavor(1);
        }

        this.clearIdleTimeout();
        player.deactivate();
        this.privateState.clearSpentActions();
        this.privateState.updatePlayerStats(player);
        this.playState.savePlayer(player.toDto());

        if(!isVoluntary)
            this.transmit(playerId, { forceTurn: null });

        const newPlayerOperation = ((): Probable<PlayerHandler> => {
            const allPlayers = this.playState.getAllPlayers();
            const nextInOrder = turnOrder == allPlayers.length ? 1 : turnOrder + 1;
            const nextPlayerDto = allPlayers.find(player => player.turnOrder == nextInOrder);
            const { id: nextPlayerId } = refPool.find(r => r.color == nextPlayerDto?.color) || {};

            if (!nextPlayerDto || !nextPlayerId)
                return lib.fail('Could not find the next player or reference');

            const nextPlayer = new PlayerHandler(nextPlayerDto, nextPlayerId);
            const { seaZone } = nextPlayer.getBearings();

            nextPlayer.activate(
                this.privateState.getDestinations(seaZone),
                nextPlayer.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
            );

            const { color, userId } = nextPlayer.getIdentity();
            this.playState.updateRival(color);
            this.startIdleTimeout(userId);

            this.transmit(nextPlayerId, { turnStart: null });

            return lib.pass(nextPlayer);
        })();

        if (newPlayerOperation.err)
            return lib.fail(newPlayerOperation.message);

        const newPlayer = newPlayerOperation.data;

        const deeds = this.convertDeedsToMessage(player);
        const nextPlayerTurn = `It's ${newPlayer.getIdentity().name}'s turn!`;
        this.addServerMessage(
            `${deeds}\n${nextPlayerTurn}`,
            { color: player.getIdentity().color, backup: true },
        );

        return this.continueTurn(newPlayer);
    }

    // MARK: RIVAL TURN
    public endRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false): Probable<StateResponse> {
        const { player } = digest;
        const rival = this.playState.getRivalData();

        if (!rival.isIncluded)
            return lib.fail('Rival is not in the game!');

        const mayConclude = lib.checkConditions([
            rival.isControllable,
            rival.moves < 2,
            player.isFrozen(),
        ]);

        if (mayConclude.err)
            return lib.fail('Player cannot conclude rival turn');

        this.playState.concludeRivalTurn();
        const rivalLocation = this.playState.getLocationName(rival.bearings.seaZone);

        if (isShiftingMarket) {
            if (rivalLocation != 'market')
                return lib.fail('Cannot shift market from here!');

            const marketShift = this.shiftMarketCards(player);

            if (marketShift.err) return lib.fail(marketShift.message);

            player.addBubbleDeed(BubbleDeed.marketRival);

            if (marketShift.data.hasGameEnded) {
                this.concludeGame(player, marketShift.data.countables);

                return this.continueTurn(player);
            }

        } else {
            player.addBubbleDeed(BubbleDeed.rival);
        }

        this.clearUndo(player);
        player.unfreeze(rival.bearings.seaZone);

        return this.continueTurn(player);
    }

    // MARK: FORCED TURN
    public forceTurn(digest: DataDigest): Probable<StateResponse> {
        const { player, refPool } = digest;

        if (player.isActivePlayer())
            return lib.fail('Active player cannot force own turn!');

        const activePlayer = this.playState.getActivePlayer();
        const { id: userId } = refPool.find(r => r.color == activePlayer?.color) || {};

        if (!activePlayer || !userId)
            return lib.fail('Cannot find active player or userId!');

        if (!activePlayer.isIdle)
            return lib.fail('Cannot force turn on non-idle player');

        if (activePlayer.isHandlingRival)
            this.playState.concludeRivalTurn();

        this.addServerMessage(
            `${player.getIdentity().name} forced ${activePlayer.name} to end the turn.`,
            { color: player.getIdentity().color, backup: true },
        );

        return this.endTurn(
            {
                player: new PlayerHandler(activePlayer, userId),
                payload: null,
                refPool,
            },
            false,
        );
    }

    // MARK: UNDO
    public undo(digest: DataDigest): Probable<StateResponse> {
        const { player, refPool } = digest;
        const { color } = player.getIdentity();

        if (!player.mayUndo)
            return lib.fail('Previous action cannot be undone.');

        const backupOperation = this.backupState.retrieveBackup();

        if (backupOperation.err)
            return lib.fail(backupOperation.message);

        const { playState, privateState } = backupOperation.data;

        this.playState = new PlayStateHandler(this.configuration.SERVER_NAME, playState);
        this.privateState = new PrivateStateHandler(privateState);

        const revertedPlayer = playState.players.find(p => p.color == color);
        const userId = refPool.find(r => r.color == color)?.id;

        if (!revertedPlayer || !userId)
            return lib.fail('Could not find active player in backup or reference');

        this.transmit(player.getIdentity().userId, { vp: this.privateState.getPlayerVictoryPoints(color) });

        const playerHandler = new PlayerHandler(revertedPlayer, userId);

        if (this.backupState.isEmpty())
            playerHandler.disableUndo();

        return this.continueTurn(playerHandler, false);
    }

    // MARK: UPGRADE
    public upgradeCargo(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);

        if (player.mayUpgradeCargo()) {
            player.spendCoins(2);
            player.addCargoSpace();
            player.addBubbleDeed(BubbleDeed.upgrade);
            this.privateState.addSpentAction(Action.upgrade_cargo);

            if (player.isHarbormaster())
                this.updateMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return this.continueTurn(player);
        }

        return lib.fail('Conditions for upgrade not met.');
    }

    public addChat(entry: ChatEntry): StateResponse {
        this.playState.addChatEntry(entry);
        this.backupState.addChat(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateResponse {
        this.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, { backup: true });
        this.playState.updateName(player.color, newName);
        this.privateState.updatePlayerName(player.color, newName);
        this.backupState.updatePlayerName(player.color, newName);

        return { state: this.getState() };
    };

    public handleReconnection(reference: UserReference) {

        if (!reference.color)
            return;

        const player = this.getState().players.find(p => p.color == reference.color);

        if (!player)
            return lib.printError(`Could not find reconnected player. {color: ${reference.color}}`);

        this.addServerMessage(`${player.name} has rejoined the table.`, { color: player.color });

        if (player.isActive) {
            const handler = new PlayerHandler(player, reference.id);
            handler.addBubbleDeed(BubbleDeed.active);
            this.playState.savePlayer(handler.toDto());

            this.transmit(reference.id, { turnStart: null });
            this.startIdleTimeout(reference.id);
        }

        this.broadcast(this.getState());
    }

    public handleDisconnection(reference: UserReference) {

        if (!reference.color)
            return;

        const player = this.getState().players.find(p => p.color == reference.color);

        if (!player)
            return lib.printError(`Could not find disconnected player. {color: ${reference.color}}`);

        this.addServerMessage(`${player.name} has left the table.`, { color: player.color });

        if(player.isActive) {
            this.clearIdleTimeout();
            const handler = new PlayerHandler(player, reference.id);
            handler.addBubbleDeed(BubbleDeed.idle);
            this.playState.savePlayer(handler.toDto());
        }

        this.broadcast(this.getState());
    };

    // MARK: PRIVATE

    private updateMovesAsHarbormaster(harbormaster: PlayerHandler) {
        if (!harbormaster.isPrivileged() || harbormaster.getMoves() != 1)
            harbormaster.clearMoves();
    }

    private getDefaultActions(player: PlayerHandler): LocalAction[] {
        const defaultActions = this.playState.getLocalActions(player.getBearings().seaZone);
        return defaultActions;
    }

    private getSpecialistActions(player: PlayerHandler): LocalAction[] {
        const currentZone = player.getBearings().seaZone;
        const currentLocation = this.playState.getLocationName(currentZone);

        if (player.isPostmaster()) {
            const adjacentZones = this.privateState.getDestinations(currentZone);

            for (const zone of adjacentZones) {
                if (this.playState.getLocationName(zone) == 'temple')
                    return [Action.donate_metal];
            }
        }

        if (player.isMoneychanger() && currentLocation == 'temple')
            return [Action.trade_commodities, Action.sell_specialty];

        if (player.isChancellor() && currentLocation == 'market')
            return [Action.trade_as_chancellor];

        return [];
    }

    private loadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const filled = cargo.filter(item => item != 'empty') as Array<ItemName>;
        const empty = cargo.filter(item => item == 'empty') as Array<ItemName>;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex == -1)
            return lib.fail('Could not find an empty slot to load item');

        const metals: Array<ItemName> = ['gold', 'silver'];
        const supplies = this.playState.getItemSupplies();

        if (metals.includes(item)) {
            const metal = item as Metal;

            if (supplies.metals[metal] < 1)
                return lib.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] != 'empty')
                return lib.fail('Not enough empty slots for storing metal');

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;
            this.playState.removeMetal(metal);

            return lib.pass(orderedCargo);
        }

        const commodity = item as Commodity;

        if (supplies.commodities[commodity] < 1)
            return lib.fail(`No ${item} available for loading`);

        orderedCargo[emptyIndex] = item;
        this.playState.removeCommodity(commodity);

        return lib.pass(orderedCargo);
    }

    private unloadItem(pool: Array<ItemName>, item: ItemName, isPlayerCargo: boolean = true): Probable<Array<ItemName>> {
        const itemIndex = pool.indexOf(item);

        const strip = (items: Array<ItemName>, index: number, useEmpty: boolean) => {
            useEmpty
                ? items.splice(index, 1, 'empty')
                : items.splice(index, 1);
        };

        if (itemIndex === -1)
            return lib.fail(`Cannot find [${item}] in item pool!`);

        strip(pool, itemIndex, isPlayerCargo);

        const metals: Array<ItemName> = ['gold', 'silver'];

        if (metals.includes(item)) {
            strip(pool, itemIndex + 1, isPlayerCargo);
            this.playState.returnMetal(item as Metal);
        } else {
            this.playState.returnCommodity(item as Commodity);
        }

        return lib.pass(pool);
    }

    private subtractItems(
        minuend: Array<ItemName>,
        subtrahend: Array<ItemName>,
        isPlayerCargo: boolean = true,
    ): Probable<Array<ItemName>> {
        const pool = [...minuend];

        for (const item of subtrahend) {
            const subtractionResult = this.unloadItem(pool, item, isPlayerCargo);

            if (subtractionResult.err)
                return subtractionResult;
        }

        return lib.pass(pool);
    }

    private pickFeasibleTrades(player: PlayerHandler): Array<FeasibleTrade> {
        const cargo = player.getCargo();
        const market = this.playState.getMarket();
        const nonCommodities: Array<ItemName> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];
        const keys: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasible: Array<FeasibleTrade> = [];

        keys.forEach(key => {
            const unfilledCommodities = market[key].request;

            for (const item of cargo) {

                if (nonCommodities.includes(item))
                    continue;

                const carriedCommodities = item as Commodity;
                const match = unfilledCommodities.indexOf(carriedCommodities);

                if (match != -1)
                    unfilledCommodities.splice(match, 1);
            }

            switch (true) {
                case player.isPeddler() && (this.playState.getFluctuation(key) == -1) && unfilledCommodities.length < 2:
                case player.isChancellor() && (player.getFavor() - unfilledCommodities.length >= 0):
                    feasible.push({ slot: key, missing: unfilledCommodities });
                    break;

                case unfilledCommodities.length == 0:
                    feasible.push({ slot: key, missing: [] });
            }
        });

        return feasible;
    }

    private pickFeasiblePurchases(player: PlayerHandler): Array<FeasiblePurchase> {
        const { silver: silverCost, gold: goldCost } = this.playState.getMetalCosts();
        const playerCoins = player.getCoinAmount();
        const playerFavor = player.getFavor();

        const available: FeasiblePurchase[] = [];
        const { silver, gold } = this.playState.getItemSupplies().metals;

        if (silver) {
            if (playerFavor >= silverCost.favor)
                available.push({ metal: 'silver', currency: 'favor' });

            if (playerCoins >= silverCost.coins)
                available.push({ metal: 'silver', currency: 'coins' });
        }

        if (gold) {
            if (playerFavor >= goldCost.favor)
                available.push({ metal: 'gold', currency: 'favor' });

            if (playerCoins >= goldCost.coins)
                available.push({ metal: 'gold', currency: 'coins' });
        }

        return available;
    }

    private determineActionsAndDetails(player: PlayerHandler): ActionsAndDetails {
        if (!player.isAnchored() || player.isFrozen())
            return { actions: [], trades: [], purchases: [] };

        const actionsByLocation = (this.getDefaultActions(player)
            .concat(this.getSpecialistActions(player))
            .filter(a =>
                !this.privateState.getSpentActions().includes(a),
            )
        );
        const replaceableRef = ['empty', 'marble', 'ebony', 'gems', 'linen'];
        const trades = this.pickFeasibleTrades(player);
        const purchases = this.pickFeasiblePurchases(player);
        const actions = actionsByLocation.filter(action => {
            switch (action) {
                case Action.upgrade_cargo:
                    return player.getCoinAmount() >= 2 && player.getCargo().length < 4;

                case Action.trade_commodities:
                    return player.isChancellor() ? false : trades.length;

                case Action.trade_as_chancellor:
                    return trades.length;

                case Action.sell_specialty:
                    const specialty = player.getSpecialty();
                    return !!specialty && player.getCargo().includes(specialty);

                case Action.donate_commodities:
                    return (() => {
                        const templeSlot = this.playState.getTempleTradeSlot();
                        const templeFeasible = trades.find(f => f.slot == templeSlot);
                        switch (true) {
                            case player.isAdvisor():
                                return trades.length;
                            case player.isChancellor():
                                return templeFeasible?.missing.length == 0;
                            default:
                                return !!templeFeasible;
                        }
                    })();

                case Action.donate_metal:
                    return player.getCargo()
                        .filter(item => ['silver', 'gold'].includes(item))
                        .length;

                case Action.buy_metal:
                    return (
                        player.hasPurchaseAllowance()
                        && purchases.length
                        && player.getCargo().filter(
                            item => replaceableRef.includes(item),
                        ).length >= 2
                    );

                case Action.load_commodity:
                    const { location } = player.getBearings();
                    return ( // TODO: add and use constants instead of this and other examples of hardcoded values.
                        ['quarry', 'forest', 'mines', 'farms'].includes(location)
                        && (this.playState.getItemSupplies()
                            .commodities[COMMODITIES_BY_LOCATION[location as CommodityLocationName]]
                        )
                        && player.getCargo().filter(
                            item => replaceableRef.includes(item),
                        ).length >= 1
                    );
                default:
                    return false;
            }
        });

        return { actions, trades, purchases };
    }

    private compileGameResults(): Probable<Array<PlayerCountables>> {
        const players = this.playState.getAllPlayers();
        const gameStats = this.privateState.getGameStats();

        for (let i = 0; i < gameStats.length; i++) {
            const playerStat = gameStats[i];
            const player = players.find(p => p.color == playerStat.color);

            if (!player) {
                return lib.fail(`No player found for [${playerStat.color}]`);
            }

            playerStat.gold = player.cargo.filter(item => item == 'gold').length;
            playerStat.silver = player.cargo.filter(item => item == 'silver').length;
            playerStat.vp += (playerStat.gold * 5) + (playerStat.silver * 3);
            playerStat.favor = player.favor;
            playerStat.coins = player.coins;
        }

        return lib.pass(gameStats);
    }

    private shiftMarketCards(player: PlayerHandler): Probable<{ hasGameEnded: boolean, countables: PlayerCountables[] }> {
        const newTrade = (() => {
            const trade = this.privateState.drawTrade();

            if (trade)
                return trade;

            if (this.playState.isDeckA()) {
                this.playState.setLabelB();
                this.privateState.loadTradeDeck(TRADE_DECK_B);
                this.addServerMessage('Market deck B is now in play');
            }

            return this.privateState.drawTrade();
        })();

        if (!newTrade) {
            this.addServerMessage(
                this.convertDeedsToMessage(player), { color: player.getIdentity().color, backup: true },
            );
            this.clearIdleTimeout();
            const results = this.compileGameResults();

            if (results.err)
                return lib.fail(results.message);

            this.addServerMessage('Market deck is empty! Game has ended.');

            return lib.pass({ hasGameEnded: true, countables: results.data });
        }

        this.playState.shiftMarketCards(newTrade);

        return lib.pass({ hasGameEnded: false, countables: [] });
    }

    private continueTurn(player: PlayerHandler, updateActions: boolean = true): Probable<StateResponse> {
        updateActions && player.setActionsAndDetails(this.determineActionsAndDetails(player));
        this.playState.savePlayer(player.toDto());

        if (updateActions) {
            this.clearIdleTimeout();
            this.startIdleTimeout(player.getIdentity().userId);
        }

        return lib.pass({ state: this.playState.toDto() });
    }

    private startIdleTimeout(playerId: UserId): void {
        const limitMinutes = (60 * 1000) * this.configuration.PLAYER_IDLE_MINUTES;

        this.idleTimeout = setTimeout(() => {
            this.clearIdleTimeout();
            const activePlayer = this.playState.getActivePlayer();

            if (!activePlayer) {
                lib.fail('No active player found in idle check!');
                return;
            }

            activePlayer.isIdle = true;
            activePlayer.bubbleDeeds.pop();
            activePlayer.bubbleDeeds.push(BubbleDeed.idle);
            this.addServerMessage(`${activePlayer.name} is idle`);
            this.playState.savePlayer(activePlayer);

            this.transmit(playerId, { turnStart: null });
            this.broadcast(this.playState.toDto());
        }, limitMinutes);
    }

    public clearIdleTimeout() {
        this.idleTimeout && clearTimeout(this.idleTimeout);
        this.idleTimeout = null;
    }

    private addServerMessage(message: string, options?: { color?: PlayerColor, backup?: boolean}) {
        const chatEntry = this.playState.addServerMessage(message, options?.color);

        if (options?.backup)
            this.backupState.addChatEntry(chatEntry);
    }

    private preserveState(player: PlayerHandler, hasMoved: boolean = false) {
        this.privateState.setMovedPreviously(hasMoved);

        this.backupState.addState(
            { playState: this.getState(), privateState: this.getPrivateState() },
        );

        player.enableUndo();
    }

    private clearUndo(player: PlayerHandler) {
        this.backupState.wipeBackup();
        player.disableUndo();
    }

    private convertDeedsToMessage(player: PlayerHandler): string {
        const { name } = player.getIdentity();
        const deeds = this.privateState.getDeeds();
        const length = deeds.length;
        let message = `${name} `;

        if (!length)
            return message + 'has played.';

        deeds.forEach((deed, key) => {
            const { description } = deed;
            message += `${description}`;

            if (key < length - 1) message += ', ';
        });

        return `${message}.`;
    }

    private concludeGame(player: PlayerHandler, countables: Array<PlayerCountables>) {
        this.clearIdleTimeout();
        this.playState.registerGameEnd(countables);
        this.privateState.updatePlayerStats(player);
        player.deactivate();
    }
}
