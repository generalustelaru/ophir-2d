import Konva from 'konva';
import clientConstants from '../../client_constants';
import { DismissButton } from './DismissButton';
import { AcceptButton } from './AcceptButton';
import { ClientMessage } from '~/shared_types';
import { Aspect, Dimensions, ElementList, LayerIds } from '~/client/client_types';

type SubmitBehavior = {
    hasSubmit: true,
    actionMessage: ClientMessage | null,
    submitLabel: string,
    dismissLabel: string,
} | {
    hasSubmit: false,
    dismissLabel: string,
}

const { HUES, STAGE_AREA } = clientConstants;

export abstract class ModalBase {
    private screenGroup: Konva.Group;
    private modalGroup: Konva.Group;
    protected contentGroup: Konva.Group;
    private acceptButton: AcceptButton | null = null;
    private isFixedActionMessage: boolean;
    private lockLayer: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        behavior: SubmitBehavior,
        aspect: Aspect,
        dimensions: Dimensions = { width: 300, height: 150 },
    ) {
        this.isFixedActionMessage = behavior.hasSubmit && !!behavior.actionMessage;

        const { width: stageWidth, height: stageHeight } = STAGE_AREA[aspect];
        const { width: modalWidth, height: modalHeight } = dimensions;
        const offset = { x: stageWidth / 2 - modalWidth / 2, y: stageHeight / 2 - modalHeight / 2 };
        const buttonLevel = modalHeight - 50;

        this.lockLayer = new Konva.Rect({ width: stageWidth, height: stageHeight });
        const modalElements: ElementList = [];

        const background = new Konva.Rect({
            width: modalWidth,
            height: modalHeight,
            fill: HUES.modalBlue,
            cornerRadius: 10,
            stroke: HUES.boneWhite,
            strokeWidth: 4,
        });
        modalElements.push(background);

        this.contentGroup = new Konva.Group({
            width: modalWidth,
            height: buttonLevel,
        });
        modalElements.push(this.contentGroup);

        const dismissButton = new DismissButton(
            stage,
            () => { this.screenGroup.hide(); },
            {
                x: modalWidth / 2 - (behavior.hasSubmit ? 75 : 25),
                y: buttonLevel,
            },
            behavior.dismissLabel,
        );
        modalElements.push(dismissButton.getElement());

        if (behavior.hasSubmit) {
            this.acceptButton = new AcceptButton(
                stage,
                {
                    x: modalWidth / 2 + 25,
                    y: buttonLevel,
                },
                behavior.actionMessage,
                behavior.submitLabel,
                () => { this.screenGroup.hide(); },
            );
            modalElements.push(this.acceptButton.getElement());
        }

        this.modalGroup = new Konva.Group({
            x: offset.x,
            y: offset.y,
            width: modalWidth,
            height: modalHeight,
        }).add(...modalElements);

        this.screenGroup = new Konva.Group({
            width: stageWidth,
            height: stageHeight,
            visible: false,
        }).add(this.lockLayer, this.modalGroup);

        stage.getLayers()[LayerIds.modals].add(this.screenGroup);
    }

    protected reposition(aspect: Aspect) {
        const { width: stageWidth, height: stageHeight } = STAGE_AREA[aspect];
        const offset = {
            x: stageWidth / 2 - this.modalGroup.width() / 2,
            y: stageHeight / 2 - this.modalGroup.height() / 2,
        };

        this.lockLayer.width(stageWidth).height(stageHeight);
        this.modalGroup.x(offset.x).y(offset.y);
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