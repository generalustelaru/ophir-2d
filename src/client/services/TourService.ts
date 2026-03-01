import { ClientMessage, Action, PlayState, MovementPayload } from '~/shared_types';
import { Communicator } from './Communicator';
import { EventType, ActionScenario, Target, Instruction } from '~/client_types';

export class TourService extends Communicator {
    private currentState: PlayState;
    private expectedMessage: ClientMessage;

    constructor() {
        super();
        // TODO: fetch initial state from server
        const initialState = '{\"gameId\":\"game-tour\",\"sessionOwner\":\"Purple\",\"setup\":{\"barriers\":[4,7],\"mapPairings\":{\"locationByZone\":{\"center\":{\"name\":\"farms\",\"actions\":[\"load_good\"]},\"topRight\":{\"name\":\"market\",\"actions\":[\"sell_goods\",\"sell_specialty\"]},\"right\":{\"name\":\"forest\",\"actions\":[\"load_good\"]},\"bottomRight\":{\"name\":\"temple\",\"actions\":[\"upgrade_cargo\",\"donate_goods\",\"donate_metal\"]},\"bottomLeft\":{\"name\":\"quarry\",\"actions\":[\"load_good\"]},\"left\":{\"name\":\"treasury\",\"actions\":[\"buy_metal\"]},\"topLeft\":{\"name\":\"mines\",\"actions\":[\"load_good\"]}},\"zoneByLocation\":{\"farms\":\"center\",\"market\":\"topRight\",\"forest\":\"right\",\"temple\":\"bottomRight\",\"quarry\":\"bottomLeft\",\"treasury\":\"left\",\"mines\":\"topLeft\"}},\"marketFluctuations\":{\"slot_1\":-1,\"slot_2\":0,\"slot_3\":1},\"templeTradeSlot\":\"slot_2\",\"reducedValueSlot\":\"slot_1\"},\"sessionPhase\":\"play\",\"gameResults\":[],\"players\":[{\"color\":\"Purple\",\"timeStamp\":1772352693651,\"isIdle\":false,\"name\":\"The Phantom\",\"turnOrder\":1,\"specialist\":{\"name\":\"chancellor\",\"displayName\":\"Chancellor\",\"specialty\":\"gems\",\"description\":\"May substitute commodities with\\nfavor when trading at the market.\"},\"isActive\":true,\"mayUndo\":false,\"bearings\":{\"seaZone\":\"center\",\"position\":{\"x\":300,\"y\":200},\"location\":\"farms\"},\"overnightZone\":\"center\",\"favor\":1,\"privilegedSailing\":false,\"influence\":1,\"moveActions\":2,\"isAnchored\":false,\"isHandlingRival\":false,\"locationActions\":[],\"destinations\":[\"topRight\",\"bottomRight\",\"bottomLeft\",\"left\",\"topLeft\"],\"navigatorAccess\":[],\"cargo\":[\"empty\",\"empty\"],\"feasibleTrades\":[],\"feasiblePurchases\":[],\"coins\":0,\"turnPurchases\":0}],\"market\":{\"deckId\":\"A\",\"future\":{\"request\":[\"gems\",\"marble\"],\"reward\":{\"coins\":3,\"favorAndVp\":3}},\"slot_1\":{\"request\":[\"ebony\",\"gems\"],\"reward\":{\"coins\":3,\"favorAndVp\":2}},\"slot_2\":{\"request\":[\"ebony\"],\"reward\":{\"coins\":1,\"favorAndVp\":1}},\"slot_3\":{\"request\":[\"ebony\",\"marble\"],\"reward\":{\"coins\":2,\"favorAndVp\":3}},\"deckSize\":35},\"treasury\":{\"goldCost\":{\"coins\":3,\"favor\":5},\"silverCost\":{\"coins\":1,\"favor\":3}},\"temple\":{\"maxLevel\":3,\"levelCompletion\":0,\"currentLevel\":0,\"donations\":[]},\"chat\":[],\"itemSupplies\":{\"metals\":{\"gold\":2,\"silver\":2},\"goods\":{\"gems\":2,\"linen\":2,\"ebony\":2,\"marble\":2}},\"rival\":{\"isIncluded\":true,\"isControllable\":false,\"activePlayerColor\":\"Purple\",\"destinations\":[\"center\",\"right\",\"topLeft\"],\"moves\":2,\"bearings\":{\"seaZone\":\"topRight\",\"position\":{\"x\":411,\"y\":125},\"location\":\"market\"},\"influence\":1}}';
        this.currentState = JSON.parse(initialState) as PlayState;
        this.expectedMessage = { action: Action.move, payload: { zoneId: 'topLeft', position: { x:0,y:0 } } };
    }

    public createConnection(_url: string, _gameId: string) {
        this.createEvent( { type: EventType.identification, detail: { color: this.currentState.players[0].color } });
        const instructions = [
            {
                text: 'Hello and welcome to Ophir 2D!\nThanks for trying out the game.\nNote that this session is on a rail. You can only perform the instructed actions.',
                highlights: [],
            },
            {
                text: 'The green ship token in the center sea zone represents your current location.\nTry to reposition it inside the current hex by dragging it.',
                highlights: [Target.centerZone],
            },
            {
                text: 'Let\'s get down to holy business!\nYour goal is to donate precious metals and commodities towards the temple\'s construction.',
                highlights: [Target.bottomRightZone],
            },
            {
                text: 'You can start by picking up commodities. Drag your ship into the top-left sea zone.',
                highlights: [Target.topLeftZone],
            },
        ];

        this.createEvent({ type: EventType.tour_update, detail: { instructions, state: this.currentState } });
    }

    public sendMessage(message: ClientMessage) {
        const { action, payload } = message;

        if (action == Action.reposition) {
            this.currentState.players[0].bearings.position = payload.repositioning;
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
            return;
        }

        // TODO: implement a detached system that compares messages to expectations
        if (action != this.expectedMessage.action) {
            this.createEvent({ type: EventType.state_update, detail: this.currentState });
            return;
        }

        if (this.expectedMessage.action == Action.move) {
            const p = payload as MovementPayload;

            if (p.zoneId != this.expectedMessage.payload.zoneId) {
                this.createEvent({ type: EventType.state_update, detail: this.currentState });
                return;
            }

            this.currentState.players[0].bearings.position = p.position;
        }

        const newInstructions = ((): Array<Instruction> => {
            const scenario = this.scenarios.shift();

            if (!scenario)
                throw new Error('Scenarios are incomplete.');

            scenario.mutate(this.currentState);
            const { instructions, expecting } = scenario;
            this.expectedMessage = expecting;

            return instructions;
        })();

        this.createEvent({ type: EventType.tour_update, detail: {
            state: this.currentState,
            instructions: newInstructions,
        } });
    }

    private scenarios: Array<ActionScenario> = [
        {
            mutate: (state) => {
                const player = state.players[0];
                player.bearings.seaZone = 'topLeft';
                player.bearings.location = 'forest';
                player.moveActions = 1;
                player.mayUndo = true;
                player.isAnchored = true;
            },
            instructions: [
                {
                    text: 'You\'ve just spent a move. You only get 2 moves per turn.\nThe Moves Counter keeps track of them.',
                    highlights: [Target.movesCounter],
                },
            ],
            expecting: { action: Action.move, payload: { zoneId: 'left', position: { x:0,y:0 } } },
        },
    ];
};
