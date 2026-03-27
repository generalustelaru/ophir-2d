import {
    AuthenticationForm, Configuration, Probable, RegistrationForm, GameState, UserRecord, UserId, User,
} from '../server_types';
import { validator } from './validation/ValidatorService';
import { Db, ObjectId } from 'mongodb';

import { randomUUID } from 'crypto';
import lib from './library';

enum CollectionName {
    config = 'config',
    users = 'users',
    games = 'games',
}

enum CustomId { config = 'config_0' }

type GameStateRecord = { id: string, data: GameState }

type Validity = { invalid: false } | { invalid: true, reason: string }
export class DatabaseService {
    private db: Db;
    constructor(db: Db) {
        this.db = db;
    }

    public async inspectAndSeed(): Promise<Probable<boolean>> {
        try {
            const config = await this.db.collection<{ _id: string } & Configuration>(CollectionName.config).findOne(
                { _id: CustomId.config },
                { projection: { _id: 0 } },
            );

            if (!config) {
                const configId = CustomId.config as unknown as ObjectId;
                const defaultConfig: Configuration = {
                    SERVER_NAME: 'TempleBot',
                    PLAYER_IDLE_MINUTES: 1,
                    USER_SESSION_HOURS: 2,
                    GAME_PERSIST_HOURS: 36,
                    SINGLE_PLAYER: true,
                    NO_RIVAL: false,
                    RICH_PLAYERS: false,
                    FAVORED_PLAYERS: false,
                    CARGO_BONUS: 0,
                    SHORT_GAME: false,
                    INCLUDE: [],
                };

                await this.db.collection('config').insertOne({ _id: configId, ...defaultConfig });

                return lib.pass(true);
            }

            return lib.pass(false);

        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    // MARK: CONFIG
    public async getConfig(): Promise<Probable<Configuration>> {
        try {
            const record = await this.db.collection<{ _id: string } & Configuration>(CollectionName.config).findOne(
                { _id: CustomId.config },
                { projection: { _id: 0 } },
            );

            if (record) {
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
    public async addGameState(state: GameState): Promise<Probable<true>> {
        const id = state.sharedState.gameId;
        const record: GameStateRecord = { id, data: lib.getCopy(state) };

        try {
            const response = (
                await this.db.collection(CollectionName.games).insertOne(record)
            );

            return response
                ? lib.pass(true)
                : lib.fail('Failed to add game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async saveGameState(state: GameState): Promise<Probable<true>> {
        const id = state.sharedState.gameId;

        try {
            const record: GameStateRecord = { id, data: lib.getCopy(state) };

            const response = (
                await this.db.collection(CollectionName.games)
                    .findOneAndReplace({ id }, record)
            );

            return response
                ? lib.pass(true)
                : lib.fail('Failed to save game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async loadGameState(gameId: string): Promise<Probable<GameState>> {
        try {
            const record = await this.db.collection<GameStateRecord>(CollectionName.games).findOne({ id: gameId });

            return record
                ? lib.pass(record.data)
                : lib.fail('Failed to retrieve state record.')
            ;

        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    public async loadAllGames(): Promise<Probable<Array<GameState>>> {
        try {
            const records = await this.db.collection<GameStateRecord>(CollectionName.games).find().toArray();

            if (records) {
                return lib.pass(records.map(r=> r.data));
            }

            return lib.fail('Failed to retrieve state record.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    public async deleteGameState(gameId: string): Promise<Probable<true>> {
        try {
            const response = (
                await this.db.collection(CollectionName.games)
                    .findOneAndDelete({ id: gameId })
            );

            return response
                ? lib.pass(true)
                : lib.fail('Failed to delete game state.')
            ;
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        };
    }

    // MARK: USERS

    public async validateRegistrationInput(form: RegistrationForm): Promise<Probable<Validity>> {
        const { userName, password, pwRetype } = lib.trimValues(form);

        switch (true) {
            case userName.length < 5:
                return lib.pass({ invalid: true, reason: 'User name must be at least 5 characters long.' });
            case password.length < 8:
                return lib.pass({ invalid: true, reason: 'Password must be at least 8 characters long.' });
            case password !== pwRetype:
                return lib.pass({ invalid: true, reason: 'Password fields do not match. :(' });
        }

        try {
            const existingUser = await this.db.collection(CollectionName.users).findOne({ name: userName });

            if (existingUser)
                return lib.pass({ invalid: true, reason: 'This username already exists.' });

            return lib.pass({ invalid: false });

        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async registerUser(form: RegistrationForm): Promise<Probable<User>> {

        try {
            const userId: UserId = `user-${randomUUID()}`;
            const user: User = {
                id: userId,
                name: form.userName,
                displayName: null,
            };

            const hash = lib.toHash(form.password);
            const record: UserRecord = { ...user, hash };

            const response = await this.db.collection(CollectionName.users).insertOne(record);

            return response
                ? lib.pass(user)
                : lib.fail('Could not save user.');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async authenticateUser(query: AuthenticationForm): Promise<Probable<User>> {
        try {
            const { userName, password } = lib.trimValues(query);

            const record = await this.db.collection<UserRecord>(CollectionName.users)
                .findOne({ name: userName });

            if (!record)
                return lib.fail('Could not find user.');

            const { _id, hash, ...user } = record;

            if (hash != lib.toHash(password))
                return lib.fail('Wrong password.');

            return lib.pass(user);
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }

    public async updateUserDisplayName(userId: UserId, name: string): Promise<Probable<true>> {
        try {
            const patch = (
                await this.db.collection(CollectionName.users)
                    .findOneAndUpdate(
                        { id: userId },
                        { $set: { displayName: name } },
                    )
            );

            if (patch)
                return lib.pass(true);

            return lib.fail('Could not update user record');
        } catch (error) {
            return lib.fail(lib.getErrorBrief(error));
        }
    }
}
