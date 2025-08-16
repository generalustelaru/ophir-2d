import Konva from "konva";
import clientConstants from "../../client_constants";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected group: Konva.Group;

    constructor(stage: Konva.Stage) {
        const width= 600;
        const height = 300;

        this.group = new Konva.Group({
            width: stage.width(),
            height: stage.height(),
            visible: false,
        });

        const lockLayer = new Konva.Rect({
            width: stage.width(),
            height: stage.height(),
        })

        const background = new Konva.Rect({
            x: stage.width() / 2 - width / 2,
            y: stage.height() / 2 - height / 2,
            width,
            height,
            fill: COLOR.modalBlue,
            cornerRadius: 10,
        });

        this.group.add(lockLayer, background);
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