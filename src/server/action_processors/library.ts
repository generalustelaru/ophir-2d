import { ErrorResponse, State, StateResponse } from "~/shared_types";

export type Probable<T> = { err: true, message: string } | { err?: false, data: T };

function pass<T>(data: T): Probable<T> {
    return { data }
}

function fail<T>(message: string): Probable<T> {
    return { err: true, message }
}

function checkConditions(arr: Array<boolean>): Probable<true> {
    if (arr.includes(false))
        return fail('');
    return pass(true);
}

function randomize<T>(array: Array<T>): Array<T> {
    return (
        array.map(element => { return { key: Math.random(), element } })
        .sort((a, b) => a.key - b.key)
        .map(object => object.element)
    );
}

function validationErrorMessage(){
    return 'Malformed request.';
}

function stateResponse(state: State): StateResponse {
    return { state }
}

function errorResponse(message: string, params?: object): ErrorResponse {
    const error = `ERROR: ${message}`;
    if (params)
        console.error(error, params);
    else
        console.error(error);

    return { error };
}

const lib = {
    pass,
    fail,
    checkConditions,
    randomize,
    stateResponse,
    validationErrorMessage,
    errorResponse,
}

export default lib;