import {
    AuthenticationForm, Configuration, Probable, RegistrationForm, GameState, UserRecord, UserId,
    User,
} from '../server_types';
import { validator } from './validation/ValidatorService';
import { DB_PORT } from '../../environment';
import { randomUUID } from 'crypto';
import lib from './library';
type Validity = { invalid: false } | { invalid: true, reason: string }
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

    // MARK: GAMES
    public async addGameState(savedSession: GameState): Promise<Probable<true>> {
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

    // TODO: call this more often (i.e during enrolment on color change, and on phase change to setup)
    public async saveGameState(savedSession: GameState): Promise<Probable<true>> {
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

    public async loadGameState(gameId: string): Promise<Probable<GameState>> {
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

    public async loadAllGames(): Promise<Probable<Array<GameState>>> {
        try {
            const response = await fetch(`${this.dbAddress}/games`);

            if (response.ok) {
                const records = await response.json();
                const gameStates: Array<GameState> = [];
                for (const record of records) {
                    const gameState = validator.validateState(record.data);

                    if (!gameState)
                        return lib.fail('State record is not type compliant');

                    gameStates.push(gameState);
                }

                return lib.pass(gameStates);
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

    public async validateRegistrationInput(query: RegistrationForm): Promise<Probable<Validity>> {
        const { userName, password, pwRetype } = query;

        switch (true) {
            case userName.length < 5:
                return lib.pass({ invalid: true, reason: 'User name must be at least 5 characters long.' });
            case password.length < 8:
                return lib.pass({ invalid: true, reason: 'Password must be at least 8 characters long.' });
            case password !== pwRetype:
                return lib.pass({ invalid: true, reason: 'Password fields do not match. :(' });
        }

        try {
            const userFetch = await fetch(`${this.dbAddress}/users`);

            if (userFetch.ok) {
                const users: Array<UserRecord> = await userFetch.json();

                if (users.find(r => r.name === userName))
                    return lib.pass({ invalid: true, reason: 'This username already exists.' });

                return lib.pass({ invalid: false });
            }

            return lib.fail(userFetch.statusText);
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }

    }
    public async registerUser(query: RegistrationForm): Promise<Probable<User>> {
        const { userName, password, pwRetype } = query;

        if (password !== pwRetype) {
            return lib.fail('Password fields do not match');
        }

        try {
            const userId: UserId = `user-${randomUUID()}`;
            const user: User = {
                id: userId,
                name: userName,
                displayName: null,
            };

            const hash = lib.toHash(password);
            const record: UserRecord = { ...user, hash };

            const response = await fetch(
                `${this.dbAddress}/users`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok
                ? lib.pass(user)
                : lib.fail('Could not save user.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async authenticateUser(query: AuthenticationForm): Promise<Probable<User>> {
        try {
            /// simulating a lookup on userName
            const response = await fetch(`${this.dbAddress}/users`);

            if (response.ok) {
                // TODO: have username indexed for direct lookup.
                const records = await response.json() as Array<UserRecord>;
                const userRecord = records.find(userRecord => userRecord.name == query.userName);

                if (!userRecord)
                    return lib.fail('Could not find user.');
                ///

                const { hash, ...user } = userRecord;

                if (hash != lib.toHash(query.password))
                    return lib.fail('Wrong password.');

                return lib.pass(user);
            }

            return lib.fail('Could not find user.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async updateUserDisplayName(userId: UserId, name: string): Promise<Probable<true>> {
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