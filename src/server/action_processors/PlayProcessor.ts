import {
    LocationName, GoodsLocationName, Action, ItemName, MarketSlotKey, TradeGood, CargoMetal, PlayerColor, Metal,
    StateResponse, PlayState, SpecialistName, DiceSix, ChatEntry, PlayerEntity, LocalAction, MetalPurchasePayload,
    Unique, FeasibleTrade,
} from '~/shared_types';
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from '~/server_constants';
import {
    ActionsAndDetails, DataDigest, PlayerCountables, Probable, SessionProcessor, StateBundle, TurnEvent,
} from '~/server_types';
import lib from './library';
import { validator } from '../services/validation/ValidatorService';
import { SERVER_NAME, IDLE_CHECKS, IDLE_TIMEOUT } from '../configuration';
import { BackupStateHandler } from '../state_handlers/BackupStateHandler';

const { TRADE_DECK_B, LOCATION_GOODS } = serverConstants;

export class PlayProcessor implements Unique<SessionProcessor> {
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    private backupState: BackupStateHandler;
    private autoBroadcast: (state: PlayState) => void;
    private transmitTurnNotification: (socketId: string) => void;
    private transmitForceTurnNotification: (socketId: string) => void;
    private transmitRivalControlNotification: (socketId: string) => void;

    private transmitVp: (vp: number, socketId: string) => void;

    /** @throws */
    constructor(
        stateBundle: StateBundle,
        broadcastCallback: (state: PlayState) => void,
        transmitTurnNotification: (socketId: string) => void,
        transmitForceTurnNotification: (socketId: string) => void,
        transmitRivalControlNotification: (socketId: string) => void,
        transmitVp: (vp: number, socketId: string) => void,
    ) {
        const { playState, privateState, backupState } = stateBundle;

        this.playState = playState;
        this.privateState = privateState;
        this.backupState = backupState;
        this.autoBroadcast = broadcastCallback;
        this.transmitTurnNotification = transmitTurnNotification;
        this.transmitForceTurnNotification = transmitForceTurnNotification;
        this.transmitRivalControlNotification = transmitRivalControlNotification;
        this.transmitVp = transmitVp;

        const players = this.playState.getAllPlayers();
        const activePlayer = players.find(p => p.isActive === true);
        const firstPlayer = players.find(p => p.turnOrder === 1);

        if (privateState.getGameStats().find(stat => { stat.vp != 0; })) {
            for (const stat of privateState.getGameStats()) {
                const player = players.find(p => p.color === stat.color);
                player && this.transmitVp(this.privateState.getPlayerVictoryPoints(player.color), player.socketId);
            }
        }

        if (!firstPlayer)
            throw new Error('Could not find the first player!');

        const player = new PlayerHandler(activePlayer || firstPlayer);
        const { seaZone } = player.getBearings();

        !activePlayer && player.activate(
            this.privateState.getDestinations(seaZone),
            player.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
        );
        this.playState.savePlayer(player.toDto());

        this.transmitTurnNotification(player.getIdentity().socketId);

        if (IDLE_CHECKS && IDLE_TIMEOUT)
            this.startIdleChecks();
    }

    public getState() {
        return this.playState.toDto();
    }

    public getPrivateState() {
        return this.privateState.toDto();
    }

    public getBackupState() {
        return this.backupState.getState();
    }

