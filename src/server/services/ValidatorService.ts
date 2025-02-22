import {
    ClientRequest,
    PlayerColor,
    // ClientMessage
} from "../../shared_types";
import { ToolService } from "./ToolService";

export class ValidatorService {
    private tools: ToolService;
    private errors: Array<string>;

    constructor(){
        this.tools = new ToolService();
        this.errors = [];
    }
    public validateClientRequest(request: object): ClientRequest | null {

        if (!request) {
            console.log('ERROR: Payload is not an object.', {payload: request});

            return null;
        }

        if (
            this.hasString(request, 'clientId', true)
            && this.hasString(request, 'gameId', true)
            && this.hasString(request, 'playerName', true)
            && this.hasPlayerColor(request)
            && this.hasClientMessage(request)
        )
            return request as ClientRequest;

        console.log(this.errors);
        this.errors = [];

        return null;
    }

    private hasPlayerColor(parent: object) {

        if (!this.hasString(parent, 'playerColor', true))
            return false;

        const prop = parent[('playerColor' as keyof object)];
        const playerColors: Array<PlayerColor|null> = ['Purple', 'Yellow', 'Red', 'Green', null];

        if (playerColors.includes(prop))
            return true;

        this.errors.push(`Invalid playerColor: ${prop}`);
        return false;
    }

    private hasClientMessage(parent: object) {
        const value = parent['message' as keyof object];

        if (!this.tools.isRecord(value)) {
            this.errors.push(`"message" property is missing: ${{...parent}}`)
            return false;
        }

        const object = value as object;

        if (!('action' in object) || !('payload' in object)) {
            this.errors.push(`"ClientMessage" is missing keys: ${{...object}}`);
            return false;
        }

        return true;
    }

    private hasString(parent: object, key: string, nullable: boolean = false): boolean {

        if (!Boolean(key in parent)) {
            this.errors.push(`"${key}" property is missing: ${{...parent}}`);
            return false;
        }

        const _key = key as keyof object;

        if (nullable && parent[_key] === null)
            return true;

        if (typeof parent[_key] !== 'string' || !((parent[_key] as string).length)) {
            this.errors.push(`"${key}" property is not a valid string: ${{...parent}}`);
            return false;
        }

        return true;
    }
}