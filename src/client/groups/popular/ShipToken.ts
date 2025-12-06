import Konva from 'konva';
import clientConstants from '~/client_constants';
import { Hue, DynamicGroupInterface, ElementList } from '~/client_types';
import { Coordinates, NeutralColor, PlayerColor, Unique } from '~/shared_types';

const { HUES, SHIP_DATA } = clientConstants;
export class ShipToken implements Unique<DynamicGroupInterface<Hue>> {
    private group: Konva.Group | null;
    private token: Konva.Path | null;

    constructor(
        options: {
            color: PlayerColor | NeutralColor,
            stroke?: Hue
            position?: Coordinates,
        },
    ) {
        const { color, stroke, position } = options;
        this.group = new Konva.Group({
            width: 60,
            height: 60,
            x: position?.x || 0,
            y: position?.y || 0,
        });

        const mapTokenElements: ElementList = [];

        const tokenFace = new Konva.Circle({
            radius: 30,
            fill: HUES[color],
            stroke: HUES[`dark${color}`],
            strokeWidth: 1,
        });
        const tokenDepth = new Konva.Circle({
            radius: 30,
            y: 8,
            fill: HUES[`dark${color}`],
            stroke: 'black',
            strokeWidth: 1,
        });

        mapTokenElements.push(tokenDepth, tokenFace);

        this.token = new Konva.Path({
            x: -24, // 15
            y: -18, // 5
            data: SHIP_DATA.shape,
            fill: HUES[`dark${color}`],
            scale: { x: 1.5, y: 1.5 },
            stroke: HUES[`dark${color}`],
            strokeWidth: 1,
        });
        this.group.add(...mapTokenElements, this.token);
    }

    public getElement(): Konva.Group {
        if (!this.group)
            throw new Error('Cannot provide element. ShipToken was destroyed improperly.');

        return this.group;
    }

    public update(stroke: Hue): void {
        // this.token?.stroke(stroke);
    }

    public selfDecomission() {
        this.token?.destroy();
        this.token = null;

        this.group?.destroy();
        this.group = null;

        return null;
    }
}