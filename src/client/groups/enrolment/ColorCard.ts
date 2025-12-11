import Konva from 'konva';
import { DynamicGroupInterface, PlayerHueVariation } from '~/client_types';
import { RequestButton } from '../popular';
import clientConstants from '~/client_constants';
import { Action, Coordinates, PlayerColor, PlayerEntry, Unique } from '~/shared_types';

const { HUES, SHIP_DATA } = clientConstants;

type ColorCardUpdate = {
    localPlayer: PlayerEntry | null
    players: Array<PlayerEntry>
}
export class ColorCard extends RequestButton implements Unique<DynamicGroupInterface<ColorCardUpdate>> {
    private background: Konva.Rect | null;
    private shipPath: Konva.Path | null;
    private color: PlayerColor;
    private variation: PlayerHueVariation;
    private ownerName: Konva.Text | null;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: PlayerColor,
        variation: PlayerHueVariation,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 230,
            height: 300,
        };
        super(stage, layout, null);

        this.color = color;
        this.variation = variation;
        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: HUES.templeDarkBlue,
            cornerRadius: 15,
        });

        this.shipPath = new Konva.Path({
            x: 50,
            y: 32,
            data: SHIP_DATA.shape,
            fill: variation['muted'].dark,
            scale: { x: 4, y: 4 },
            stroke: HUES.shipBorder,
            strokeWidth: 2,
        });

        this.ownerName = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontFamily: 'Custom',
            fontSize: 28,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            y: 190,
            text: 'available',
        });

        this.setEnabled(true);

        this.group.add(this.background, this.shipPath, this.ownerName);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public update(update: ColorCardUpdate): void {

        if (!this.background || !this.ownerName || !this.shipPath)
            return;

        const { localPlayer, players } = update;
        const cardOwner = players.find(p => p.color == this.color);
        const localPlayerIsOwner = !!localPlayer && localPlayer.name === cardOwner?.name;

        this.setEnabled(!Boolean(cardOwner));

        this.updateActionMessage(!cardOwner && localPlayer?.color
            ? { action: Action.change_color, payload: { color: this.color, name: localPlayer.name } }
            : { action: Action.enrol, payload: { color: this.color, name: null } },
        );

        const { muted: active, vivid: inactive } = this.variation;

        if (cardOwner) {
            this.ownerName.text(`${cardOwner.name}${localPlayerIsOwner ? '\n(you)' : ''}`);
            this.shipPath.fill(active.light);
            this.shipPath.stroke(active.dark);
            this.background.fill(inactive.light);
            this.ownerName.fill(inactive.dark);
        } else {
            this.ownerName.text('available');
            this.shipPath.fill('');
            this.shipPath.stroke(inactive.light);
            this.background.fill(HUES.templeDarkBlue);
            this.ownerName.fill(HUES.boneWhite);
        }
    }

    public selfDecomission(): null {
        this.clearReferences();
        this.background?.destroy();
        this.background = null;
        this.ownerName?.destroy();
        this.ownerName = null;
        this.shipPath?.destroy();
        this.shipPath = null;
        return null;
    }
}