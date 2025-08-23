import 'process';

export const SERVER_ADDRESS = String(process.env.SERVER_ADDRESS);
export const HTTP_PORT = String(process.env.HTTP_PORT);
export const WS_PORT = Number(process.env.WS_PORT);
export const SERVER_NAME = String(process.env.SERVER_NAME);
export const SHUTDOWN_AUTH = String(process.env.SHUTDOWN_AUTH);
export const IDLE_CHECKS = Boolean(process.env.IDLE_CHECKS === 'true');
export const IDLE_TIMEOUT = (60 * 1000) * Number(process.env.IDLE_TIMEOUT);
export const RICH_PLAYERS = Boolean(process.env.RICH_PLAYERS === 'true');
export const FAVORED_PLAYERS = Boolean(process.env.FAVORED_PLAYERS === 'true');
export const CARGO_BONUS = Number(process.env.CARGO_BONUS);
export const SINGLE_PLAYER = Boolean(process.env.SINGLE_PLAYER === 'true');
export const SHORT_GAME = Boolean(process.env.SHORT_GAME === 'true');
export const INCLUDE = (() => {
    try {
        return  JSON.parse(String(process.env.INCLUDE));
    } catch (error) {
        console.error('Could not parse INCLUDE variable!');
        return [];
    }
})();
export const PERSIST_SESSION = Boolean(process.env.PERSIST_SESSION === 'true'); //TODO: remove persistence logic after implementing DB solution
