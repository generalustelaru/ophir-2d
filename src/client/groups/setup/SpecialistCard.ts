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

        const styles = {
            disabled: {
                fill: COLOR.templeDarkBlue,
            },
            enabled: {
                fill: COLOR.templeBlue,
            },
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
            // stroke: COLOR.boneWhite,
            fill: COLOR.templeBlue,
            cornerRadius: 15,
            strokeWidth: 0,
        });

        const textCommon = {
            fontFamily: 'Custom',
            width: layout.width,
            height: layout.height,
        }

        const { owner, displayName, description, startingFavor, specialty } = specialist;
        const nameElement = new Konva.Text({
            ...textCommon,
            text: displayName,
            fontStyle: 'bold',
            fontSize: 26,
            align: 'center',
            y: 10,
        });

        const descriptionElement = new Konva.Text({
            ...textCommon,
            width: layout.width - 5,
            text: description,
            fontSize: 22,
            y: 70,
            x: 5,
        });

        const favorDial = new FavorDial({ x: 5, y: 240 }, startingFavor);


        // this.info = new Konva.Text({
        //     x: 10,
        //     text: this.getCardText(specialist),
        //     width: 200,
        //     fontSize: 18,
        //     fontFamily: 'Custom',
        //     wrap: 'word'
        // });

        this.group.add(...[
            this.background,
            nameElement,
            descriptionElement,
            favorDial.getElement(),
        ]);

        if (specialty) {
            const iconData = CARGO_ITEM_DATA[specialty];
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
                this.background.fill(styles.enabled.fill);
                break;
            case !!localPlayerColor && localPlayerColor === specialist.owner:
                this.background.fill(COLOR[localPlayerColor]);
                break;
            case Boolean(specialist.owner):
                this.background.fill(COLOR[`dark${specialist.owner}`]);
                // this.background.fill('black');
                break;
            default:
                this.background.fill(styles.disabled.fill);
                break;
        }
        if (shouldEnable) {
        } else {
            this.background.fill( specialist.owner ? COLOR[specialist.owner] : styles.disabled.fill)
        }
        this.setEnabled(shouldEnable);
        // this.info.text(this.getCardText(data.specialist))
    }

    // private getCardText(specialist: SelectableSpecialist) {
    //     const { owner, displayName, description, startingFavor, specialty } = specialist;

    //     return `
    //     ${displayName}\n
    //     \n${description}\n
    //     \nFavor: ${startingFavor}\n
    //     \nSpecialty: ${specialty || 'none'}\n
    //     \n${owner ? 'Picked by: ' + owner : 'Not Picked'}`;
    // }
}