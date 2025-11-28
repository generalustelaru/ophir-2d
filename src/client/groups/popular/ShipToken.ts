import Konva from 'konva';
import clientConstants from '~/client_constants';
import { Color, DynamicGroupInterface, ElementList } from '~/client_types';
import { Coordinates, NeutralColor, PlayerColor, Unique } from '~/shared_types';

const { COLOR, SHIP_DATA } = clientConstants;
export class ShipToken implements Unique<DynamicGroupInterface<Color>> {
    private group: Konva.Group | null;
    private token: Konva.Path | null;

    constructor(
        color: PlayerColor | NeutralColor,
        options?: {
            stroke?: Color
            position?: Coordinates,
            scale?: number
        },
        isMapToken: boolean = true,
    ) {
        this.group = new Konva.Group({
            width: 60,
            height: 60,
            x: options?.position?.x || 0,
            y: options?.position?.y || 0,
        });

        const mapTokenElements: ElementList = [];

        if (isMapToken) {
            const tokenFace = new Konva.Circle({
                radius: 30,
                fill: COLOR[color],
                stroke: 'black',
                strokeWidth: 1,
            });
            const tokenDepth = new Konva.Circle({
                radius: 30,
                y: 8,
                fill: COLOR[`dark${color}`],
                stroke: 'black',
                strokeWidth: 1,
            });

            mapTokenElements.push(tokenDepth, tokenFace);
        }

        const scale = options?.scale || 1.5;
        this.token = new Konva.Path({
            x: -24,// 15
            y: -18, // 5
            data: SHIP_DATA.shape,
            fill: COLOR[color],
            scale: { x: scale, y: scale },
            stroke: options?.stroke || COLOR.shipBorder,
            strokeWidth: 2,
        });
        this.group.add(...mapTokenElements, this.token);
    }

    public getElement(): Konva.Group {
        if (!this.group)
            throw new Error('Cannot provide element. ShipToken was destroyed improperly.');

        return this.group;
    }

    public update(stroke: Color): void {
        this.token?.stroke(stroke);
    }

    public selfDecomission() {
        this.token?.destroy();
        this.token = null;

        this.group?.destroy();
        this.group = null;

        return null;
    }
}