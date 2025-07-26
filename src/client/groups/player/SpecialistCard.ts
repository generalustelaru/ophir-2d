import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "~/client_types";
import { Player } from "~/shared_types";
import clientConstants from "~/client_constants";

const { COLOR } = clientConstants;
export class SpecialistCard implements DynamicGroupInterface<undefined> {
    private group: Konva.Group;

    constructor(
        layout: GroupLayoutData,
        player: Player,
        isLocalPlayer: boolean,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            visible: false,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[`dark${player.color}`],
            cornerRadius: 5,
        });

        const { specialist } = player;
        const name = new Konva.Text({
            x: 0,
            y: 14,
            width: this.group.width() / 2,
            height: this.group.height(),
            text: isLocalPlayer ? specialist.displayName : player.name,
            fontSize: 14,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'top',
            fontFamily: 'Custom',
            fill: 'white',
        });

        const description = new Konva.Text({
            x: 0,
            y: 14,
            width: this.group.width(),
            height: this.group.height(),
            text: specialist.description,
            fontSize: 14,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
            fill: 'white',
        });

        this.group.add(background, name, description);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(): void {
        this.group.visible() ? this.group.hide(): this.group.show();
    }
}