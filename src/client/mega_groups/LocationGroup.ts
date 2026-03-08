import Konva from 'konva';
import {
    MegaGroupInterface, GroupLayoutData, TempleUpdate, MarketUpdate, LayerIds, DropBeforeLoadMessage, Target,
} from '~/client_types';
import { MarketArea, TreasuryArea, TempleArea } from '../groups/location';
import localState from '../state';
import { Action, Coordinates, MetalPurchasePayload, PlayState, SpecialistName, Unique } from '~/shared_types';
import { ResultsPanel } from '../groups/conclusion/ResultsPanel';
import { Highlight } from '../groups/tutorial';

type VariableLocationGroupCallbacks = {
    tradeCallback: Function
    donateGoodsCallback?: Function,
    advisorCallback?: Function,
    peddlerCallback?: Function,
}
export class LocationGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage | null;
    private group: Konva.Group;
    private resultsPanel: ResultsPanel | null = null;
    private marketArea: MarketArea | null = null;
    private treasuryArea: TreasuryArea | null = null;
    private templeArea: TempleArea | null = null;
    private purchaseActionCallback: (data: DropBeforeLoadMessage) => void;
    private tradeCallback: Function | null = null;
    private peddlerCallback: Function | null = null;
    private donateGoodsCallback: Function | null = null;
    private advisorOptionsCallback: Function | null = null;
    private highlights: Map<Target, Highlight> | null = null;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        dropBeforeLoadCallback: (data: DropBeforeLoadMessage) => void,
    ) {
        this.purchaseActionCallback = dropBeforeLoadCallback;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            x: layout.x,
            y: layout.y,
        });
        stage.getLayers()[LayerIds.board].add(this.group);
        this.stage = stage;
    }

    public setPlacement(coordinates: Coordinates) {
        this.group?.x(coordinates.x).y(coordinates.y);
    }

    public setCallbacks(selection:VariableLocationGroupCallbacks) {
        const { tradeCallback, donateGoodsCallback, advisorCallback, peddlerCallback } = selection;
        this.tradeCallback = tradeCallback;
        donateGoodsCallback && (this.donateGoodsCallback = donateGoodsCallback);
        advisorCallback && (this.advisorOptionsCallback = advisorCallback);
        peddlerCallback && (this.peddlerCallback = peddlerCallback);
    }

    public drawElements(state: PlayState): void {
        if (!this.group || !this.stage)
            return;

        const setup = state.setup;

        if (!setup)
            throw new Error('State is missing setup data.');

        const heightSegment = this.group.height() / 9;

        this.marketArea = new MarketArea(
            this.stage,
            state.setup.marketFluctuations,
            state.setup.templeTradeSlot,
            state.market,
            {
                width: this.group.width(),
                height: heightSegment * 3,
                x: 0,
                y: 10,
            },
            this.tradeCallback || null,
            this.peddlerCallback,
        );

        this.treasuryArea = new TreasuryArea(
            this.stage,
            {
                width: this.group.width(),
                height: heightSegment * 2,
                x: 0,
                y: this.marketArea.getElement().height(),
            },
            (payload: MetalPurchasePayload) => {
                this.purchaseActionCallback(this.formatPurchaseMessage(payload));
            },
        );

        const specialistName = state.players.find(
            p => p.color == localState.playerColor,
        )?.specialist.name || null;

        const isAdvisor = specialistName == SpecialistName.advisor;

        this.templeArea = new TempleArea(
            this.stage,
            state.setup.templeTradeSlot,
            state.market,
            {
                width: this.group.width(),
                height: heightSegment * 4,
                x: 0,
                y: this.marketArea.getElement().height() + this.treasuryArea.getElement().height(),
            },
            state.temple.maxLevel,
            isAdvisor,
            isAdvisor ? this.advisorOptionsCallback : this.donateGoodsCallback,
        );

        this.group.add(
            this.marketArea.getElement(),
            this.treasuryArea.getElement(),
            this.templeArea.getElement(),
        );
    }

    public update(state: PlayState): void {
        if (!this.group)
            return;

        const localPlayer = state.players.find(player => player.color === localState.playerColor);
        const marketUpdate: MarketUpdate = {
            localPlayer: localPlayer ?? null,
            marketOffer: state.market,
        };
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            templeStatus: state.temple,
            trade: state.market[state.setup.templeTradeSlot],
        };

        this.marketArea?.update(marketUpdate);
        this.treasuryArea?.update({
            localPlayer: localPlayer ?? null,
            treasury: state.treasury,
            metalSupplies: state.itemSupplies.metals,
        });
        this.templeArea?.update(templeUpdate);
    }

    public disable(): void {
        this.marketArea?.disable();
        this.treasuryArea?.disable();
        this.templeArea?.disable();
    }

    public switchToResults(state: PlayState): void {
        this.group.destroyChildren();

        this.stage = null;
        this.tradeCallback = null;
        this.peddlerCallback = null;
        this.donateGoodsCallback = null;
        this.advisorOptionsCallback = null;

        // these remain in memory
        this.marketArea = null;
        this.treasuryArea = null;
        this.templeArea = null;

        this.resultsPanel = new ResultsPanel(state, { width: this.group.width(), height: this.group.height() });
        this.group.add(this.resultsPanel.getElement());
    }

    public updateHighlights(targets: Array<Target>): void {

        if (!this.highlights) {
            this.highlights = new Map();
            const layouts = [
                { target: Target.locationGroup, layout: { x:0, y:0, width: 300, height: 500 } },

                { target: Target.marketArea, layout: { x: 2, y: 5, width: 293, height: 158 } },
                { target: Target.deck, layout: { x: 2, y: 5, width: 66, height: 160 } },
                { target: Target.slot_1, layout: { x: 75, y: 5, width: 66, height: 150 } },
                { target: Target.slot_2, layout: { x: 152, y: 5, width: 66, height: 150 } },
                { target: Target.slot_3, layout: { x: 227, y: 5, width: 66, height: 150 } },
                { target: Target.fluctuation_up, layout: { x: 230, y: 125, width: 23, height: 25 } },
                { target: Target.fluctuation_down, layout: { x: 78, y: 125, width: 23, height: 25 } },
                { target: Target.temple_mark, layout: { x: 169, y: 5, width: 32, height: 32 } },

                { target: Target.treasuryArea, layout: { x: 2, y: 165, width: 293, height: 100 } },
                { target: Target.goldForFavor, layout: { x: 2, y: 165, width: 66, height: 100 } },
                { target: Target.silverForFavor, layout: { x: 75, y: 165, width: 66, height: 100 } },
                { target: Target.goldForCoin, layout: { x: 152, y: 165, width: 66, height: 100 } },
                { target: Target.silverForCoin, layout: { x: 227, y: 165, width: 66, height: 100 } },

                { target: Target.templeArea, layout: { x: 2, y: 285, width: 293, height: 200 } },
                { target: Target.goldCard, layout: { x: 35, y: 285, width: 66, height: 100 } },
                { target: Target.silverCard, layout: { x: 111, y: 285, width: 66, height: 100 } },
                { target: Target.marketCard, layout: { x: 227, y: 285, width: 66, height: 130 } },
                { target: Target.upgradeButton, layout: { x: 207, y: 435, width: 86, height: 40 } },
                { target: Target.donationsDisplay, layout: { x: 25, y: 395, width: 162, height: 85 } },
            ];
            for (const item of layouts) {
                const { target, layout } = item;
                this.highlights.set(target, new Highlight({ isRectangle: true, layout }));
            }

            const nodes: Konva.Shape[] = [];
            this.highlights.forEach(highlight => {
                nodes.push(highlight.getElement());
            });
            this.group.add(...nodes);
        }

        this.highlights.forEach((highlight, key) => {
            if (targets.includes(key)) {
                highlight.isVisible() == false && highlight.show();
            } else {
                highlight.hide();
            }
        });
    }

    private formatPurchaseMessage(payload: MetalPurchasePayload): DropBeforeLoadMessage {
        return { action: Action.buy_metal, payload };
    }
}
