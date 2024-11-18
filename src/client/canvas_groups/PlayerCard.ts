
import Konva from 'konva';
import { DynamicGroupInterface } from '../client_types';
import { Player, PlayerId } from '../../shared_types';
import { FavorDial, CargoDisplay, CoinDial, BoneIcon} from './CanvasGroups';
import clientConstants from '../client_constants';

const { COLOR } = clientConstants;

export class PlayerCard implements DynamicGroupInterface<Player> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoDisplay: CargoDisplay;
    private favorDial: FavorDial;
    private coinDial: CoinDial;
    private influenceDial: BoneIcon;
    private id: PlayerId;

    constructor(
        stage: Konva.Stage,
        player: Player,
        localPlayerId: PlayerId|null,
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

        this.cargoDisplay = new CargoDisplay(player.cargo);

        this.favorDial = new FavorDial(
            stage,
            { action: 'favor', details: null },
            player,
            localPlayerId
        );

        this.coinDial = new CoinDial(
            { x: 105, y: 63 },
            player.coins
        );

        this.influenceDial = new BoneIcon(
            {
                width: 50,
                height: 50,
                x: 60,
                y: -25,
            },
            COLOR[player.id]);
        this.influenceDial.updateElement(player.influence);

        this.group.add(
            this.background,
            this.cargoDisplay.getElement(),
            this.favorDial.getElement(),
            this.coinDial.getElement(),
            this.influenceDial.getElement(),
        );
    }

    public updateElement(player: Player): void {
        this.cargoDisplay.updateElement(player.cargo);
        this.background.strokeWidth(player.isActive ? 3 : 0);
        this.favorDial.updateElement(player);
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
