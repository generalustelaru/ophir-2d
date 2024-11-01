
import Konva from 'konva';
import { HexaColor, MapHexInterface, IslandData, SettlementData } from '../client_types';
import { Vector2d } from 'konva/lib/types';
import { LocationToken } from './locationToken';
import clientConstants from '../client_constants';

const { CARGO_HOLD_DATA, COLOR } = clientConstants;

export class CargoHold {

    group: Konva.Group;
    hold: Konva.Rect;
    constructor(
        color: HexaColor,
        isLargeHold: boolean = false,
    ) {
        this.group = new Konva.Group({
            width: 200,
            height: 200,
            x: 525,
            y: 25,
        });

        this.hold = new Konva.Rect({
            width: 200,
            height: isLargeHold ? 200 : 100,
            fill: color,
            cornerRadius: 15,
            strokeWidth: 1,
        });

        this.group.add(this.hold);
    }

    public getElement() {
        return this.group;
    }

    public upgradeHold() {
        this.hold.height(200);
    }
}