import {
    ZoneName, LocationName, Coordinates, GoodsLocationName, Action, ItemName, MarketSlotKey, TradeGood, CargoMetal,
    LocalActions, Metal, StateResponse, PlayState, SpecialistName, DiceSix, Trade,
} from "~/shared_types";
import { PlayStateHandler } from '../state_handlers/PlayStateHandler';
import { PlayerHandler } from '../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../state_handlers/PrivateStateHandler';
import serverConstants from "~/server_constants";
import { DataDigest, PlayerCountables, StateBundle } from "~/server_types";
import lib, { Probable } from './library';
import { validator } from '../services/validation/ValidatorService';
import { IDLE_CHECKS, IDLE_TIMEOUT } from "../configuration";

const { TRADE_DECK_B } = serverConstants;

export class PlayProcessor {
    private idleCheckInterval: NodeJS.Timeout | null = null;
    private playState: PlayStateHandler;
    private privateState: PrivateStateHandler;
    private autoBroadcast: (state: PlayState) => void;
    private transmitVp: (vp: number, socketId: string) => void;

    /** @throws  */
    constructor(
        stateBundle: StateBundle,
        broadcastCallback: (state: PlayState) => void,
        transmitVp: (vp: number, socketId: string) => void,
    ) {
        this.playState = stateBundle.playState;
        this.privateState = stateBundle.privateState;
        this.autoBroadcast = broadcastCallback;
        this.transmitVp = transmitVp

        const players = this.playState.getAllPlayers();
        const firstPlayer = players.find(p => p.turnOrder === 1);

        if (!firstPlayer)
            throw new Error("Could not find a player to activate!");

        const player = new PlayerHandler(firstPlayer);
        const { seaZone } = player.getBearings();

        player.activate(
            this.playState.getLocalActions(seaZone),
            this.pickFeasibleTrades(player.getCargo()),
            this.privateState.getDestinations(seaZone),
        );
        this.playState.savePlayer(player.toDto());

        if (IDLE_CHECKS)
            this.startIdleChecks();
    }

    public getState() {
        return this.playState.toDto();
    }

    public getPrivateState() {
        return this.privateState.toDto();
    }

