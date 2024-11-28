import Konva from "konva"
import { Coordinates, TempleStatus } from "../../../shared_types"
import { DynamicGroupInterface, } from "../../client_types"
import { TempleLevelDial } from "./TempleLevelDial";


export class MetalDonationsDial implements DynamicGroupInterface<TempleStatus> {

    private group: Konva.Group;
    private levelDials: Array<TempleLevelDial> = [];

    constructor(
        position: Coordinates,
    ) {

        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: 100,
            height: 100,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: 'black',
            cornerRadius: 15,
        });

        this.group.add(background);
    }

    getElement(): Konva.Group {
        return this.group;
    }

    updateElement(status: TempleStatus): void {
        this.levelDials.forEach(dial => dial.getElement().destroy());
        this.levelDials = [];

        const donationsCount = status.donations.length;
        const levelDialCount = (donationsCount - status.levelCompletion) / 3;

        for (let i = 0; i < levelDialCount; i++) {
            const dial = new TempleLevelDial(
                status.donations.slice(i * 3, i * 3 + 3),
                { x: 0, y: 0 },
            );
            this.group.add(dial.getElement());
            this.levelDials.push(dial);
        }
    }
}