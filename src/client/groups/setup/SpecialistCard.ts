// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import clientConstants from '../../client_constants';

const { COLOR } = clientConstants;

export class SpecialistCard implements DynamicGroupInterface<any> {

    private group: Konva.Group;
    private background: Konva.Rect;

    constructor(
        // stage: Konva.Stage,
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


        this.group.add(...[
            this.background,
        ]);

    }

    public getElement() {
        return this.group;
    }

    public update(digest: any) {
        console.log(digest)
    }
}