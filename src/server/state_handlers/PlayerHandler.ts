import {
    Action, CargoMetal, DiceSix, ItemName, LocalActions, MarketSlotKey, Player, PlayerColor, ShipBearings, ZoneName,
    Specialist, SpecialistName,
} from "~/shared_types";
import { ObjectHandler, PlayerIdentity } from "~/server_types";
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from "./library";

const MAX_FAVOR = 6;
export class PlayerHandler implements ObjectHandler<Player>{

    private socketId: Writable<string>;
    private color: Readable<PlayerColor>;
    private timeStamp: Writable<number>;
    private isIdle: Writable<boolean>;
    private name: Readable<string>;
    private turnOrder: Readable<number>;
    private specialist: Readable<Specialist>;
    private isActive: Writable<boolean>;
    private _mayUndo: Writable<boolean>;
    private bearings: Writable<ShipBearings>;
    private overnightZone: Writable<ZoneName>;
    private favor: Writable<number>;
    private privilegedSailing: Writable<boolean>;
    private influence: Writable<DiceSix>;
    private moveActions: Writable<number>;
    private isAnchored: Writable<boolean>;
    private isHandlingRival: Writable<boolean>;
    private localActions: ArrayWritable<LocalActions>;
    private destinations: ArrayWritable<ZoneName>;
    private navigatorAccess: ArrayWritable<ZoneName>;
    private cargo: ArrayWritable<ItemName>;
    private feasibleTrades: ArrayWritable<MarketSlotKey>;
    private coins: Writable<number>;

    constructor(player: Player) {
        this.socketId = writable(player.socketId);
        this.color = readable(player.color);
        this.timeStamp = writable(player.timeStamp);
        this.isIdle = writable(player.isIdle);
        this.name = readable(player.name);
        this.turnOrder = readable(player.turnOrder);
        this.specialist = readable(player.specialist);
        this.isActive = writable(player.isActive);
        this._mayUndo = writable(player.mayUndo);
        this.bearings = writable(player.bearings);
        this.overnightZone = writable(player.overnightZone);
        this.favor = writable(player.favor);
        this.privilegedSailing = writable(player.privilegedSailing);
        this.influence = writable(player.influence);
        this.moveActions = writable(player.moveActions);
        this.isAnchored = writable(player.isAnchored);
        this.isHandlingRival = writable(player.isHandlingRival);
        this.localActions = arrayWritable(player.locationActions);
        this.destinations = arrayWritable(player.destinations);
        this.navigatorAccess = arrayWritable(player.navigatorAccess);
        this.cargo = arrayWritable(player.cargo);
        this.feasibleTrades = arrayWritable(player.feasibleTrades);
        this.coins = writable(player.coins);
    }

    public toDto(): Player {
        return {
            socketId: this.socketId.get(),
            color: this.color.get(),
            timeStamp: this.timeStamp.get(),
            isIdle: this.isIdle.get(),
            name: this.name.get(),
            turnOrder: this.turnOrder.get(),
            specialist: this.specialist.get(),
            isActive: this.isActive.get(),
            mayUndo: this._mayUndo.get(),
            bearings: this.bearings.get(),
            overnightZone: this.overnightZone.get(),
            favor: this.favor.get(),
            privilegedSailing: this.privilegedSailing.get(),
            influence: this.influence.get(),
            moveActions: this.moveActions.get(),
            isAnchored: this.isAnchored.get(),
            isHandlingRival: this.isHandlingRival.get(),
            locationActions: this.localActions.get(),
            destinations: this.destinations.get(),
            navigatorAccess: this.navigatorAccess.get(),
            cargo: this.cargo.get(),
            feasibleTrades: this.feasibleTrades.get(),
            coins: this.coins.get(),
        }
    }

    // MARK: PUBLIC

    public refreshTimeStamp() {
        this.isIdle.set(false);
        this.timeStamp.set(Date.now());
    }

    public getIdentity(): PlayerIdentity {
        return {
            socketId: this.socketId.get(),
            color: this.color.get(),
            name: this.name.get(),
            turnOrder: this.turnOrder.get()
        }
    }

    public isActivePlayer() {
        return this.isActive.get();
    }

    public mayAct(action: LocalActions) {
        return this.isAnchored && this.getActions().includes(action);
    }

    public getMoves() {
        return this.moveActions.get();
    }

    public getFavor() {
        return this.favor.get();
    }

    public isDestinationValid(destination: ZoneName) {
        return Boolean(this.destinations.getOne(destination))
    }

    public isBarrierCrossing(destination: ZoneName) {
        return Boolean(this.navigatorAccess.getOne(destination));
    }

    public setDestinationOptions(options: Array<ZoneName>) {
        this.destinations.overwrite(options);
    }

    public setNavigatorAccess(options: Array<ZoneName>) {
        this.navigatorAccess.overwrite(options);
    }

    public setAnchoredActions(actions: Array<LocalActions>) {
        this.isAnchored.set(true);
        this.localActions.overwrite(actions);
    }

    public removeAction(action: LocalActions) {
        this.localActions.removeOne(action);
    }

    public spendMove() {
        this.moveActions.update(a => --a);
    }

    public isHarbormaster(): boolean {
        return this.getSpecialistName() === SpecialistName.harbormaster;
    }

    public isPostmaster(): boolean {
        return this.getSpecialistName() === SpecialistName.postmaster;
    }

