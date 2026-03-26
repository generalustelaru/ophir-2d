import { PlayerHandler } from '../../state_handlers/PlayerHandler';
import { PrivateStateHandler } from '../../state_handlers/PrivateStateHandler';

export class DeedService {

    public static convertToMessage(player: PlayerHandler, privateState: PrivateStateHandler): string {
        const { name } = player.getIdentity();
        const deeds = privateState.getDeeds();
        const length = deeds.length;
        let message = `${name} `;

        if (!length)
            return message + 'has played.';

        deeds.forEach((deed, key) => {
            message += deed.description;

            if (key < length - 1) message += ', ';
        });

        return `${message}.`;
    }
}
