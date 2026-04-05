import { CookieName, Cookies, Probable } from './server_types';
import {
    State, StateBroadcast, MessageKey, ErrorTransmission, ForceTurnTransmission, InfluenceRollBroadcast,
    NewRivalInfluenceBroadcast, NotFoundTransmission, PlayerIdTransmission, ResetBroadcast, RivalControlTransmission,
    SocketSwitchTransmission, TokenExpiredTransmission, TurnTransmission, VpTransmission, PlayerColor, DiceSix,
} from '~/shared_types';
import crypto from 'crypto';

function pass<T>(data: T): Probable<T> {
    return { err: false, ok: true, data };
}

function fail<T>(message: string): Probable<T> {
    return { err: true, ok: false, message };
}

// TODO: add source parameter, then array to accumulate trace
function printError(message: string) {
    console.error(`\x1b[91mERROR: ${message}\x1b[0m`);
}

function printWarning(message: string) {
    console.warn(`\x1b[93mWARN: ${message}\x1b[0m`);
}

function printInfo(message: string) {
    console.info(`INFO: ${message}`);
}

function checkConditions(arr: Array<boolean>): Probable<true> {
    if (arr.includes(false))
        return fail('Condition failed');
    return pass(true);
}

function randomize<T>(array: Array<T>): Array<T> {
    return (
        array.map(element => { return { key: Math.random(), element }; })
            .sort((a, b) => a.key - b.key)
            .map(object => object.element)
    );
}

function produceCookieArgs(isSecure: boolean, lifetime: number): Cookies {
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
function getCopy<O extends object>(obj: O): O {

    return JSON.parse(JSON.stringify(obj));
}

function parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};

    if (cookieString.length) {
        cookieString.split(';').forEach(cookie => {
            const [key, value] = cookie.trim().split('=');
            cookies[key] = decodeURIComponent(value);
        });
    }

    return cookies;
}

function getErrorBrief(error: unknown): string {
    const body = String(error);
    const line = body.match(/^.*/g);

    if (line)
        return line[0];

    console.error('Could not extract text from error');
    return 'Unknown Error';
}

function getStateBroadcast(state: State): StateBroadcast {
    return { key: MessageKey.state_broadcast, state };
}
function getResetBroadcast(resetFrom: string | PlayerColor): ResetBroadcast {
    return { key: MessageKey.reset_broadcast, resetFrom };
}
function getErrorTransmission(error: string): ErrorTransmission {
    return { key: MessageKey.error_transmission, error };
}
function getPlayerIdTransmission(color: PlayerColor, displayName: string | null): PlayerIdTransmission {
    return { key: MessageKey.player_id_transmission, color, displayName };
}
function getNotFoundTransmission(): NotFoundTransmission {
    return { key: MessageKey.not_found_transmission };
}
function getVpTransmission(vp: number): VpTransmission {
    return { key: MessageKey.vp_transmission, vp };
}
function getTurnTransmission(): TurnTransmission {
    return { key: MessageKey.turn_transmission };
}
function getRivalControlTransmission(): RivalControlTransmission {
    return { key: MessageKey.rival_control_transmission };
}
function getInfluenceRollBroadcast(color: PlayerColor, rolled: DiceSix, toHit: DiceSix): InfluenceRollBroadcast {
    return { key: MessageKey.influence_roll_broadcast, color, rolled, toHit };
}
function getForceTurnTransmission(): ForceTurnTransmission {
    return { key: MessageKey.force_turn_transmission };
}
function getTokenExpiredTransmission(): TokenExpiredTransmission {
    return { key: MessageKey.token_expired_transmission };
}
function getSocketSwitchTransmission(): SocketSwitchTransmission {
    return { key: MessageKey.socket_switch_transmission };
}
function getNewRivalInfluenceBroadcast(rivalRoll: DiceSix): NewRivalInfluenceBroadcast {
    return { key: MessageKey.newRival_influence_broadcast, rivalRoll };
}

const sLib = { // TODO: Maybe rename this to common_library (file too)
    pass,
    fail,
    printError,
    printWarning,
    printInfo,
    checkConditions,
    randomize,
    produceCookieArgs,
    parseCookies,
    getCopy,
    getErrorBrief,
    getStateBroadcast,
    getResetBroadcast,
    getErrorTransmission,
    getPlayerIdTransmission,
    getNotFoundTransmission,
    getVpTransmission,
    getTurnTransmission,
    getRivalControlTransmission,
    getInfluenceRollBroadcast,
    getForceTurnTransmission,
    getTokenExpiredTransmission,
    getSocketSwitchTransmission,
    getNewRivalInfluenceBroadcast,
};

export default sLib;