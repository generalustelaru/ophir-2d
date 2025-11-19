import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Player, Coordinates, PlayerColor, Action, Unique } from '~/shared_types';
import { RequestButton } from '../popular';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA, COLOR } = clientConstants;

export class SpecialtyGoodButton extends RequestButton implements Unique<DynamicGroupInterface<boolean>> {

    private background: Konva.Rect;
    private playerColor: PlayerColor;
    private isLocalPlayer: boolean;

    constructor(
        stage: Konva.Stage,
        player: Player,
        position: Coordinates,
        isLocalPlayer: boolean,
    ) {

        const size = { width: 50, height: 50 };
        const layout = { ...position, ...size };
        const { specialty } = player.specialist;

        super(stage, layout, isLocalPlayer && specialty ? { action: Action.sell_specialty, payload: null } :  null);

        this.playerColor = player.color;
        this.isLocalPlayer = isLocalPlayer;
        this.background = new Konva.Rect({
            ...size,
            fill: isLocalPlayer ? COLOR[`dark${player.color}`] : undefined,
            cornerRadius: 5,
            stroke: isLocalPlayer && specialty ? 'white' : undefined,
            strokeWidth: 2,
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
            });
            this.group.add(tradeGoodIcon);
        }
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(maySell: boolean): void {
        if (this.isLocalPlayer) {
            this.background.fill( maySell
                ? COLOR.marketOrange
                : COLOR[`dark${this.playerColor}`],
            );
        }
        this.setEnabled(maySell);
    }
}