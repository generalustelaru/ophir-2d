import Konva from 'konva';
import { DynamicGroupInterface, ElementList } from '~/client_types';
import { Player, Coordinates, PlayerColor, Action, Unique } from '~/shared_types';
import { RequestButton, CoinDial } from '../popular';
import clientConstants from '~/client_constants';

const { CARGO_ITEM_DATA, HUES } = clientConstants;

export class SpecialtyButton extends RequestButton implements Unique<DynamicGroupInterface<boolean>> {

    private background: Konva.Rect;
    private playerColor: PlayerColor;
    private isLocalPlayer: boolean;
    private coin: CoinDial | null = null;

    constructor(
        stage: Konva.Stage,
        player: Player,
        position: Coordinates,
        isLocalPlayer: boolean,
    ) {

        const size = { width: 50, height: 50 };
        const layout = { ...position, ...size };
        const { specialty } = player.specialist;
        const isWorkingButton = isLocalPlayer && specialty;
        super(
            stage,
            layout,
            isWorkingButton ? { action: Action.sell_specialty, payload: null } :  null,
        );

        this.playerColor = player.color;
        this.isLocalPlayer = isLocalPlayer;
        this.background = new Konva.Rect({
            ...size,
            fill: isLocalPlayer ? HUES[`dark${player.color}`] : undefined,
            cornerRadius: 5,
            stroke: isWorkingButton ? 'white' : undefined,
            strokeWidth: 2,
        });

        const elements: ElementList = [this.background];

        if (specialty) {
            const iconData = CARGO_ITEM_DATA[specialty];
            const specialtyIcon = new Konva.Path({
                data: iconData.shape,
                fill: iconData.fill,
                stroke: 'white',
                strokeWidth: .75,
                scale: { x: 3, y: 3 },
                x: 7,
                y: 7,
            });
            elements.push(specialtyIcon);
        }

        if (isLocalPlayer) {
            this.coin = new CoinDial({ x: 25, y: 40 }, 1);
            const clipGroup = new Konva.Group({
                clipFunc: (ctx => {ctx.rect(0, 0, size.width, size.height - 1);}),
            }).add(this.coin.getElement());

            elements.push(clipGroup);
        }

        this.group.add(...elements);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(maySell: boolean): void {
        if (this.isLocalPlayer) {
            this.background.fill( maySell
                ? HUES.marketOrange
                : HUES[`dark${this.playerColor}`],
            );
            maySell ? this.coin?.show() : this.coin?.hide();
        }
        this.setEnabled(maySell);
    }
}