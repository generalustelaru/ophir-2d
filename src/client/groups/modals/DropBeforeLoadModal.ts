import { ItemName, Metal, PlayState, TradeGood, Unique } from '~/shared_types';
import { ModalBase } from './ModalBase';
import { Aspect, Dimensions, DropBeforeLoadMessage, DynamicModalInterface } from '~/client_types';
import { Stage } from 'konva/lib/Stage';
// TODO: Populate contentGroup with cargo and relevant action card
// TODO: Allow player to enable the card by removing cargo and formulate request upon submission 
// { action: Action.load_good, payload: { tradeGood: goodToPickup, drop: '' } }
// { action: Action.buy_metal, payload }
export class DropBeforeLoadModal
    extends ModalBase
    implements Unique<DynamicModalInterface<PlayState, DropBeforeLoadMessage>>
{
    private playerCargo: Array<ItemName> = [];

    constructor(stage: Stage, aspect: Aspect, dimensions?: Dimensions) {
        super(stage, { hasSubmit: false, dismissLabel: 'Close' }, aspect, dimensions);
    }

    public update(state: PlayState): void {
        const activePlayer = state.players.find(p => p.isActive);

        if (activePlayer)
            this.playerCargo = activePlayer.cargo;
    }

    public show(message: DropBeforeLoadMessage): void {
        console.log({message});
        super.open();
    }

    public hasCargoRoom(req: 1 | 2) {
        return this.playerCargo.filter(i => i == 'empty').length >= req;
    }

    public repositionModal(aspect: Aspect): void {
        super.reposition(aspect);
    }
}