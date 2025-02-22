import {
    ClientRequest,
    PlayerColor,
    ClientMessage,
    MessageAction
} from "../../shared_types";
import { ToolService } from "./ToolService";

export class ValidatorService {
    private tools: ToolService;
    private error: string

    constructor(){
        this.tools = new ToolService();
        this.error = '';
    }
    public validateClientRequest(request: object): ClientRequest | null {

        if (
            this.hasString(request, 'clientId', true)
            && this.hasString(request, 'gameId', true)
            && this.hasString(request, 'playerName', true)
            && this.hasPlayerColor(request)
            && this.hasClientMessage(request)
        )
            return request as ClientRequest;

        console.error(this.error);
        this.setError();

        return null;
    }

    private hasPlayerColor(parent: object) {

        if (!this.hasString(parent, 'playerColor', true))
            return false;

        const prop = parent[('playerColor' as keyof object)];
        const playerColors: Array<PlayerColor|null> = ['Purple', 'Yellow', 'Red', 'Green', null];

        if (playerColors.includes(prop))
            return true;

        this.setError(`Invalid playerColor: ${prop}`);

        return false;
    }

    private hasClientMessage(parent: object) {
        const value = parent['message' as keyof object];

        if (!this.tools.isRecord(value)) {
            this.setError(`"message" property is missing: ${{...parent}}`)

            return false;
        }

        const object = value as object;

        if (!('action' in object) || !('payload' in object)) {
            this.setError(`"ClientMessage" is missing keys: ${{...object}}`);
            return false;
        }

        const clientMessage = object as ClientMessage;
        const actions: Array<MessageAction> = [
            "inquire", "enroll", "end_turn", "reset", "spend_favor", 'load_good',
            'upgrade_hold', 'get_status', 'chat', 'start', 'move', 'drop_item',
            'reposition', 'trade_goods', 'buy_metals', 'donate_metals', 'rebind_id',
        ];

        if (!actions.includes(clientMessage.action)) {
            this.setError(`action in ClientMessage is not MessageAction: ${clientMessage.action}`);

            return false;
        }

        return true;
    }

    private hasString(parent: object, key: string, nullable: boolean = false): boolean {

        if (!Boolean(key in parent)) {
            this.setError(`"${key}" property is missing: ${{...parent}}`);

            return false;
        }

        const _key = key as keyof object;

        if (nullable && parent[_key] === null)
            return true;

        if (typeof parent[_key] !== 'string' || !((parent[_key] as string).length)) {
            this.setError(`${key} property is not a valid string: ${parent[_key]}`);

            return false;
        }

        return true;
    }

    private setError(text?: string) {
        this.error = `VALIDATION ERROR; ${text}` || '';
    }
}