
export type PlayerId = "playerWhite" | "playerYellow" | "playerRed" | "playerGreen";

export type ServerState = {
    status: "empty" | "lobby" | "full" | "started",
    sessionOwner: PlayerId | null,
    availableSlots: PlayerId[],
    players: any,
};
export type State = {
    playerId: string | null,
    isBoardDrawn: boolean,
    server: ServerState,
    map: any,
}