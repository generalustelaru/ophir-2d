import Konva from 'konva';
import clientConstants from '~/client_constants';
import { HueCombo, StaticGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';

const { SHIP_DATA } = clientConstants;
export class ShipToken implements Unique<StaticGroupInterface> {
    private group: Konva.Group | null;
    private tokenDepth: Konva.Circle;
    private tokenFace: Konva.Circle;
    private sticker: Konva.Path;

    constructor(
        options: {
            combo: HueCombo,
            position?: Coordinates,
        },
    ) {
        const { combo, position } = options;
        this.group = new Konva.Group({
            width: 60,
            height: 60,
            x: position?.x || 0,
            y: position?.y || 0,
        });

        const { light, dark, accent } = combo;

        this.tokenDepth = new Konva.Circle({
            radius: 30,
            y: 8,
            fill: dark,
            stroke: 'black',
            strokeWidth: 1,
        });
        this.tokenFace = new Konva.Circle({
            radius: 30,
            fill: light,
            stroke: accent,
            strokeWidth: 1,
        });

        this.sticker = new Konva.Path({
            x: -24, // 15
            y: -18, // 5
            data: SHIP_DATA.shape,
            fill: accent,
            scale: { x: 1.5, y: 1.5 },
            stroke: dark,
            strokeWidth: 1,
        });
        this.group.add(this.tokenDepth, this.tokenFace, this.sticker);
    }

    public getElement(): Konva.Group {
        if (!this.group)
            throw new Error('Cannot provide element. ShipToken was destroyed improperly.');

        return this.group;
    }

    public selfDecomission() {
        this.group?.destroy();
        this.group = null;

        return null;
    }
}