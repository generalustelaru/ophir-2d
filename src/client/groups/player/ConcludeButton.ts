import Konva from 'konva';
import { Coordinates, Unique } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { AnchorButton } from '../popular';

type ConcludeButtonUpdate = {
    isControllable: boolean,
    mayConclude: boolean,
}
export class ConcludeButton implements Unique<DynamicGroupInterface<ConcludeButtonUpdate>> {
    private anchor: AnchorButton;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        clickCallback: ((isShifting: boolean) => void) | null,
    ) {
        this.anchor = new AnchorButton( stage, position, clickCallback);
    }

    public getElement() {
        return this.anchor.getElement();
    }

    public update(update: ConcludeButtonUpdate) {
        const { mayConclude, isControllable } = update;

        this.anchor.update({
            disabled: false == isControllable,
            anchored: mayConclude || false == isControllable,
        });
    }

    public disable() {
        this.anchor.disable();
    }
}
