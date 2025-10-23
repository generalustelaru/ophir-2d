import { ErrorResponse, State, StateResponse } from '~/shared_types';
import sLib from '../server_lib';

function validationErrorMessage(){
    return 'Malformed request.';
}

function stateResponse(state: State): StateResponse {
    return { state };
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
    ...sLib,
    stateResponse,
    validationErrorMessage,
    errorResponse,
};

export default lib;