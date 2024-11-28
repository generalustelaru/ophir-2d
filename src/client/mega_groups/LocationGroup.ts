import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData, TempleUpdate } from "../client_types";
import { MarketPlacard, TreasuryPlacard, TemplePlacard } from "../groups/GroupList";
import clientState from '../state';

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
        const setup = clientState.received.setup;
        const localPlayer = clientState.received.players.find(player => player.id === clientState.localPlayerId) || null;

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

        const heightSegment = this.group.height() / 5;

        this.marketPlacard = new MarketPlacard(
            this.stage,
            clientState.received.setup.marketFluctuations,
            clientState.received.setup.templeTradeSlot,
            clientState.received.marketOffer,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: 0,
            }
        );

        this.treasuryPlacard = new TreasuryPlacard(
            this.stage,
            {
                width: this.group.width(),
                height: heightSegment,
                x: 0,
                y: this.marketPlacard.getElement().height(),
            },
            { localPlayer: localPlayer, templeLevel: clientState.received.templeStatus.level }
        );

        this.templePlacard = new TemplePlacard(
            this.stage,
            clientState.received.setup.templeTradeSlot,
            clientState.received.marketOffer,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketPlacard.getElement().height() + this.treasuryPlacard.getElement().height(),
            }
        );

        this.group.add(
            this.marketPlacard.getElement(),
            this.treasuryPlacard.getElement(),
            this.templePlacard.getElement(),
        );
    }

    public updateElements(): void {

        const sharedState = clientState.received;
        const activePlayer = sharedState.players.find(player => player.isActive);
        const marketOffer = sharedState.marketOffer
        if (!activePlayer || !marketOffer) {
            throw new Error(`Missing state data in Location Group: {activePlayer: ${activePlayer}, market: ${marketOffer}}.`);
        }

        const localPlayer = sharedState.players.find(player => player.id === clientState.localPlayerId);
        const marketUpdate = {
            localPlayer: localPlayer ?? null,
            marketOffer: marketOffer,
        }
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            trade: sharedState.marketOffer[sharedState.setup.templeTradeSlot],
        }

        this.marketPlacard?.updateElement(marketUpdate);
        this.treasuryPlacard?.updateElement({
            localPlayer: localPlayer ?? null,
            templeLevel: sharedState.templeStatus.level
        });
        this.templePlacard?.updateElement(templeUpdate);
    }
}
