
import Konva from 'konva';
import { DynamicGroupInterface, ElementList, PlayerHueVariation } from '~/client_types';
import { Action, DiceSix, Player, PlayerColor, Unique, ZoneName } from '~/shared_types';
import { CoinDial, FavorDial, InfluenceDial, VictoryPointDial } from '../popular';
import { CargoBand, SpecialistBand, SpecialistCard, SpecialtyButton } from '.';
import clientConstants from '~/client_constants';

const { PLAYER_HUES } = clientConstants;

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
    private currentInfluence: DiceSix;
    private currentZone: ZoneName;
    private vpDial: VictoryPointDial;
    private specialtyButton: SpecialtyButton;
    private color: PlayerColor;
    private variation: PlayerHueVariation;
    private localPlayerColor: PlayerColor | null;

    constructor(
        stage: Konva.Stage,
        player: Player,
        localColorName: PlayerColor | null,
        yOffset: number,
    ) {
        const { color, cargo } = player;
        this.variation = PLAYER_HUES[player.color];
        const isLocalPlayer = localColorName === color;

        this.stage = stage;
        this.color = color;
        this.localPlayerColor = localColorName;
        this.group = new Konva.Group({
            width: 250,
            height: 100,
            x: 50,
            y: yOffset,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
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

        this.currentZone = player.bearings.seaZone;
        this.currentInfluence = player.influence;
        this.influenceDial = new InfluenceDial(
            { x: -53, y: 25 },
            this.variation.vivid.light,
        );

        const elements: ElementList = [
            this.background,
            this.cargoBand.getElement(),
            this.favorDial.getElement(),
            this.coinDial.getElement(),
            this.influenceDial.getElement(),
        ];

        this.vpDial = new VictoryPointDial(
            { x:120, y: 33 },
            0,
            player.color === localColorName,
        );
        elements.push(this.vpDial.getElement());

        this.specialtyButton = new SpecialtyButton(
            stage,
            player,
            { x: 190, y: 40 },
            isLocalPlayer,
        );
        elements.push(this.specialtyButton.getElement());

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

        elements.push(
            this.specialistCard.getElement(),
            this.specialistBand.getElement(),
        );

        this.group.add(...elements);
    }

    public update(player: Player): void {
        const { cargo, isCurrent, influence, specialist, bearings } = player;
        const { seaZone } = bearings;
        this.background.fill(isCurrent ? this.variation.vivid.light : this.variation.muted.dark);
        this.cargoBand.update({ cargo, canDrop: this.localPlayerColor === player.color && isCurrent });
        this.favorDial.update(player.favor);
        this.coinDial.update(player.coins);
        this.influenceDial.update({
            value: influence,
            hue: isCurrent ? this.variation.muted.dark : this.variation.vivid.light,
            simRoll: isCurrent && influence != this.currentInfluence &&  seaZone != this.currentZone,
        });

        this.currentInfluence = influence;
        this.currentZone = seaZone;
        this.specialistBand.update(isCurrent);
        this.specialistCard.update(player.name);
        this.specialtyButton.update(!!(
            player.isAnchored
            && player.locationActions.includes(Action.sell_specialty)
            && specialist.specialty
            && cargo.includes(specialist.specialty)
        ));
    }

    public switchToResults(vp: number) {
        this.influenceDial.selfDestroy();
        this.vpDial.appear();
        this.vpDial.update(vp);
    }

    public updateVP(vp: number) {
        this.vpDial.update(vp);
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
        this.specialtyButton.disable();
    }

    private toggleSpecialistCard() {
        this.specialistCard.toggle();
    }
}
