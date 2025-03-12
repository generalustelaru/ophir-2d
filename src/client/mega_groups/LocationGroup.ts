import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData, TempleUpdate, MarketUpdate } from "../client_types";
import { MarketPlacard, TreasuryPlacard, TemplePlacard } from "../groups/GroupList";
import state from '../state';

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

    public drawElements(): void {
        const setup = state.received.setup;
        const localPlayer = state.received.players.find(player => player.id === state.local.playerColor) || null;

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

        const heightSegment = this.group.height() / 9;

        this.marketPlacard = new MarketPlacard(
            this.stage,
            state.received.setup.marketFluctuations,
            state.received.setup.templeTradeSlot,
            state.received.market,
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
            { localPlayer: localPlayer, tier: state.received.temple.treasury }
        );

        this.templePlacard = new TemplePlacard(
            this.stage,
            state.received.setup.templeTradeSlot,
            state.received.market,
            {
                width: this.group.width(),
                height: heightSegment * 4,
                x: 0,
                y: this.marketPlacard.getElement().height() + this.treasuryPlacard.getElement().height(),
            },
            state.received.temple.maxLevel
        );

        this.group.add(
            this.marketPlacard.getElement(),
            this.treasuryPlacard.getElement(),
            this.templePlacard.getElement(),
        );
    }

    public update(): void {

        const sharedState = state.received;
        const activePlayer = sharedState.players.find(player => player.isActive);
        const marketOffer = sharedState.market
        if (!activePlayer || !marketOffer) {
            throw new Error(`Missing state data in Location Group: {activePlayer: ${activePlayer}, market: ${marketOffer}}.`);
        }

        const localPlayer = sharedState.players.find(player => player.id === state.local.playerColor);
        const marketUpdate: MarketUpdate = {
            localPlayer: localPlayer ?? null,
            marketOffer: marketOffer,
        }
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            templeStatus: sharedState.temple,
            trade: sharedState.market[sharedState.setup.templeTradeSlot],
        }

        this.marketPlacard?.update(marketUpdate);
        this.treasuryPlacard?.update({
            localPlayer: localPlayer ?? null,
            tier: sharedState.temple.treasury,
        });
        this.templePlacard?.update(templeUpdate);
    }

    public disable(): void {
        this.marketPlacard?.disable();
        this.treasuryPlacard?.disable();
        this.templePlacard?.disable();
    }

}
