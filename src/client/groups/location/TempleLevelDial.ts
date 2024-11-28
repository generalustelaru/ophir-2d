import Konva from "konva";
import { Coordinates, MetalId } from "../../../shared_types";
import { StaticGroupInterface } from "../../client_types";
// import clientConstants from "../../client_constants";

// const { CARGO_ITEM_DATA } = clientConstants;

export class TempleLevelDial implements StaticGroupInterface {
    private group: Konva.Group;

    constructor(donations: Array<MetalId>, position: Coordinates) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: 25,
            height: 100,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: 'red',
            cornerRadius: 15,
        });
        console.log('donations', donations);

        this.group.add(background);
    }

    getElement(): Konva.Group {
        return this.group;
    }
}