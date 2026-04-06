import { CookieName, Cookies, Probable } from './server_types';
import {
    State, StateBroadcast, MessageKey, ErrorTransmission, ForceTurnTransmission, InfluenceRollBroadcast,
    NewRivalInfluenceBroadcast, NotFoundTransmission, PlayerIdTransmission, ResetBroadcast, RivalControlTransmission,
    SocketSwitchTransmission, TokenExpiredTransmission, TurnTransmission, VpTransmission, PlayerColor, DiceSix,
} from '~/shared_types';
import crypto from 'crypto';

export class ServerTools {

    public static pass<T>(data: T): Probable<T> {
        return { err: false, ok: true, data };
    }

    public static fail<T>(message: string): Probable<T> {
        return { err: true, ok: false, message };
    }

    // TODO: add source parameter, then array to accumulate trace
    public static printError(message: string) {
        console.error(`\x1b[91mERROR: ${message}\x1b[0m`);
    }

    public static printWarning(message: string) {
        console.warn(`\x1b[93mWARN: ${message}\x1b[0m`);
    }

    public static printInfo(message: string) {
        console.info(`INFO: ${message}`);
    }

    public static checkConditions(arr: Array<boolean>): Probable<true> {
        if (arr.includes(false))
            return ServerTools.fail('Condition failed');
        return ServerTools.pass(true);
    }

    public static randomize<T>(array: Array<T>): Array<T> {
        return (
            array.map(element => { return { key: Math.random(), element }; })
                .sort((a, b) => a.key - b.key)
                .map(object => object.element)
        );
    }

    public static produceCookieArgs(isSecure: boolean, lifetime: number): Cookies {
        return {
            [CookieName.token]: {
                value: crypto.randomBytes(32).toString('hex'),
                options: {
                    httpOnly: true,
                    secure: isSecure,
                    maxAge: lifetime,
                    path: '/',
                },
            },
        };
    }
    /**
     * @param obj - JSON-compatible object to copy
    */
    public static getCopy<O extends object>(obj: O): O {

        return JSON.parse(JSON.stringify(obj));
    }

    public static parseCookies(cookieString: string): Record<string, string> {
        const cookies: Record<string, string> = {};

        if (cookieString.length) {
            cookieString.split(';').forEach(cookie => {
                const [key, value] = cookie.trim().split('=');
                cookies[key] = decodeURIComponent(value);
            });
        }

        return cookies;
    }

    public static getErrorBrief(error: unknown): string {
        const body = String(error);
        const line = body.match(/^.*/g);

        if (line)
            return line[0];

        console.error('Could not extract text from error');
        return 'Unknown Error';
    }

    public static getStateBroadcast(state: State): StateBroadcast {
        return { key: MessageKey.state_broadcast, state };
    }
    public static getResetBroadcast(resetFrom: string | PlayerColor): ResetBroadcast {
        return { key: MessageKey.reset_broadcast, resetFrom };
    }
    public static getErrorTransmission(error: string): ErrorTransmission {
        return { key: MessageKey.error_transmission, error };
    }
    public static getPlayerIdTransmission(color: PlayerColor, displayName: string | null): PlayerIdTransmission {
        return { key: MessageKey.player_id_transmission, color, displayName };
    }
    public static getNotFoundTransmission(): NotFoundTransmission {
        return { key: MessageKey.not_found_transmission };
    }
    public static getVpTransmission(vp: number): VpTransmission {
        return { key: MessageKey.vp_transmission, vp };
    }
    public static getTurnTransmission(): TurnTransmission {
        return { key: MessageKey.turn_transmission };
    }
    public static getRivalControlTransmission(): RivalControlTransmission {
        return { key: MessageKey.rival_control_transmission };
    }
    public static getInfluenceRollBroadcast(color: PlayerColor, rolled: DiceSix, toHit: DiceSix): InfluenceRollBroadcast {
        return { key: MessageKey.influence_roll_broadcast, color, rolled, toHit };
    }
    public static getForceTurnTransmission(): ForceTurnTransmission {
        return { key: MessageKey.force_turn_transmission };
    }
    public static getTokenExpiredTransmission(): TokenExpiredTransmission {
        return { key: MessageKey.token_expired_transmission };
    }
    public static getSocketSwitchTransmission(): SocketSwitchTransmission {
        return { key: MessageKey.socket_switch_transmission };
    }
    public static getNewRivalInfluenceBroadcast(rivalRoll: DiceSix): NewRivalInfluenceBroadcast {
        return { key: MessageKey.newRival_influence_broadcast, rivalRoll };
    }
}
