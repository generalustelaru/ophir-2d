
import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { Player, PlayerId } from '../../../shared_types';
import { FavorDial, CargoBand, CoinDial, InfluenceDial} from '../GroupList';
import clientConstants from '../../client_constants';

const { COLOR } = clientConstants;

export class PlayerPlacard implements DynamicGroupInterface<Player> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoBand: CargoBand;
    private favorDial: FavorDial;
    private coinDial: CoinDial;
    private influenceDial: InfluenceDial;
    private id: PlayerId;

    constructor(
        player: Player,
        localPlayerId: PlayerId | null,
        yOffset: number,
    ) {
        this.id = player.id;
        this.group = new Konva.Group({
            width: 200,
            height: 100,
            x: localPlayerId === player.id ? 25 : 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[player.id],
            stroke: 'white',
            cornerRadius: 15,
            strokeWidth: player.isActive ? 3 : 0,
        });

        this.cargoBand = new CargoBand(player.id, player.cargo);

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
            COLOR[player.id]);
        this.influenceDial.updateElement(player.influence);

        this.group.add(
            this.background,
            this.cargoBand.getElement(),
            this.favorDial.getElement(),
            this.coinDial.getElement(),
            this.influenceDial.getElement(),
        );
    }

    public updateElement(player: Player): void {
        this.background.strokeWidth(player.isActive ? 3 : 0);
        this.cargoBand.updateElement(player.cargo);
        this.favorDial.updateElement(player.favor);
        this.coinDial.updateElement(player.coins);
        this.influenceDial.updateElement(player.influence);
    }

    public getId(): PlayerId {
        return this.id;
    }

    public getElement() {
        return this.group;
    }
}
