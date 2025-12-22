const { MongoClient } = require('mongodb');

(async () => {
    const client = new MongoClient('mongodb://mongo:27017/gamedb');

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('ophir');

        // Seed config
        const config = {
            SERVER_NAME: 'Laputan Machine',
            PLAYER_IDLE_MINUTES: 1,
            USER_SESSION_HOURS: 1,
            GAME_PERSIST_HOURS: 1,
            SINGLE_PLAYER: false,
            NO_RIVAL: false,
            RICH_PLAYERS: false,
            FAVORED_PLAYERS: false,
            CARGO_BONUS: 0,
            SHORT_GAME: false,
            INCLUDE: [],
        };
        await db.collection('config').deleteOne();
        await db.collection('config').insertOne({ _id: 'config_0', ...config });
        await db.createCollection('games');
        await db.createCollection('users');

        console.log('✅ DB Seeded.');
    } catch (error){
        console.log({ error });
        process.exit(1);
    } finally {
        await client.close();
    }
})();