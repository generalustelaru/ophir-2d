import Konva from "konva";
import clientConstants from "../../client_constants";
import { DismissButton } from "./DismissButton";
import { AcceptButton } from "./AcceptButton";
import { ClientMessage, Coordinates } from "~/shared_types";

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected stage: Konva.Stage;
    private screenGroup: Konva.Group;
    // protected contentLayout: GroupLayoutData;
    private modalGroup: Konva.Group;
    protected contentGroup: Konva.Group;
    private dismissButton: DismissButton;
    private acceptButton: AcceptButton | null = null;

    constructor(
        stage: Konva.Stage,
        actionMessage: ClientMessage | null = null,
        dimensions: { width: number, height: number } = { width: 600, height: 300 },
    ) {
        this.stage = stage;
        const { width, height } = dimensions;

        this.screenGroup = new Konva.Group({
            width: stage.width(),
            height: stage.height(),
            visible: false,
        });

        // lock layer
        this.screenGroup.add(...[
            new Konva.Rect({
                width: stage.width(),
                height: stage.height(),
            }),
        ]);

        this.modalGroup = new Konva.Group({
            x: stage.width() / 2 - width / 2,
            y: stage.height() / 2 - height / 2,
            width,
            height,
        });

        this.modalGroup.add(...[
            new Konva.Rect({
                width,
                height,
                fill: COLOR.modalBlue,
                cornerRadius: 10,
                stroke: COLOR.boneWhite,
                strokeWidth: 4,
            }),
        ]);

        const buttonLevel = height - 50;

        this.contentGroup = new Konva.Group({ width, height: buttonLevel,});

        this.dismissButton = new DismissButton(
            stage,
            () => { this.screenGroup.hide() },
            {
                x: this.modalGroup.width() / 2 - 75,
                y: buttonLevel,
            }
        );
        this.dismissButton.enable();

        if (actionMessage) {
            this.acceptButton = new AcceptButton(
                this.stage,
                {
                    x: this.modalGroup.width() / 2 + 25,
                    y: buttonLevel,
                },
                actionMessage,
                () => { this.screenGroup.hide() },
            );
            this.modalGroup.add(this.acceptButton.getElement());
            this.acceptButton.enable();
        }

        this.modalGroup.add(...[
            this.contentGroup,
            this.dismissButton.getElement(),
        ]);

        this.screenGroup.add(...[
            this.modalGroup
        ]);
        stage.getLayers()[1].add(this.screenGroup);
    }

    protected open() {
        this.screenGroup.show();
    }
}