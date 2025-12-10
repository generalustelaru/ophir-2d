import { Probable } from './server_types';

function pass<T>(data: T): Probable<T> {
    return { err: false, ok: true, data };
}

function fail<T>(message: string): Probable<T> {
    return { err: true, ok: false,  message };
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

const sLib = { // TODO: Maybe rename this to common_library (file too)
    pass,
    fail,
    checkConditions,
    randomize,
};

export default sLib;