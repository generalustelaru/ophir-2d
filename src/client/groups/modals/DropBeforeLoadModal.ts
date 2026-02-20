import { Action, ItemName, PlayState, TradeGood, TreasuryOffer, Unique } from '~/shared_types';
import { ModalBase } from './ModalBase';
import { Aspect, DropBeforeLoadMessage, DynamicModalInterface, Specification } from '~/client_types';
import { Stage } from 'konva/lib/Stage';
import Konva from 'konva';
import clientConstants from '~/client/client_constants';
import { PurchaseCard, SymbolRow } from '.';

const { HUES } = clientConstants;

export class DropBeforeLoadModal
    extends ModalBase
    implements Unique<DynamicModalInterface<PlayState, DropBeforeLoadMessage>>
{
    private playerCargo: Array<ItemName> | null = null;
    private dropSpecs: Array<Specification> = [];
    private treasury: TreasuryOffer | null = null;
    private message: DropBeforeLoadMessage | null = null;
    private dropReq: number = 0;
    private description: Konva.Text;
    private cargoRow: SymbolRow;
    private purchaseCard: PurchaseCard;

    constructor(stage: Stage, aspect: Aspect) {
        super(
            stage,
            { hasSubmit: false, dismissLabel: 'Close' },
            aspect,
            { width: 300, height: 200 },
        );

        this.description = new Konva.Text({
            text: 'Dispose of some cargo to make room.',
            fill: HUES.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.cargoRow = new SymbolRow(
            stage,
            {
                width: 50,
                height: 30,
                x: 30,
                y: 65,
            },
            (index) => { this.updatePlayerChoice(index); },
            false,
        );

        this.purchaseCard = new PurchaseCard(
            stage,
            { x: 220, y: 50 },
            () => { this.dropAndLoadItems(); },
        );

        this.contentGroup.add(...[
            this.cargoRow.getElement(),
            this.purchaseCard.getElement(),
            this.description,
        ]);
    }

    public update(state: PlayState): void {
        this.treasury = state.treasury;
        this.playerCargo = state.players.find(p => p.isActive)?.cargo || null;
    }

    public show(message: DropBeforeLoadMessage): void {

        if (!this.treasury || !this.playerCargo)
            throw new Error('Cannot show modal, missing update.');

        this.message = message;
        const reference: ItemName[] = ['ebony', 'gems', 'linen', 'marble'];
        const carriedGoods = this.playerCargo.filter(
            name =>  reference.includes(name),
        ) as TradeGood[];

        this.dropSpecs = carriedGoods.map(name => {
            return { name, isOmited: false, isLocked: false };
        });

        this.dropReq = (() => {
            const room = this.playerCargo.filter(i => i == 'empty').length;
            const req = message.action == Action.buy_metal ? 2 : 1;

            return req - room;
        })();
        this.cargoRow.update({ specifications: this.dropSpecs });

        if (message.action == Action.buy_metal) {
            this.purchaseCard.update({ message, treasury: this.treasury });
        } else {
            this.purchaseCard.update();
        }

        super.open();
    }

    public hasCargoRoom(req: 1 | 2) {

        if (!this.playerCargo)
            throw new Error('Cannot query modal, missing update.');

        return this.playerCargo.filter(i => i == 'empty').length >= req;
    }

    public repositionModal(aspect: Aspect): void {
        super.reposition(aspect);
    }

    private updatePlayerChoice(index: number) {

        if (!this.message)
            throw new Error('Cannot handle change, missing open data');

        const selection = this.dropSpecs[index];
        selection.isOmited = !selection.isOmited;
        this.cargoRow.update({ specifications: this.dropSpecs });

        const dropped = this.dropSpecs.filter(s => s.isOmited);
        this.message.payload.drop = dropped.map(d => d.name);

        const isFeasible = dropped.length >= this.dropReq;

        if (this.message.action == Action.buy_metal) {
            // this.purchaseCard.updateActionMessage(this.message);
            this.purchaseCard.setFeasable(isFeasible);
        }
    }

    private dropAndLoadItems() {
        window.dispatchEvent(new CustomEvent(
            'action',
            { detail: this.message },
        ));
        this.close();
    }
}