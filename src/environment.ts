import 'process';

export const SERVER_ADDRESS = String(process.env.SERVER_ADDRESS);
export const HTTP_PORT = String(process.env.HTTP_PORT);
export const DB_PORT = String(process.env.DB_PORT);
export const WS_PORT = Number(process.env.WS_PORT);
