import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "~/client_types";
import { EnrolmentState, PlayerColor, PlayerEntry } from "~/shared_types";
import  clientConstants from "~/client_constants"
import { ColorCard } from "./ColorCard";

type EnrolmentModalUpdate = {
    players: Array<PlayerEntry>,
}

const { COLOR } = clientConstants

export class EnrolmentModal implements DynamicGroupInterface<EnrolmentModalUpdate> {
    private group: Konva.Group;
    // private localPlayerColor: PlayerColor | null;

    constructor(
        stage: Konva.Stage, layout: GroupLayoutData, localPlayerColor: PlayerColor | null, state: EnrolmentState
    ) {
        // this.localPlayerColor = localPlayerColor;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            cornerRadius: 15,
            fill: COLOR.modalBlue,

        });
        this.group.add(background);

        const playerColors: Array<PlayerColor> = ['Purple' , 'Yellow' , 'Red' , 'Green'];
        const margin = 60;
        const offset = 200;
        let drift = margin;
        playerColors.forEach(color => {
            const optionCard = new ColorCard(
                stage,
                {x:drift, y:50},
                color,
                {
                    player: state.players.find(p => p.color === localPlayerColor) || null
                },
            );
            this.group.add(optionCard.getElement());
            drift += margin + offset;
        });

    }

    public getElement() {
        return this.group;
    }

    public update(data: EnrolmentModalUpdate) {
        console.log({players: data.players});
    }
}