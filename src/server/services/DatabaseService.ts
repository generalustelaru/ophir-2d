import { DB_PORT } from '../../environment';
import { AuthenticationForm, Configuration, Probable, RegistrationForm, SessionState, User } from '../server_types';
import { validator } from './validation/ValidatorService';
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
                `${this.dbAddress}/sessions`,
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
                `${this.dbAddress}/sessions/${id}`,
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
            const response = await fetch(`${this.dbAddress}/sessions/${gameId}`);

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
                `${this.dbAddress}/sessions/${gameId}`,
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
            const response = await fetch(`${this.dbAddress}/sessions`);

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
    public async registerUser(query: RegistrationForm): Promise<Probable<true>> {
        const { name, email, password, pwRetype } = query;

        if (password !== pwRetype) {
            return lib.fail('Password fields do not match');
        }

        try {
            const userResponse = await fetch(`${this.dbAddress}/users/${email}`);

            if (userResponse.ok) {
                return lib.fail('User w/ the same email is already registered.');
            }

            const newUser: User = {
                id: email,
                name,
                hash: lib.toHash(password),
                authToken: null,
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
                ? lib.pass(true)
                : lib.fail('Could not save user.');

        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async authenticateUser(query: AuthenticationForm): Promise<Probable<true>> {
        try {
            const response = await fetch(`${this.dbAddress}/users/${query.email}`);

            if (response.ok) {
                const user = await response.json() as User;
                const pwHash = lib.toHash(query.password);

                if (pwHash != user.hash)
                    return lib.fail('Wrong password.');

                return lib.pass(true);
            }

            return lib.fail('Could not find user.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async setAuthToken(userEmail: string, token: string): Promise<Probable<true>> {
        try {
            const response = await fetch(
                `${this.dbAddress}/users/${userEmail}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authToken: token }),
                },
            );

            await new Promise(resolve => setTimeout(resolve, 100));

            return response.ok ? lib.pass(true) : lib.fail('Could not find user.');
        } catch (error) {
            console.error(error);
            return lib.fail(`${lib.getErrorBrief(error)}`);
        }
    }

    public async getUser(userEmail: string): Promise<Probable<User>> {
        try {
            const response = await fetch(`${this.dbAddress}/users/${userEmail}`);

            if (response.ok) {
                const user = await response.json();

                return lib.pass(user);
            }

            return lib.fail('User was not found');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }
}

const dbService = new DatabaseService();

export default dbService;