
import Konva from 'konva';
import { PlayMatInterface, Color } from '../client_types';
import { CargoManifest, ManifestItem, Player, PlayerId } from '../../shared_types';
import clientConstants from '../client_constants';

const { CARGO_ITEM_DATA: CARGO_HOLD_DATA, COLOR } = clientConstants;

type CargoSlot = {
    x: number,
    y: number,
    element: Konva.Path|null,
}
export class PlayMat implements PlayMatInterface {

    private playMat: Konva.Group;
    private background: Konva.Rect;
    private cargoHold: Konva.Rect;
    private cargoDrawData: Array<CargoSlot>;
    private id: PlayerId;
    private defaultX: number;

    constructor(
        player: Player,
        isLocalPlayer: boolean,
        color: Color,
        yOffset: number,
        isLargeHold: boolean = false,
    ) {
        this.id = player.id;
        this.defaultX = 525;
        this.playMat = new Konva.Group({
            width: 200,
            height: 100,
            x: player.isActive ? 500 : this.defaultX,
            y: yOffset,
        });


        this.background = new Konva.Rect({
            width: this.playMat.width(),
            height: this.playMat.height(),
            fill: color,
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: isLocalPlayer ? 3 : 0,
        });
        this.playMat.add(this.background);

        this.cargoHold = new Konva.Rect({
            width: 40,
            height: isLargeHold ? 40 : 25,
            fill: COLOR['wood'],
            cornerRadius: 5,
            strokeWidth: 1,
            x: 10,
            y: 10,
        });
        this.playMat.add(this.cargoHold);

        this.cargoDrawData = [
            {x: 0, y: 0, element: null},
            {x: 15, y: 0, element: null},
            {x: 0, y: 15, element: null},
            {x: 15, y: 15, element: null},
        ];
    }

    public updateElements(player: Player): void {
        this.updateHold(player.cargo);
        this.updateHighlight(player.isActive);
    }

    private updateHold(cargo: CargoManifest) {

        for (let i = 0; i < this.cargoDrawData.length; i++) {
            const slot = this.cargoDrawData[i];
            if (slot.element) {
                slot.element.destroy();
            }
        }

        for (let i = 0; i < cargo.length; i++) {
            const item = cargo[i];
            const driftData = this.cargoDrawData[i];
            if (item) {
                this.addItem(item, driftData);
            }
        }
    };

    private addItem(itemId: ManifestItem, cargoSlot: CargoSlot) {
        const itemData = CARGO_HOLD_DATA[itemId];
        const itemIcon = new Konva.Path({
            x: cargoSlot.x + this.cargoHold.x(),
            y: cargoSlot.y + this.cargoHold.y(),
            data: itemData.shape,
            fill: itemData.fill,
            stroke: 'white',
            strokeWidth: 1,
            // scale: {x: 5, y: 5},
        });
        cargoSlot.element = itemIcon;
        this.playMat.add(itemIcon);
    }

    private updateHighlight(isActive: boolean) {
        this.playMat.x(isActive ? this.defaultX - 25 : this.defaultX);
    }

    public getId(): PlayerId {
        return this.id;
    }
    public getElement() {
        return this.playMat;
    }

    public upgradeHold() {
        this.cargoHold.height(40);
    }
}