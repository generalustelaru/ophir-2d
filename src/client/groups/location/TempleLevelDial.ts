import Konva from 'konva';
import { Coordinates, Metal, Unique } from '~/shared_types';
import { StaticGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA } = clientConstants;
const UNIT = 27;
export class TempleLevelDial implements Unique<StaticGroupInterface> {
    private group: Konva.Group;

    constructor(
        position: Coordinates,
        donations: Array<Metal>,
    ) {
        this.group = new Konva.Group({
            x: position.x,
            y: position.y,
            width: UNIT,
            height: UNIT * 3,
        });

        for (let i = 0; i < donations.length; i++) {
            const metal = new Konva.Path({
                width: UNIT,
                height: UNIT,
                data: CARGO_ITEM_DATA[donations[i]].shape,
                fill: CARGO_ITEM_DATA[donations[i]].fill,
                x: 2,
                y: (this.group.height() - UNIT) - i * UNIT,
                scaleY: 2.75,
            });

            this.group.add(metal);
        }
    }

    getElement(): Konva.Group {
        return this.group;
    }
}