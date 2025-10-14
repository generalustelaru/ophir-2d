// same height but narrower
// stroke should become of the player color when ship is controllable
// should contain buttons for shifting the market and endig turn (its turn)

import Konva from "konva";
import { DynamicGroupInterface } from "~/client_types";
import clientConstants from "~/client_constants";
import { Action, PlayerColor, SelectableSpecialist, SpecialistName } from "~/shared_types";
import { ActionButton } from "../ActionButton";
import { FavorDial } from "../FavorDial";

const { COLOR, CARGO_ITEM_DATA } = clientConstants;

type SpecialistCardUpdate = {
    localPlayerColor: PlayerColor | null
    specialist: SelectableSpecialist;
    shouldEnable: boolean;
}

export class SpecialistCard extends ActionButton implements DynamicGroupInterface<SpecialistCardUpdate> {

    private background: Konva.Rect;
    private cardName: SpecialistName;

    constructor(
        stage: Konva.Stage,
        specialist: SelectableSpecialist,
        xOffset: number,
    ) {
        const layout = {
            width: 200,
            height: 300,
            x: xOffset,
            y: 50,
        }
        super(
            stage,
            layout,
            {
                action: Action.pick_specialist,
                payload: { name: specialist.name }
            }
        );
        this.cardName = specialist.name;

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeRed,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        const textCommon = {
            fontFamily: 'Custom',
            width: layout.width,
            height: layout.height,
        }

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
            width: layout.width - 5,
            text: specialist.description,
            fontSize: 22,
            y: 70,
            x: 5,
        });

        const favorDial = new FavorDial({ x: 5, y: 240 }, specialist.startingFavor);

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

        this.setEnabled(!specialist.owner);
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
                this.background.fill(COLOR.templeRed);
                break;
            case !!localPlayerColor && localPlayerColor === specialist.owner:
                this.background.fill(COLOR[localPlayerColor]);
                break;
            case !!specialist.owner:
                this.background.fill(COLOR[`dark${specialist.owner}`]);
                break;
            default:
                this.background.fill(COLOR.templeDarkRed);
                break;
        }
        this.setEnabled(shouldEnable);
    }
}