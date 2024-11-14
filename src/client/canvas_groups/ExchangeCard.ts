import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData } from '../client_types';
import clientConstants from '../client_constants';
import { HexId } from '../../shared_types';

const { COLOR } = clientConstants;

export class ExchangeCard implements DynamicGroupInterface<HexId> {

    private group: Konva.Group;
    private background: Konva.Rect;

    private exchangeLocation: HexId

    constructor(
        location: HexId,
        layout: GroupLayoutData,
    ) {
        this.exchangeLocation = location;

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.exchangeGold,
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: 0,
        });

        this.group.add(
            this.background,
        );
    }

    public updateElement(playerLocation: HexId): void {
        if (playerLocation === this.exchangeLocation) {
            this.background.strokeWidth(3);
        } else {
            this.background.strokeWidth(0);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}