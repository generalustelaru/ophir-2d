import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData, TempleUpdate, MarketUpdate } from "../client_types";
import { MarketPlacard, TreasuryPlacard, TemplePlacard } from "../groups/GroupList";
import localState from '../state';
import { PlayState } from "../../shared_types";

export class LocationGroup implements MegaGroupInterface {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private marketPlacard: MarketPlacard | null = null;
    private treasuryPlacard: TreasuryPlacard | null = null;
    private templePlacard: TemplePlacard | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height - 20,
            x: layout.x + 10,
            y: layout.y + 10,
        });
        stage.getLayers()[0].add(this.group);
        this.stage = stage;
    }

    public drawElements(state: PlayState): void {
        const setup = state.setup;
        const localPlayer = state.players.find(player => player.id === localState.playerColor) || null;

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

        const heightSegment = this.group.height() / 9;

        this.marketPlacard = new MarketPlacard(
            this.stage,
            state.setup.marketFluctuations,
            state.setup.templeTradeSlot,
            state.market,
            {
                width: this.group.width(),
                height: heightSegment * 3,
                x: 0,
                y: 0,
            }
        );

        this.treasuryPlacard = new TreasuryPlacard(
            this.stage,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketPlacard.getElement().height(),
            },
            { localPlayer: localPlayer, tier: state.temple.treasury, metalSupplies: state.itemSupplies.metals }
        );

        this.templePlacard = new TemplePlacard(
            this.stage,
            state.setup.templeTradeSlot,
            state.market,
            {
                width: this.group.width(),
                height: heightSegment * 4,
                x: 0,
                y: this.marketPlacard.getElement().height() + this.treasuryPlacard.getElement().height(),
            },
            state.temple.maxLevel
        );

        this.group.add(
            this.marketPlacard.getElement(),
            this.treasuryPlacard.getElement(),
            this.templePlacard.getElement(),
        );
    }

    public update(state: PlayState): void {

        const activePlayer = state.players.find(player => player.isActive);
        const marketOffer = state.market
        if (!activePlayer || !marketOffer) {
            throw new Error(`Missing state data in Location Group: {activePlayer: ${activePlayer}, market: ${marketOffer}}.`);
        }

        const localPlayer = state.players.find(player => player.id === localState.playerColor);
        const marketUpdate: MarketUpdate = {
            localPlayer: localPlayer ?? null,
            marketOffer: marketOffer,
        }
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            templeStatus: state.temple,
            trade: state.market[state.setup.templeTradeSlot],
        }

        this.marketPlacard?.update(marketUpdate);
        this.treasuryPlacard?.update({
            localPlayer: localPlayer ?? null,
            tier: state.temple.treasury,
            metalSupplies: state.itemSupplies.metals,
        });
        this.templePlacard?.update(templeUpdate);
    }

    public disable(): void {
        this.marketPlacard?.disable();
        this.treasuryPlacard?.disable();
        this.templePlacard?.disable();
    }

}
