import Konva from 'konva';
import { Hue, DynamicGroupInterface } from '~/client_types';
import { Unique } from '~/shared_types';
import { Button } from '../popular';

export class ShowHideButton extends Button implements Unique<DynamicGroupInterface<string>> {
    private background: Konva.Rect | null;
    private label: Konva.Text | null;

    constructor(
        stage: Konva.Stage,
        positionX: number,
        color: Hue,
        callback: Function,
    ) {
        const layout = { x: positionX - 60, y: 0, height: 50, width: 120 };
        super(stage, layout, callback);

        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: color,
            cornerRadius: 15,
        });

        this.label = new Konva.Text({
            width: layout.width,
            y: 18,
            text: 'Show/Hide',
            fontSize: 18,
            fill: 'white',
            fontFamily: 'Custom',
            align: 'center',
        });
        this.group.add(this.background, this.label);
    }

    public reposition(positionX: number) {
        this.group.x(positionX - 60);
    }

    public getElement() {
        return this.group;
    }

    public update(text: string) {
        this.label?.text(text);
    }

    public selfDecomission(): null {
        this.background?.destroy();
        this.background = null;

        this.label?.destroy();
        this.label = null;

        this.clearReferences();

        return null;
    }
}