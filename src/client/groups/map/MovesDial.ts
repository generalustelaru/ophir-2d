import Konva from "konva";
import constants from "../../client_constants";
import { Player } from "../../../shared_types";
import { DynamicGroupInterface } from "../../client_types";

const { ICON_DATA, COLOR } = constants;

export class MovesDial implements DynamicGroupInterface<Player> {

    private group: Konva.Group;
    private upperWave: Konva.Path;
    private lowerWave: Konva.Path;

    constructor(isActivePlayer: boolean) {
        this.group = new Konva.Group({
            x: 15,
            y: 60,
        });

        const waveData = ICON_DATA.ocean_wave;

        this.upperWave = new Konva.Path({
            x: this.group.x(),
            y: 0,
            data: waveData.shape,
            fill: isActivePlayer ? waveData.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.lowerWave = new Konva.Path({
            x: this.group.x(),
            y: 20,
            data: waveData.shape,
            fill: isActivePlayer ? waveData.fill : COLOR.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        this.group.add(this.upperWave, this.lowerWave);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(player: Player): void {
        const waveColor = ICON_DATA.ocean_wave.fill;
        if (player.isActive) {
            this.upperWave.fill(player.moveActions > 1 ? waveColor : COLOR.disabled);
            this.lowerWave.fill(player.moveActions > 0 ? waveColor : COLOR.disabled);
        } else {
            this.upperWave.fill(COLOR.disabled);
            this.lowerWave.fill(COLOR.disabled);
        }
    }
}