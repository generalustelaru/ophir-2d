import Konva from 'konva';
import { GroupLayoutData } from "~/client_types";
export abstract class Button {
    protected group: Konva.Group;
    private stage: Konva.Stage;
    protected isActive: boolean = false;
    private callback: Function | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, callback: Function | null) {
        this.stage = stage;

        this.group = new Konva.Group(layout);

        // if (!callback) {
        //     return;
        // }

        this.callback = callback;

        this.group.on('mouseenter', () => {
            this.stage.container().style.cursor = this.isActive ? 'pointer' : 'not-allowed';
        });

        this.group.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        this.group.on('click', () => {
            if (this.callback && this.isActive)
                this.callback();
        });
    }

    public disable(): void {
        this.isActive = false;
    }

    public enable(): void {
        this.isActive = true;
    }

    public updateFunction(newCallback: Function) {
        this.callback = newCallback;
    }
}
