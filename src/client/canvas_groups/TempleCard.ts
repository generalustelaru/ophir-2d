import Konva from "konva";
import { DynamicGroupInterface, GroupLayoutData } from "../client_types";
import clientConstants from "../client_constants";
import { Player } from "../../shared_types";
import { UpgradeBox } from "./UpgradeBox";

const { COLOR } = clientConstants;

export class TempleCard implements DynamicGroupInterface<Player | null> {

    private group: Konva.Group;
    private background: Konva.Rect;
    private upgradeBox: UpgradeBox;

    constructor(
        stage: Konva.Stage,
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

        this.upgradeBox = new UpgradeBox(
            stage,
            {
                width: 80,
                height: 30 + 10,
                x: layout.width - 100,
                y: layout.height - 25 - 20,
            }
        );

        this.group.add(
            this.background,
            this.upgradeBox.getElement(),
        );
    }

    public updateElement(localPlayer: Player | null): void {
        const isUpgradeAvailable = (
            localPlayer?.allowedSettlementAction === 'upgrade_hold'
            && localPlayer.coins >= 2
            && localPlayer.cargo.length < 4
        );
        this.upgradeBox.updateElement(isUpgradeAvailable);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}