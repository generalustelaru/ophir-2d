import Konva from "konva";
import clientConstants from "../../client_constants";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected group: Konva.Group;

    constructor(stage: Konva.Stage) {
        const width= 600;
        const height = 300;

        this.group = new Konva.Group({
            x: stage.width() / 2 - width / 2,
            y: stage.height() / 2 - height / 2,
            width,
            height,
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
}