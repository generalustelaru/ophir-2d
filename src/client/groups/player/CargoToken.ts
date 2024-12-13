import Konva from "konva";
import { ActionButton } from "../ActionButton";
import { Coordinates, ItemId } from "../../../shared_types";
import clientConstants from "../../client_constants";


const { CARGO_ITEM_DATA } = clientConstants;

export class CargoToken extends ActionButton {
    private path: Konva.Path;

    constructor(stage: Konva.Stage, position: Coordinates, itemId: ItemId) {
        super(
            stage,
            { width: 0, height: 0, x: position.x, y: position.y },
            {action: 'drop_item', payload: {item: itemId} },
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
        this.setEnabled(true);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public selfDestruct(): null {
        this.group.destroy();
        return null;
    }
}
