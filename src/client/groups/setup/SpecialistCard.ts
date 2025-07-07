// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import clientConstants from '../../client_constants';
import { Action, PlayerColor, Specialist, SpecialistName } from "../../../shared_types";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;


export class SpecialistCard extends ActionButton implements DynamicGroupInterface<Specialist> {

    // private group: Konva.Group;
    private background: Konva.Rect;
    private info: Konva.Text;
    private cardName: SpecialistName;

    constructor(
        stage: Konva.Stage,
        specialist: Specialist,
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
                payload: { name: specialist.name }
            }
        );
        console.log('New card', {name: specialist.name})
        this.cardName = specialist.name;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            // stroke: COLOR.boneWhite,
            fill: COLOR.boneWhite,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        const { owner, displayName, description, startingFavor, specialty } = specialist;

        this.info = new Konva.Text({
            text: (`${displayName}\n\n${description}\nFavor: ${startingFavor}\nSpecialty Good: ${specialty || 'none'}\n\n${owner ? 'Picked by: ' + owner : 'Not Picked'}`),
            width: 200,
            wrap: 'word'
        });

        this.group.add(...[
            this.background,
            this.info,
        ]);

        this.setEnabled(!owner);
    }

    public getCardName() {
        return this.cardName;
    }

    public getElement() {
        return this.group;
    }

    public update(specialist: Specialist) {
        const { owner, displayName, description, startingFavor, specialty } = specialist;
        this.setEnabled(!specialist.owner)
        this.info.text(
            `${displayName}\n\n${description}\nFavor: ${startingFavor}\nSpecialty Good: ${specialty || 'none'}\n\n${owner ? 'Picked by: ' + owner : 'Not Picked'}`,
        )
    }
}