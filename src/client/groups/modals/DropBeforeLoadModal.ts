import { Action, ItemName, Metal, PlayState, TradeGood, TreasuryOffer, Unique } from '~/shared_types';
import { ModalBase } from './ModalBase';
import { Aspect, Dimensions, DropBeforeLoadMessage, DynamicModalInterface } from '~/client_types';
import { Stage } from 'konva/lib/Stage';
import Konva from 'konva';
import clientConstants from '~/client/client_constants';
import { PurchaseCard } from '.';
// TODO: Populate contentGroup with cargo and relevant action card
// TODO: Allow player to enable the card by removing cargo and formulate request upon submission 
// { action: Action.load_good, payload: { tradeGood: goodToPickup, drop: '' } }
// { action: Action.buy_metal, payload }

const { HUES } = clientConstants;

export class DropBeforeLoadModal
    extends ModalBase
    implements Unique<DynamicModalInterface<PlayState, DropBeforeLoadMessage>>
{
    private playerCargo: Array<ItemName> = [];
    private treasury: TreasuryOffer | null = null;
    private message: DropBeforeLoadMessage | null = null;
    private description: Konva.Text;
    private purchaseCard: PurchaseCard;

    constructor(stage: Stage, aspect: Aspect, dimensions?: Dimensions) {
        super(stage, { hasSubmit: false, dismissLabel: 'Close' }, aspect, dimensions);

        this.description = new Konva.Text({
            text: 'Dispose of cargo to make room.',
            fill: HUES.boneWhite,
            fontSize: 18,
            width: this.contentGroup.width(),
            align: 'center',
            y: 10,
            fontFamily: 'Custom',
        });

        this.purchaseCard = new PurchaseCard(
            stage,
            { x: 0, y: 0 },
        );

        this.contentGroup.add(...[
            this.purchaseCard.getElement(),
            this.description,
        ]);
    }

    public update(state: PlayState): void {
        this.treasury = state.treasury;
        const activePlayer = state.players.find(p => p.isActive);

        if (activePlayer)
            this.playerCargo = activePlayer.cargo;
    }

    public show(message: DropBeforeLoadMessage): void {
        this.message = message;

        if (!this.treasury)
            throw new Error('Cannot show modal, missing update.');

        if (message.action == Action.buy_metal) {
            this.purchaseCard.update({ message, treasury: this.treasury });
        } else {
            this.purchaseCard.update();
        }

        super.open();
    }

    public hasCargoRoom(req: 1 | 2) {
        return this.playerCargo.filter(i => i == 'empty').length >= req;
    }

    public repositionModal(aspect: Aspect): void {
        super.reposition(aspect);
    }
}