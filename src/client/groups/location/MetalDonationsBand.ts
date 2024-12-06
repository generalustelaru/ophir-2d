import Konva from "konva"
import { Coordinates, TempleStatus } from "../../../shared_types"
import { DynamicGroupInterface, } from "../../client_types"
import { TempleLevelDial } from "./TempleLevelDial";
import clientConstants from "../../client_constants";

const { COLOR } = clientConstants;
const UNIT = 27;
const LEVEL_DIAL_DRIFTS = [
    {id: 0, x: 0},
    {id: 1, x: UNIT},
    {id: 2, x: UNIT * 2},
    {id: 3, x: UNIT * 3},
    {id: 4, x: UNIT * 4},
    {id: 5, x: UNIT * 5},
    {id: 6, x: UNIT * 6},
];
export class MetalDonationsBand implements DynamicGroupInterface<TempleStatus> {

    private group: Konva.Group;
    private cargoDisplayGroup: Konva.Group;
    private levelDials: Array<TempleLevelDial> = [];

    constructor(
        position: Coordinates,
        maxLevel: number,
    ) {

        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: UNIT * 6,
            height: UNIT * 3,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
            stroke: COLOR.stampEdge,
            cornerRadius: 5,
        });

        const displayWidth = UNIT * maxLevel
        this.cargoDisplayGroup = new Konva.Group({
            x: this.group.width() - displayWidth,
            width: UNIT * maxLevel,
            height: UNIT * 3,
        });

        const storageDisplay = new Konva.Rect({
            width: this.cargoDisplayGroup.width(),
            height: this.cargoDisplayGroup.height(),
            fill: 'black',
            stroke: COLOR.stampEdge,
            cornerRadius: 5,
            strokeWidth: 1,
        });

        this.cargoDisplayGroup.add(storageDisplay);

        this.group.add(background, this.cargoDisplayGroup);
    }

    getElement(): Konva.Group {
        return this.group;
    }

    updateElement(status: TempleStatus): void {
        this.levelDials.forEach(dial => dial.getElement().destroy());
        this.levelDials = [];
        const donationsCount = status.donations.length;
        const levelDialCount = (donationsCount - status.levelCompletion) / 3 + 1;

        for (let i = 0; i < levelDialCount; i++) {
            const dial = new TempleLevelDial(
                { x: LEVEL_DIAL_DRIFTS[i].x, y: 0 },
                status.donations.slice(i * 3, i * 3 + 3),
            );
            this.cargoDisplayGroup.add(dial.getElement());
            this.levelDials.push(dial);
        }
    }
}