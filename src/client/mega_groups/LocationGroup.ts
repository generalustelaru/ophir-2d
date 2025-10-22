import Konva from 'konva';
import { MegaGroupInterface, GroupLayoutData, TempleUpdate, MarketUpdate, LayerIds } from '~/client_types';
import { MarketArea, TreasuryArea, TempleArea } from '../groups/location';
import localState from '../state';
import { PlayState } from '~/shared_types';

export class LocationGroup implements MegaGroupInterface {
    private stage: Konva.Stage;
    private group: Konva.Group;
    private marketArea: MarketArea | null = null;
    private treasuryArea: TreasuryArea | null = null;
    private templeArea: TempleArea | null = null;
    private sellGoodsCallback: Function;
    private donateGoodsCallback: Function;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        sellGoodsCallback: Function,
        donateGoodsCallback: Function,
    ) {
        this.sellGoodsCallback = sellGoodsCallback;
        this.donateGoodsCallback = donateGoodsCallback;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height - 20,
            x: layout.x + 10,
            y: layout.y + 10,
        });
        stage.getLayers()[LayerIds.base].add(this.group);
        this.stage = stage;
    }

    public drawElements(state: PlayState): void {
        const setup = state.setup;

        if (!setup) {
            throw new Error('State is missing setup data.');
        }

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
            this.sellGoodsCallback,
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
            this.donateGoodsCallback,
        );

        this.group.add(
            this.marketArea.getElement(),
            this.treasuryArea.getElement(),
            this.templeArea.getElement(),
        );
    }

    public update(state: PlayState): void {

        const activePlayer = state.players.find(player => player.isActive);
        const marketOffer = state.market;
        if (!activePlayer || !marketOffer) {
            throw new Error(
                `Missing state data in Location Group: {activePlayer: ${activePlayer}, market: ${marketOffer}}.`,
            );
        }

        const localPlayer = state.players.find(player => player.color === localState.playerColor);
        const marketUpdate: MarketUpdate = {
            localPlayer: localPlayer ?? null,
            marketOffer: marketOffer,
        };
        const templeUpdate: TempleUpdate = {
            localPlayer: localPlayer ?? null,
            templeStatus: state.temple,
            trade: state.market[state.setup.templeTradeSlot],
        };

        this.marketArea?.update(marketUpdate);
        this.treasuryArea?.update({
            localPlayer: localPlayer ?? null,
            tier: state.temple.treasury,
            metalSupplies: state.itemSupplies.metals,
        });
        this.templeArea?.update(templeUpdate);
    }

    public disable(): void {
        this.marketArea?.disable();
        this.treasuryArea?.disable();
        this.templeArea?.disable();
    }

}
