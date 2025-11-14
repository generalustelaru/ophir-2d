import Konva from 'konva';
import clientConstants from '../../client_constants';
import { DismissButton } from './DismissButton';
import { AcceptButton } from './AcceptButton';
import { ClientMessage } from '~/shared_types';
import { LayerIds } from '~/client/client_types';

type SubmitBehavior = {
    hasSubmit: true,
    actionMessage: ClientMessage | null,
    submitLabel: string,
    dismissLabel: string,
} | {
    hasSubmit: false,
    dismissLabel: string,
}

const { COLOR } = clientConstants;

export abstract class ModalBase {
    protected stage: Konva.Stage;
    private screenGroup: Konva.Group;
    private modalGroup: Konva.Group;
    protected contentGroup: Konva.Group;
    private dismissButton: DismissButton;
    private acceptButton: AcceptButton | null = null;
    private isFixedActionMessage: boolean;

    constructor(
        stage: Konva.Stage,
        behavior: SubmitBehavior,
        dimensions: { width: number, height: number } = { width: 300, height: 150 },
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

        this.contentGroup = new Konva.Group({ width, height: buttonLevel });

        this.dismissButton = new DismissButton(
            stage,
            () => { this.screenGroup.hide(); },
            {
                x: this.modalGroup.width() / 2 - (behavior.hasSubmit ? 75 : 25),
                y: buttonLevel,
            },
            behavior.dismissLabel,
        );
        this.dismissButton.enable();

        this.isFixedActionMessage = behavior.hasSubmit && !!behavior.actionMessage;

        if (behavior.hasSubmit) {
            this.acceptButton = new AcceptButton(
                this.stage,
                {
                    x: this.modalGroup.width() / 2 + 25,
                    y: buttonLevel,
                },
                behavior.actionMessage,
                behavior.submitLabel,
                () => { this.screenGroup.hide(); },
            );
            this.modalGroup.add(this.acceptButton.getElement());
        }

        this.modalGroup.add(...[
            this.contentGroup,
            this.dismissButton.getElement(),
        ]);

        this.screenGroup.add(...[
            this.modalGroup,
        ]);
        stage.getLayers()[LayerIds.modal].add(this.screenGroup);
    }

    protected open(message: ClientMessage|null = null) {

        if (message && !this.acceptButton)
            throw new Error('Cannot assign message. Accept button not initialized!');

        if (this.acceptButton) {
            switch (true) {
                case !!message:
                    this.acceptButton.updateActionMessage(message);
                    this.acceptButton.setAcceptable(true);
                    break;
                case this.isFixedActionMessage:
                    this.acceptButton.setAcceptable(true);
                    break;
                default:
                    this.acceptButton.setAcceptable(false);
                    break;
            }
        }

        this.screenGroup.show();
    }

    protected close() {
        this.screenGroup.hide();
    }
}