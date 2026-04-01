import {
    LocationName, CommodityLocationName, Action, PlayerColor,
    StateBroadcast, PlayState, SpecialistName, DiceSix, ChatEntry, PlayerEntity, Unique,
    ServerMessage, PlayerCountables, BubbleDeed,
} from '~/shared_types';
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from '~/server_constants';
import {
    Configuration, DataDigest, Probable, ActionProcessor, StateBundle, TurnEvent, UserId, UserReference,
} from '~/server_types';
import { CargoManipulator, FeasibilityCalculator, DeedService } from './play_tools';
import lib from './library';
import { validator } from '../services/validation/ValidatorService';
import { BackupStateHandler } from '../state_handlers/BackupStateHandler';

const { TRADE_DECK_B } = serverConstants;

export class PlayProcessor implements Unique<ActionProcessor> {
    private idleTimeout: NodeJS.Timeout | null = null;
    private configuration: Configuration;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    private backupState: BackupStateHandler;
    private transmit: (userId: UserId, message: ServerMessage) => void;
    private stateBroadcast: (state: PlayState) => void;
    private broadcast: (message: ServerMessage) => void;

    /** @throws */
    constructor(
        stateBundle: StateBundle,
        configuration: Configuration,
        stateBroadcastCallback: (state: PlayState) => void,
        transmitCallback: (userId: UserId, message: ServerMessage) => void,
        broadcastCallback: (message: ServerMessage) => void,
        currentPlayerReference: UserReference,
    ) {
        const { playState, privateState, backupState } = stateBundle;
        this.configuration = configuration;
        this.playState = playState;
        this.privateState = privateState;
        this.backupState = backupState;
        this.transmit = transmitCallback;
        this.broadcast = broadcastCallback;
        this.stateBroadcast = stateBroadcastCallback;

        const { id, color } = currentPlayerReference;
        const players = this.playState.getAllPlayers();

        if (playState.hasGameEnded()) return;

        const currentPlayer = players.find(p => p.color == color);

        if (!currentPlayer) throw new Error('Cannot find not find current player!');

        const player = new PlayerHandler(currentPlayer, id);

        if (false == player.isCurrentPlayer()) {
            const { seaZone } = player.getBearings();

            player.activate(
                this.privateState.getDestinations(seaZone),
                player.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
            );
        }

        if (player.isAway()) {
            player.addBubbleDeed(BubbleDeed.idle);
            const { name, color } = player.getIdentity();
            this.addServerMessage(`${name} is currently away.`, { color });

            this.stateBroadcast(this.getState());
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
    public move(digest: DataDigest, isRivalShip: boolean = false): Probable<StateBroadcast> {
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
            const threshold = (() => {
                const influencePool = playersInZone.map(p => p.influence);

                return Math.max(...influencePool, rivalInfluence) as DiceSix;
            })();
            const influenceRoll = ((): DiceSix => {
                player.rollInfluence();
                const roll = player.getInfluence();

                if (player.getSpecialistName() == SpecialistName.temple_guard) {
                    const bumpedRoll = Math.min(roll + 1, 6) as DiceSix;
                    player.setInfluence(bumpedRoll);

                    return bumpedRoll;
                }

                return roll;
            })();

            this.broadcast({ color: player.getIdentity().color, rolled: influenceRoll, toHit: threshold });

            if (influenceRoll < threshold) {
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
                description: 'rolled to low on the second move',
            });

            return this.endTurn(digest, false);
        }

        if(player.isHarbormaster() && player.isPrivileged())
            this.privateState.clearSpentActions();

        return this.continueTurn(player, hasSailed && !player.isFrozen());
    }

    // MARK: REPOSITION
    public reposition(data: DataDigest, isRivalShip: boolean = false): Probable<StateBroadcast> {
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

        player.addBubbleDeed(BubbleDeed.active);

        return this.continueTurn(player, false);
    }

    public repositionOpponent(data: DataDigest): Probable<StateBroadcast> {
        const { payload, refPool, player } = data;
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

        this.playState.savePlayer(opponent.toDto());
        player.addBubbleDeed(BubbleDeed.active);

        return this.continueTurn(player, false);
    }

