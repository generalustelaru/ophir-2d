import Konva from 'konva';
import clientConstants from '~/client_constants';
import { Action, ItemName, PlayerColor, Unique } from '~/shared_types';
import { CargoBandUpdate, DynamicGroupInterface, EventType } from '~/client_types';
import { ItemRow } from '../popular';
import { Communicator } from '~/client/services/Communicator';

const { COLOR } = clientConstants;
const SLOT_WIDTH = 25;

export class CargoBand extends Communicator implements Unique<DynamicGroupInterface<CargoBandUpdate>> {
    private group: Konva.Group;
    private cargoDisplay: Konva.Rect;
    private itemRow: ItemRow;

    constructor(stage: Konva.Stage, playerColor: PlayerColor, update: CargoBandUpdate) {
        super();

        this.group = new Konva.Group({
            width: SLOT_WIDTH * 4,
            height: 30,
            x: 10,
            y: 5,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[`dark${playerColor}`],
            stroke: COLOR.stampEdge,
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.cargoDisplay = new Konva.Rect({
            width: update.cargo.length * SLOT_WIDTH,
            height: this.group.height(),
            fill: 'black',
            cornerRadius: 5,
        });

        this.itemRow = new ItemRow(
            stage,
            {
                x: 0,
                y: 0,
                width: this.group.width(),
                height: this.group.height(),
            },
            {
                spacing: SLOT_WIDTH,
                itemCallback: (name: ItemName) => {
                    this.createEvent({
                        type: EventType.action,
                        detail: { action: Action.drop_item, payload: { item: name } },
                    });
                },
            },
        );

        this.group.add(...[
            background,
            this.cargoDisplay,
            this.itemRow.getElement(),
        ]);
        this.update(update);
    }

    public update(update: CargoBandUpdate): void {
        const { cargo, canDrop } = update;
        this.cargoDisplay.width(cargo.length * SLOT_WIDTH);

        this.itemRow.update(update.cargo, canDrop);
    };

    public getElement() {
        return this.group;
    }
}

