// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "~/client_types";
import clientConstants from "~/client_constants";
import { Action, SelectableSpecialist, SpecialistName } from "~/shared_types";
import { ActionButton } from "../ActionButton";

const { COLOR } = clientConstants;

type SpecialistCardUpdate = {
    specialist: SelectableSpecialist;
    shouldEnable: boolean;
}

export class SpecialistCard extends ActionButton implements DynamicGroupInterface<SpecialistCardUpdate> {

    // private group: Konva.Group;
    private background: Konva.Rect;
    // private info: Konva.Text;
    private cardName: SpecialistName;

    constructor(
        stage: Konva.Stage,
        specialist: SelectableSpecialist,
        xOffset: number,
    ) {
        const layout = {
            width: 200,
            height: 300,
            x: xOffset,
            y: 50,
        }
        super(
            stage,
            layout,
            {
                action: Action.pick_specialist,
                payload: { name: specialist.name }
            }
        );
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
        const nameElement = new Konva.Text({
            text: displayName,
            fontSize: 26,
            fontStyle: 'bold',
            width: layout.width,
            height: layout.height,
            align: 'center',
            y: 10,
            // verticalAlign: 'middle',
        });

        const descriptionElement = new Konva.Text({
            text: description,
            fontSize: 22,
            fontStyle: 'bold',
            width: layout.width,
            height: layout.height,
            // align: 'center',
            verticalAlign: 'middle',
            x: 5,

        })

        // this.info = new Konva.Text({
        //     x: 10,
        //     text: this.getCardText(specialist),
        //     width: 200,
        //     fontSize: 18,
        //     fontFamily: 'Custom',
        //     wrap: 'word'
        // });

        this.group.add(...[
            this.background,
            nameElement,
            descriptionElement,
        ]);

        this.setEnabled(!specialist.owner);
    }

    public getCardName() {
        return this.cardName;
    }

    public getElement() {
        return this.group;
    }

    public update(data: SpecialistCardUpdate) {
        this.setEnabled(data.shouldEnable)
        // this.info.text(this.getCardText(data.specialist))
    }

    private getCardText(specialist: SelectableSpecialist) {
        const { owner, displayName, description, startingFavor, specialty } = specialist;

        return `
        ${displayName}\n
        \n${description}\n
        \nFavor: ${startingFavor}\n
        \nSpecialty: ${specialty || 'none'}\n
        \n${owner ? 'Picked by: ' + owner : 'Not Picked'}`;
    }
}