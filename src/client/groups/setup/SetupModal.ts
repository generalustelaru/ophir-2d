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

    constructor(layout: GroupLayoutData, digest: ModalDigest) {
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

        const oneCard = new SpecialistCard(30);
        const twoCard = new SpecialistCard(250);
        const threeCard = new SpecialistCard(460);
        const fourCard = new SpecialistCard(670);
        const fiveCard = new SpecialistCard(880);
        console.log({state: digest})
        this.group.add(...[
            background,
            oneCard.getElement(),
            twoCard.getElement(),
            threeCard.getElement(),
            fourCard.getElement(),
            fiveCard.getElement(),
        ]);
    }

    public getElement() {
        return this.group;
    }

    public update(digest: ModalDigest) {
        console.log({digest});
    }

    public switchVisibility() {
        this.group.visible()
            ? this.group.hide()
            : this.group.show()
    }
}
