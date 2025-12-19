import sLib from '../server_lib';
import crypto from 'crypto';

function toHash(string: string): string {
    return crypto.createHash('sha256').update(string).digest('hex');
}

const lib = {
    ...sLib,
    toHash,
};

export default lib;