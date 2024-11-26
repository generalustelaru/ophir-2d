import Konva from 'konva';
import clientConstants from '../client_constants';
import { DynamicGroupInterface } from '../client_types';
import { FavorIcon } from './GroupList';
import { Coordinates } from '../../shared_types';

const { COLOR } = clientConstants;
export class FavorDial implements DynamicGroupInterface<number> {
    private group: Konva.Group;
    private favorCount: Konva.Text;

    constructor(
        position: Coordinates,
        amount: number,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
        });

        const favorIcon = new FavorIcon({x: 0, y: 0, width: 0, height: 0});

        const stampCenter = favorIcon.getVerticalAxis();

        this.favorCount = new Konva.Text({
            x: stampCenter - 7,
            y: stampCenter - 12,
            text: amount.toString(),
            fontSize: 20,
            fill: COLOR.boneWhite,
            fontFamily: 'Arial',
        });

        this.group.add(favorIcon.getElement(), this.favorCount);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public updateElement(amount: number): void {
        this.favorCount?.text(amount.toString());
    }
}