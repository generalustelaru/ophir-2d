import Konva from 'konva';
import { Hue, DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { Button } from '../popular';

export class ShowHideButton extends Button implements Unique<DynamicGroupInterface<string>> {
    private background: Konva.Rect | null;
    private label: Konva.Text | null;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: Hue,
        text: string,
        callback: Function,
    ) {
        const layout = { ...position, height: 50, width: 100 };
        super(stage, layout, callback);

        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: color,
            cornerRadius: 15,
        });
        const scale = 1.4;
        this.label = new Konva.Text({
            text: text,
            x: 5,
            y: 20,
            fill: 'white',
            scale: { x: scale, y: scale },
            fontFamily: 'Custom',
        });
        this.group!.add(this.background, this.label);
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