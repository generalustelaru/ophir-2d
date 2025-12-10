import { DB_PORT } from '../../environment';
import { Configuration, Probable, SessionState } from '../server_types';
import { validator } from './validation/ValidatorService';
import lib from '../action_processors/library';

class DatabaseService {

    private dbAddress: string = `http://localhost:${DB_PORT}`;

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
                `${this.dbAddress}/sessions/${gameId}`, { method: 'DELETE' },
            );

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
}

const dbService = new DatabaseService();

export default dbService;