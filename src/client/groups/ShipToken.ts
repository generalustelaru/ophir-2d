import Konva from 'konva';
import clientConstants from "~/client_constants";
import { Color, DynamicGroupInterface } from "~/client_types";
import { Coordinates } from '~/shared_types';

const { COLOR, SHIP_DATA } = clientConstants;
export class ShipToken implements DynamicGroupInterface<Color> {
    group: Konva.Group;
    token: Konva.Path;

    constructor(
        fill: Color,
        options?: {
            stroke?: Color
            scale?: Coordinates
        }
    ) {
        this.group = new Konva.Group();

        this.token = new Konva.Path({
            x: -15,
            y: -5,
            data: SHIP_DATA.shape,
            fill,
            scale: {x: 1.5, y: 1.5},
            stroke: options?.stroke || COLOR.shipBorder,
            strokeWidth: 2,
        });
        this.group.add(this.token)
    }

    getElement(): Konva.Group {
        return this.group;
    }

    update(stroke: Color): void {
        this.token.stroke(stroke);
    }
}