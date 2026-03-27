import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Action, Coordinates, Unique } from '~/shared_types';
import { RequestButton, CoinDial } from '../popular';
import clientConstants from '~/client_constants';

const { HUES } = clientConstants;

export class UpgradeButton extends RequestButton implements Unique<DynamicGroupInterface<boolean>> {

    private background: Konva.Rect;
    private plusSign: Konva.Text;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
    ) {
        const layout = {
            width: 80,
            height: 40,
            ...position,
        };

        super(stage, layout, { action: Action.upgrade_cargo, payload: null });

        const bgRetraction = 9;
        this.background = new Konva.Rect({
            width: layout.width - bgRetraction,
            height: layout.height,
            x: bgRetraction,
            fill: HUES.upgradeBoxSilver,
            cornerRadius: 5,
        });

        const coin = new CoinDial({ x: 15, y: 20 }, 2);

        this.plusSign = new Konva.Text({
            x: 50,
            y: 5,
            text: '+',
            fontSize: 30,
            fontFamily: 'Calibri',
            fill: HUES.boneWhite,
        });

        const cargoIcon = new Konva.Rect({
            x: 45,
            y: 5,
            height: 30,
            width: 25,
            fill: 'black',
            stroke: HUES.stampEdge,
            hitStrokeWidth: 2,
            cornerRadius: 5,
            strokeWidth: 1,
        });

        this.group.add(
            this.background,
            coin.getElement(),
            cargoIcon,
            this.plusSign,
        );
    }

    public update(canUpgrade: boolean): void {
        this.setEnabled(canUpgrade);
        this.background.fill(canUpgrade ? HUES.boneWhite : HUES.upgradeBoxSilver);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}