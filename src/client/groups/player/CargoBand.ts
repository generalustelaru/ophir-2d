import Konva from 'konva';
import clientConstants from '~/client_constants';
import { Action, ItemName, PlayerColor, Unique } from '~/shared_types';
import { DynamicGroupInterface, EventType } from '~/client_types';
import { ItemRow } from '../popular';
import { Communicator } from '~/client/services/Communicator';
import { resize } from '~/client/animations';

const { HUES } = clientConstants;
const SLOT_WIDTH = 25;

type Update = {
    cargo: Array<ItemName>,
    canDrop: boolean,
}

export class CargoBand extends Communicator implements Unique<DynamicGroupInterface<Update>> {
    private group: Konva.Group;
    private cargoDisplay: Konva.Rect;
    private itemRow: ItemRow;

    constructor(stage: Konva.Stage, playerColor: PlayerColor, update: Update) {
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
            fill: HUES[`dark${playerColor}`],
            stroke: HUES.stampEdge,
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.cargoDisplay = new Konva.Rect({
            width: update.cargo.length * SLOT_WIDTH,
            height: 30,
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
    }

    public async update(update: Update): Promise<void> {
        const { cargo, canDrop } = update;
        const newWidth = cargo.length * SLOT_WIDTH;

        if (this.cargoDisplay.width() != newWidth) {
            await resize(
                this.cargoDisplay,
                1,
                { width: newWidth, height: 30 },
            );
        }

        this.itemRow.update({ items: update.cargo, isClickable: canDrop });
    };

    public getElement() {
        return this.group;
    }
}

