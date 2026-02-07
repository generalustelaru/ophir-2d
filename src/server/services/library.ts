import sLib from '../server_lib';
import crypto from 'crypto';

function toHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('hex');
}

function trimValues(data: Record<string, string>): Record<string, string> {
    let output: Record<string, string> = {};

    for (const key in data) {
        output[key] = data[key].trim();
    }

    return output;
}

const lib = {
    ...sLib,
    toHash,
    trimValues,
};

export default lib;