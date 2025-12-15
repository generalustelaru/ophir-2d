import { CookieOptions } from 'express';
import { CookieName, Probable } from './server_types';
import crypto from 'crypto';

function pass<T>(data: T): Probable<T> {
    return { err: false, ok: true, data };
}

function fail<T>(message: string): Probable<T> {
    return { err: true, ok: false, message };
}

function printError(message: string) {
    console.error(`\x1b[91mERROR:${message}\x1b[0m`);
}

function printWarning(message: string) {
    console.warn(`\x1b[93mWARN: ${message}\x1b[0m`);
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

type CookieArgs = {
    value: string,
    options: CookieOptions
}
function produceCookieArgs(isSecure: boolean, clientEmail: string): Record<CookieName, CookieArgs> {

    return {
        [CookieName.authToken]: {
            value: crypto.randomBytes(32).toString('hex'),
            options: {
                httpOnly: true,
                secure: isSecure,
                maxAge: 24 * 60 * 60 * 1000,
                path: '/',
            },
        },
        [CookieName.userEmail]: {
            value: clientEmail,
            options: {
                httpOnly: true,
                secure: isSecure,
                maxAge: 24 * 60 * 60 * 1000,
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

const sLib = { // TODO: Maybe rename this to common_library (file too)
    pass,
    fail,
    printError,
    printWarning,
    checkConditions,
    randomize,
    produceCookieArgs,
    parseCookies,
    getCopy,
};

export default sLib;