    // MARK: MOVE
    public processMove(digest: DataDigest, isRivalShip: boolean = false): Probable<StateResponse> {
        const { player, payload } = digest;
        const { name: playerName, color: playerColor } = player.getIdentity();

        const movementPayload = validator.validateMovementPayload(payload);

        if (!movementPayload)
            return lib.fail(lib.validationErrorMessage());

        const target = movementPayload.zoneId;
        const locationName = this.playState.getLocationName(target);

        if (isRivalShip)
            return this.processRivalMovement(target, locationName, movementPayload.position, player);

        if (!player.isDestinationValid(target) || !player.getMoves() || player.handlesRival())
            return lib.fail('Movement not alowed.',);

        const hasSailed = (() => {
            player.spendMove();
            const playersInZone = this.playState.getPlayersByZone(target);

            const rival = this.playState.getRivalData()
            const rivalInfluence = rival.isIncluded && rival.bearings.seaZone === target
                ? rival.influence
                : 0;

            if ((!playersInZone.length && !rivalInfluence) || player.isPrivileged())
                return true;

            const influenceRoll = ((): Probable<DiceSix> => {
                player.rollInfluence();
                const roll = player.getInfluence();

                if (roll === 6) {
                    this.playState.addServerMessage(`${playerName} rolled a natural 6!`, playerColor);

                    return lib.pass(roll);
                }

                if (player.getSpecialistName() === SpecialistName.temple_guard) {

                    const bumpedRoll = player.validateDiceSix(roll + 1);

                    if (!bumpedRoll)
                        return lib.fail('Failed calculating valid D6.');

                    player.setInfluence(bumpedRoll);
                    this.playState.addServerMessage(`${playerName} bumped the roll to ${bumpedRoll}.`, playerColor);

                    return lib.pass(bumpedRoll);
                }

                this.playState.addServerMessage(`${playerName} rolled a ${roll}`, playerColor);

                return lib.pass(roll);
            })();

            if (influenceRoll.err)
                return lib.fail(influenceRoll.message);

            const playerInfluence = influenceRoll.data;
            const blockingPlayers = playersInZone.filter(p => p.influence > playerInfluence);

            if (!blockingPlayers.length && playerInfluence >= rivalInfluence)
                return true;

            this.playState.addServerMessage(
                `${playerName} was blocked from sailing.`,
                playerColor
            );
            this.playState.trimInfluenceByZone(target, rivalInfluence);
            this.playState.addServerMessage(`Influence at the [${locationName}] was trimmed.`)

            return false;
        })();

        if (hasSailed) {
            player.setBearings({
                seaZone: target,
                position: movementPayload.position,
                location: this.playState.getLocationName(target),
            });

            player.setAnchoredActions(this.determinePlayerActions(player, target));

            if (player.getMoves() > 0) {
                const nextDestinations = this.privateState.getDestinations(target);

                player.setDestinationOptions(
                    nextDestinations.filter(zone => zone !== player.getOvernightZone()),
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
            this.playState.addServerMessage(`${playerName} also ran out of moves and cannot act further`);
        }

        return lib.pass(this.saveAndReturn(player));
    }

    public processRivalMovement(target: ZoneName, locationName: LocationName, position: Coordinates, player: PlayerHandler): Probable<StateResponse> {
        if (lib.checkConditions([
            player.handlesRival(),
            this.playState.rivalHasMoves(),
            this.playState.isRivalDestinationValid(target),
        ]).err)
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

        if (!player.getFavor() || player.isPrivileged())
            return lib.fail(`${player.getIdentity().name} cannot spend favor`);

        player.enablePrivilege();
        this.playState.addServerMessage(
            `${player.getIdentity().name} has spent favor`,
            player.getIdentity().color,
        );

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DROP ITEM
    public processItemDrop(data: DataDigest): Probable<StateResponse> {
        const payload = validator.validateDropItemPayload(data.payload);

        if (!payload)
            return lib.fail(lib.validationErrorMessage());

        const player = data.player;
        const result = this.unloadItem(player.getCargo(), payload.item);

        if (result.err)
            return lib.fail(result.message);

        player.setCargo(result.data);
        player.setTrades(this.pickFeasibleTrades(result.data));

        this.playState.addServerMessage(
            `${player.getIdentity().name} ditched one ${payload.item}`,
            player.getIdentity().color,
        );

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: LOAD GOOD
    public processLoadGood(data: DataDigest): Probable<StateResponse> {
        const payload = validator.validateLoadGoodPayload(data.payload);

        if (!payload)
            return lib.fail(lib.validationErrorMessage());

        const player = data.player;

        if (!player.mayLoadGood())
            return lib.fail(`${player.getIdentity().color} Cannot load good`);

        const locationName = this.playState.getLocationName(player.getBearings().seaZone);
        const nonPickupLocations: Array<LocationName> = ['temple', 'market', 'treasury'];

        if (nonPickupLocations.includes(locationName))
            return lib.fail(`Cannot pick up goods from ${locationName}`);

        const localGood = serverConstants.LOCATION_GOODS[locationName as GoodsLocationName];

        if (localGood !== payload.tradeGood)
            return lib.fail(`Cannot load ${payload.tradeGood} here.`);

        const loadItem = this.loadItem(player.getCargo(), localGood);

        if (loadItem.err)
            return lib.fail(loadItem.message);

        player.setCargo(loadItem.data);

        this.playState.addServerMessage(
            `${player.getIdentity().name} picked up ${localGood}`,
            player.getIdentity().color
        );

        player.removeAction(Action.load_good);

        if (player.isHarbormaster())
            this.clearMovesAsHarbormaster(player);
        else
            player.clearMoves();

        player.setTrades(this.pickFeasibleTrades(player.getCargo()));

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: SELL GOODS
    public processSellGoods(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { slot } = marketSlotPayload;
        const { color, name } = player.getIdentity();

        if (lib.checkConditions([
            player.mayAct(Action.sell_goods),
            player.getTrades().includes(slot),
        ]).err) {
            return lib.fail(`${name} cannnot sell goods`);
        }

        // Transaction
        const trade = this.playState.getMarketTrade(slot);
        const unloadResult = this.unloadGoodsForPlayer(player, trade);

        if (unloadResult.err)
            return lib.fail(unloadResult.message);

        const coinReward = trade.reward.coins + this.playState.getFluctuation(slot);
        player.gainCoins(coinReward);

        // other updates
        player.removeAction(Action.sell_goods);

        if (player.isMoneychanger() && player.getBearings().location === 'temple') {
            player.removeAction(Action.donate_goods);
            this.playState.addServerMessage(`${name} accessed the market and sold goods for ${coinReward} coins`, color);
        } else {
            this.playState.addServerMessage(`${name} sold goods for ${coinReward} coins`, color);
        }

        if (player.isHarbormaster())
            this.clearMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: DONATE GOODS
    public donateGoods(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        const marketSlotPayload = validator.validateMarketSlotPayload(payload);

        if (!marketSlotPayload)
            return lib.fail(lib.validationErrorMessage());

        const { name, color, socketId } = player.getIdentity();
        const { slot } = marketSlotPayload;

        const conditions = lib.checkConditions([
            player.mayAct(Action.donate_goods),
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
        player.removeAction( Action.donate_goods);

        if (player.isMoneychanger())
            player.removeAction(Action.sell_goods);

        this.playState.addServerMessage(`${name} donated goods for ${reward} favor and VP`, color);

        if (player.isHarbormaster())
            this.clearMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return this.issueMarketShiftResponse(player);
    }

    // MARK: SELL SPECIALTY
    public processSellSpecialty(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        const { name, color } = player.getIdentity();
        const specialty = player.getSpecialty();

        if (specialty && player.maySellSpecialtyGood()) {
            const unload = this.unloadItem(player.getCargo(), specialty);

            if (unload.err)
                return lib.fail(unload.message);

            player.setCargo(unload.data);
            player.gainCoins(1);
            player.setTrades(this.pickFeasibleTrades(unload.data))

            if (!player.getCargo().includes(specialty))
                player.removeAction(Action.sell_specialty);

            if (player.isMoneychanger() && player.getBearings().location === 'temple') {
                player.removeAction(Action.donate_goods);
                this.playState.addServerMessage(`${name} accessed the market and sold ${specialty} for 1 coin`, color);
            } else {
                this.playState.addServerMessage(`${name} sold ${specialty} for 1 coin`, color);
            }

            if (player.isHarbormaster())
                this.clearMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return lib.pass(this.saveAndReturn(player));
        }

        return lib.fail('Player does not meet conditions for selling specialty good.');
    }

    // MARK: BUY METAL
    public processMetalPurchase(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
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

        this.playState.addServerMessage(`${name} bought ${metal} for ${metalCost[currency]} ${currency}`, color);

        const metalLoad = this.loadItem(player.getCargo(), metal);

        if (metalLoad.err)
            return lib.fail(metalLoad.message);

        player.setCargo(metalLoad.data);

        if (player.isHarbormaster())
            this.clearMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: DONATE METAL
    public processMetalDonation(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
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
            this.playState.addServerMessage(`${name} mailed one ${metal} for ${reward} VP`, color);
            player.removeAction(Action.donate_metals);
        } else {
            this.playState.addServerMessage(`${name} donated ${metal} for ${reward} VP`, color);
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
            this.playState.addServerMessage('The temple construction is complete! Game has ended.');
            this.playState.addServerMessage(JSON.stringify(results.data));

            return lib.pass({ state: this.playState.toDto() });
        }

        if (isNewLevel) {
            const newPrices = this.privateState.drawMetalPrices();

            if (!newPrices)
                return lib.fail('Donation could not be resolved');

            this.playState.setMetalPrices(newPrices);
            this.playState.addServerMessage('Current temple level is complete. Metal costs increase.');
        }

        if (player.isHarbormaster())
            this.clearMovesAsHarbormaster(player);
        else
            player.clearMoves();

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: END TURN
    public processEndTurn(data: DataDigest): Probable<StateResponse> {
        const { player } = data;
        const { turnOrder, name, color } = player.getIdentity();

        if (!player.mayEndTurn())
            return lib.fail(`Ship is not anchored.`);

        if (
            player.getBearings().location === 'temple'
            && player.getSpecialistName() === SpecialistName.priest
            && player.endsTurnFreely()
        ) {
            this.playState.addServerMessage(`${name} gained 1 Favor for stopping at the temple.`, color);
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
                this.determinePlayerActions(nextPlayer, seaZone),
                this.pickFeasibleTrades(nextPlayer.getCargo()),
                this.privateState.getDestinations(seaZone),
            );
            this.playState.updateRival(nextPlayer.getIdentity().color);

            return lib.pass(nextPlayer);
        })();

        if (newPlayerResult.err)
            return lib.fail(newPlayerResult.message);

        const newPlayer = newPlayerResult.data;
        this.playState.addServerMessage(`It's ${newPlayer.getIdentity().name}'s turn!`, newPlayer.getIdentity().color);

        return lib.pass(this.saveAndReturn(newPlayer));
    }

    public processRivalTurn(digest: DataDigest, isShiftingMarket: boolean = false): Probable<StateResponse> {
        const rival = this.playState.getRivalData();

        if (!rival.isIncluded || !rival.isControllable)
            return lib.fail('Rival is not active!');

        if (rival.moves === 2)
            return lib.fail('Rival cannot act before moving');

        this.playState.concludeRivalTurn();

        const { player } = digest;
        player.unfreeze(
            this.playState.getLocalActions(
                player.getBearings().seaZone,
            ),
            rival.bearings.seaZone,
        );

        if (isShiftingMarket) {

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
            { ...activePlayer, isIdle: false, isAnchored: true, isHandlingRival: false }
        );

        this.playState.addServerMessage(
            `${player.getIdentity().name} forced ${idlerHandler.getIdentity().name} to end the turn.`,
            player.getIdentity().color,
        );

        return this.processEndTurn({
            player: idlerHandler,
            payload: null
        })
    }

    // MARK: UPGRADE
    public processUpgrade(data: DataDigest): Probable<StateResponse> {
        const player = data.player;

        if (player.mayUpgradeCargo()) {
            player.removeAction( Action.upgrade_cargo);
            player.spendCoins(2);
            player.addCargoSpace();

            this.playState.addServerMessage(
                `${player.getIdentity().name} upgraded their cargo hold.`,
                player.getIdentity().color,
            );

            if (player.isHarbormaster())
                this.clearMovesAsHarbormaster(player);
            else
                player.clearMoves();

            return lib.pass(this.saveAndReturn(player));
        }

        return lib.fail(`Conditions for upgrade not met`);
    }

    public processChat(data: DataDigest): Probable<StateResponse> {
        const { player, payload } = data;
        const chatPayload = validator.validateChatPayload(payload);

        if (!chatPayload)
            return lib.fail(lib.validationErrorMessage());

        const { color: color, name } = player.getIdentity();

        this.playState.addChatEntry({
            color,
            name,
            message: chatPayload.input,
        });

        return lib.pass(this.saveAndReturn(player));
    }

    // MARK: PRIVATE

    private clearMovesAsHarbormaster(harbormaster: PlayerHandler) {
        const moves = harbormaster.getMoves();

        if (harbormaster.isPrivileged() && moves === 1) {
            const { name, color } = harbormaster.getIdentity();
            this.playState.addServerMessage(`${name} can move and act again.`, color)
        } else {
            harbormaster.clearMoves();
        }
    }

    private determinePlayerActions(player: PlayerHandler, seaZone: ZoneName): Array<LocalActions> {
        const actions = this.playState.getLocalActions(seaZone)

        if (player.isPostmaster()) {
            const adjacentZones = this.privateState.getDestinations(seaZone);

            for (const zone of adjacentZones) {
                if (this.playState.getLocalActions(zone).includes(Action.donate_metals)) {
                    actions.push(Action.donate_metals);
                    break;
                }
            }
        }

        if (player.isMoneychanger()) {
            if (this.playState.getLocationName(seaZone) === 'temple')
                actions.push(Action.sell_goods, Action.sell_specialty);
        }

        return actions;
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
                this.playState.addServerMessage('Market deck B is now in play');
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
            this.playState.addServerMessage('Market deck is empty! Game has ended.');

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
                this.playState.addServerMessage(`${activePlayer.name} is idle`);
                this.playState.savePlayer(activePlayer);

                this.autoBroadcast(this.playState.toDto());
            }

        }, 2000);
    }

    public killIdleChecks() {
        this.idleCheckInterval && clearInterval(this.idleCheckInterval);
    }
}