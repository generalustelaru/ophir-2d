import 'process';

export const SERVER_ADDRESS = String(process.env.SERVER_ADDRESS);
export const HTTP_PORT = String(process.env.HTTP_PORT);
export const DB_PORT = String(process.env.DB_PORT);
export const WS_PORT = Number(process.env.WS_PORT);
export const SERVER_NAME = String(process.env.SERVER_NAME);
export const ADMIN_AUTH = String(process.env.ADMIN_AUTH);
export const IDLE_CHECKS = Boolean(process.env.IDLE_CHECKS === 'true');
export const IDLE_TIMEOUT = (60 * 1000) * Math.min(Number(process.env.IDLE_TIMEOUT), 60);
export const RICH_PLAYERS = Boolean(process.env.RICH_PLAYERS === 'true');
export const FAVORED_PLAYERS = Boolean(process.env.FAVORED_PLAYERS === 'true');
export const CARGO_BONUS = Number(process.env.CARGO_BONUS);
export const SINGLE_PLAYER = Boolean(process.env.SINGLE_PLAYER === 'true');
export const SHORT_GAME = Boolean(process.env.SHORT_GAME === 'true');
export const NO_RIVAL = Boolean(process.env.NO_RIVAL === 'true');
export const INCLUDE = (() => {
    try {
        const array = JSON.parse(String(process.env.INCLUDE));

        return array.length ? array : null;
    } catch (error) {
        console.error('Could not parse INCLUDE variable!');
        return null;
    }
})();

//TODO: Adapt or remove persistence logic after implementing DB solution
export const PERSIST_SESSION = Boolean(process.env.PERSIST_SESSION === 'true');
