import { State, StateResponse } from '~/shared_types';
import { createCanvas } from 'canvas';
import sLib from '../server_lib';

function validationErrorMessage(){
    return 'Malformed request.';
}

function stateResponse(state: State): StateResponse {
    return { state };
}

function estimateWidth(text: string, fontSize: number, fontFamily = 'Arial') {
    const context = createCanvas(0, 0).getContext('2d');
    context.font = `${fontSize}px ${fontFamily}`;

    return context.measureText(text).width;
}

const lib = {
    ...sLib,
    stateResponse,
    validationErrorMessage,
    estimateWidth,
};

export default lib;