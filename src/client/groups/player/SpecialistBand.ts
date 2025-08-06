import Konva from "konva";
import { Coordinates, Player, PlayerColor } from "~/shared_types";
import { DynamicGroupInterface } from "~/client_types";
import clientConstants from "~/client_constants";
import { InterfaceButton } from "../InterfaceButton";
const { COLOR } = clientConstants;

export class SpecialistBand extends InterfaceButton implements DynamicGroupInterface<boolean> {
    private background: Konva.Rect;
    private label: Konva.Text;
    private playerColor: PlayerColor;

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

        this.playerColor = player.color;
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
            fill: COLOR[`${player.isActive ? 'dark': ''}${player.color}`],
        });

        this.group.add(this.background, this.label);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(isActive: boolean): void {
        this.background.fill(isActive ? 'white' : 'black');
        this.label.fill(COLOR[`${isActive ? 'dark': ''}${this.playerColor}`])
    }
}