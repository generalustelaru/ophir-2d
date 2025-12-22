import { Probable, UserSession } from '../server_types';
import { createClient, RedisClientType } from 'redis';
import { REDIS_PORT } from '~/environment';
import sLib from '../server_lib';
export class SessionService {
    private redis: RedisClientType;

    constructor() {
        this.redis = createClient({
            url: `redis://localhost:${REDIS_PORT}`,
        });

        this.redis.on('error', (err) => { sLib.printError(String(err)); });
        this.redis.on('connect', () => { console.log('✅ Connected to Redis'); });
    }

    public async connect(): Promise<void> {
        await this.redis.connect();
    }

    public disconnect(): void {
        this.redis.destroy();
    }

    public async set(token: string, session: UserSession): Promise<Probable<true>> {
        const response = await this.redis.set(
            token,
            JSON.stringify(session),
            { expiration: { type: 'PXAT', value: session.expiresAt } },
        );

        if (!response)
            return sLib.fail(`Cannot save session: ${token}`);

        return sLib.pass(true);
    }

    public async get(token: string): Promise<Probable<UserSession>> {
        const session = await this.redis.get(token);

        if (!session)
            return sLib.fail(`Could not find token: ${token}`);

        return sLib.pass(JSON.parse(session) as UserSession);
    }

    public async delete(token: string): Promise<void> {
        await this.redis.del(token);
    }
}
