import Konva from 'konva';
import clientConstants from '../../client_constants';
import { CargoManifest, ItemId, PlayerColor } from '../../../shared_types';
import { Color, DynamicGroupInterface } from '../../client_types';
import { CargoToken } from './CargoToken';

const { COLOR } = clientConstants;
const SLOT_WIDTH = 25;

type CargoSlot = {
    x: number,
    element: CargoToken | null,
}
export class CargoBand implements DynamicGroupInterface<CargoManifest> {
    private group: Konva.Group;
    private stage: Konva.Stage;
    private cargoDisplay: Konva.Rect;
    private cargoDrawData: Array<CargoSlot>;

    constructor(stage: Konva.Stage, playerColor: PlayerColor, cargo: CargoManifest) {
        this.stage = stage;
        this.group = new Konva.Group({
            width: SLOT_WIDTH * 4,
            height: 30,
            x: 10,
            y: 5,
        });
        this.cargoDrawData = [
            { x: 0, element: null },
            { x: SLOT_WIDTH, element: null },
            { x: SLOT_WIDTH * 2, element: null },
            { x: SLOT_WIDTH * 3, element: null },
        ];
        const backgroundMapping: Record<PlayerColor, Color> = {
            Red: COLOR.holdDarkRed,
            Purple: COLOR.holdDarkPurple,
            Green: COLOR.holdDarkGreen,
            Yellow: COLOR.holdDarkYellow,
        }
        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: backgroundMapping[playerColor],
            stroke: COLOR.stampEdge,
            cornerRadius: 5,
            strokeWidth: 1,
        });
        this.cargoDisplay = new Konva.Rect({
            width: cargo.length * SLOT_WIDTH,
            height: this.group.height(),
            fill: 'black',
            cornerRadius: 5,
        });
        this.group.add(...[
            background,
            this.cargoDisplay
        ]);
        this.update(cargo);
    }

    public update(cargo: CargoManifest): void {
        this.cargoDisplay.width(cargo.length * SLOT_WIDTH);

        for (const slot of this.cargoDrawData) {
            slot.element = slot.element?.selfDestruct() || null;
        }

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];

            if (item) {
                const slot = this.cargoDrawData[i];
                this.addItem(item, slot);
            }
        }
    };

    private addItem(itemId: ItemId, cargoSlot: CargoSlot): void {
        const token = new CargoToken(
            this.stage,
            { x: cargoSlot.x, y: 4 },
            itemId,
        );

        cargoSlot.element = token;
        this.group.add(token.getElement());
    }

    public getElement() {
        return this.group;
    }
}