    public isMoneychanger(): boolean {
        return this.getSpecialistName() === SpecialistName.moneychanger;
    }

    public isNavigator() {
        return this.getSpecialistName() === SpecialistName.navigator;
    }

    public clearMoves() {
        this.moveActions.set(0);
    }
    public getOvernightZone() {
        return this.overnightZone.get();
    }

    public getBearings() {
        return this.bearings.get();
    }

    public getDestinations() {
        return this.destinations.get();
    }

    public setBearings(bearings: ShipBearings) {
        this.bearings.set(bearings);
    }

    public isPrivileged() {
        return this.privilegedSailing.get();
    }

    public enablePrivilege() {
        this.favor.update(f => --f);
        this.isAnchored.set(true);
        this.privilegedSailing.set(true);
    }

    public rollInfluence() {
        const roll = this.validateDiceSix(Math.ceil(Math.random() * 6));
        if (roll)
            this.influence.set(roll);
    }

    public validateDiceSix(value: number): DiceSix | null {
        if (value == 1 || value == 2 || value == 3 || value == 4 || value == 5 || value == 6)
            return value;
        return null;
    }

    public getInfluence() {
        return this.influence.get();
    }

    public setInfluence(value: DiceSix) {
        this.influence.set(value);
    }

    public getCargo() {
        return this.cargo.get();
    }

    public getSpecialist() {
        return this.specialist.get();
    }
    public getSpecialistDisplayName() {
        return this.specialist.get().displayName;
    }

    public getSpecialistName() {
        return this.specialist.get().name;
    }
    public getSpecialty() {
        return this.specialist.get().specialty;
    }

    public mayLoadGood() {
        return (this.mayAct(Action.load_good) && this.hasCargoRoom(1));
    }

    public mayBuyMetal() {
        return (this.mayAct(Action.buy_metals) && this.hasCargoRoom(2));
    }

    public canDonateMetal(metal: CargoMetal) {
        return (this.mayAct(Action.donate_metals) && this.cargo.includes(metal));
    }

    public maySellSpecialtyGood() {
        return (
            this.mayAct(Action.sell_specialty)
            && this.cargo.includes(this.specialist.get().specialty)
        );
    }

    public mayUpgradeCargo() {
        return (
            this.mayAct(Action.upgrade_cargo)
            && this.getCoinAmount() >= 2
            && this.getCargo().length < 4
        );
    }

    public addCargoSpace() {
        this.cargo.addOne('empty');
    }

    public mayEndTurn(){
        return this.isAnchored.get() && !this.handlesRival();
    }

    public setCargo(cargo: Array<ItemName>) {
        this.cargo.overwrite(cargo);
    }

    public setTrades(trades: Array<MarketSlotKey>) {
        this.feasibleTrades.overwrite(trades);
    }

    public getTrades() {
        return this.feasibleTrades.get();
    }

    public getCoinAmount() {
        return this.coins.get();
    }

    public gainCoins(amount: number) {
        this.coins.update(c => c += amount);
    }

    public spendCoins(cost: number) {
        this.coins.update(c => c -= cost);
    }

    public getFavorAmount() {
        return this.favor.get();
    }

    public gainFavor(amount: number) {
        this.favor.update(f => Math.min(f + amount, MAX_FAVOR));
    }

    public spendFavor(cost: number) {
        this.favor.update(f => f -= cost)
    }

    public getActions() {
        return this.localActions.get();
    }

    public setActions(actions: Array<LocalActions>) {
        this.localActions.overwrite(actions);
    }

    public clearActions() {
        this.localActions.clear();
    }

    public handlesRival() {
        return this.isHandlingRival.get();
    }

    public enableUndo() {
        this._mayUndo.set(true);
    }

    public disableUndo() {
        this._mayUndo.set(false);
    }

    public mayUndo() {
        return this._mayUndo.get();
    }

    public freeze() {
        this.isHandlingRival.set(true);
        this.localActions.clear();
    }

    public unfreeze(actions: Array<LocalActions>, rivalZone: ZoneName) {
        this.isHandlingRival.set(false);
        this.localActions.overwrite(actions);
        this.destinations.removeOne(rivalZone);
    }

    public isFrozen() {
        return this.isHandlingRival.get();
    }

    public activate(
        zoneActions: Array<LocalActions>,
        feasibleTrades: Array<MarketSlotKey>,
        destinations: Array<ZoneName>,
        navigatorAccess: Array<ZoneName>,
    ) {
        this.isActive.set(true);
        this.isAnchored.set(false);
        this.timeStamp.set(Date.now());
        this.moveActions.set(2);
        this.localActions.overwrite(zoneActions);
        this.feasibleTrades.overwrite(feasibleTrades);
        this.destinations.overwrite(destinations);
        this.navigatorAccess.overwrite(navigatorAccess);
    }

    public deactivate() {
        this.isActive.set(false);
        this.isAnchored.set(true);
        this.privilegedSailing.set(false);
        this.moveActions.set(0);
        this.localActions.clear();
        this.destinations.clear();
        this.overnightZone.set(this.getBearings().seaZone);
    }

    // MARK: PRIVATE

    private hasCargoRoom(req: 1 | 2): boolean {
        const emptySlots = this.getCargo().filter(
            item => item === 'empty',
        ).length;

        return (emptySlots >= req);
    }
}
