import Konva from 'konva';
import { Coordinates, ItemName } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA, COLOR } = clientConstants;

export class TradeGoodToken extends Button {
    private path: Konva.Path;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        name: ItemName,
        callback: ((index: number) => void) | null,
    ) {
        super(
            stage,
            { ...position, width: 0, height: 0 },
            callback,
        );

        callback && this.group.add(new Konva.Rect({
            width: 30,
            height: 30,
            stroke: COLOR.boneWhite,
            strokeWidth: 1,
            x: -3,
            y: -3,
            cornerRadius: 5,
            fill: COLOR.modalLightBlue,
        }));

        const tokenData = CARGO_ITEM_DATA[name];

        this.path = new Konva.Path({
            data: tokenData.shape,
            fill: tokenData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });

        this.group.width(this.path.width());
        this.group.height(this.path.height());

        this.group.add(this.path);
        callback && this.enable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public selfDestruct(): null {
        this.group.destroy();
        return null;
    }
}
