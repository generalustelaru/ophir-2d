import { Player } from "../../shared_types";
import { ObjectHandler } from "../server_types";


export class PlayerHandler implements ObjectHandler<Player>{

    private player: Player;
    constructor(player: Player) {
        this.player = player;
    }

    public toDto() {
        return this.player;
    }
}