import Konva from 'konva';
import { ModalBase } from './ModalBase';
import { MarketSlotKey, PlayState, SpecialistName, Trade, Unique } from '~/shared_types';
import { RowDistributor } from '../popular';
import { TempleMarketCard } from '../location';
import { DynamicModalInterface } from '~/client/client_types';

type DonationItem = {
    slot: MarketSlotKey,
    trade: Trade,
}

export class AdvisorModal extends ModalBase implements Unique<DynamicModalInterface<PlayState, undefined>> {
    private advisorTrades: Array<DonationItem>;
    private cardRow: RowDistributor;
    private cardSelectionCallback: (slot: MarketSlotKey) => void;
    constructor(
        stage: Konva.Stage,
        donateGoodsCallback: (slot: MarketSlotKey) => void,
    ) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Cancel' },
            { width: 300, height: 220 },
        );

        this.cardSelectionCallback = donateGoodsCallback;

        this.advisorTrades = [];
        this.cardRow = new RowDistributor(
            {
                x: 0,
                y: 20,
                width: this.contentGroup.width(),
                height: this.contentGroup.height(),
            },
        );

        this.contentGroup.add(this.cardRow.getElement());
    }

    public update(state: PlayState) {
        const advisorPlayer = state.players.find(p => p.specialist.name == SpecialistName.advisor);

        this.advisorTrades = (advisorPlayer
            ? advisorPlayer.feasibleTrades.map((key): DonationItem => {
                return { slot: key, trade: state.market[key] };
            }) : []
        );
    }

    public show() {
        const rowElements = this.advisorTrades.map(item => {
            const card = new TempleMarketCard(
                this.stage,
                { x: 0, y: 0 },
                item.trade,
                false,
                () => { this.selectTrade(item.slot); },
            );
            card.enable();

            return { id: item.slot, node: card.getElement() };
        });

        this.cardRow.setNodes(rowElements);
        this.open();
    }

    private selectTrade(slot: MarketSlotKey) {
        this.close();
        this.cardSelectionCallback(slot);
    }
}