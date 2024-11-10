import Konva from "konva";
import constants from "../client_constants";
import { Player } from "../../shared_types";

const { ICON_DATA, COLOR } = constants;
export class MovesDial {

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

    public getElement() {
        return this.group;
    }

    public updadeElements(player: Player) {

        if (!player.isActive || player.moveActions === 0) {
            this.luminary.data(ICON_DATA.moon.shape);
            this.luminary.fill(ICON_DATA.moon.fill);
            return;
        }

        this.luminary.data(ICON_DATA.sun.shape);
        this.luminary.fill(player.moveActions > 1 ? ICON_DATA.sun.fill : COLOR.sunset);
    }
}