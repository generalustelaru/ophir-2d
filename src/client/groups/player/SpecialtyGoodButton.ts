import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { ActionButton } from '../ActionButton';
import { Player, Coordinates, ClientMessage, PlayerColor } from '../../../shared_types';
import clientConstants from '../../client_constants';

const { CARGO_ITEM_DATA, COLOR } = clientConstants;

export class SpecialtyGoodButton extends ActionButton implements DynamicGroupInterface<boolean> {

    background: Konva.Rect;
    playerColor: PlayerColor;
    isLocalPlayer: boolean;

    constructor(
        stage: Konva.Stage,
        player: Player,
        position: Coordinates,
        message: ClientMessage | null,
    ) {

        const size = { width: 50, height: 50 };
        const layout = { ...position, ...size };
        const { specialty } = player.specialist;

        super(stage, layout, specialty ? message : null);

        this.playerColor = player.color;
        this.isLocalPlayer = !!message;
        this.background = new Konva.Rect({
            ...size,
            fill: COLOR[`holdDark${player.color}`],
            cornerRadius: 10,
            stroke: message ? 'white' : undefined,
            strokeWidth: 2
        });
        this.group.add(this.background);

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
        this.background.fill(this.isLocalPlayer && maySell
            ? COLOR.marketOrange
            : COLOR[`holdDark${this.playerColor}`]
        )
        this.setEnabled(maySell);
    }
}