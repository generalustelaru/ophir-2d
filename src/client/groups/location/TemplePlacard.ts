import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData, TempleUpdate } from "../../client_types";
import clientConstants from "../../client_constants";
import { Contract } from "../../../shared_types";
import { UpgradeButton, ContractCard } from "../GroupList";

const { COLOR } = clientConstants;

export class TempleCard implements DynamicGroupInterface<TempleUpdate> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeButton: UpgradeButton;
    private contractCard: ContractCard;

    constructor(
        stage: Konva.Stage,
        contract: Contract,
        layout: GroupLayoutData,
    ) {

        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });

        this.background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
        });

        this.upgradeButton = new UpgradeButton(
            stage,
            {
                width: 80,
                height: 30 + 10,
                x: layout.width - 90,
                y: layout.height - 25 - 20,
            }
        );

        const cardWidth = this.group.width() / 4;
        const cardHeight = this.group.height() / 6 * 4;
        this.contractCard = new ContractCard(
            stage,
            {
                width: cardWidth,
                height: cardHeight,
                x: this.group.width() - cardWidth - 10,
                y: 10,
            },
            null,
            contract,
            0,
        );

        this.group.add(
            this.background,
            this.contractCard.getElement(),
            this.upgradeButton.getElement(),
        );
    }

    public updateElement(data: TempleUpdate): void {
        const localPlayer = data.localPlayer;

        this.contractCard.updateElement({ contract: data.contract, isFeasible: false });
        const isUpgradeAvailable = (
            localPlayer?.allowedSettlementAction === 'upgrade_hold'
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        );
        this.upgradeButton.updateElement(isUpgradeAvailable);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}