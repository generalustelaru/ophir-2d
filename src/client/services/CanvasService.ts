import Konva from 'konva';
import { GameSetupPayload, Phase, PlayState, SetupState } from '../../shared_types';
import { Communicator } from "./Communicator";
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import { EventName } from '../client_types';

export const CanvasService = new class extends Communicator {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playerGroup: PlayerGroup;
    private setupGroup: SetupGroup;
    private isDrawn = false;

    public constructor() {
        super();
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: true,
            opacity: 1,
            width: 1200,
            height: 500,
        });

        this.stage.add(...[
            new Konva.Layer(), // [0] for the board
            new Konva.Layer(), // [1] for overlay modals, popups, tooltips.
        ]);

        const segmentWidth = this.stage.width() / 4;

        this.locationGroup = new LocationGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth,
                x: 0,
                y: 0,
            },
        ); // locationGroup covers 1 segment, sitting on the left

        this.playerGroup = new PlayerGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth,
                x: segmentWidth * 3,
                y: 0,
            },
        ); // playerGroup covers 1 segment, sitting on the right

        this.mapGroup = new MapGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth * 2,
                x: segmentWidth,
                y: 0,
            },
        ); // mapGroup covers half the canvas (2 segments), sitting in the middle

        this.setupGroup = new SetupGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: this.stage.width(),
                x: 0,
                y: 0,
            }
        )
    }

    public getSetupCoordinates(): GameSetupPayload {
        return this.mapGroup.createSetupPayload();
    }

    private drawElements(state: PlayState | SetupState): void {

        switch(state.sessionPhase) {
            case Phase.setup:
                this.setupGroup.drawElements();
                 // TODO: need to create draw logic for incomplete setup (missing market and ships)
                break;
            case Phase.play:
                this.locationGroup.drawElements(state);
                this.playerGroup.drawElements(state);
                this.mapGroup.drawElements(state);
                this.isDrawn = true;
                break;
            default:
                console.error('session phase is incompatible', state);
        }

        if (!localState.playerColor) {
            this.createEvent({
                type: EventName.info,
                detail: { text: 'You are a spectator' }
            });
        }
    }

    public drawUpdateElements(state: PlayState | SetupState, disable = false): void {

        if(!this.isDrawn)
            this.drawElements(state);

        if (state.sessionPhase === Phase.setup) {
            this.setupGroup.update(state);

            return;
        }

        this.setupGroup.disable();
        this.locationGroup.update(state);
        this.mapGroup.update(state);
        this.playerGroup.update(state);

        disable && this.disable();
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }
}