    // MARK: FAVOR
    public spendFavor(data: DataDigest): Probable<StateBroadcast> {
        const { player } = data;
        this.preserveState(player);

        if (!player.getFavor() || player.isPrivileged())
            return lib.fail(`${player.getIdentity().name} cannot spend favor`);

        player.enablePrivilege();
        player.addBubbleDeed(BubbleDeed.privilege);

        return this.continueTurn(player);
    }

    // MARK: DROP ITEM
    public dropItem(data: DataDigest): Probable<StateBroadcast> {
        const { player, payload } = data;
        this.preserveState(player);

        const dropPayload = validator.validateDropItemPayload(payload);

        if (!dropPayload)
            return lib.fail(lib.validationErrorMessage());

        const { item } = dropPayload;
        const result = CargoManipulator.unloadItem(player.getCargo(), item, this.playState);

        if (result.err)
            return lib.fail(result.message);

        player.setCargo(result.data);

        return this.continueTurn(player);
    }

    // MARK: LOAD COMMODITY
    public loadCommodity(data: DataDigest): Probable<StateBroadcast> {
        const { player, payload } = data;
        const { color } = player.getIdentity();
        this.preserveState(player);

        const validPayload = validator.validateLoadCommodityPayload(payload);

        if (!validPayload)
            return lib.fail(lib.validationErrorMessage());


        const { commodity, drop } = validPayload;

        if (drop) {
            for (const item of drop) {
                const result = CargoManipulator.unloadItem(player.getCargo(), item, this.playState);

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

        const loadItem = CargoManipulator.loadItem(player.getCargo(), localCommodity, this.playState);

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

        player.spendActionMoves();

        return this.continueTurn(player);
    }

    // MARK: SELL
    public trade(data: DataDigest): Probable<StateBroadcast> {
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
        const unloadResult = CargoManipulator.subtractItems(player.getCargo(), request, this.playState);

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

        player.spendActionMoves();

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.concludeGame(player, marketShift.data.countables);

        return this.continueTurn(player);
    }

    public sellAsChancellor(data: DataDigest): Probable<StateBroadcast> {
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
        const payable = CargoManipulator.subtractItems(request, omit, this.playState, false);

        if(payable.err)
            return lib.fail('Ommited items are not included in request');

        const cargo = CargoManipulator.subtractItems(player.getCargo(), payable.data, this.playState);

        if(cargo.err)
            return lib.fail(cargo.message);

        const coins = reward.coins + this.playState.getFluctuation(slot);

        player.setCargo(cargo.data);
        player.spendFavor(omit.length);
        player.gainCoins(coins);
        this.privateState.addSpentAction(Action.trade_as_chancellor);
        player.spendActionMoves();

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

    public sellAsPeddler(data: DataDigest): Probable<StateBroadcast> {
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

        const payable = CargoManipulator.subtractItems(request, [omit], this.playState, false);

        if(payable.err)
            return lib.fail(payable.message);

        const cargo = CargoManipulator.subtractItems(player.getCargo(), payable.data, this.playState);

        if (cargo.err)
            return lib.fail(cargo.message);

        const coinReward = reward.coins - 1;
        player.setCargo(cargo.data);
        player.gainCoins(coinReward);
        player.spendActionMoves();

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
    public donateCommodities(data: DataDigest): Probable<StateBroadcast> {
        const { player, payload } = data;
        this.clearUndo(player);
        const marketTradePayload = validator.validateMarketPayload(payload);

        if (!marketTradePayload)
            return lib.fail(lib.validationErrorMessage());

        const { name, color, userId: userId } = player.getIdentity();
        const { slot } = marketTradePayload;

        if (!player.hasAction(Action.donate_commodities))
            return lib.fail(`${name} cannot donate commodities`);

        if (this.playState.getTempleTradeSlot() != slot) {

            if (player.isAdvisor()) {
                this.privateState.addDeed({
                    context: Action.donate_commodities,
                    description: 'picked a different trade card',
                });
            } else {
                return lib.fail('Donation slot does not match temple slot');
            }
        }

        // Transaction
        const { request, reward } = this.playState.getMarketTrade(slot);
        const unloadResult = CargoManipulator.subtractItems(player.getCargo(), request, this.playState);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const donationReward = reward.favorAndVp;

        player.gainFavor(donationReward);
        player.setCargo(unloadResult.data);
        this.privateState.addSpentAction(Action.donate_commodities);

        if (player.isMoneychanger()) this.privateState.addSpentAction(Action.trade_commodities);

        player.spendActionMoves();

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
    public sellSpecialty(data: DataDigest): Probable<StateBroadcast> {
        const { player } = data;
        this.preserveState(player);
        const specialty = player.getSpecialty();

        if (specialty && player.maySellSpecialty()) {
            const unload = CargoManipulator.unloadItem(player.getCargo(), specialty, this.playState);

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

            player.spendActionMoves();

            return this.continueTurn(player);
        }

        return lib.fail('Player does not meet conditions for selling specialty.');
    }

    // MARK: BUY METAL
    public buyMetal(data: DataDigest): Probable<StateBroadcast> {
        const { player, payload } = data;
        this.preserveState(player);
        const { name } = player.getIdentity();
        const purchasePayload = validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal, currency, drop } = purchasePayload;

        if (drop) {
            for (const item of drop) {
                const result = CargoManipulator.unloadItem(player.getCargo(), item, this.playState);

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

        const metalLoad = CargoManipulator.loadItem(player.getCargo(), metal, this.playState);

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

        player.spendActionMoves();

        player.addBubbleDeed(metal == 'gold' ? BubbleDeed.gold : BubbleDeed.silver);

        return this.continueTurn(player);
    }

    // MARK: DONATE METAL
    public donateMetal(data: DataDigest): Probable<StateBroadcast> {
        const { player, payload } = data;
        this.preserveState(player);
        const { color, name } = player.getIdentity();
        const donationPayload = validator.validateMetalDonationPayload(payload);

        if (!donationPayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal } = donationPayload;

        if (!player.canDonateMetal(metal))
            return lib.fail(`${name} cannot donate ${metal}`);

        const unload = CargoManipulator.unloadItem(player.getCargo(), metal, this.playState);

        if (unload.err)
            return lib.fail(unload.message);

        player.setCargo(unload.data);

        player.spendActionMoves();

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

            this.addServerMessage(DeedService.convertToMessage(player, this.privateState), { color, backup: true });
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
    public endTurn(data: DataDigest, isVoluntary: boolean = true): Probable<StateBroadcast> {
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
            const { id: nextPlayerId } = refPool.find(
                r => r.color == nextPlayerDto?.color,
            ) || {};

            if (!nextPlayerDto || !nextPlayerId) {
                return lib.fail('Could not find the next player or reference');
            }

            this.playState.updateRival(nextPlayerDto.color);
            const nextPlayer = new PlayerHandler(nextPlayerDto, nextPlayerId);
            const { seaZone } = nextPlayer.getBearings();
            nextPlayer.activate(
                this.privateState.getDestinations(seaZone),
                nextPlayer.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
            );
            this.transmit(nextPlayerId, { turnStart: null });

            return lib.pass(nextPlayer);
        })();

        if (newPlayerOperation.err) return lib.fail(newPlayerOperation.message);

        const { data: newPlayer } = newPlayerOperation;
        const deeds = DeedService.convertToMessage(player, this.privateState);
        const nextPlayerTurn = `It's ${newPlayer.getIdentity().name}'s turn!`;
        this.addServerMessage(
            `${deeds}\n${nextPlayerTurn}`,
            { color: player.getIdentity().color, backup: true },
        );

        return this.continueTurn(newPlayer);
    }

    // MARK: RIVAL TURN
    public endRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false): Probable<StateBroadcast> {
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

        const newInfluence = Math.round(Math.random() * 6) as DiceSix || 1 ;
        this.playState.concludeRivalTurn(newInfluence);
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

        this.broadcast({ rivalRoll: newInfluence });

        this.clearUndo(player);
        player.unfreeze(rival.bearings.seaZone);

        return this.continueTurn(player);
    }

    // MARK: UNDO
    public undo(digest: DataDigest): Probable<StateBroadcast> {
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
    public upgradeCargo(data: DataDigest): Probable<StateBroadcast> {
        const { player } = data;
        this.preserveState(player);

        if (player.mayUpgradeCargo()) {
            player.spendCoins(2);
            player.addCargoSpace();
            player.addBubbleDeed(BubbleDeed.upgrade);
            this.privateState.addSpentAction(Action.upgrade_cargo);

            player.spendActionMoves();

            return this.continueTurn(player);
        }

        return lib.fail('Conditions for upgrade not met.');
    }

    public addChat(entry: ChatEntry, reference: UserReference): StateBroadcast {
        this.playState.addChatEntry(entry);
        this.backupState.addChat(entry);

        this.resetTimeoutIfCurrentPlayer(reference);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string, reference: UserReference): StateBroadcast {
        this.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, { backup: true });
        this.playState.updateName(player.color, newName);
        this.privateState.updatePlayerName(player.color, newName);
        this.backupState.updatePlayerName(player.color, newName);

        this.resetTimeoutIfCurrentPlayer(reference);

        return { state: this.getState() };
    };

    public handleReconnection(reference: UserReference) {

        if (!reference.color)
            return;

        const player = this.getState().players.find(p => p.color == reference.color);

        if (!player)
            return lib.printError(`Could not find reconnected player. {color: ${reference.color}}`);

        player.isAway = false;
        this.addServerMessage(`${player.name} has rejoined the table.`, { color: player.color });

        if (player.isCurrent) {
            const handler = new PlayerHandler(player, reference.id);
            handler.addBubbleDeed(BubbleDeed.active);
            this.playState.savePlayer(handler.toDto());
            this.transmit(reference.id, { turnStart: null });
            this.setIdleTimeout(reference.id);
        }

        this.stateBroadcast(this.getState());
    }

    public handleDisconnection(reference: UserReference) {

        if (!reference.color)
            return;

        const player = this.getState().players.find(p => p.color == reference.color);

        if (!player)
            return lib.printError(`Could not find disconnected player. {color: ${reference.color}}`);

        player.isAway = true;
        this.addServerMessage(`${player.name} has left the table.`, { color: player.color });

        if(player.isCurrent) {
            this.clearIdleTimeout();
            const handler = new PlayerHandler(player, reference.id);
            handler.addBubbleDeed(BubbleDeed.idle);
            this.playState.savePlayer(handler.toDto());
        }

        this.stateBroadcast(this.getState());
    };

    // MARK: PRIVATE

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
                DeedService.convertToMessage(player, this.privateState), { color: player.getIdentity().color, backup: true },
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

    private continueTurn(player: PlayerHandler, updateActions: boolean = true): Probable<StateBroadcast> {
        updateActions && player.setActionsAndDetails(
            FeasibilityCalculator.determineActionsAndDetails(player, this.playState, this.privateState),
        );
        this.playState.savePlayer(player.toDto());
        this.setIdleTimeout(player.getIdentity().userId);

        return lib.pass({ state: this.playState.toDto() });
    }

    private setIdleTimeout(playerId: UserId): void {
        this.clearIdleTimeout();
        const limitMinutes = (60 * 1000) * this.configuration.PLAYER_IDLE_MINUTES;

        this.idleTimeout = setTimeout(() => {
            this.clearIdleTimeout();
            const activePlayer = this.playState.getActivePlayer();

            if (!activePlayer) {
                lib.fail('No active player found in idle check!');
                return;
            }

            activePlayer.bubbleDeeds.pop();
            activePlayer.bubbleDeeds.push(BubbleDeed.idle);
            this.addServerMessage(`${activePlayer.name} is idling.`);
            this.playState.savePlayer(activePlayer);

            this.transmit(playerId, { turnStart: null });
            this.stateBroadcast(this.playState.toDto());
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

    private concludeGame(player: PlayerHandler, countables: Array<PlayerCountables>) {
        this.clearIdleTimeout();
        this.playState.registerGameEnd(countables);
        this.privateState.updatePlayerStats(player);
        player.deactivate();
    }

    private resetTimeoutIfCurrentPlayer(reference: UserReference) {
        const currentPlayer = this.playState.getActivePlayer();

        if (currentPlayer && currentPlayer.color == reference.color) {
            this.setIdleTimeout(reference.id);
            const player = new PlayerHandler(currentPlayer, reference.id);
            player.addBubbleDeed(BubbleDeed.active);
            this.playState.savePlayer(player.toDto());
        }
    }
}
