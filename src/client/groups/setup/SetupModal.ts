import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";

type ModalDigest = {}
export class SetupModal implements DynamicGroupInterface<ModalDigest> {
    private group: Konva.Group

    constructor(layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        const background = new Konva.Rect({
            // x: 50,
            // y: 50,
            width: this.group.width(),
            height: this.group.height(),
            cornerRadius: 15,
            fill: '#002255',
        });

        this.group.add(background);
    }

    public getElement() {
        return this.group;
    }

    public update(digest: ModalDigest) {
        console.log(digest);
    }

    public switchVisibility() {
        this.group.visible()
            ? this.group.hide()
            : this.group.show()
    }
}
