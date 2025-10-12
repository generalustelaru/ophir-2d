import {
    LocationName, GoodsLocationName, Action, ItemName, MarketSlotKey, TradeGood, CargoMetal, PlayerColor,
    Metal, StateResponse, PlayState, SpecialistName, DiceSix, Trade, ChatEntry, PlayerEntity,
    LocalAction,
    ZoneName,
} from "~/shared_types";
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from "~/server_constants";
import { DataDigest, PlayerCountables, SessionProcessor, StateBundle } from "~/server_types";
import lib, { Probable } from './library';
import { validator } from '../services/validation/ValidatorService';
import { SERVER_NAME, IDLE_CHECKS, IDLE_TIMEOUT } from "../configuration";
import { BackupStateHandler } from "../state_handlers/BackupStateHandler";

const { TRADE_DECK_B } = serverConstants;

export class PlayProcessor implements SessionProcessor {
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    private backupState: BackupStateHandler;
    private autoBroadcast: (state: PlayState) => void;
    private transmitTurnNotification: (socketId: string) => void;
    private transmitVp: (vp: number, socketId: string) => void;

    /** @throws */
    constructor(
        stateBundle: StateBundle,
        broadcastCallback: (state: PlayState) => void,
        transmitTurnNotification: (socketId: string) => void,
        transmitVp: (vp: number, socketId: string) => void,
    ) {
        const { playState, privateState, backupState } = stateBundle;

        this.playState = playState;
        this.privateState = privateState;
        this.backupState = backupState;
        this.autoBroadcast = broadcastCallback;
        this.transmitTurnNotification = transmitTurnNotification;
        this.transmitVp = transmitVp;

        const players = this.playState.getAllPlayers();
        const firstPlayer = players.find(p => p.turnOrder === 1);

        if (!firstPlayer)
            throw new Error("Could not find the first player!");

        const player = new PlayerHandler(firstPlayer);
        const { seaZone } = player.getBearings();

        player.activate(
            this.privateState.getDestinations(seaZone),
            player.isNavigator() ? this.privateState.getNavigatorAccess(seaZone) : [],
        );
        this.playState.savePlayer(player.toDto());

        this.transmitTurnNotification(player.getIdentity().socketId);

        if (IDLE_CHECKS)
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
    public processMove(digest: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { player, payload } = digest;
        this.preserveState(player);
        const { name: playerName, color: playerColor } = player.getIdentity();

        const movementPayload = validator.validateMovementPayload(payload);

        if (!movementPayload)
            return lib.fail(lib.validationErrorMessage());

        const { zoneId: target, position } = movementPayload;
        const locationName = this.playState.getLocationName(target);

        if (isRivalShip) {
            const mayMoveRival = lib.checkConditions([
                player.handlesRival(),
                this.playState.rivalHasMoves(),
                this.playState.isRivalDestinationValid(target),
            ]);

            if (mayMoveRival.err)
                return lib.fail('Rival ship movement is illegal!');

            this.playState.moveRivalShip(
                {
                    seaZone: target,
                    location: locationName,
                    position
                },
                this.privateState.getDestinations(target),
            );

            return lib.pass(this.saveAndReturn(player));
        }

        const playerMovementLegal = player.isDestinationValid(target)
        const navigatorMevementLegal = player.isNavigator() && player.isBarrierCrossing(target)

        const playerMovementAllowed = lib.checkConditions([
            player.getMoves() > 0,
            false === player.handlesRival(),
            playerMovementLegal || navigatorMevementLegal,
        ]);

        if (playerMovementAllowed.err)
            return lib.fail('Movement not alowed.');

        const hasSailed = ((): boolean => {
            player.spendMove();

            if (player.isBarrierCrossing(target)) {
                this.addServerMessage(
                    `${playerName} used a hidden passage to cross a barrier.`,
                    playerColor,
                );

                return true;
            }

            const playersInZone = this.playState.getPlayersByZone(target);

            const rival = this.playState.getRivalData()
            const rivalInfluence = rival.isIncluded && rival.bearings.seaZone === target
                ? rival.influence
                : 0;

            if ((!playersInZone.length && !rivalInfluence) || player.isPrivileged())
                return true;

            this.wipeState(player);

            const influenceRoll = ((): DiceSix => {
                player.rollInfluence();
                const roll = player.getInfluence();

                if (roll === 6) {
                    this.addServerMessage(`${playerName} rolled a natural 6!`, playerColor);

                    return roll;
                }

                if (player.getSpecialistName() === SpecialistName.temple_guard) {

                    const bumpedRoll = roll + 1 as DiceSix;

                    player.setInfluence(bumpedRoll);
                    this.addServerMessage(`${playerName} bumped the roll to ${bumpedRoll}.`, playerColor);

                    return bumpedRoll;
                }

                this.addServerMessage(`${playerName} rolled a ${roll}`, playerColor);

                return roll;
            })();

            const blockingPlayers = playersInZone.filter(p => p.influence > influenceRoll);

            if (!blockingPlayers.length && influenceRoll >= rivalInfluence)
                return true;

            this.addServerMessage(
                `${playerName} was blocked from sailing.`,
                playerColor
            );
            this.playState.trimInfluenceByZone(target, rivalInfluence);
            this.addServerMessage(`Influence at the [${locationName}] was trimmed.`)

            return false;
        })();

        if (hasSailed) {
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.playState.getLocationName(target),
            });

            player.setActions(this.getDefaultActions(player));
            player.appendActions(this.getSpecialistActions(player));
            player.setTrades(this.getTrades(player));

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
                    player.freeze();
                }
            }

        } else if (player.getMoves() === 0) {
            this.addServerMessage(`${playerName} also ran out of moves and cannot act further`);
            this.processEndTurn(digest, false);
        }

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: REPOSITION
    public processRepositioning(data: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { payload, player } = data;
        const repositioningPayload = validator.validateRepositioningPayload(payload);

        if (!repositioningPayload)
            return lib.fail(lib.validationErrorMessage());

        const position = repositioningPayload.repositioning;

        if (isRivalShip)
            this.playState.repositionRivalShip(position);
        else
            player.setBearings({ ...player.getBearings(), position });

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: FAVOR
    public processFavorSpending(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);

        if (!player.getFavor() || player.isPrivileged())
            return lib.fail(`${player.getIdentity().name} cannot spend favor`);

        player.enablePrivilege();
        player.setActions(this.getDefaultActions(player));
        player.appendActions(this.getSpecialistActions(player));
        player.setTrades(this.getTrades(player));

        this.addServerMessage(
            `${player.getIdentity().name} has spent favor`,
            player.getIdentity().color,
        );

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DROP ITEM
    public processItemDrop(data: DataDigest): Probable<StateResponse> {
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
        player.appendActions(this.getSpecialistActions(player))

        const { name, color } = player.getIdentity();
        this.addServerMessage(`${name} ditched one ${item}`, color);

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: LOAD GOOD
    public processLoadGood(data: DataDigest): Probable<StateResponse> {
        const { payload, player } = data;
        const { color, name } = player.getIdentity();
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

        this.addServerMessage(`${name} picked up ${localGood}`, color);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        player.removeAction(Action.load_good);
        player.appendActions(this.getSpecialistActions(player));

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: SELL GOODS
    public processSellGoods(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        player.disableUndo();
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot } = marketSlotPayload;
        const { color, name } = player.getIdentity();

        if (lib.checkConditions([
            player.hasAction(Action.sell_goods),
            player.getTrades().includes(slot),
        ]).err) {
            return lib.fail(`${name} cannnot sell goods`);
        }

        // Transaction
        const trade = this.playState.getMarketTrade(slot);
        const unloadResult = this.unloadGoodsForPlayer(player, trade);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const reward = trade.reward.coins + this.playState.getFluctuation(slot);
        player.gainCoins(reward);

        // other updates
        player.removeAction(Action.sell_goods);
        const coinForm = reward === 1 ? 'coin' : 'coins';
        const isRemote = player.isMoneychanger() && player.getBearings().location === 'temple'

        if (isRemote)
            player.removeAction(Action.donate_goods);

        this.addServerMessage(
            `${name} ${isRemote ? 'accessed the market and' : ''} traded for ${reward} ${coinForm}${reward === 0 ? ' (what?!)' : ''}`,
            color,
        );

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: DONATE GOODS
    public donateGoods(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.wipeState(player);
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { name, color, socketId } = player.getIdentity();
        const { slot } = marketSlotPayload;

        const conditions = lib.checkConditions([
            player.hasAction(Action.donate_goods),
            this.playState.getTempleTradeSlot() === slot,
            player.getTrades().includes(slot),
        ]);

        if (conditions.err)
            return lib.fail(`${name} cannnot donate goods`);

        // Transaction
        const trade = this.playState.getMarketTrade(slot);
        const unloadResult = this.unloadGoodsForPlayer(player, trade);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const reward = trade.reward.favorAndVp;
        player.gainFavor(reward);

        this.privateState.updateVictoryPoints(color, reward);
        this.transmitVp(this.privateState.getPlayerVictoryPoints(color), socketId);
        console.info(this.privateState.getGameStats());

        // Other updates
        player.removeAction(Action.donate_goods);

        if (player.isMoneychanger())
            player.removeAction(Action.sell_goods);

        this.addServerMessage(`${name} donated goods for ${reward} favor and VP`, color);

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: SELL SPECIALTY
    public processSellSpecialty(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);
        const { name, color } = player.getIdentity();
        const specialty = player.getSpecialty();

        if (specialty && player.maySellSpecialtyGood()) {
            const unload = this.unloadItem(player.getCargo(), specialty);

            if (unload.err)
                return lib.fail(unload.message);

            player.setCargo(unload.data);
            player.gainCoins(1);
            player.setTrades(this.pickFeasibleTrades(player));

            if (!player.getCargo().includes(specialty))
                player.removeAction(Action.sell_specialty);

            if (player.isMoneychanger() && player.getBearings().location === 'temple') {
                player.removeAction(Action.donate_goods);
                this.addServerMessage(`${name} accessed the market and sold ${specialty} for 1 coin`, color);
            } else {
                this.addServerMessage(`${name} sold ${specialty} for 1 coin`, color);
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
    public processMetalPurchase(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.preserveState(player);
        const { name, color } = player.getIdentity();
        const purchasePayload = validator.validateMetalPurchasePayload(payload);

        if (!purchasePayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal, currency } = purchasePayload;

        if (!player.mayBuyMetal())
            return lib.fail(`Player ${name} cannot buy metals`);

        const metalCost = this.playState.getMetalCosts()[metal];
        const playerAmount = currency === 'coins' ? player.getCoinAmount() : player.getFavorAmount();

        const price = metalCost[currency];
        const remainder = playerAmount - price;

        if (remainder < 0) {
            return lib.fail(`Player ${name} cannot afford metal purchase`);
        }

        if (currency === 'coins')
            player.spendCoins(price);
        else
            player.spendFavor(price);

        this.addServerMessage(`${name} bought ${metal} for ${metalCost[currency]} ${currency}`, color);

        const metalLoad = this.loadItem(player.getCargo(), metal);

        if (metalLoad.err)
            return lib.fail(metalLoad.message);


        player.setCargo(metalLoad.data);
        player.appendActions(this.getSpecialistActions(player))

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DONATE METAL
    public processMetalDonation(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        this.preserveState(player);
        const { color, name } = player.getIdentity();
        const donationPayload = validator.validateMetalDonationPayload(payload);

        if (!donationPayload)
            return lib.fail(lib.validationErrorMessage());

        const { metal } = donationPayload;

        if (!player.canDonateMetal(metal))
            return lib.fail(`${name} cannot donate ${metal}`);

        const result = this.unloadItem(player.getCargo(), metal);

        if (result.err)
            return lib.fail(result.message);

        player.setCargo(result.data);

        const reward = metal === 'gold' ? 10 : 5;
        this.privateState.updateVictoryPoints(color, reward);

        if (player.isPostmaster() && player.getBearings().location != 'temple') {
            this.addServerMessage(`${name} mailed one ${metal} for ${reward} VP`, color);
            player.removeAction(Action.donate_metals);
        } else {
            this.addServerMessage(`${name} donated ${metal} for ${reward} VP`, color);
        }
        console.info(this.privateState.getGameStats());

        this.transmitVp(this.privateState.getPlayerVictoryPoints(color), player.getIdentity().socketId);

        const { isNewLevel, isTempleComplete } = this.playState.processMetalDonation(metal);

        if (isTempleComplete) {
            this.killIdleChecks();
            player.clearActions();
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

        if (player.isHarbormaster())
            this.updateMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: END TURN
    public processEndTurn(data: DataDigest, isVoluntary: boolean = true): Probable<StateResponse> {
        const { player } = data;
        this.wipeState(player);
        const { turnOrder, name, color } = player.getIdentity();

        if (isVoluntary && !player.isAnchored())
            return lib.fail(`Ship is not anchored.`);

        if (
            player.getBearings().location === 'temple'
            && player.getSpecialistName() === SpecialistName.priest
            && isVoluntary
        ) {
            this.addServerMessage(`${name} gained 1 Favor for stopping at the temple.`, color);
            player.gainFavor(1);
        }

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

    public processRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false): Probable<StateResponse> {
        const { player } = digest;
        this.preserveState(player);

        const rival = this.playState.getRivalData();

        if (!rival.isIncluded || !rival.isControllable)
            return lib.fail('Rival is not active!');

        if (rival.moves === 2)
            return lib.fail('Rival cannot act before moving');

        this.playState.concludeRivalTurn();

        player.unfreeze(
            this.playState.getLocalActions(
                player.getBearings().seaZone,
            ),
            rival.bearings.seaZone,
        );

        if (isShiftingMarket) {
            this.wipeState(player);
            if (this.playState.getLocationName(rival.bearings.seaZone) !== 'market')
                return lib.fail('Cannot shift market from here!');

            return this.issueMarketShiftResponse(player);
        }

        return lib.pass(this.saveAndReturn(player));
    }

    public processForcedTurn(digest: DataDigest): Probable<StateResponse> {
        const { player } = digest;

        if (player.isActivePlayer())
            return lib.fail('Active player cannot force own turn!')

        const activePlayer = this.playState.getActivePlayer();

        if (!activePlayer)
            return lib.fail('Cannot find active player!')

        if (!activePlayer.isIdle)
            return lib.fail('Cannot force turn on non-idle player')

        if (activePlayer.isHandlingRival)
            this.playState.concludeRivalTurn();

        const idlerHandler = new PlayerHandler(
            { ...activePlayer, locationActions: [], isIdle: false, isAnchored: true, isHandlingRival: false }
        );

        this.addServerMessage(
            `${player.getIdentity().name} forced ${idlerHandler.getIdentity().name} to end the turn.`,
            player.getIdentity().color,
        );

        return this.processEndTurn({ player: idlerHandler, payload: null }, false);
    }

    public processUndo(digest: DataDigest): Probable<StateResponse> {
        const { player } = digest;
        const { color, name } = player.getIdentity();

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

        this.addServerMessage(`${name} has reconsidered last action/move`, color)
        const playerHandler = new PlayerHandler(revertedPlayer);
        playerHandler.disableUndo();

        return lib.pass(this.saveAndReturn(playerHandler));
    }

    // MARK: UPGRADE
    public processUpgrade(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        this.preserveState(player);

        if (player.mayUpgradeCargo()) {
            player.removeAction(Action.upgrade_cargo);
            player.spendCoins(2);
            player.addCargoSpace();

            this.addServerMessage(
                `${player.getIdentity().name} bought a cargo slot.`,
                player.getIdentity().color,
            );

            if (player.isHarbormaster())
                this.updateMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return lib.pass(this.saveAndReturn(player));
        }

        return lib.fail(`Conditions for upgrade not met.`);
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

        return { state: this.getState() }
    };

    // MARK: PRIVATE

    private updateMovesAsHarbormaster(harbormaster: PlayerHandler) {
        const moves = harbormaster.getMoves();

        if (harbormaster.isPrivileged() && moves === 1) {
            const { name, color } = harbormaster.getIdentity();
            this.addServerMessage(`${name} can move and act again.`, color)
        } else {
            harbormaster.clearMoves();
        }
    }

    private getDefaultActions(player: PlayerHandler): LocalAction[] {
        return this.playState.getLocalActions(player.getBearings().seaZone);
    }

    private getTrades(player: PlayerHandler): MarketSlotKey[] {
        const actions = player.getActions();

        if (actions.filter(a => a === Action.sell_goods || a === Action.donate_goods).length)
            return this.pickFeasibleTrades(player);

        return [];
    }

    private getSpecialistActions(player: PlayerHandler): LocalAction[] {
        const currentZone = player.getBearings().seaZone;

        if (player.isPostmaster()) {
            const adjacentZones = this.privateState.getDestinations(currentZone);

            for (const zone of adjacentZones) {
                if (this.playState.getLocationName(zone) === 'temple') // TODO: fix unlimited remote donation bug
                    return [Action.donate_metals];
            }
        }

        if (player.isMoneychanger()) {
            if (this.playState.getLocationName(currentZone) === 'temple')
                return [Action.sell_goods, Action.sell_specialty];
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
            const metal = item as Metal

            if (supplies.metals[metal] < 1)
                return lib.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] !== 'empty')
                return lib.fail(`Not enough empty slots for storing metal`);

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

    private unloadItem(cargo: Array<ItemName>, item: ItemName): Probable<Array<ItemName>> {
        const itemIndex = cargo.indexOf(item);

        if (itemIndex === -1)
            return lib.fail(`Cannot find [${item}] in cargo!`);

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

    private unloadGoodsForPlayer(player: PlayerHandler, trade: Trade): Probable<true> {
        const cargo = player.getCargo();

        for (const tradeGood of trade.request) {
            const unloadResult = this.unloadItem(cargo, tradeGood);

            if (unloadResult.err)
                return unloadResult;
        }

        player.setCargo(cargo);

        return lib.pass(true);
    }

    private pickFeasibleTrades(player: PlayerHandler): Array<MarketSlotKey> {
        const cargo = player.getCargo();
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

            if (player.isChancellor()) {
                if (player.getFavor() - unfilledGoods.length >= 0) {
                    feasible.push(key);
                }
            } else if (unfilledGoods.length === 0) {
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

    private issueMarketShiftResponse(player: PlayerHandler): Probable<StateResponse> {

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
            this.killIdleChecks();
            const results = this.compileGameResults();

            if (results.err)
                return lib.fail(results.message);

            this.playState.savePlayer(player.toDto());
            this.playState.registerGameEnd(results.data);
            this.addServerMessage('Market deck is empty! Game has ended.');

            return lib.pass({ state: this.playState.toDto() });
        }

        this.playState.shiftMarketCards(newTrade);

        return lib.pass(this.saveAndReturn(player));
    }

    private saveAndReturn(player: PlayerHandler): StateResponse {
        this.playState.savePlayer(player.toDto());

        return { state: this.playState.toDto() };
    }

    private startIdleChecks(): void {
        this.idleCheckInterval = setInterval(() => {
            const activePlayer = this.playState.getActivePlayer();

            if (!activePlayer) {
                lib.fail('No active player found in idle check!')
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
        this.backupState.saveCopy({
            playState: this.getState(),
            privateState: this.getPrivateState(),
        });
        player.enableUndo();
    }

    private wipeState(player: PlayerHandler) {
        this.backupState.wipeBackup();
        player.disableUndo();
    }
}