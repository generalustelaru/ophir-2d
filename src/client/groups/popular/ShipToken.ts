import Konva from 'konva';
import clientConstants from '~/client_constants';
import { Color, DynamicGroupInterface } from '~/client_types';
import { Coordinates, NeutralColor, PlayerColor, Unique } from '~/shared_types';

const { COLOR, SHIP_DATA } = clientConstants;
export class ShipToken implements Unique<DynamicGroupInterface<Color>> {
    group: Konva.Group;
    token: Konva.Path;

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

            this.group.add(tokenDepth, tokenFace);
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
        this.group.add(this.token);
    }

    getElement(): Konva.Group {
        return this.group;
    }

    update(stroke: Color): void {
        this.token.stroke(stroke);
    }
}