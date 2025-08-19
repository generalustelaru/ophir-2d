import Konva from "konva";
import clientConstants from "../../client_constants";
import { CancelButton } from "./CancelButton";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected group: Konva.Group;
    private cancelButton: CancelButton;
    private submitActionCallback: Function;

    constructor(stage: Konva.Stage, submitActionCallback: Function) {
        this.submitActionCallback = submitActionCallback;
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

        this.cancelButton = new CancelButton(
            stage,
            () => { this.group.hide() },
            {
                x: stage.width() / 2 - 50 / 2,
                y: (stage.height() / 2 - 30 / 2) + background.height() / 2 - 40,
            }
        );
        this.cancelButton.enable();

        this.group.add(lockLayer, background, this.cancelButton.getElement());
        stage.getLayers()[1].add(this.group);
    }

    protected open() {
        this.group.show();
    }

    protected submitAction() {
        this.submitActionCallback();
        this.group.hide();
    }
}