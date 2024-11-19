import Konva from "konva";
import { ActionEventPayload, ContractCardUpdate, DynamicGroupInterface, GroupLayoutData } from "../client_types";
import { Contract } from "../../shared_types";
import { CoinDial, GoodsOrderDisplay } from "./CanvasGroups";
import clientConstants from "../client_constants";
import { ActionGroup } from "./ActionGroup";

const { COLOR } = clientConstants;
export class ContractCard extends ActionGroup implements DynamicGroupInterface<ContractCardUpdate> {

    private coinDial: CoinDial;
    private goodsDisplay: GoodsOrderDisplay;
    private cardInterior: Konva.Rect;
    private cardBorder: Konva.Rect;
    private fluctuation: number | null = null;
    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        actionPayload: ActionEventPayload | null,
        contract: Contract,
        fluctuation: number | null = null,
    ) {
        super(stage, layout, actionPayload);

        this.fluctuation = fluctuation;

        this.cardBorder = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR.boneWhite,
            cornerRadius: 15,
        });

        this.cardInterior = new Konva.Rect({
            width: this.group.width() - 6,
            height: this.group.height() - 6,
            x: 3,
            y: 3,
            fill: COLOR.wood,
            cornerRadius: 15,
        });

        this.coinDial = new CoinDial(
            { x: 38, y: 35 },
            contract.reward.coins + (fluctuation ?? 0)
        );

        this.goodsDisplay = new GoodsOrderDisplay(
            {
                width: this.cardInterior.width(),
                height: this.cardInterior.height() - this.coinDial.getElement().height() - this.coinDial.getElement().y() - 20,
                x: this.cardInterior.x(),
                y: this.coinDial.getElement().y() + this.coinDial.getElement().height() + 10,
            },
            contract.request
        );

        this.group.add(
            this.cardBorder,
            this.cardInterior,
            this.coinDial.getElement(),
            this.goodsDisplay.getElement(),
        );
    }

    public updateElement(data: ContractCardUpdate): void {
        this.coinDial.updateElement(data.contract.reward.coins + (this.fluctuation ?? 0));
        this.goodsDisplay.updateElement(data.contract.request);
        this.cardInterior.fill(data.isFeasible ? COLOR.marketOrange : COLOR.wood);
        this.cardBorder.fill(data.isFeasible ? COLOR.exchangeGold : COLOR.boneWhite);
        this.setEnabled(data.isFeasible);
    }

    public getElement(): Konva.Group {
        return this.group;
    }
}