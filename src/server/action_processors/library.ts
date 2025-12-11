import { ErrorResponse, State, StateResponse } from '~/shared_types';
import { createCanvas } from 'canvas';
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

function estimateWidth(text: string, fontSize: number, fontFamily = 'Arial') {
    const context = createCanvas(0, 0).getContext('2d');
    context.font = `${fontSize}px ${fontFamily}`;

    return context.measureText(text).width;
}

function getErrorBrief(error: unknown) {
    const body = String(error);
    const line =  body.match(/^.*/g);

    if (line)
        return line[0];

    console.error('Could not extract text from error');
    return 'Unknown Error';
}

const lib = {
    ...sLib,
    stateResponse,
    validationErrorMessage,
    errorResponse,
    estimateWidth,
    getErrorBrief,
};

export default lib;