import {
    AuthenticationForm, Configuration, Probable, RegistrationForm, SessionState, UserRecord, UserId, UserSession,
} from '../server_types';
import { validator } from './validation/ValidatorService';
import { DB_PORT } from '../../environment';
import { randomUUID } from 'crypto';
import lib from './library';

class DatabaseService {
    private dbAddress: string = `http://localhost:${DB_PORT}`;

    // MARK: CONFIG
    public async getConfig(): Promise<Probable<Configuration>> {
        try {
            const response = await fetch(`${this.dbAddress}/config`);

            if (response.ok) {
                const record = await response.json();

                if (typeof record != 'object')
                    return lib.fail('Configuration is not an object.');

                const configuration = validator.validateConfiguration(record);

                return configuration
                    ? lib.pass(configuration)
                    : lib.fail('Configuration is not type-compliant')
                ;
            }

            return lib.fail('Failed to retrieve configuration.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    // MARK: SESSIONS
    public async addGameState(savedSession: SessionState): Promise<Probable<true>> {
        const id = savedSession.sharedState.gameId;

        try {
            const response = await fetch(
                `${this.dbAddress}/games`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, timeStamp: Date.now(), data: savedSession }),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok
                ? lib.pass(true)
                : lib.fail('Failed to add game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async saveGameState(savedSession: SessionState): Promise<Probable<true>> {
        const id = savedSession.sharedState.gameId;

        try {
            const response = await fetch(
                `${this.dbAddress}/games/${id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, timeStamp: Date.now(), data: savedSession }),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok
                ? lib.pass(true)
                : lib.fail('Failed to save game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async loadGameState(gameId: string): Promise<Probable<SessionState>> {
        try {
            const response = await fetch(`${this.dbAddress}/games/${gameId}`);

            if (response.ok) {
                const record = await response.json();
                const gameState = validator.validateState(record.data);

                return gameState
                    ? lib.pass(gameState)
                    : lib.fail('State record is not type compliant')
                ;
            }

            return lib.fail('Failed to retrieve state record.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    public async deleteGameState(gameId: string): Promise<Probable<true>> {
        try {
            const response = await fetch(
                `${this.dbAddress}/games/${gameId}`,
                { method: 'DELETE' },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok
                ? lib.pass(true)
                : lib.fail('Failed to delete game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    public async getTimestamps(): Promise<Probable<Array<{ id: string, timeStamp: number }>>> {
        try {
            const response = await fetch(`${this.dbAddress}/games`);

            if (response.ok) {
                const data = await response.json();

                if (!Array.isArray(data))
                    return lib.fail('Sessions contains malformed data.');

                const timeStamps = data.filter(record => {
                    const { id, timeStamp } = record;

                    if (typeof id == 'string' && typeof timeStamp == 'number')
                        return { id, timeStamp };

                    return null;
                });

                if (timeStamps.includes(null))
                    return lib.fail('Sessions contains malformed data.');

                return lib.pass(timeStamps);
            }

            return lib.fail('Could not retreive timeStamp list');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    // MARK: USERS
    public async registerUser(query: RegistrationForm): Promise<Probable<UserRecord>> {
        const { userName, password, pwRetype } = query;

        if (password !== pwRetype) {
            return lib.fail('Password fields do not match');
        }

        try {
            const userId: UserId = `user-${randomUUID()}`;
            const newUser: UserRecord = {
                id: userId,
                name: userName,
                displayName: null,
                hash: lib.toHash(password),
            };

            const response = await fetch(
                `${this.dbAddress}/users`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUser),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok
                ? lib.pass(newUser)
                : lib.fail('Could not save user.');

        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async authenticateUser(query: AuthenticationForm): Promise<Probable<UserRecord>> {
        try {
            /// simulating a lookup on userName
            const response = await fetch(`${this.dbAddress}/users`);

            if (response.ok) {
                // TODO: have username indexed for direct lookup.
                const users = await response.json() as Array<UserRecord>;
                const user = users.find(user => user.name == query.userName);

                if (!user)
                    return lib.fail('Could not find user.');
                ///

                if (user.hash != lib.toHash(query.password))
                    return lib.fail('Wrong password.');

                return lib.pass(user);
            }

            return lib.fail('Could not find user.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    // TODO: have session data available independently at the ready (in memory, Redis, or something else)
    public async setSession(user: UserRecord, token: string, expiresAt: number): Promise<Probable<true>> {
        const { id: userId, name, displayName } = user;
        const userSession: UserSession = { id: token, userId, name, displayName, expiresAt };

        try {
            const response = await fetch(
                `${this.dbAddress}/sessions`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify( userSession),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok ? lib.pass(true) : lib.fail('Could not save session.');
        } catch (error) {
            console.error(error);
            return lib.fail(`${lib.getErrorBrief(error)}`);
        }
    }

    public async getSession(sessionId: string): Promise<Probable<UserSession>> {
        try {
            const response = await fetch(`${this.dbAddress}/sessions/${sessionId}`);

            if (response.ok) {
                const session: UserSession = await response.json();

                return lib.pass(session);
            }

            return lib.fail('Session was not found.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async removeSession(sessionId: string): Promise<Probable<true>> {
        try {
            const response = await fetch(
                `${this.dbAddress}/sessions/${sessionId}`,
                { method: 'DELETE' },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            if (response.ok) {
                return lib.pass(true);
            }

            return lib.fail('Could not delete session');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async getUser(userId: UserId): Promise<Probable<UserRecord>> {
        try {
            const response = await fetch(`${this.dbAddress}/users/${userId}`);

            if (response.ok) {
                const user: UserRecord = await response.json();

                return lib.pass(user);
            }

            return lib.fail('User was not found');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async saveDisplayName(userId: UserId, name: string): Promise<Probable<true>> {
        try {
            const patch = await fetch(
                `${this.dbAddress}/users/${userId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ displayName: name }),
                },
            );

            if (patch.ok)
                return lib.pass(true);

            return lib.fail('Could not update user record');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }
}

const dbService = new DatabaseService();

export default dbService;