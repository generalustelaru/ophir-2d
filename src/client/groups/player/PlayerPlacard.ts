
import Konva from 'konva';
import { DynamicGroupInterface, Unique } from '~/client_types';
import { Action, Player, PlayerColor } from '~/shared_types';
import { CoinDial, FavorDial, InfluenceDial, VictoryPointDial } from '../popular';
import { CargoBand, SpecialistBand, SpecialistCard, SpecialtyGoodButton } from '.';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class PlayerPlacard implements Unique<DynamicGroupInterface<Player>> {

    private stage: Konva.Stage;
    private group: Konva.Group;
    private background: Konva.Rect;
    private cargoBand: CargoBand;
    private specialistBand: SpecialistBand;
    private specialistCard: SpecialistCard;
    private favorDial: FavorDial;
    private coinDial: CoinDial;
    private influenceDial: InfluenceDial;
    private vpDial: VictoryPointDial | null;
    private specialtyGoodButton: SpecialtyGoodButton;
    private color: PlayerColor;
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
        this.color = color;
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
        );

        this.favorDial = new FavorDial(
            { x: 10, y: 42 },
            player.favor,
        );

        this.coinDial = new CoinDial(
            { x: 85, y: 65 },
            player.coins,
        );

        this.influenceDial = new InfluenceDial(
            { x: -55, y: 25 },
            COLOR[`dark${player.color}`]);
        this.influenceDial.update({ value: player.influence, color: COLOR[`dark${player.color}`] });

        this.group.add(
            this.background,
            this.cargoBand.getElement(),
            this.favorDial.getElement(),
            this.coinDial.getElement(),
            this.influenceDial.getElement(),
        );

        this.vpDial = player.color === localColorName ? new VictoryPointDial(
            { x:120, y: 33 },
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

        this.specialistCard = new SpecialistCard(
            { width: this.group.width(), height: this.group.height(), x: 0, y: 0 },
            player,
            isLocalPlayer,
        );

        this.specialistBand = new SpecialistBand(
            stage,
            { x: 120, y: 5 },
            player,
            // isLocalPlayer,
            () => this.toggleSpecialistCard(),
        );

        this.group.add(
            this.specialistCard.getElement(),
            this.specialistBand.getElement(),
        );
    }

    public update(player: Player): void {
        const { cargo, favor, isActive, influence, color, locationActions, isAnchored, specialist, name } = player;
        this.background.fill(COLOR[`${isActive ? '' : 'dark'}${color}`]);
        this.cargoBand.update({ cargo, canDrop: this.localPlayerColor === color && isActive });
        this.favorDial.update(favor);
        this.coinDial.update(player.coins);
        this.influenceDial.update({ value: influence, color: COLOR[`${isActive ? '' : 'dark'}${color}`] });
        this.specialistBand.update(isActive);
        this.specialistCard.update(name);
        this.specialtyGoodButton.update(!!(
            isAnchored
            && locationActions.includes(Action.sell_specialty)
            && specialist.specialty
            && cargo.includes(specialist.specialty)
        ));
    }

    public updateVP(vp: number) {
        if (!this.vpDial)
            throw new Error('Cannot update VP on opponent placards');

        this.vpDial?.update(vp);
    }

    public getId(): PlayerColor {
        return this.color;
    }

    public isLocal() {
        return Boolean(this.localPlayerColor);
    }

    public getElement() {
        return this.group;
    }

    public disable() {
        this.specialtyGoodButton.disable();
    }

    private toggleSpecialistCard() {
        this.specialistCard.toggle();
    }
}
