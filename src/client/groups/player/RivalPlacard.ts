// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import { PlayerColor } from "../../../shared_types";

type RivalPlacardUpdate = {
    isControllable: boolean
    playerColor: PlayerColor
}
export class RivalPlacard implements DynamicGroupInterface<RivalPlacardUpdate> {

    constructor(
        stage: Konva.Stage,
        playerInControl: PlayerColor,
        localColorName: PlayerColor,
        yOffset: number,
    ){}

    public getElement() {
        return new Konva.Group();
    }

    public update(): void {
        return;
    }
}