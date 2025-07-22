import Konva from 'konva';
import { GroupLayoutData } from '../client_types';
export abstract class InterfaceButton {
    private stage: Konva.Stage;
    protected group: Konva.Group;

    constructor(stage: Konva.Stage, layout: GroupLayoutData, callback: Function) {
        this.stage = stage;

        this.group = new Konva.Group(layout);

        this.group.on('mouseenter', () => {
            this.stage.container().style.cursor = 'pointer';
        });

        this.group.on('mouseleave', () => {
            this.stage.container().style.cursor = 'default';
        });

        this.group.on('click', () => {
            callback();
        });
    }
}
