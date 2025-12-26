import { State, StateResponse } from '~/shared_types';
import { Font } from 'opentype.js';
import sLib from '../server_lib';
import { Probable } from '../server_types';

function validationErrorMessage(){
    return 'Malformed request.';
}

function stateResponse(state: State): StateResponse {
    return { state };
}

export function validateTextLength(
    text: string,
    font: Font,
    fontSize: number,
    maxWidth: number,
    maxSegmentWidth: number,
): Probable<true> {
    const textWidth = font.getAdvanceWidth(text, fontSize);

    if (textWidth > maxWidth)
        return sLib.fail('Text is too long.');

    const segments = text.split(' ');

    for (const segment of segments) {
        const segmentWidth = font.getAdvanceWidth(segment, fontSize);

        if (segmentWidth > maxSegmentWidth)
            return sLib.fail(`A word is too long: ${segment}.`);
    }

    return sLib.pass(true);
}

const lib = {
    ...sLib,
    stateResponse,
    validationErrorMessage,
    validateTextLength,
};

export default lib;