import Konva from "konva";
import { GroupLayoutData, MegaGroupInterface } from "../client_types";
import { GameState } from "../../shared_types";
import { ModalButton } from "../groups/setup/ModalButton";

export class SetupGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private modal: Konva.Rect | null = null;
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

    public drawElements(){
        this.modal = new Konva.Rect({
            x: 50,
            y: 50,
            width: this.group.width() - 100,
            height: this.group.height() - 100,
            cornerRadius: 15,
            fill: '#002255',
        });

        this.showHideButton = new ModalButton(
            this.stage,
            { x: 550, y: 450 },
            '#002255',
            'Show / Hide',
            () => this.switchModal()
        )
        this.group.add(this.modal, this.showHideButton.getElement())
    }

    public update(state: GameState) {
        state.gameStatus === 'setup' ? this.group.show() : this.group.hide();
    }

    private switchModal() {
        if (this.modal?.visible())
            this.modal?.hide();
        else
            this.modal?.show();
    }
}