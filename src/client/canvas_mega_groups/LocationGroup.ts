import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData, TempleUpdate } from "../client_types";
import { MarketCard, ExchangePlacard, TempleCard } from "../canvas_groups/CanvasGroups";
import clientState from '../state';
import { HexId, SettlementId } from "../../shared_types";

type Locations = {
    market: HexId;
    exchange: HexId;
    temple: HexId;
};

export class LocationGroup implements MegaGroupInterface {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private marketCard: MarketCard | null = null;
    private exchangePlacard: ExchangePlacard | null = null;
    private templeCard: TempleCard | null = null;
    private locations: Locations | null = null;

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

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

        this.locations = this.matchLocations(setup.settlements);
        const heightSegment = this.group.height() / 5;

        this.marketCard = new MarketCard(
            this.stage,
            clientState.received.setup.marketFluctuations,
            clientState.received.setup.templeTradeSlot,
            clientState.received.market,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: 0,
            }
        );

        this.exchangePlacard = new ExchangePlacard(
            this.locations.exchange,
            {
                width: this.group.width(),
                height: heightSegment,
                x: 0,
                y: this.marketCard.getElement().height(),
            }
        );

        const templeContractSlot = clientState.received.setup.templeTradeSlot;
        const contract  = clientState.received.market[templeContractSlot];

        this.templeCard = new TempleCard(
            this.stage,
            contract,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketCard.getElement().height() + this.exchangePlacard.getElement().height(),
            }
        );

        this.group.add(
            this.marketCard.getElement(),
            this.exchangePlacard.getElement(),
            this.templeCard.getElement(),
        );
    }

    public updateElements(): void {

        const sharedState = clientState.received;
        const activePlayer = sharedState.players.find(player => player.isActive);
        const marketOffer = sharedState.market
        if (!activePlayer || !marketOffer) {
            throw new Error(`Missing state data in Location Group: {activePlayer: ${activePlayer}, market: ${marketOffer}}.`);
        }

        const localPlayer = sharedState.players.find(player => player.id === clientState.localPlayerId);
        const marketUpdate = {
            localPlayer: localPlayer ?? null,
            contracts: marketOffer,
        }
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            contract: sharedState.market[sharedState.setup.templeTradeSlot],
        }

        this.marketCard?.updateElement(marketUpdate);
        this.exchangePlacard?.updateElement(activePlayer.location.hexId);
        this.templeCard?.updateElement(templeUpdate);
    }

    private matchLocations(settlements: Record<HexId, SettlementId>|null): Locations {

        if (!settlements) {
            throw new Error('No settlements found in setup.');
        }

        const locations = Object.fromEntries(
            Object.entries(settlements)
                .map(([key, value]) => [value, key])
        );

        const match = {
            market: locations.market,
            exchange: locations.exchange,
            temple: locations.temple,
        } as Locations;

        return match;
    }
}
