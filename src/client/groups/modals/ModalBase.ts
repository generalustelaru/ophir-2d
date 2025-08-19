import Konva from "konva";
import clientConstants from "../../client_constants";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected group: Konva.Group;
    private closeButton: Konva.Group;
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

        // Close Button
        this.closeButton = new Konva.Group({
            x: stage.width() / 2 - 50 / 2,
            y: (stage.height() / 2 - 30 / 2) + background.height() / 2 - 40,
            width: 50,
            height: 30,
        });

        const buttonBackground = new Konva.Rect({
            width: this.closeButton.width(),
            height: this.closeButton.height(),
            fill: 'red',
        });

        const buttonLabel = new Konva.Text({
            width: this.closeButton.width(),
            height: this.closeButton.height(),
            fontSize: 14,
            align: 'center',
            verticalAlign: 'middle',
            text: 'Close',
            fontFamily: 'Custom',

        });
        this.closeButton.add(buttonBackground, buttonLabel);

        this.closeButton.on('mouseenter', () => {
            stage.container().style.cursor = 'pointer';
        });

        this.closeButton.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
        });

        this.closeButton.on('click', () => {
            this.close();
        });

        this.group.add(lockLayer, background, this.closeButton);
        stage.getLayers()[1].add(this.group);
    }

    protected open() {
        this.group.show();
    }

    protected submitAction() {
        this.submitActionCallback();
        this.group.hide();
    }

    private close() {
        this.group.hide();
    }
}