import {
    Action, CargoMetal, DiceSix, ItemName, LocationAction, MarketSlotKey,
    Player, PlayerColor, ShipBearings, ZoneName } from "../../shared_types";
import { ObjectHandler } from "../server_types";
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from "./library";

const MAX_FAVOR = 6;
export class PlayerHandler implements ObjectHandler<Player>{

    private id: Readable<PlayerColor>;
    private timeStamp: Writable<number>;
    private isIdle: Writable<boolean>;
    private name: Readable<string>;
    private turnOrder: Readable<number>;
    private isActive: Writable<boolean>;
    private bearings: Writable<ShipBearings>;
    private favor: Writable<number>;
    private privilegedSailing: Writable<boolean>;
    private influence: Writable<DiceSix>;
    private moveActions: Writable<number>;
    private isAnchored: Writable<boolean>;
    private locationActions: ArrayWritable<LocationAction>; // TODO:  return null on empty array, shoud remove null or adapt writable function
    private allowedMoves: ArrayWritable<ZoneName>;
    private hasCargo: Writable<boolean>;
    private cargo: ArrayWritable<ItemName>;
    private feasibleTrades: ArrayWritable<MarketSlotKey>;
    private coins: Writable<number>;

    constructor(player: Player) {
        this.id = readable(player.id);
        this.timeStamp = writable(player.timeStamp);
        this.isIdle = writable(player.isIdle);
        this.name = readable(player.name);
        this.turnOrder = readable(player.turnOrder);
        this.isActive = writable(player.isActive);
        this.bearings = writable(player.bearings);
        this.favor = writable(player.favor);
        this.privilegedSailing = writable(player.privilegedSailing);
        this.influence = writable(player.influence);
        this.moveActions = writable(player.moveActions);
        this.isAnchored = writable(player.isAnchored);
        this.locationActions = arrayWritable(player.locationActions || []);
        this.allowedMoves = arrayWritable(player.allowedMoves);
        this.hasCargo = writable(player.hasCargo);
        this.cargo = arrayWritable(player.cargo);
        this.feasibleTrades = arrayWritable(player.feasibleTrades);
        this.coins = writable(player.coins);
    }

    public toDto(): Player {
        return {
            id: this.id.get(),
            timeStamp: this.timeStamp.get(),
            isIdle: this.isIdle.get(),
            name: this.name.get(),
            turnOrder: this.turnOrder.get(),
            isActive: this.isActive.get(),
            bearings: this.bearings.get(),
            favor: this.favor.get(),
            privilegedSailing: this.privilegedSailing.get(),
            influence: this.influence.get(),
            moveActions: this.moveActions.get(),
            isAnchored: this.isAnchored.get(),
            locationActions: this.locationActions.count() ? this.locationActions.getAll() : null,
            allowedMoves: this.allowedMoves.getAll(),
            hasCargo: this.hasCargo.get(),
            cargo: this.cargo.getAll(),
            feasibleTrades: this.feasibleTrades.getAll(),
            coins: this.coins.get(),
        }
    }

    // MARK: PUBLIC

    public refreshTimeStamp() {
        this.isIdle.reset();
        this.timeStamp.set(Date.now());
    }

    public getIdentity() {
        return {
            id: this.id.get(),
            name: this.name.get(),
            order: this.turnOrder.get()
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
        return Boolean(this.allowedMoves.findOne(destination))
    }

    public setDestinationOptions(options: Array<ZoneName>) {
        this.allowedMoves.overwrite(options);
    }

    public setAnchoredActions(actions?: Array<LocationAction>) {
        this.isAnchored.set(true);
        this.locationActions.overwrite(actions || []);
    }

    public spendMove() {
        this.moveActions.update(a => --a);
    }

    public clearMoves() {
        this.moveActions.set(0);
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
        return this.cargo.getAll();
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

    public mayDonateMetal(metal: CargoMetal) {
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
        this.cargo.add('empty');
    }

    public mayEndTurn(){
        return this.isAnchored.get();
    }

    public setCargo(cargo: Array<ItemName>) {
        const hasItems = !!cargo.find(item => item !== 'empty')
        this.hasCargo.set(hasItems);
        this.cargo.overwrite(cargo);
    }

    public setTrades(trades: Array<MarketSlotKey>) {
        this.feasibleTrades.overwrite(trades);
    }

    public getTrades() {
        return this.feasibleTrades.getAll();
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
    public getActions() {
        return this.locationActions.getAll();
    }

    public setActions(actions: Array<LocationAction>) {
        this.locationActions.overwrite(actions);
    }

    public clearActions() {
        this.locationActions.overwrite([]);
    }

    public activate(newActions: Array<LocationAction>) {
        this.isActive.set(true);
        this.isAnchored.set(false);
        this.moveActions.set(2);
        this.timeStamp.set(Date.now());
        this.setActions(newActions);
    }

    public deactivate() {
        this.isActive.set(false);
        this.privilegedSailing.set(false);
        this.clearActions();
    }

    // MARK: PRIVATE

    private hasCargoRoom(req: 1 | 2): boolean {
        const emptySlots = this.getCargo().filter(
            item => item === 'empty',
        ).length;

        return (emptySlots >= req);
    }

}