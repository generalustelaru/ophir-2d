import sLib from '../server_lib';
import crypto from 'crypto';

function getErrorBrief(error: unknown): string {
    const body = String(error);
    const line = body.match(/^.*/g);

    if (line)
        return line[0];

    console.error('Could not extract text from error');
    return 'Unknown Error';
}

function toHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('hex');
}

const lib = {
    ...sLib,
    getErrorBrief,
    toHash,
};

export default lib;