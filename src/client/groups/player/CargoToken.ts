import Konva from "konva";
import { ActionButton } from "../ActionButton";
import { Coordinates, ManifestItem } from "../../../shared_types";
import clientConstants from "../../client_constants";
type CargoTokenUpdate = {
    itemId: ManifestItem
}

const { CARGO_ITEM_DATA } = clientConstants;

export class CargoToken extends ActionButton {
    private path: Konva.Path;
    constructor(stage: Konva.Stage, position: Coordinates, update: CargoTokenUpdate) {
        super(
            stage,
            { width: 0, height: 0, x: position.x, y: position.y },
            null,
        );

        const tokenData = CARGO_ITEM_DATA[update.itemId];

        this.path = new Konva.Path({
            x: position.x,
            y: position.y,
            data: tokenData.shape,
            fill: tokenData.fill,
            stroke: 'white',
            strokeWidth: 1,
            scale: { x: 2, y: 2 },
        });

        this.group.width(this.path.width());
        this.group.height(this.path.height());

        this.group.add(this.path);
    }
}