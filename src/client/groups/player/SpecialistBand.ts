import Konva from 'konva';
import { Coordinates, Player } from '~/shared_types';
import { DynamicGroupInterface, Unique } from '~/client_types';
import { Button } from '../popular';

export class SpecialistBand extends Button implements Unique<DynamicGroupInterface<boolean>> {
    private background: Konva.Rect;
    private label: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        player: Player,
        callback: Function,
    ) {
        const width = 125;
        const height = 30;
        const layout = { ...position, width, height };

        super(stage, layout, callback);

        this.background = new Konva.Rect({
            width,
            height,
            fill: player.isActive ? 'white' : 'black',
            cornerRadius: 5,
        });

        this.label = new Konva.Text({
            y: 1,
            width,
            height,
            text: player.specialist.displayName,
            fontSize: 14,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
            fill: player.isActive ? 'black' : 'white',
        });

        this.group.add(this.background, this.label);
        this.enable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(isActive: boolean): void {
        this.label.fill(isActive ? 'black': 'white');
        this.background.fill(isActive ? 'white' : 'black');
    }
}