
import Konva from 'konva';
import { DynamicGroupInterface } from '../../client_types';
import { Action, Player, PlayerColor } from '../../../shared_types';
import { FavorDial, CargoBand, CoinDial, InfluenceDial} from '../GroupList';
import { VictoryPointDial } from '../VictoryPointDial';
import clientConstants from '../../client_constants';
import { SpecialtyGoodButton } from './SpecialtyGoodButton';
import { SpecialistBand } from './SpecialistBand';

const { COLOR } = clientConstants;

export class PlayerPlacard implements DynamicGroupInterface<Player> {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoBand: CargoBand;
    private specialistBand: SpecialistBand;
    private favorDial: FavorDial;
    private coinDial: CoinDial;
    private influenceDial: InfluenceDial;
    private vpDial: VictoryPointDial | null;
    private specialtyGoodButton: SpecialtyGoodButton;
    private id: PlayerColor;
    private localPlayerColor: PlayerColor | null;

    constructor(
        stage: Konva.Stage,
        player: Player,
        localColorName: PlayerColor | null,
        yOffset: number,
    ) {
        const { color, cargo, isActive } = player;

        const isLocalPlayer = localColorName === color;

        this.stage = stage;
        this.id = color;
        this.localPlayerColor = localColorName;
        this.group = new Konva.Group({
            width: 250,
            height: 100,
            x: 25,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[`${isActive ? '' : 'dark'}${color}`],
            cornerRadius: 5,
        });


        this.cargoBand = new CargoBand(
            this.stage,
            color,
            { cargo, canDrop: false },
            isLocalPlayer,
        );

        this.specialistBand = new SpecialistBand(
            { x: 120, y: 5 },
            player,
            isLocalPlayer
        )

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
            this.specialistBand.getElement(),
        );

        this.vpDial = player.color === localColorName ? new VictoryPointDial(
            { x:120, y: 3 },
            0,
        ) : null;
        this.vpDial && this.group.add(this.vpDial.getElement());

        this.specialtyGoodButton = new SpecialtyGoodButton(
            stage,
            player,
            { x: 190, y: 40 },
            isLocalPlayer,
        );
        this.group.add(this.specialtyGoodButton.getElement());
    }

    public update(player: Player): void {
        const { cargo, favor, isActive, influence, color, locationActions, isAnchored, specialist } = player;
        this.background.fill(COLOR[`${isActive ? '' : 'dark'}${color}`]);
        this.cargoBand.update({ cargo, canDrop: this.localPlayerColor === color && isActive });
        this.favorDial.update(favor);
        this.coinDial.update(player.coins);
        this.influenceDial.update(influence);
        this.specialistBand.update(isActive);
        this.specialtyGoodButton.update(!!(
            isAnchored
            && locationActions.includes(Action.sell_good)
            && specialist.specialty
            && cargo.includes(specialist.specialty)
        ));
    }

    public updateVP(vp: number) {
        if (!this.vpDial)
            throw new Error("Cannot update VP on opponent placards");

        this.vpDial?.update(vp);
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
