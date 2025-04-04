import { ErrorResponse } from "../../shared_types";

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

function validationErrorResponse(){
    return issueErrorResponse('Malformed request.');
}

function issueErrorResponse(message: string, params?: object): ErrorResponse {
    const error = `ERROR: ${message}`;
    console.error(error, params);

    return { error };
}

const lib = {
    pass,
    fail,
    checkConditions,
    validationErrorResponse,
    issueErrorResponse,
}

export default lib;