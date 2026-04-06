import { ServerTools } from '../ServerTools';
import crypto from 'crypto';

export class ServiceTools extends ServerTools {

    public static toHash(string: string): string {
        return crypto.createHash('sha256').update(string).digest('hex');
    }

    public static trimValues(data: Record<string, string>): Record<string, string> {
        let output: Record<string, string> = {};

        for (const key in data) {
            output[key] = data[key].trim();
        }

        return output;
    }
}
