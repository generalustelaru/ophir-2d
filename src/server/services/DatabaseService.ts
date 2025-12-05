import { DB_PORT } from '../configuration';
import { Configuration, SessionState } from '../server_types';
import { validator } from './validation/ValidatorService';

class DatabaseService {

    private dbAddress: string = `http://localhost:${DB_PORT}`;

    public async getConfig(): Promise<Configuration | null> {
        try {
            const response = await fetch(`${this.dbAddress}/config`);

            if (!response.ok){
                throw new Error('Could not find Configuration in DB');
            }

            const record = await response.json();

            if (typeof record != 'object')
                throw new Error('Db entry for Record is corrupted.');

            const configuration = validator.validateConfiguration(record);

            if (!configuration)
                throw new Error('Db entry for Record is not type-compliant');

            return configuration;

        } catch (error) {
            console.error('DB Error',{ error });
            return null;
        }
    }

    public async addGameState(savedSession: SessionState): Promise<{ok: boolean}> {
        const id = savedSession.sharedState.gameId;

        const response = await fetch(
            `${this.dbAddress}/sessions`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, data: savedSession }),
            },
        );

        if (response.ok)
            return { ok: true };

        console.error('Failed to add game state:', { error: response.status });
        return { ok: false };
    }

    public async saveGameState(savedSession: SessionState): Promise<{ok: boolean}> {

        const id = savedSession.sharedState.gameId;

        const response = await fetch(
            `${this.dbAddress}/sessions/${id}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, data: savedSession }),
            },
        );

        if (response.ok)
            return { ok: true };

        console.error('Failed to save game state:', { error: response.status });
        return { ok: false };
    }

    public async loadGameState(gameId: string): Promise<SessionState | null> {
        try {
            const response = await fetch(`${this.dbAddress}/sessions/${gameId}`);

            if (!response.ok)
                throw new Error(`DB Error: ${response.status}`);

            const record = await response.json();

            if (typeof record != 'object' || !record.data)
                throw new Error(`Data Error: ${record}`);

            if (!('data' in record))
                throw new Error('Db entry is corrupted.');

            const gameState = validator.validateState(record.data);

            if (!gameState)
                throw new Error('Stored game state is corrupted.');

            return gameState;

        } catch (error) {
            console.log('Could not resolve data', { error });

            return null;
        }
    }
}

const dbService = new DatabaseService();

export default dbService;