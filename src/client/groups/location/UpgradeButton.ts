import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Action, Coordinates, Unique } from '~/shared_types';
import { RequestButton, CoinDial } from '../popular';
import clientConstants from '~/client_constants';
import { fade } from '~/client/animations';

const { HUES } = clientConstants;

type Upgrades = {
    first: Konva.Group,
    second: Konva.Group,
}

type Update = {
    mayUpgrade: boolean,
    cargoSize: number,
} | null

export class UpgradeButton extends RequestButton implements Unique<DynamicGroupInterface<Update>> {

    private background: Konva.Rect;
    private coin: CoinDial;
    private upgrades: Upgrades;

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

        this.coin = new CoinDial({ x: 15, y: 20 }, 2);

        this.upgrades = {
            first: this.getUpgradeIcon(),
            second: this.getUpgradeIcon({ x: 5, y: 5 }),
        };

        this.group.add(
            this.background,
            this.coin.getElement(),
            this.upgrades.second,
            this.upgrades.first,
        );
    }

    public async update(data: Update): Promise<void> {

        if (!data) {
            this.setEnabled(false);
            this.background.fill(HUES.upgradeBoxSilver);
            this.coin.update(0);
            this.upgrades.second.hide();
            this.upgrades.first.hide();

            return;
        }

        const { mayUpgrade, cargoSize } = data;
        this.setEnabled(mayUpgrade);
        this.background.fill(mayUpgrade ? HUES.boneWhite : HUES.upgradeBoxSilver);

        if (cargoSize > 2) {
            this.upgrades.first.opacity() == 1 && await fade(this.upgrades.first, .5, 0);
        } else {
            this.upgrades.first.opacity() == 0 && await fade(this.upgrades.first, .5, 1);
        }

        if (cargoSize > 3) {
            this.coin.update(0);
            this.upgrades.second.opacity() == 1 && await fade(this.upgrades.second, .5, 0);
        } else {
            this.coin.update(2);
            this.upgrades.second.opacity() == 0 && await fade(this.upgrades.second, .5, 1);
        };
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    private getUpgradeIcon(drift?: Coordinates) {
        const plusSign = new Konva.Text({
            x: 45 + (drift?.x ?? 0),
            y: 0 + (drift?.y ?? 0),
            text: '+',
            fontSize: 30,
            fontFamily: 'Calibri',
            fill: HUES.boneWhite,
        });
        const cargoIcon = new Konva.Rect({
            x: 40 + (drift?.x ?? 0),
            y: 0 + (drift?.y ?? 0),
            height: 30,
            width: 25,
            fill: 'black',
            stroke: HUES.stampEdge,
            hitStrokeWidth: 2,
            cornerRadius: 5,
            strokeWidth: 1,
        });

        return new Konva.Group().add(cargoIcon, plusSign);
    }
}