import Konva from "konva";
import clientConstants from "../../client_constants";
import { CancelButton } from "./CancelButton";
import { AcceptButton } from "./AcceptButton";
import { ClientMessage, Coordinates } from "~/shared_types";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    private stage: Konva.Stage;
    protected group: Konva.Group;
    private cancelButton: CancelButton;
    private acceptButtonPosition: Coordinates;
    private acceptButton: AcceptButton | null = null;

    constructor(stage: Konva.Stage) {
        this.stage = stage;
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
                x: stage.width() / 2 - 75,
                y: (stage.height() / 2 - 30 / 2) + background.height() / 2 - 40,
            }
        );
        this.cancelButton.enable();

        this.acceptButtonPosition = {
            x: stage.width() / 2 + 25,
            y: (stage.height() / 2 - 30 / 2) + background.height() / 2 - 40,
        },

        this.group.add(...[
            lockLayer,
            background,
            this.cancelButton.getElement(),
        ]);
        stage.getLayers()[1].add(this.group);
    }

    protected open(actionMessage: ClientMessage) {
        this.acceptButton && this.acceptButton.getElement().destroy();

        this.acceptButton = new AcceptButton(
            this.stage,
            this.acceptButtonPosition,
            actionMessage,
        );
        this.group.add(this.acceptButton.getElement());
        this.acceptButton.enable();
        this.group.show();
    }
}