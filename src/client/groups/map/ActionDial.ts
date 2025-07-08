import Konva from "konva";
import constants from "../../client_constants";
import { Player } from "../../../shared_types";
import { DynamicGroupInterface } from "../../client_types";

const { ICON_DATA, COLOR } = constants;
export class ActionDial implements DynamicGroupInterface<Player> {

    private group: Konva.Group;
    private luminary: Konva.Path;

    constructor(parent: Konva.Group, isActivePlayer: boolean) {
        this.group = new Konva.Group();
        const data = isActivePlayer ? ICON_DATA.sun : ICON_DATA.moon;
        this.luminary = new Konva.Path({
            x: 50,
            y: parent.height() - 130,
            data: data.shape,
            fill: isActivePlayer ? data.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });
        this.group.add(this.luminary);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player): void {

        const pendingAction = player.isActive && (player.locationActions.length || player.moveActions === 2);

        this.luminary.data(ICON_DATA[pendingAction ? 'sun' : 'moon'].shape);
        this.luminary.fill(ICON_DATA[pendingAction ? 'sun' : 'moon'].fill);
    }
}
