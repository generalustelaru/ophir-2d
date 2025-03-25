// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "../../client_types";
import { DiceSix, PlayerColor } from "../../../shared_types";
import { InfluenceDial } from "../GroupList";
import clientConstants from '../../client_constants';

const { COLOR } = clientConstants;

type RivalPlacardUpdate = {
    isControllable: boolean,
    activePlayerColor: PlayerColor | null,
    influence: DiceSix,
}
export class RivalPlacard implements DynamicGroupInterface<RivalPlacardUpdate> {
    private group: Konva.Group;
    private background: Konva.Rect;
    private influenceDial: InfluenceDial;
    // TODO: private endTurnButton: ShiftMarketButton;
    // TODO: private endTurnButton: EndTurnButton;

    constructor(
        data: RivalPlacardUpdate,
        yOffset: number,
    ){
        this.group = new Konva.Group({
            width: 100,
            height: 100,
            x: 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            stroke: COLOR.boneWhite,
            fill: COLOR.boneWhite,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        this.influenceDial = new InfluenceDial(
            { width: 50, height: 50, x: 60, y: -25 },
            COLOR.boneWhite);
        this.influenceDial.update(1);

        this.group.add(...[
            this.background, this.influenceDial.getElement(),
        ]);

        this.update(data);
    }

    public getElement() {
        return this.group;
    }

    public update(data: RivalPlacardUpdate) {
        const { isControllable, activePlayerColor, influence } = data;

        activePlayerColor && this.background.fill(isControllable ? COLOR[activePlayerColor] : COLOR.boneWhite);
        this.background.strokeWidth(isControllable ? 3 : 0);
        this.influenceDial.update(influence);
    }
}