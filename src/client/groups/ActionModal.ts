import Konva from "konva";
import clientConstants from "../client_constants";
import { ActionButton } from "./ActionButton";
import { DynamicGroupInterface } from "../client_types";

const { COLOR } = clientConstants;
export class ActionModal implements DynamicGroupInterface<Array<ActionButton>> {
    private group: Konva.Group;

    constructor(stage: Konva.Stage) {
        this.group = new Konva.Group({
            x: 0,
            y: 0,
            width: 600,
            height: 300,
            visible: false,
        });

        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.modalBlue,
            cornerRadius: 10,
        });

        this.group.add(background);
        stage.getLayers()[1].add(this.group);
        // this.group.hide(); // Initially hide the modal
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public open() {
        this.group.show();
    }

    public close() {
        this.group.hide();
    }

    update(actions: Array<ActionButton>) {
        console.log("Setting actions in the modal:", actions);
        // Logic to set actions in the modal
    }
}