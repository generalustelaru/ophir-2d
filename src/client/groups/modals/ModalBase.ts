import Konva from 'konva';
import clientConstants from '../../client_constants';
import { DismissButton } from './DismissButton';
import { AcceptButton } from './AcceptButton';
import { ClientMessage } from '~/shared_types';
import { ElementList, LayerIds } from '~/client/client_types';

type SubmitBehavior = {
    hasSubmit: true,
    actionMessage: ClientMessage | null,
    submitLabel: string,
    dismissLabel: string,
} | {
    hasSubmit: false,
    dismissLabel: string,
}

const { COLOR, STAGE_AREA } = clientConstants;

export abstract class ModalBase {
    private screenGroup: Konva.Group;
    protected contentGroup: Konva.Group;
    private acceptButton: AcceptButton | null = null;
    private isFixedActionMessage: boolean;

    constructor(
        stage: Konva.Stage,
        behavior: SubmitBehavior,
        dimensions: { width: number, height: number } = { width: 300, height: 150 },
    ) {
        this.isFixedActionMessage = behavior.hasSubmit && !!behavior.actionMessage;

        const { width: stageWidth, height: stageHeight } = STAGE_AREA;
        const { width: modalWidth, height: modalHeight } = dimensions;
        const offset = { x: stageWidth / 2 - modalWidth / 2, y: stageHeight / 2 - modalHeight / 2}

        const lockLayer = new Konva.Rect({ width: stageWidth, height: stageHeight });
        const modalBody = new Konva.Rect({
            x: offset.x,
            y: offset.y,
            width: modalWidth,
            height: modalHeight,
            fill: COLOR.modalBlue,
            cornerRadius: 10,
            stroke: COLOR.boneWhite,
            strokeWidth: 4,
        });

        const buttonLevel = modalHeight - 50;

        this.contentGroup = new Konva.Group({
            width: modalWidth,
            height: buttonLevel,
            x: offset.x,
            y: offset.y,
        });

        const dismissButton = new DismissButton(
            stage,
            () => { this.screenGroup.hide(); },
            {
                x: offset.x + modalWidth / 2 - (behavior.hasSubmit ? 75 : 25),
                y: offset.y + buttonLevel,
            },
            behavior.dismissLabel,
        );

        const elements: ElementList = [
            lockLayer, modalBody, this.contentGroup, dismissButton.getElement(),
        ];

        if (behavior.hasSubmit) {
            this.acceptButton = new AcceptButton(
                stage,
                {
                    x: offset.x + modalWidth / 2 + 25,
                    y: offset.y + buttonLevel,
                },
                behavior.actionMessage,
                behavior.submitLabel,
                () => { this.screenGroup.hide(); },
            );
            elements.push(this.acceptButton.getElement());
        }

        this.screenGroup = new Konva.Group({
            width: stageWidth,
            height: stageHeight,
            visible: false,
        }).add(...elements);

        stage.getLayers()[LayerIds.modals].add(this.screenGroup);
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

    protected updateActionMessage(message: ClientMessage) {
        if (!this.acceptButton)
            throw new Error('Cannot update missing accept button.');

        this.acceptButton.updateActionMessage(message);
    }

    protected setAcceptable(isAcceptable: boolean) {
        if (!this.acceptButton)
            throw new Error('Cannot update missing accept button.');

        this.acceptButton.setAcceptable(isAcceptable);
    }
}