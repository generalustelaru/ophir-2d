import 'process';

export const SERVER_ADDRESS = String(process.env.SERVER_ADDRESS);
export const HTTP_PORT = String(process.env.HTTP_PORT);
export const WS_PORT = Number(process.env.WS_PORT);
export const SERVER_NAME = String(process.env.SERVER_NAME);
export const SHUTDOWN_AUTH = String(process.env.SHUTDOWN_AUTH);
export const IDLE_CHECKS = Boolean(Number(process.env.IDLE_CHECKS));
export const IDLE_TIMEOUT = Number(process.env.IDLE_TIMEOUT);
export const RICH_PLAYERS = Boolean(Number(process.env.RICH_PLAYERS));
export const CARGO_BONUS = Number(process.env.CARGO_BONUS);
export const SINGLE_PLAYER = Boolean(Number(process.env.SINGLE_PLAYER));
export const SHORT_GAME = Boolean(Number(process.env.SHORT_GAME));
