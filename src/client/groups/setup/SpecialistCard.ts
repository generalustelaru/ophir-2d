// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import clientConstants from '../../client_constants';
import { PlayerColor, Specialist } from "../../../shared_types";

const { COLOR } = clientConstants;

type SpecialistCardDigest = {
    specialist: Specialist,
    owner: PlayerColor | null,
}
export class SpecialistCard implements DynamicGroupInterface<SpecialistCardDigest> {

    private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        // stage: Konva.Stage,
        digest: SpecialistCardDigest,
        xOffset: number,
    ) {
        this.group = new Konva.Group({
            width: 200,
            height: 300,
            x: xOffset,
            y: 50,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            // stroke: COLOR.boneWhite,
            fill: COLOR.boneWhite,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        const { specialist, owner } = digest;
        const { displayName, description, startingFavor, specialty } = specialist;

        const info = new Konva.Text({
            text: (`${displayName}\n\n${description}\nFavor: ${startingFavor}\nSpecialty Good: ${specialty||'none'}`),
            width: 200,
            wrap: 'word'
        });


        this.group.add(...[
            this.background,
            info,
        ]);

    }

    public getElement() {
        return this.group;
    }

    public update(digest: any) {
        console.log(digest)
    }
}