import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData, TempleUpdate } from "../client_types";
import { MarketPlacard, ExchangePlacard, TemplePlacard } from "../groups/GroupList";
import clientState from '../state';
import { Location, HexId } from "../../shared_types";

type Locations = {
    market: HexId;
    exchange: HexId;
    temple: HexId;
};

export class LocationGroup implements MegaGroupInterface {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private marketPlacard: MarketPlacard | null = null;
    private exchangePlacard: ExchangePlacard | null = null;
    private templePlacard: TemplePlacard | null = null;
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

        this.locations = this.matchLocations(setup.mapPairings);

        const heightSegment = this.group.height() / 5;

        this.marketPlacard = new MarketPlacard(
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
                y: this.marketPlacard.getElement().height(),
            }
        );

        this.templePlacard = new TemplePlacard(
            this.stage,
            clientState.received.setup.templeTradeSlot,
            clientState.received.market,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketPlacard.getElement().height() + this.exchangePlacard.getElement().height(),
            }
        );

        this.group.add(
            this.marketPlacard.getElement(),
            this.exchangePlacard.getElement(),
            this.templePlacard.getElement(),
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

        this.marketPlacard?.updateElement(marketUpdate);
        this.exchangePlacard?.updateElement(activePlayer.hexagon.hexId);
        this.templePlacard?.updateElement(templeUpdate);
    }

    private matchLocations(locationPairings: Record<HexId, Location>|null): Locations {

        if (!locationPairings) {
            throw new Error('No settlements found in setup.');
        }

        const locations = Object.fromEntries(
            Object.entries(locationPairings)
                .map(([hexId, actionPairing]) => [actionPairing.id, hexId])
        );

        const match = {
            market: locations.market,
            exchange: locations.exchange,
            temple: locations.temple,
        } as Locations;

        return match;
    }
}
