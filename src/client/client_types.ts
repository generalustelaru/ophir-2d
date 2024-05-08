import { HexId } from '../shared_types';

export type HexaColor = `#${string}`;
export type HexOffset = { id: HexId, x: number, y: number };

export type ClientConstants = {
    CONNECTION: {
        wsAddress: string
    },
    COLOR: Record<string, HexaColor>,
    HEX_OFFSET_DATA: HexOffset[],
};