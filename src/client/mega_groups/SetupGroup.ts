import Konva from "konva";
import { GroupLayoutData, MegaGroupInterface } from "~/client_types";
import {  SetupState } from "~/shared_types";
import { ModalButton } from "../groups/setup/ModalButton";
import { SetupModal } from "../groups/setup/SetupModal";

export class SetupGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private modal: SetupModal | null = null;
    private showHideButton: ModalButton | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[1].add(this.group);
        this.stage = stage;
    }

    public drawElements(state: SetupState){
        this.modal = new SetupModal(
            this.stage,
            {
                x: 50,
                y: 50,
                width: this.group.width() - 100,
                height: this.group.height() - 100,
            },
            state.specialists,
        );

        this.showHideButton = new ModalButton(
            this.stage,
            { x: 550, y: 450 },
            '#002255',
            'Show / Hide',
            () => {
                this.modal && this.modal.switchVisibility();
            },
        )
        this.group.add(this.modal.getElement(), this.showHideButton.getElement())
    }

    public update(state: SetupState) {
        const {players, specialists} = state;

        if (!this.modal)
            throw new Error("Can't update without initialization");

        this.modal.update({ players, specialists })
    }

    public disable() {
        this.group.hide();
    }
}