
import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { Player, PlayerColor } from '../../../shared_types';
import { FavorDial, CargoBand, CoinDial, InfluenceDial} from '../GroupList';
import clientConstants from '../../client_constants';

const { COLOR } = clientConstants;

export class PlayerPlacard implements DynamicGroupInterface<Player> {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoBand: CargoBand;
    private favorDial: FavorDial;
    private coinDial: CoinDial;
    private influenceDial: InfluenceDial;
    private id: PlayerColor;
    private localPlayerColor: PlayerColor | null;

    constructor(
        stage: Konva.Stage,
        player: Player,
        localColorName: PlayerColor | null,
        yOffset: number,
    ) {
        const isLocalPlayer = localColorName === player.color;

        this.stage = stage;
        this.id = player.color;
        this.localPlayerColor = localColorName;
        this.group = new Konva.Group({
            width: isLocalPlayer ? 250 : 200,
            height: 100,
            x: isLocalPlayer ? 25 : 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[player.color],
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: player.isActive ? 3 : 0,
        });

        const { color, cargo } = player;
        this.cargoBand = new CargoBand(
            this.stage,
            color,
            { cargo, canDrop: false },
        );

        this.favorDial = new FavorDial(
            { x: 10, y: 42 },
            player.favor,
        );

        this.coinDial = new CoinDial(
            { x: 85, y: 65 },
            player.coins
        );

        this.influenceDial = new InfluenceDial(
            { width: 50, height: 50, x: 60, y: -25 },
            COLOR[player.color]);
        this.influenceDial.update(player.influence);

        this.group.add(
            this.background,
            this.cargoBand.getElement(),
            this.favorDial.getElement(),
            this.coinDial.getElement(),
            this.influenceDial.getElement(),
        );
    }

    public update(player: Player): void {
        const { cargo, favor, isActive, influence, color } = player;
        this.background.strokeWidth(isActive ? 3 : 0);
        this.cargoBand.update({ cargo, canDrop: this.localPlayerColor === color && isActive });
        this.favorDial.update(favor);
        this.coinDial.update(player.coins);
        this.influenceDial.update(influence);
    }

    public getId(): PlayerColor {
        return this.id;
    }

    public getElement() {
        return this.group;
    }

    public disable() {
        this.cargoBand.disable();
    }
}
