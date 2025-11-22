import Konva from 'konva';
import { StaticGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { Button, FavorIcon } from '../popular';

export class FavorToken extends Button implements Unique<StaticGroupInterface> {

    constructor( // TODO: move this out of popular and into modals
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
        this.enable();

        const icon = new FavorIcon({ x: 0, y: 0 }, 'small');
        this.group.add(icon.getElement());
    }

    public getElement() {
        return this.group;
    }

    public selfDestruct(): null {
        this.group.destroy();
        return null;
    }
}
