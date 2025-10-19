import Konva from 'konva';
import { Coordinates, Player } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';
import { Button } from '../Button';
const { COLOR } = clientConstants;

export class SpecialistBand extends Button implements DynamicGroupInterface<boolean> {
    private background: Konva.Rect;
    private label: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        player: Player,
        // isLocalPlayer: boolean,
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
            // text: isLocalPlayer ? 'You' : player.specialist.displayName,
            text: player.specialist.displayName,
            fontSize: 14,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
            fill: COLOR[player.color],
        });

        this.group.add(this.background, this.label);
        this.enable();
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(isActive: boolean): void {
        this.background.fill(isActive ? 'white' : 'black');
    }
}