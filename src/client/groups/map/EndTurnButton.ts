import Konva from 'konva';
import { Coordinates, Player, Unique  } from '~/shared_types';
import { DynamicGroupInterface } from '~/client_types';
import { AnchorButton } from '../popular';

export class EndTurnButton implements Unique<DynamicGroupInterface<Player>> {

    private anchor: AnchorButton;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        clickCallback: Function,
    ) {
        this.anchor = new AnchorButton(stage, position, clickCallback);
    }

    public getElement() {
        return this.anchor.getElement();
    }

    public update(player: Player): void {
        const { isActive, isHandlingRival, isAnchored } = player;

        this.anchor.update({
            disabled: !isActive || isHandlingRival,
            anchored: isAnchored,
        });
    }

    public disable() {
        this.anchor.disable();
    }
}
