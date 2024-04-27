
import { Service } from "./service.js";
import { CommunicationService } from "./commService.js";
import constants from "./constants.json";
const { EVENT, ACTION } = constants;

export class EventHandler extends Service {

    constructor() {
        super();
        this.commService = CommunicationService.getInstance();

        // TODO: move EVENT.update here

        //Konva to Websocket
        window.addEventListener(
            EVENT.action,
            (event) => this.commService.sendMessage(
                event.detail.action,
                event.detail.details
            ),
        );

        // Websocket to UI
        window.addEventListener(
            EVENT.error,
            () => console.error('Game server erred :('),
        );

        // Websocket to Websocket
        window.addEventListener(
            EVENT.connected,
            // () => {console.log('EVENT.connected received')},
            () => this.commService.sendMessage(ACTION.inquire),
        );
    }
}
