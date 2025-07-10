import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { PlayerColor, PlayerDraft, Specialist } from "../../../shared_types";
import  clientConstants from "../../client_constants"
import { SpecialistCard } from "./SpecialistCard";

type ModalUpdate = {
    players: Array<PlayerDraft>,
    specialists: Array<Specialist>,
}

const { COLOR } = clientConstants

export class SetupModal implements DynamicGroupInterface<ModalUpdate> {
    private group: Konva.Group
    private specialistCards: Array<SpecialistCard> = [];
    private localPlayerColor: PlayerColor

    constructor(stage: Konva.Stage, layout: GroupLayoutData, localPlayerColor: PlayerColor, digest: ModalUpdate) {
        this.localPlayerColor = localPlayerColor;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        const background = new Konva.Rect({
            // x: 50,
            // y: 50,
            width: this.group.width(),
            height: this.group.height(),
            cornerRadius: 15,
            fill: COLOR.modalBlue,
        });
        this.group.add(background);

        let offset = 20;
        digest.specialists.forEach( specialist => {
            const card = new SpecialistCard(
                stage,
                specialist,
                offset,
            );
            this.group.add(card.getElement());

            this.specialistCards.push(card)
            offset += 220;
        });
    }

    public getElement() {
        return this.group;
    }

    public update(digest: ModalUpdate) {
        const playerToPick = digest.players.find(p => p.turnToPick);
        if (!playerToPick)
            throw new Error("Cannot find player to pick cards");

        this.specialistCards.forEach(card => {
            const specialist = digest.specialists.find(s => s.name === card.getCardName())

            if (!specialist)
                throw new Error(`Specialist [${card.getCardName()}] is missing from state`);

            card.update({
                specialist,
                shouldEnable: !specialist.owner && playerToPick.color === this.localPlayerColor
            });
        })
    }

    public switchVisibility() {
        this.group.visible()
            ? this.group.hide()
            : this.group.show()
    }
}
