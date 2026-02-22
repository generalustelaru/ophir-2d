import { ClientRequest, ClientMessage, State } from '~/shared_types';
import { Communicator } from './Communicator';
import { EventType } from '~/client_types';

export class TourService extends Communicator {

    constructor() {
        super();
    }

    public createConnection(_url: string, _gameId: string) {
        console.info('Tour session ongoing.');
        this.createEvent({ type: EventType.state_update, detail: this.drawState() });
        // this.createEvent({ type: EventType.start_turn, detail: null });
    }

    public sendMessage(message: ClientMessage) {

        const request: ClientRequest = { message };

        console.debug('->', request);
        this.createEvent({ type: EventType.state_update, detail: this.drawState() });
    }

    private drawState(): State {
        this.currentState += 1;
        const state = JSON.parse(this.states[this.currentState]);

        return state as State;
    }
    private currentState = -1;
    private states = [
        '{\"chat\":[{\"color\":\"Red\",\"message\":\"The Phantom has joined the game\",\"name\":\"TempleBot\",\"timeStamp\":1771753975292},{\"color\":\"Red\",\"message\":\"[The Phantom] is picking a specialist.\",\"name\":\"TempleBot\",\"timeStamp\":1771753976523},{\"color\":null,\"message\":\"Game started!\",\"name\":\"TempleBot\",\"timeStamp\":1771753980332}],\"gameId\":\"injured-olive\",\"gameResults\":[],\"itemSupplies\":{\"goods\":{\"ebony\":2,\"gems\":2,\"linen\":2,\"marble\":2},\"metals\":{\"gold\":2,\"silver\":2}},\"market\":{\"deckId\":\"A\",\"deckSize\":35,\"future\":{\"request\":[\"ebony\",\"linen\"],\"reward\":{\"coins\":2,\"favorAndVp\":2}},\"slot_1\":{\"request\":[\"marble\",\"marble\"],\"reward\":{\"coins\":3,\"favorAndVp\":4}},\"slot_2\":{\"request\":[\"gems\"],\"reward\":{\"coins\":2,\"favorAndVp\":1}},\"slot_3\":{\"request\":[\"gems\"],\"reward\":{\"coins\":2,\"favorAndVp\":1}}},\"players\":[{\"bearings\":{\"location\":\"treasury\",\"position\":{\"x\":300,\"y\":200},\"seaZone\":\"center\"},\"cargo\":[\"marble\",\"gems\",\"ebony\",\"linen\"],\"coins\":99,\"color\":\"Red\",\"destinations\":[\"topRight\",\"right\",\"bottomRight\",\"bottomLeft\",\"topLeft\"],\"favor\":6,\"feasiblePurchases\":[],\"feasibleTrades\":[],\"influence\":1,\"isActive\":true,\"isAnchored\":false,\"isHandlingRival\":false,\"isIdle\":false,\"locationActions\":[],\"mayUndo\":false,\"moveActions\":2,\"name\":\"You\",\"navigatorAccess\":[],\"overnightZone\":\"center\",\"privilegedSailing\":false,\"specialist\":{\"description\":\"No ability.\",\"displayName\":\"Captain\",\"name\":\"\",\"specialty\":\"gems\"},\"timeStamp\":1771753980332,\"turnOrder\":1,\"turnPurchases\":0}],\"rival\":{\"isIncluded\":false},\"sessionOwner\":\"Red\",\"sessionPhase\":\"play\",\"setup\":{\"barriers\":[7,10],\"mapPairings\":{\"locationByZone\":{\"bottomLeft\":{\"actions\":[\"load_good\"],\"name\":\"quarry\"},\"bottomRight\":{\"actions\":[\"load_good\"],\"name\":\"forest\"},\"center\":{\"actions\":[\"buy_metal\"],\"name\":\"treasury\"},\"left\":{\"actions\":[\"load_good\"],\"name\":\"mines\"},\"right\":{\"actions\":[\"sell_goods\",\"sell_specialty\"],\"name\":\"market\"},\"topLeft\":{\"actions\":[\"load_good\"],\"name\":\"farms\"},\"topRight\":{\"actions\":[\"upgrade_cargo\",\"donate_goods\",\"donate_metal\"],\"name\":\"temple\"}},\"zoneByLocation\":{\"farms\":\"topLeft\",\"forest\":\"bottomRight\",\"market\":\"right\",\"mines\":\"left\",\"quarry\":\"bottomLeft\",\"temple\":\"topRight\",\"treasury\":\"center\"}},\"marketFluctuations\":{\"slot_1\":1,\"slot_2\":0,\"slot_3\":-1},\"reducedValueSlot\":\"slot_3\",\"templeTradeSlot\":\"slot_1\"},\"temple\":{\"currentLevel\":0,\"donations\":[],\"levelCompletion\":0,\"maxLevel\":3},\"treasury\":{\"goldCost\":{\"coins\":3,\"favor\":5},\"silverCost\":{\"coins\":1,\"favor\":3}}}',
    ];
};