    // MARK: MOVE
    public move(digest: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { player, payload, action } = digest;
        this.preserveState(player);

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

            return lib.pass(this.saveAndReturn(player));
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
                    context: action,
                    description: `used hidden passage to reach the ${locationName}`,
                });

                return true;
            }

            const playersInZone = this.playState.getPlayersByZone(target);

            const rival = this.playState.getRivalData();
            const rivalInfluence = rival.isIncluded && rival.bearings.seaZone === target
                ? rival.influence
                : 0;

            if ((!playersInZone.length && !rivalInfluence) || player.isPrivileged()) {
                this.privateState.addDeed({ context: action, description: `sailed to the ${locationName}` });

                return true;
            }

            this.wipeState(player);

            const influenceRoll = ((): DiceSix => {
                player.rollInfluence();
                const roll = player.getInfluence();

                if (player.getSpecialistName() === SpecialistName.temple_guard) {
                    const bumpedRoll = roll + 1 as DiceSix;
                    player.setInfluence(bumpedRoll);

                    return bumpedRoll;
                }

                return roll;
            })();

            const blockingPlayers = playersInZone.filter(p => p.influence > influenceRoll);

            if (!blockingPlayers.length && influenceRoll >= rivalInfluence) {
                this.privateState.addDeed({
                    context: action,
                    description: `exerted influence to reach the ${locationName}`,
                });

                return true;
            }

            this.playState.trimInfluenceByZone(target, rivalInfluence);
            this.privateState.addDeed({
                context: TurnEvent.failed_move,
                description: `was blocked from sailing towards the ${locationName}`,
            });

            return false;
        })();

        if (hasSailed) {
            player.anchorShip();
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.playState.getLocationName(target),
            });
            player.setActionsAndDetails(this.determineActionsAndDetails(player));

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
                if (this.playState.getRivalBearings()!.seaZone === player.getBearings().seaZone) {
                    this.playState.enableRivalControl(this.privateState.getDestinations(target));
                    this.privateState.addDeed({
                        context: TurnEvent.rival_handling,
                        description: 'took control of the rival ship',
                    });
                    player.freeze();
                    this.transmitRivalControlNotification(player.getIdentity().socketId);
                }
            }

        } else if (player.getMoves() === 0) {
            this.privateState.addDeed({
                context: TurnEvent.failed_turn,
                description: 'also being out of moves--cannot act further',
            });
            this.endTurn(digest, false);
        }

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: REPOSITION
    public reposition(data: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { payload, player } = data;
        const repositioningPayload = validator.validateRepositioningPayload(payload);

        if (!repositioningPayload)
            return lib.fail(lib.validationErrorMessage());

        const position = repositioningPayload.repositioning;

        if (isRivalShip) {
            this.playState.repositionRivalShip(position);
            this.backupState.saveRepositioning('Neutral', position);
        }
        else {
            player.setBearings({ ...player.getBearings(), position });
            this.backupState.saveRepositioning(player.getIdentity().color, position);
        }

        return lib.pass(this.saveAndReturn(player));
    }

    public repositionOpponent(data: DataDigest): Probable<StateResponse> {
        const { payload } = data;
        const validation = validator.validateOpponentRepositioningPayload(payload);

        if (validation.err)
            return lib.fail(lib.validationErrorMessage());

        const { color, repositioning } = validation.data;

        try { // TODO: since PlayerHadler can now throw, check and adapt the other instances.
            const opponent = new PlayerHandler(this.playState.getPlayer(color));
            opponent.setBearings({ ...opponent.getBearings(), position: repositioning });

            return lib.pass(this.saveAndReturn(opponent));
        } catch (error) {

            return lib.fail('Cannot find opponent in state.');
        }
    }

    // MARK: FAVOR
    public spendFavor(data: DataDigest): Probable<StateResponse> {
        const { player, action } = data;
        this.preserveState(player);

        if (!player.getFavor() || player.isPrivileged())
            return lib.fail(`${player.getIdentity().name} cannot spend favor`);

        player.enablePrivilege();
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        this.privateState.addDeed({ context: action, description: 'spent favor to obtain privileges' });

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DROP ITEM
    public dropItem(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
        this.preserveState(player);

        const dropPayload = validator.validateDropItemPayload(payload);

        if (!dropPayload)
            return lib.fail(lib.validationErrorMessage());

        const { item } = dropPayload;
        const result = this.unloadItem(player.getCargo(), item);

        if (result.err)
            return lib.fail(result.message);

        player.setCargo(result.data);
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        this.privateState.addDeed({ context: action, description: `ditched ${item} from cargo` });

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: LOAD GOOD
    public loadGood(data: DataDigest): Probable<StateResponse> {
        const { action, payload, player } = data;
        const { color } = player.getIdentity();
        this.preserveState(player);

        const loadGoodPayload = validator.validateLoadGoodPayload(payload);

        if (!loadGoodPayload)
            return lib.fail(lib.validationErrorMessage());

        const { tradeGood } = loadGoodPayload;
        if (!player.mayLoadGood())
            return lib.fail(`${color} Cannot load good`);

        const locationName = this.playState.getLocationName(player.getBearings().seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return lib.fail(`Cannot pick up goods from ${locationName}`);

        const localGood = serverConstants.LOCATION_GOODS[locationName as GoodsLocationName];

        if (localGood !== tradeGood)
            return lib.fail(`Cannot load ${tradeGood} here.`);

        const loadItem = this.loadItem(player.getCargo(), localGood);

        if (loadItem.err)
            return lib.fail(loadItem.message);

        player.setCargo(loadItem.data);
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        player.removeAction(Action.load_good);
        this.privateState.addDeed({ context: action, description: `picked up ${localGood}` });

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: SELL
    public sellGoods(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
        this.wipeState(player);
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot } = marketSlotPayload;
        const { name } = player.getIdentity();

        if (lib.checkConditions([
            player.hasAction(Action.sell_goods),
            player.getTrades().map(t => t.slot).includes(slot),
        ]).err) {
            return lib.fail(`${name} cannnot sell goods`);
        }

        const trade = this.playState.getMarketTrade(slot);
        const unloadResult = this.subtractTradeGoods(player.getCargo(), trade.request);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const reward = trade.reward.coins + this.playState.getFluctuation(slot);

        player.setCargo(unloadResult.data);
        player.gainCoins(reward);
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        player.removeAction(Action.sell_goods);

        const coinForm = reward === 1 ? 'coin' : 'coins';
        const moneyChangerAtTemple = player.isMoneychanger() && player.getBearings().location === 'temple';
        this.privateState.addDeed({
            context: action,
            description: (
                `${moneyChangerAtTemple ? 'accessed the market and ' : ''}`
                + `traded for ${reward === 0 ? 'naught' : `${reward} ${coinForm}`}`
            ),
        });

        if (moneyChangerAtTemple)
            player.removeAction(Action.donate_goods);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.playState.registerGameEnd(marketShift.data.countables);

        return lib.pass(this.saveAndReturn(player));
    }

    public sellAsChancellor(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
        this.wipeState(player);

        if (player.getSpecialist().name != SpecialistName.chancellor)
            return lib.fail('Only chancellor may sell favor as goods.');

        const chancellorPayload = validator.validateChancellorPurchasePayload(payload);

        if(!chancellorPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot, omit } = chancellorPayload;

        const favor = player.getFavor();

        if (favor < omit.length)
            return lib.fail('Not enough favor to substitute ommisions');

        const trade = this.playState.getMarketTrade(slot);
        const payable = this.subtractTradeGoods(trade.request, omit, false);

        if(payable.err)
            return lib.fail('Ommited items are not included in request');

        const cargo = this.subtractTradeGoods(player.getCargo(), payable.data);

        if(cargo.err)
            return lib.fail(cargo.message);

        const reward = trade.reward.coins + this.playState.getFluctuation(slot);

        player.setCargo(cargo.data);
        player.spendFavor(omit.length);
        player.gainCoins(reward);
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        player.removeAction(Action.sell_as_chancellor);
        player.clearMoves();

        const coinForm = reward === 1 ? 'coin' : 'coins';
        this.privateState.addDeed({
            context: action,
            description: (
                omit.length ? `spent ${omit.length} favor and ` : ''
                + `traded for ${reward === 0 ? 'naught' : `${reward} ${coinForm}`}`),
        });

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.playState.registerGameEnd(marketShift.data.countables);

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DONATE
    public donateGoods(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
        this.wipeState(player);
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { name, color, socketId } = player.getIdentity();
        const { slot } = marketSlotPayload;

        if (!player.hasAction(Action.donate_goods))
            return lib.fail(`${name} cannot donate goods`);

        // Transaction
        const trade = this.playState.getMarketTrade(slot);
        const unloadResult = this.subtractTradeGoods(player.getCargo(), trade.request);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const reward = trade.reward.favorAndVp;

        player.gainFavor(reward);
        player.setCargo(unloadResult.data);
        player.setActionsAndDetails(this.determineActionsAndDetails(player));
        player.removeAction(Action.donate_goods);

        if (player.isMoneychanger())
            player.removeAction(Action.sell_goods);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        this.privateState.updatePlayerStats(player, reward);
        this.privateState.addDeed({ context: action, description: `donated goods for ${reward} favor and VP` });
        console.info(this.privateState.getGameStats());

        this.transmitVp(this.privateState.getPlayerVictoryPoints(color), socketId);

        const marketShift = this.shiftMarketCards(player);

        if (marketShift.err)
            return lib.fail(marketShift.message);

        if (marketShift.data.hasGameEnded)
            this.playState.registerGameEnd(marketShift.data.countables);

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: SPECIALTY
    public sellSpecialty(data: DataDigest): Probable<StateResponse> {
        const { player, action } = data;
        this.preserveState(player);
        const specialty = player.getSpecialty();

        if (specialty && player.maySellSpecialtyGood()) {
            const unload = this.unloadItem(player.getCargo(), specialty);

            if (unload.err)
                return lib.fail(unload.message);

            player.setCargo(unload.data);
            player.gainCoins(1);
            player.setActionsAndDetails(this.determineActionsAndDetails(player));

            if (!player.getCargo().includes(specialty))
                player.removeAction(Action.sell_specialty);

            if (player.isMoneychanger() && player.getBearings().location === 'temple') {
                player.removeAction(Action.donate_goods);
                this.privateState.addDeed({
                    context: action,
                    description: `accessed the market and sold ${specialty} for 1 coin`,
                });
            } else {
                this.privateState.addDeed({ context: action, description: `sold ${specialty} for 1 coin` });
            }

            if (player.isHarbormaster())
                this.updateMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return lib.pass(this.saveAndReturn(player));
        }

        return lib.fail('Player does not meet conditions for selling specialty good.');
    }

    // MARK: BUY METAL
    public buyMetal(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
        this.preserveState(player);
        const { name } = player.getIdentity();
        const purchasePayload = validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal, currency } = purchasePayload;

        if (!player.mayBuyMetal())
            return lib.fail(`Player ${name} cannot buy metals`);

        const metalCost = this.playState.getMetalCosts()[metal];
        const playerAmount = currency === 'coins' ? player.getCoinAmount() : player.getFavor();

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
        player.setActionsAndDetails(this.determineActionsAndDetails(player));

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        this.privateState.addDeed({
            context: action,
            description: `bought ${metal} for ${metalCost[currency]} ${currency}`,
        });

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DONATE METAL
    public donateMetal(data: DataDigest): Probable<StateResponse> {
        const { player, action, payload } = data;
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

        const reward = metal === 'gold' ? 10 : 5;
        this.privateState.updatePlayerStats(player, reward);

        if (player.isPostmaster() && player.getBearings().location != 'temple') {
            this.privateState.addDeed({ context: action, description: `mailed ${metal} for ${reward} VP` });
        } else {
            this.privateState.addDeed({ context: action, description: `donated ${metal} for ${reward} VP` });
        }

        this.transmitVp(
            this.privateState.getPlayerVictoryPoints(color),
            player.getIdentity().socketId,
        );

        const { isNewLevel, isTempleComplete } = this.playState.processMetalDonation(metal);

        console.info(this.privateState.getGameStats());

        if (isTempleComplete) {
            this.killIdleChecks();
            this.addServerMessage(this.convertDeedsToMessage(player), color);
            player.deactivate();
            this.playState.savePlayer(player.toDto());

            const results = this.compileGameResults();

            if (results.err)
                return lib.fail(results.message);

            this.playState.registerGameEnd(results.data);
            this.addServerMessage('The temple construction is complete! Game has ended.');
            this.addServerMessage(JSON.stringify(results.data));

            return lib.pass({ state: this.playState.toDto() });
        }

        if (isNewLevel) {
            const newPrices = this.privateState.drawMetalPrices();

            if (!newPrices)
                return lib.fail('Donation could not be resolved');

            this.playState.setMetalPrices(newPrices);
            this.addServerMessage('Current temple level is complete. Metal costs increase.');
        }

        player.setActionsAndDetails(this.determineActionsAndDetails(player));

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: END TURN
    public endTurn(data: DataDigest, isVoluntary: boolean = true): Probable<StateResponse> {
        const { player, action } = data;
        this.wipeState(player);
        const { turnOrder, socketId } = player.getIdentity();

        if (isVoluntary && !player.isAnchored())
            return lib.fail('Ship is not anchored.');

        if (
            player.getBearings().location === 'temple'
            && player.getSpecialistName() === SpecialistName.priest
            && isVoluntary
        ) {
            this.privateState.addDeed({ context: action, description: 'gained 1 Favor for remaining at the temple' });
            player.gainFavor(1);
        }
        this.addServerMessage(this.convertDeedsToMessage(player), player.getIdentity().color);

        player.deactivate();
        this.privateState.updatePlayerStats(player);
        console.info(this.privateState.getGameStats());
        this.playState.savePlayer(player.toDto());

        if(!isVoluntary)
            this.transmitForceTurnNotification(socketId);

        const newPlayerResult = ((): Probable<PlayerHandler> => {
            const allPlayers = this.playState.getAllPlayers();
            const nextInOrder = turnOrder === allPlayers.length ? 1 : turnOrder + 1;
            const nextPlayerDto = allPlayers.find(player => player.turnOrder === nextInOrder);

            if (!nextPlayerDto)
                return lib.fail('Could not find the next player');

            const nextPlayer = new PlayerHandler(nextPlayerDto);
            const { seaZone } = nextPlayer.getBearings();

            nextPlayer.activate(
                this.privateState.getDestinations(seaZone),
                nextPlayer.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
            );

            const { color, socketId } = nextPlayer.getIdentity();
            this.playState.updateRival(color);

            this.transmitTurnNotification(socketId);

            return lib.pass(nextPlayer);
        })();

        if (newPlayerResult.err)
            return lib.fail(newPlayerResult.message);

        const newPlayer = newPlayerResult.data;
        this.addServerMessage(`It's ${newPlayer.getIdentity().name}'s turn!`, newPlayer.getIdentity().color);

        return lib.pass(this.saveAndReturn(newPlayer));
    }

    // MARK: RIVAL TURN
    public endRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false): Probable<StateResponse> {
        const { player, action } = digest;
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
            if (rivalLocation !== 'market')
                return lib.fail('Cannot shift market from here!');

            const marketShift = this.shiftMarketCards(player);

            if (marketShift.err)
                return lib.fail(marketShift.message);

            this.privateState.addDeed({ context: action, description: 'sent it to the market, cycled it' });

            if (marketShift.data.hasGameEnded)
                this.playState.registerGameEnd(marketShift.data.countables);
        } else {
            this.privateState.addDeed({ context: action, description: `sent it to the ${rivalLocation}` });
        }

        this.wipeState(player);

        player.unfreeze(
            this.determineActionsAndDetails(player),
            rival.bearings.seaZone,
        );


        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: FORCED TURN
    public forceTurn(digest: DataDigest): Probable<StateResponse> {
        const { player, action } = digest;

        if (player.isActivePlayer())
            return lib.fail('Active player cannot force own turn!');

        const activePlayer = this.playState.getActivePlayer();

        if (!activePlayer)
            return lib.fail('Cannot find active player!');

        if (!activePlayer.isIdle)
            return lib.fail('Cannot force turn on non-idle player');

        if (activePlayer.isHandlingRival)
            this.playState.concludeRivalTurn();

        const idlerHandler = new PlayerHandler(
            { ...activePlayer, locationActions: [], isIdle: false, isAnchored: true, isHandlingRival: false },
        );

        this.addServerMessage(
            `${player.getIdentity().name} forced ${idlerHandler.getIdentity().name} to end the turn.`,
            player.getIdentity().color,
        );

        return this.endTurn({ player: idlerHandler, action, payload: null }, false);
    }

    // MARK: UNDO
    public undo(digest: DataDigest): Probable<StateResponse> {
        const { player } = digest;
        const { color } = player.getIdentity();

        if (!player.mayUndo)
            return lib.fail('Previous action cannot be undone.');

        const backupOperation = this.backupState.retrieveBackup();

        if (backupOperation.err)
            return lib.fail(backupOperation.message);

        const { playState, privateState } = backupOperation.data;

        this.playState = new PlayStateHandler(SERVER_NAME, playState);
        this.privateState = new PrivateStateHandler(privateState);

        const revertedPlayer = playState.players.find(p => p.color === color);

        if (!revertedPlayer)
            return lib.fail('Could not find active player in backup');

        this.transmitVp(this.privateState.getPlayerVictoryPoints(color), player.getIdentity().socketId);

        const playerHandler = new PlayerHandler(revertedPlayer);

        if (this.backupState.isEmpty())
            playerHandler.disableUndo();

        return lib.pass(this.saveAndReturn(playerHandler));
    }

    // MARK: UPGRADE
    public upgradeCargo(data: DataDigest): Probable<StateResponse> {
        const { player, action } = data;
        this.preserveState(player);

        if (player.mayUpgradeCargo()) {
            player.spendCoins(2);
            player.addCargoSpace();
            player.setActionsAndDetails(this.determineActionsAndDetails(player));
            player.removeAction(Action.upgrade_cargo);
            this.privateState.addDeed({ context: action, description: 'bought a cargo slot' });

            if (player.isHarbormaster())
                this.updateMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return lib.pass(this.saveAndReturn(player));
        }

        return lib.fail('Conditions for upgrade not met.');
    }

    public addChat(entry: ChatEntry): StateResponse {
        this.playState.addChatEntry(entry);
        this.backupState.addChat(entry);

        return { state: this.getState() };
    }

    public updatePlayerName(player: PlayerEntity, newName: string): StateResponse {
        this.addServerMessage(`[${player.name}] is henceforth known as [${newName}]`, player.color);
        this.playState.updateName(player.color, newName);
        this.backupState.updatePlayerName(player.color, newName);

        return { state: this.getState() };
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

    private getPositionalActions(player: PlayerHandler): LocalAction[] {
        const currentZone = player.getBearings().seaZone;
        const currentLocation = this.playState.getLocationName(currentZone);

        if (player.isPostmaster()) {
            const adjacentZones = this.privateState.getDestinations(currentZone);

            for (const zone of adjacentZones) {
                if (this.playState.getLocationName(zone) == 'temple')
                    return [Action.donate_metal];
            }
        }

        if (player.isMoneychanger() && currentLocation == 'temple') {
            return [Action.sell_goods, Action.sell_specialty];
        }

        if (player.isChancellor() && currentLocation == 'market') {
            return [Action.sell_as_chancellor];
        }

        return [];
    }

    private loadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const filled = cargo.filter(item => item !== 'empty') as Array<ItemName>;
        const empty = cargo.filter(item => item === 'empty') as Array<ItemName>;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex === -1)
            return lib.fail('Could not find an empty slot to load item');

        const metals: Array<ItemName> = ['gold', 'silver'];
        const supplies = this.playState.getItemSupplies();

        if (metals.includes(item)) {
            const metal = item as Metal;

            if (supplies.metals[metal] < 1)
                return lib.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] !== 'empty')
                return lib.fail('Not enough empty slots for storing metal');

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;
            this.playState.removeMetal(metal);

            return lib.pass(orderedCargo);
        }

        const tradeGood = item as TradeGood;

        if (supplies.goods[tradeGood] < 1)
            return lib.fail(`No ${item} available for loading`);

        orderedCargo[emptyIndex] = item;
        this.playState.removeTradeGood(tradeGood);

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
            this.playState.returnTradeGood(item as TradeGood);
        }

        return lib.pass(pool);
    }

    private subtractTradeGoods(
        minuend: Array<ItemName>,
        subtrahend: Array<ItemName>,
        isPlayerCargo: boolean = true,
    ): Probable<Array<ItemName>> {
        for (const tradeGood of subtrahend) {
            const subtractionResult = this.unloadItem(minuend, tradeGood, isPlayerCargo);

            if (subtractionResult.err)
                return subtractionResult;
        }

        return lib.pass(minuend);
    }

    private pickFeasibleTrades(player: PlayerHandler): Array<FeasibleTrade> {
        const cargo = player.getCargo();
        const market = this.playState.getMarket();
        const nonGoods: Array<ItemName> = ['empty', 'gold', 'silver', 'gold_extra', 'silver_extra'];

        const slots: Array<MarketSlotKey> = ['slot_1', 'slot_2', 'slot_3'];
        const feasible: Array<FeasibleTrade> = [];

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

            if (player.isChancellor()) { // TODO: (Chancellor) have the modal Accept button switchable on/off for this
                if (player.getFavor() - unfilledGoods.length >= 0) {
                    feasible.push({ slot: key, missing: unfilledGoods });
                }
            } else if (unfilledGoods.length === 0) {
                feasible.push({ slot: key, missing: [] });
            }
        });

        return feasible;
    }

    private pickFeasiblePurchases(player: PlayerHandler): Array<MetalPurchasePayload> {
        const { silver: silverCost, gold: goldCost } = this.playState.getMetalCosts();
        const playerCoins = player.getCoinAmount();
        const playerFavor = player.getFavor();

        const available: MetalPurchasePayload[] = [];
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
        if (!player.isAnchored())
            return { actions: [], trades: [], purchases: [] };

        const actionsByLocation = this.getDefaultActions(player).concat(this.getPositionalActions(player));

        const trades = this.pickFeasibleTrades(player);
        const purchases = this.pickFeasiblePurchases(player);
        const actions = actionsByLocation.filter(action => {
            switch (action) {
                case Action.upgrade_cargo:
                    return player.getCoinAmount() >= 2 && player.getCargo().length < 4;

                case Action.sell_goods:
                    return player.isChancellor() ? false : trades.length;

                case Action.sell_as_chancellor:
                    return trades.length;

                case Action.sell_specialty:
                    const specialty = player.getSpecialty();
                    return !!specialty && player.getCargo().includes(specialty);

                case Action.donate_goods:
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
                        && player.hasCargoRoom(2)
                        && purchases.length
                    );

                case Action.load_good:
                    const { location } = player.getBearings();
                    return (
                        ['quarry' , 'forest', 'mines', 'farms'].includes(location)
                        && player.hasCargoRoom(1)
                        && this.playState.getItemSupplies().goods[LOCATION_GOODS[location as GoodsLocationName]]
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
            const player = players.find(p => p.color === playerStat.color);

            if (!player) {
                return lib.fail(`No player found for [${playerStat.color}]`);
            }

            playerStat.gold = player.cargo.filter(item => item === 'gold').length;
            playerStat.silver = player.cargo.filter(item => item === 'silver').length;
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
            this.addServerMessage(this.convertDeedsToMessage(player), player.getIdentity().color);
            this.killIdleChecks();
            const results = this.compileGameResults();

            if (results.err)
                return lib.fail(results.message);

            this.addServerMessage('Market deck is empty! Game has ended.');

            return lib.pass({ hasGameEnded: true, countables: results.data });
        }

        this.playState.shiftMarketCards(newTrade);

        return lib.pass({ hasGameEnded: false, countables: [] });
    }

    private saveAndReturn(player: PlayerHandler): StateResponse {
        this.playState.savePlayer(player.toDto());

        return { state: this.playState.toDto() };
    }

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.playState.getActivePlayer();

            if (!activePlayer) {
                lib.fail('No active player found in idle check!');
                return;
            }

            const timeNow = Date.now();

            if (timeNow - activePlayer.timeStamp > IDLE_TIMEOUT && !activePlayer.isIdle) {
                activePlayer.isIdle = true;
                this.addServerMessage(`${activePlayer.name} is idle`);
                this.playState.savePlayer(activePlayer);

                this.transmitTurnNotification(activePlayer.socketId);
                this.autoBroadcast(this.playState.toDto());
            }

        }, 2000);
    }

    public killIdleChecks() {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
    }

    private addServerMessage(message: string, as: PlayerColor | null = null) {
        this.playState.addServerMessage(message, as);
        this.backupState.addServerMessage(message, as);
    }

    private preserveState(player: PlayerHandler) {
        this.backupState.addState({
            playState: this.getState(),
            privateState: this.getPrivateState(),
        });
        player.enableUndo();
    }

    private wipeState(player: PlayerHandler) {
        this.backupState.wipeBackup();
        player.disableUndo();
    }

    private convertDeedsToMessage(player: PlayerHandler): string {
        const { name } = player.getIdentity();
        const deeds = this.privateState.getDeeds();
        const length = deeds.length;
        let message = `${name} `;

        deeds.forEach((deed, key) => {
            const { context: action, description } = deed;
            const [prev, next] = [deeds[key-1], deeds[key+1]];
            const isSecondMovement = key > 0 && action == Action.move && prev.context == Action.move;

            if (key != 0) {
                const ligature = isSecondMovement ? ' then ' : (length > 2 ? ', ' : ' ');
                message += ligature;
            }

            if (!next)
                message += isSecondMovement ? '' : (length > 3 ? 'and finally ' : 'and ');

            message += description;
        });

        return `${message}.`;
        // this.addServerMessage(`${message}.`, color);
    }
}