// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import clientConstants from '../../client_constants';
import { Action, PlayerColor, Specialist } from "../../../shared_types";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;

type SpecialistCardDigest = {
    specialist: Specialist,
    owner: PlayerColor | null,
}
export class SpecialistCard extends ActionButton implements DynamicGroupInterface<SpecialistCardDigest> {

    // private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        digest: SpecialistCardDigest,
        xOffset: number,
    ) {
        super(
            stage,
            {
                width: 200,
                height: 300,
                x: xOffset,
                y: 50,
            },
            {
                action: Action.pick_specialist,
                payload: { name: digest.specialist.name }
            }
        );

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
            text: (`${displayName}\n\n${description}\nFavor: ${startingFavor}\nSpecialty Good: ${specialty || 'none'}\n\n${owner ? 'Picked by: ' + owner : 'Not Picked'}`),
            width: 200,
            wrap: 'word'
        });


        this.group.add(...[
            this.background,
            info,
        ]);

        if (owner === null) {
            this.setEnabled(true);
        }
    }

    public getElement() {
        return this.group;
    }

    public update(digest: any) {
        console.log(digest)
    }
}