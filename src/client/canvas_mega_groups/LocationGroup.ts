import Konva from "konva";
import { MegaGroupInterface, GroupLayoutData } from "../client_types";
import { MarketCard, ExchangeCard, TempleCard } from "../canvas_groups/CanvasGroups";
import clientState from '../state';
import { HexId, SettlementId } from "../../shared_types";

type Locations = {
    market: HexId;
    exchange: HexId;
    temple: HexId;
};

export class LocationGroup implements MegaGroupInterface {

    private group: Konva.Group;
    private marketCard: MarketCard | null = null;
    private exchangeCard: ExchangeCard | null = null;
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
    }

    public drawElements(): void {
        const setup = clientState.received.setup;

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

        this.locations = this.matchLocations(setup.settlements);

        const heightSegment = this.group.height() / 5;
        this.marketCard = new MarketCard(
            this.locations.market,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: 0,
            }
        );

        this.exchangeCard = new ExchangeCard(
            this.locations.exchange,
            {
                width: this.group.width(),
                height: heightSegment,
                x: 0,
                y: this.marketCard.getElement().height(),
            }
        );

        this.templeCard = new TempleCard(
            this.locations.temple,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketCard.getElement().height() + this.exchangeCard.getElement().height(),
            }
        );

        this.group.add(
            this.marketCard.getElement(),
            this.exchangeCard.getElement(),
            this.templeCard.getElement(),
        );
    }

    public updateElements(): void {

        const activePlayer = clientState.received.players.find(player => player.isActive);

        if (!activePlayer) {
            throw new Error('No active player found.');
        }

        const activeHex = activePlayer.location.hexId;
        this.marketCard?.updateElement(activeHex);
        this.exchangeCard?.updateElement(activeHex);
        this.templeCard?.updateElement(activeHex);
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
