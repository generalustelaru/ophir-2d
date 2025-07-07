import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../../client_types";
import { PlayerBuild, Specialist } from "../../../shared_types";
import  clientConstants from "../../client_constants"
import { SpecialistCard } from "./SpecialistCard";

type ModalDigest = {
    players: Array<PlayerBuild>,
    specialists: Array<Specialist>,
}

const { COLOR } = clientConstants

export class SetupModal implements DynamicGroupInterface<ModalDigest> {
    private group: Konva.Group
    private specialistCards:  Array<SpecialistCard> = [];

    constructor(stage: Konva.Stage, layout: GroupLayoutData, digest: ModalDigest) {
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

        console.log({state: digest})
    }

    public getElement() {
        return this.group;
    }

    public update(digest: ModalDigest) {
        this.specialistCards.forEach(card => {
            const specialist = digest.specialists.find(s => s.name === card.getCardName())

            if (!specialist)
                throw new Error(`Specialist [${card.getCardName()}] is missing from state`);

            card.update(specialist)
        })
    }

    public switchVisibility() {
        this.group.visible()
            ? this.group.hide()
            : this.group.show()
    }
}
