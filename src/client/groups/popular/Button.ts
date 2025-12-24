import Konva from 'konva';
import { GroupLayoutData } from '~/client_types';
export abstract class Button {
    protected group: Konva.Group;
    protected isActive: boolean = false;
    private callback: Function | null = null;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, callback: Function | null) {

        this.group = new Konva.Group(layout);

        this.callback = callback;

        this.group.on('mouseenter', () => {
            stage.container().style.cursor = this.isActive ? 'pointer' : 'not-allowed';
        });

        this.group.on('mouseleave', () => {
            stage.container().style.cursor = 'default';
        });

        this.group.on('pointerclick', () => {
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

    protected clearReferences() {
        this.group?.destroy();
        this.callback = null;
    }
}
