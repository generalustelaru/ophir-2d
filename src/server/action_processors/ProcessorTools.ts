import { Font } from 'opentype.js';
import { ServerTools } from '../ServerTools';
import { Probable } from '../server_types';

export class ProcessorTools extends ServerTools {

    public static validationErrorMessage() {
        return 'Malformed request.';
    }

    public static validateTextLength(
        text: string,
        font: Font,
        fontSize: number,
        maxWidth: number,
        maxSegmentWidth: number,
    ): Probable<true> {
        const textWidth = font.getAdvanceWidth(text, fontSize);

        if (textWidth > maxWidth)
            return ServerTools.fail('Text is too long.');

        const segments = text.split(' ');

        for (const segment of segments) {
            const segmentWidth = font.getAdvanceWidth(segment, fontSize);

            if (segmentWidth > maxSegmentWidth)
                return ServerTools.fail(`A word is too long: ${segment}.`);
        }

        return ServerTools.pass(true);
    }
}
