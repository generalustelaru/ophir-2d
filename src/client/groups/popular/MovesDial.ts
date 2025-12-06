import Konva from 'konva';
import constants from '~/client_constants';
import { Coordinates, Unique } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';

const { ICON_DATA, HUES } = constants;

type MovesDialUpdate = {
    isActive: boolean,
    moves: number,
}
export class MovesDial implements Unique<DynamicGroupInterface<MovesDialUpdate>> {

    private group: Konva.Group;
    private upperWave: Konva.Path;
    private lowerWave: Konva.Path;

    constructor(position: Coordinates) {
        this.group = new Konva.Group(position);

        const waveData = ICON_DATA.ocean_wave;

        this.upperWave = new Konva.Path({
            x: this.group.x(),
            y: 0,
            data: waveData.shape,
            fill: HUES.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.lowerWave = new Konva.Path({
            x: this.group.x(),
            y: 20,
            data: waveData.shape,
            fill: HUES.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group.add(this.upperWave, this.lowerWave);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(data: MovesDialUpdate): void {
        const { isActive, moves } = data;
        const waveColor = ICON_DATA.ocean_wave.fill;
        if (isActive) {
            this.upperWave.fill(moves > 1 ? waveColor : HUES.disabled);
            this.lowerWave.fill(moves > 0 ? waveColor : HUES.disabled);
        } else {
            this.upperWave.fill(HUES.disabled);
            this.lowerWave.fill(HUES.disabled);
        }
    }
}