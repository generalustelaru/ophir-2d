import {
    Action, CargoMetal, DiceSix, ItemName, LocalAction, Player, PlayerColor, ShipBearings, ZoneName,
    Specialist, SpecialistName, FeasiblePurchase, Unique, FeasibleTrade, BubbleDeed,
} from '~/shared_types';
import { ActionsAndDetails, ObjectHandler, PlayerIdentity, UserId } from '~/server_types';
import { writable, Writable, readable, Readable, arrayWritable, ArrayWritable } from './library';

const MAX_FAVOR = 6;
export class PlayerHandler implements Unique<ObjectHandler<Player>>{

    private userId: Readable<UserId>;
    private color: Readable<PlayerColor>;
    private name: Readable<string>;
    private turnOrder: Readable<number>;
    private specialist: Readable<Specialist>;
    private isActive: Writable<boolean>;
    private bubbleDeeds: Writable<Array<BubbleDeed>>;
    private _mayUndo: Writable<boolean>;
    private bearings: Writable<ShipBearings>;
    private overnightZone: Writable<ZoneName>;
    private favor: Writable<number>;
    private privilegedSailing: Writable<boolean>;
    private influence: Writable<DiceSix>;
    private moveActions: Writable<number>;
    private _isAnchored: Writable<boolean>;
    private isHandlingRival: Writable<boolean>;
    private localActions: ArrayWritable<LocalAction>;
    private destinations: ArrayWritable<ZoneName>;
    private navigatorAccess: ArrayWritable<ZoneName>;
    private cargo: ArrayWritable<ItemName>;
    private feasibleTrades: ArrayWritable<FeasibleTrade>;
    private feasiblePurchases: ArrayWritable<FeasiblePurchase>;
    private coins: Writable<number>;
    private turnPurchases: Writable<number>;

    /**
     * @throws Instantiation error
     */
    constructor(playerDto: Player, userId: UserId) {
        this.userId = readable(userId);
        this.color = readable(playerDto.color);
        this.name = readable(playerDto.name);
        this.turnOrder = readable(playerDto.turnOrder);
        this.specialist = readable(playerDto.specialist);
        this.isActive = writable(playerDto.isActive);
        this.bubbleDeeds = writable(playerDto.bubbleDeeds);
        this._mayUndo = writable(playerDto.mayUndo);
        this.bearings = writable(playerDto.bearings);
        this.overnightZone = writable(playerDto.overnightZone);
        this.favor = writable(playerDto.favor);
        this.privilegedSailing = writable(playerDto.privilegedSailing);
        this.influence = writable(playerDto.influence);
        this.moveActions = writable(playerDto.moveActions);
        this._isAnchored = writable(playerDto.isAnchored);
        this.isHandlingRival = writable(playerDto.isHandlingRival);
        this.localActions = arrayWritable(playerDto.locationActions);
        this.destinations = arrayWritable(playerDto.destinations);
        this.navigatorAccess = arrayWritable(playerDto.navigatorAccess);
        this.cargo = arrayWritable(playerDto.cargo);
        this.feasibleTrades = arrayWritable(playerDto.feasibleTrades);
        this.feasiblePurchases = arrayWritable(playerDto.feasiblePurchases);
        this.coins = writable(playerDto.coins);
        this.turnPurchases = writable(playerDto.turnPurchases);
    }

    public toDto(): Player {
        return {
            color: this.color.get(),
            name: this.name.get(),
            turnOrder: this.turnOrder.get(),
            specialist: this.specialist.get(),
            isActive: this.isActive.get(),
            bubbleDeeds: this.bubbleDeeds.get(),
            mayUndo: this._mayUndo.get(),
            bearings: this.bearings.get(),
            overnightZone: this.overnightZone.get(),
            favor: this.favor.get(),
            privilegedSailing: this.privilegedSailing.get(),
            influence: this.influence.get(),
            moveActions: this.moveActions.get(),
            isAnchored: this._isAnchored.get(),
            isHandlingRival: this.isHandlingRival.get(),
            locationActions: this.localActions.getAll(),
            destinations: this.destinations.getAll(),
            navigatorAccess: this.navigatorAccess.getAll(),
            cargo: this.cargo.getAll(),
            feasibleTrades: this.feasibleTrades.getAll(),
            feasiblePurchases: this.feasiblePurchases.getAll(),
            coins: this.coins.get(),
            turnPurchases: this.turnPurchases.get(),
        };
    }

    // MARK: PUBLIC
    public getIdentity(): PlayerIdentity {
        return {
            userId: this.userId.get(),
            color: this.color.get(),
            name: this.name.get(),
            turnOrder: this.turnOrder.get(),
        };
    }

    public isActivePlayer() {
        return this.isActive.get();
    }

