import Konva from 'konva';
import { StaticGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client/client_constants';

const { HUES } = clientConstants;

export class RetainedToken extends Button implements Unique<StaticGroupInterface> {

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        callback: ((index: number) => void) | null,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 0,
            height: 0,
        };

        super(stage, layout, callback);

        callback && this.group.add(new Konva.Rect({
            width: 30,
            height: 30,
            stroke: HUES.boneWhite,
            strokeWidth: 1,
            x: -3,
            y: -3,
            cornerRadius: 5,
            fill: HUES.modalLightBlue,
        }));

        callback && this.enable();
    }

    public getElement() {
        return this.group;
    }

    public selfDestruct(): null {
        this.group.destroy();
        return null;
    }
}
