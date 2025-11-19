import Konva from 'konva';
import { Coordinates, ItemName } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA } = clientConstants;

export class ItemToken extends Button {
    private path: Konva.Path;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        itemId: ItemName,
        callback: Function | null,
    ) {
        super(
            stage,
            { width: 0, height: 0, x: position.x, y: position.y },
            callback,
        );

        const tokenData = CARGO_ITEM_DATA[itemId];

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