    public addBubbleDeed(deed: BubbleDeed) {
        this.bubbleDeeds.update(arr => {
            arr.pop();
            arr.push(deed);
            if (false == [BubbleDeed.anchor, BubbleDeed.idle, BubbleDeed.active].includes(deed))
                arr.push(BubbleDeed.active);
            return arr;
        });
    }

    public hasAction(action: LocalAction) {
        return this._isAnchored && this.getActions().includes(action);
    }

    public getMoves() {
        return this.moveActions.get();
    }

    public getFavor() {
        return this.favor.get();
    }

    public isDestinationValid(destination: ZoneName) {
        return Boolean(this.destinations.getOne(destination));
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

    public setActionsAndDetails(data: ActionsAndDetails) {
        this.localActions.overwrite(data.actions);
        this.feasibleTrades.overwrite(data.trades);
        this.feasiblePurchases.overwrite(data.purchases);
    }

    public anchorShip() {
        this._isAnchored.set(true);
    }

    public appendActions(actions: Array<LocalAction>) {
        for(const action of actions) {
            this.localActions.addOne(action);
        }
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

    public isChancellor() {
        return this.getSpecialistName() === SpecialistName.chancellor;
    }

    public isAdvisor() {
        return this.getSpecialistName() === SpecialistName.advisor;
    }

    public isPeddler() {
        return this.getSpecialistName() == SpecialistName.peddler;
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
        return this.destinations.getAll();
    }

    public setBearings(bearings: ShipBearings) {
        this.bearings.set(bearings);
    }

    public isPrivileged() {
        return this.privilegedSailing.get();
    }

    public enablePrivilege() {
        this.favor.update(f => --f);
        this._isAnchored.set(true);
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
        return this.cargo.getAll();
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

    public mayLoadCommodity() {
        return (this.hasAction(Action.load_commodity) && this.hasCargoRoom(1));
    }

    public registerMetalPurchase() {
        this.turnPurchases.update(count => ++count);
    }
    public mayBuyMetal() { // TODO: try removing hasAction() checks and use addSpentAction() instead where needed.
        return (this.hasAction(Action.buy_metal) && this.hasCargoRoom(2) && this.turnPurchases.get() < 2);
    }

    public hasPurchaseAllowance() {
        return this.turnPurchases.get() < 2;
    }

    public canDonateMetal(metal: CargoMetal) {
        return (this.hasAction(Action.donate_metal) && this.cargo.includes(metal));
    }

    public maySellSpecialty() {
        return (
            this.hasAction(Action.sell_specialty)
            && this.cargo.includes(this.specialist.get().specialty)
        );
    }

    public mayUpgradeCargo() {
        return (
            this.hasAction(Action.upgrade_cargo)
            && this.getCoinAmount() >= 2
            && this.getCargo().length < 4
        );
    }

    public addCargoSpace() {
        this.cargo.addOne('empty');
    }

    public isAnchored(){
        return this._isAnchored.get();
    }

    public setCargo(cargo: Array<ItemName>) {
        this.cargo.overwrite(cargo);
    }

    public setFeasibles(trades: Array<FeasibleTrade>) {
        this.feasibleTrades.overwrite(trades);
    }

    public getFeasibles() {
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

    public gainFavor(amount: number) {
        this.favor.update(f => Math.min(f + amount, MAX_FAVOR));
    }

    public spendFavor(cost: number) {
        this.favor.update(f => f -= cost);
    }

    public getActions() {
        return this.localActions.getAll();
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

    public unfreeze(rivalZone: ZoneName) {
        this.destinations.removeOne(rivalZone);
        this.isHandlingRival.set(false);
    }

    public isFrozen() {
        return this.isHandlingRival.get();
    }

    public activate(
        destinations: Array<ZoneName>,
        navigatorAccess: Array<ZoneName>,
    ) {
        this.isActive.set(true);
        this._isAnchored.set(false);
        this.moveActions.set(2);
        this.destinations.overwrite(destinations);
        this.navigatorAccess.overwrite(navigatorAccess);
        this.turnPurchases.set(0);
        this.bubbleDeeds.set([BubbleDeed.active]);
    }

    public deactivate() {
        this.isActive.set(false);
        this._isAnchored.set(true);
        this.privilegedSailing.set(false);
        this.moveActions.set(0);
        this.localActions.clear();
        this.feasibleTrades.clear();
        this.destinations.clear();
        this.overnightZone.set(this.getBearings().seaZone);
        this.addBubbleDeed(BubbleDeed.anchor);
    }

    private hasCargoRoom(req: 1 | 2): boolean {
        const emptySlots = this.getCargo().filter(
            item => item == 'empty',
        ).length;

        return (emptySlots >= req);
    }
}
