import {
    Action, CargoMetal, DiceSix, ItemName, LocationAction, MarketSlotKey, Player, PlayerColor, ShipBearings, ZoneName,
    Specialist,
} from "../../shared_types";
import { ObjectHandler, PlayerIdentity } from "../server_types";
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
    private bearings: Writable<ShipBearings>;
    private overnightZone: Writable<ZoneName>;
    private favor: Writable<number>;
    private privilegedSailing: Writable<boolean>;
    private influence: Writable<DiceSix>;
    private moveActions: Writable<number>;
    private isAnchored: Writable<boolean>;
    private isHandlingRival: Writable<boolean>;
    private locationActions: ArrayWritable<LocationAction>;
    private destinations: ArrayWritable<ZoneName>;
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
        this.bearings = writable(player.bearings);
        this.overnightZone = writable(player.overnightZone);
        this.favor = writable(player.favor);
        this.privilegedSailing = writable(player.privilegedSailing);
        this.influence = writable(player.influence);
        this.moveActions = writable(player.moveActions);
        this.isAnchored = writable(player.isAnchored);
        this.isHandlingRival = writable(player.isHandlingRival);
        this.locationActions = arrayWritable(player.locationActions);
        this.destinations = arrayWritable(player.destinations);
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
            bearings: this.bearings.get(),
            overnightZone: this.overnightZone.get(),
            favor: this.favor.get(),
            privilegedSailing: this.privilegedSailing.get(),
            influence: this.influence.get(),
            moveActions: this.moveActions.get(),
            isAnchored: this.isAnchored.get(),
            isHandlingRival: this.isHandlingRival.get(),
            locationActions: this.locationActions.get(),
            destinations: this.destinations.get(),
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

    public canAct(action: LocationAction) {
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

    public setDestinationOptions(options: Array<ZoneName>) {
        this.destinations.overwrite(options);
    }

    public setAnchoredActions(actions: Array<LocationAction>) {
        this.isAnchored.set(true);
        this.locationActions.overwrite(actions);
    }

    public spendMove() {
        this.moveActions.update(a => --a);
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
        const roll = Math.ceil(Math.random() * 6);
        this.influence.set(roll as DiceSix);
    }

    public getInfluence() {
        return this.influence.get();
    }

    public getCargo() {
        return this.cargo.get();
    }

    public mayLoadGood() {
        return (
            this.isAnchored.get()
            && this.hasCargoRoom(1)
            && this.locationActions.includes(Action.load_good)
        );
    }

    public mayLoadMetal() {
        return (
            this.isAnchored.get()
            && this.hasCargoRoom(2)
            && this.locationActions.includes(Action.buy_metals)
        );
    }

    public canDonateMetal(metal: CargoMetal) {
        return (
            this.isAnchored.get()
            && this.cargo.includes(metal)
            && this.locationActions.includes(Action.donate_metals)
        );
    }

    public mayUpgradeCargo() {
        return (
            this.isAnchored.get()
            && this.getCoinAmount() >= 2
            && this.getCargo().length < 4
            && this.getActions().includes(Action.upgrade_cargo)
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
        return this.locationActions.get();
    }

    public setActions(actions: Array<LocationAction>) {
        this.locationActions.overwrite(actions);
    }

    public clearActions() {
        this.locationActions.clear();
    }

    public handlesRival() {
        return this.isHandlingRival.get();
    }

    public freeze() {
        this.isHandlingRival.set(true);
        this.locationActions.clear();
    }

    public unfreeze(actions: Array<LocationAction>, rivalZone: ZoneName) {
        this.isHandlingRival.set(false);
        this.locationActions.overwrite(actions);
        this.destinations.removeOne(rivalZone);
    }

    public isFrozen() {
        return this.isHandlingRival.get();
    }

    public activate(zoneActions: Array<LocationAction>, destinations: Array<ZoneName>) {
        this.isActive.set(true);
        this.isAnchored.set(false);
        this.timeStamp.set(Date.now());
        this.moveActions.set(2);
        this.locationActions.overwrite(zoneActions);
        this.destinations.overwrite(destinations);
    }

    public deactivate() {
        this.isActive.set(false);
        this.isAnchored.set(true);
        this.privilegedSailing.set(false);
        this.moveActions.set(0);
        this.locationActions.clear();
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
