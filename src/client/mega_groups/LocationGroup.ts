import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData, TempleUpdate, MarketUpdate, LayerIds } from '~/client_types';
import { MarketArea, TreasuryArea, TempleArea } from '../groups/location';
import localState from '../state';
import { PlayState, SpecialistName, Unique } from '~/shared_types';

type LocationGroupCallbacks = {
    tradeCallback: Function
    donateGoodsCallback?: Function,
    advisorCallback?: Function,
    peddlerCallback?: Function,
}
export class LocationGroup implements Unique<MegaGroupInterface> {
    private stage: Konva.Stage | null;
    private group: Konva.Group | null;
    private marketArea: MarketArea | null = null;
    private treasuryArea: TreasuryArea | null = null;
    private templeArea: TempleArea | null = null;
    private tradeCallback: Function | null = null;
    private peddlerCallback: Function | null = null;
    private donateGoodsCallback: Function | null = null;
    private advisorOptionsCallback: Function | null = null;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
    ) {
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height - 20,
            x: layout.x + 10,
            y: layout.y + 10,
        });
        stage.getLayers()[LayerIds.board].add(this.group);
        this.stage = stage;
    }

    public setCallbacks(selection:LocationGroupCallbacks) {
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

        if (!this.tradeCallback)
            throw new Error('Default trade callback is missing.');

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
                y: 0,
            },
            this.tradeCallback,
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
        );

        const specialistName = state.players.find(
            p => p.color == localState.playerColor,
        )?.specialist.name || null;

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
            specialistName == SpecialistName.advisor,
            this.donateGoodsCallback || (() => {}),
            this.advisorOptionsCallback || (() => {}),
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

    public selfDecomission(): null {
        this.group?.destroy();
        this.group = null;
        this.stage = null;
        this.tradeCallback = null;
        this.peddlerCallback = null;
        this.donateGoodsCallback = null;
        this.advisorOptionsCallback = null;

        // these remain in memory
        this.marketArea = null;
        this.treasuryArea = null;
        this.templeArea = null;

        return null;
    }
}
