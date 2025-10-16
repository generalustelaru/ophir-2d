import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { ShipToken } from '../ShipToken';
import clientConstants from '~/client_constants';
import { Action, Coordinates, PlayerColor, PlayerEntry } from '~/shared_types';
import { ActionButton } from '../ActionButton';

const { COLOR } = clientConstants;

type ColorCardUpdate = {
    localPlayer: PlayerEntry | null
    players: Array<PlayerEntry>
}
export class ColorCard extends ActionButton implements DynamicGroupInterface<ColorCardUpdate> {
    private background: Konva.Rect;
    private shipToken: ShipToken;
    private color: PlayerColor;
    private ownerName: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: PlayerColor,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 200,
            height: 300,
        };
        super(stage, layout, { action: Action.enrol, payload: { color, name: null } });

        this.color = color;
        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: COLOR.templeDarkRed,
            cornerRadius: 15,
        });

        this.shipToken = new ShipToken(COLOR[color], { scale: 4, position: { x: 40, y: 50 } });

        this.ownerName = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontSize: 28,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'middle',
            y: 50,
            fontFamily: 'Custom',
            text: 'available',
        });

        this.group.add(this.background, this.shipToken.getElement(), this.ownerName);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(update: ColorCardUpdate): void {
        const { localPlayer, players } = update;

        const colorOwner = players.find(p => p.color == this.color);
        const isLocalPlayerColor = localPlayer && localPlayer.name === colorOwner?.name;
        const text = isLocalPlayerColor
            ? 'You'
            : (
                colorOwner
                    ? colorOwner?.name || 'picked'
                    : 'available'
            );

        this.setEnabled(!Boolean(localPlayer || colorOwner));

        this.background.fill(colorOwner ? COLOR[`dark${colorOwner.color}`] : COLOR.templeDarkRed);
        this.ownerName.text(text);
        this.ownerName.fill(colorOwner ? COLOR[colorOwner.color] : 'white');
        this.shipToken.update(isLocalPlayerColor ? COLOR.activeShipBorder : COLOR.shipBorder);
    }
}