// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from 'konva';
import { Color, DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client_constants';
import { Coordinates, PlayerColor, SelectableSpecialist, SpecialistName, Unique } from '~/shared_types';
import { Button, FavorDial } from '../popular';
import { ConfirmButton } from './ConfirmButton';

const { COLOR, CARGO_ITEM_DATA } = clientConstants;

type SpecialistCardUpdate = {
    localPlayerColor: PlayerColor | null
    specialist: SelectableSpecialist;
    shouldEnable: boolean;
}

export class SpecialistCard extends Button implements Unique<DynamicGroupInterface<SpecialistCardUpdate>> {

    private background: Konva.Rect;
    private cardName: SpecialistName;
    private stateFill: Color;
    private selectButton: ConfirmButton;

    constructor(
        stage: Konva.Stage,
        specialist: SelectableSpecialist,
        position: Coordinates,
        selectionCallback: (name: SpecialistName) => void,
    ) {
        const layout = { ...position, width: 200, height: 300 };

        super(stage, layout, () => {});

        this.cardName = specialist.name;
        this.stateFill = COLOR.templeRed;
        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: this.stateFill,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        this.updateFunction(selectionCallback);

        const textCommon = {
            fontFamily: 'Custom',
            width: layout.width,
        };

        const nameElement = new Konva.Text({
            ...textCommon,
            text: specialist.displayName,
            fontStyle: 'bold',
            fontSize: 26,
            align: 'center',
            y: 10,
        });

        const descriptionElement = new Konva.Text({
            ...textCommon,
            width: layout.width,
            text: specialist.description,
            fontSize: 22,
            y: 70,
            x: 5,
        });

        const favorDial = new FavorDial({ x: 5, y: 240 }, specialist.startingFavor);

        this.selectButton = new ConfirmButton(stage, { x: 0, y: 0 }, specialist);

        this.group.add(...[
            this.background,
            nameElement,
            descriptionElement,
            favorDial.getElement(),
        ]);

        if (specialist.specialty) {
            const iconData = CARGO_ITEM_DATA[specialist.specialty];
            const tradeGoodIcon = new Konva.Path({
                data: iconData.shape,
                fill: iconData.fill,
                stroke: 'white',
                strokeWidth: .75,
                scale: { x: 3, y: 3 },
                x: 155,
                y: 248,
            });
            this.group.add(tradeGoodIcon);
        }

        this.group.add(this.selectButton.getElement());

        !specialist.owner ? this.enable() : this.disable();
    }

    public getCardName() {
        return this.cardName;
    }

    public getElement() {
        return this.group;
    }

    public update(data: SpecialistCardUpdate) {
        const { localPlayerColor, shouldEnable, specialist } = data;

        switch (true) {
            case shouldEnable:
                this.setFill(COLOR.templeRed);
                break;
            case !!localPlayerColor && localPlayerColor === specialist.owner:
                this.setFill(COLOR[localPlayerColor]);
                this.selectButton.hide();
                break;
            case !!specialist.owner:
                this.setFill(COLOR[`dark${specialist.owner}`]);
                this.selectButton.hide();
                break;
            default:
                this.setFill(COLOR.templeDarkRed);
                this.selectButton.hide();
                break;
        }
        shouldEnable ? this.enable() : this.disable();
    }

    public preSelect(isPreSelected: boolean) {
        if (isPreSelected) {
            this.selectButton.show();
            this.background.fill(COLOR.boneWhite);
        } else {
            this.setFill(this.stateFill);
            this.selectButton.hide();
        }
    }

    private setFill(color: Color) {
        this.stateFill = color;
        this.background.fill(color);
    }
}