import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { ActionButton } from '../ActionButton';
import { Player, Coordinates, ClientMessage } from '../../../shared_types';
import clientConstants from '../../client_constants';

export class SpecialtyGoodButton extends ActionButton implements DynamicGroupInterface<boolean> {

    constructor(
        stage: Konva.Stage,
        player: Player,
        position: Coordinates,
        message: ClientMessage | null,
    ) {
        const { CARGO_ITEM_DATA, COLOR } = clientConstants;

        const size = { width: 50, height: 50 };
        const layout = { ...position, ...size };
        const { specialty } = player.specialist;

        super(stage, layout, specialty ? message : null);

        const background = new Konva.Rect({
            ...size,
            fill: COLOR[`holdDark${player.color}`],
            cornerRadius: 10,
        });
        this.group.add(background);

        if (specialty) {
            const iconData = CARGO_ITEM_DATA[specialty];
            const tradeGoodIcon = new Konva.Path({
                data: iconData.shape,
                fill: iconData.fill,
                stroke: 'white',
                strokeWidth: .75,
                scale: { x: 3, y: 3 },
                x: 7,
                y: 7,
            })
            this.group.add(tradeGoodIcon);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(maySell: boolean): void {
        console.log({maySell})
    }
}