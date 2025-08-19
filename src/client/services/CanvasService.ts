import Konva from 'konva';
import { GameSetupPayload, MarketSlotKey, Phase, PlayerColor, State } from "~/shared_types";
import { Communicator } from "./Communicator";
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import { EventType } from "~/client_types";
import { EnrolmentGroup } from '../mega_groups/EnrolmentGroup';
import { SellGoodsModal } from '../groups/modals/SellGodsModal';

export const CanvasService = new class extends Communicator {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playerGroup: PlayerGroup;
    private setupGroup: SetupGroup;
    private enrolmentGroup: EnrolmentGroup;
    private isEnrolmentDrawn: boolean = false;
    private isSetupDrawn: boolean = false
    private isPlayDrawn: boolean = false;
    private sellGoodsModal: SellGoodsModal;

    public constructor() {
        super();

        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: false,
            opacity: 1,
            width: 1200,
            height: 500,
        });

        this.stage.add(...[
            new Konva.Layer(), // [0] for the board
            new Konva.Layer(), // [1] for overlay modals, popups, tooltips.
        ]);

        const segmentWidth = this.stage.width() / 4;

        this.sellGoodsModal = new SellGoodsModal(this.stage);

        const openSellGoodsModal = (slot: MarketSlotKey) => {
            this.sellGoodsModal.show(slot);
        }

        this.locationGroup = new LocationGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: segmentWidth,
                x: 0,
                y: 0,
            },
            openSellGoodsModal,
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
            },
        );

        this.enrolmentGroup = new EnrolmentGroup(
            this.stage,
            {
                height: this.stage.height(),
                width: this.stage.width(),
                x: 0,
                y: 0,
            },
        );
    }

    public getSetupCoordinates(): GameSetupPayload {
        return this.mapGroup.createSetupPayload();
    }

    public updatePlayerVp(color: PlayerColor, vp: number) {
        if (!this.isPlayDrawn)
            throw new Error("Cannot update. VP element is not instanced.");

        this.playerGroup.updatePlayerVp(color, vp);
    }

    public drawUpdateElements(state: State, toDisable = false): void {

        if (!localState.playerColor) {
            this.createEvent({
                type: EventType.info,
                detail: { text: 'You are a spectator' }
            });
        }

        const { sessionPhase } = state;

        switch (sessionPhase) {
            case Phase.enrolment:
                if(!this.isEnrolmentDrawn) {
                    this.stage.visible(true);
                    this.enrolmentGroup.drawElements();
                    this.fitStageIntoParentContainer();
                    this.isEnrolmentDrawn = true;
                }
                this.enrolmentGroup.update(state)
                break;
            case Phase.setup:
                this.enrolmentGroup.disable();
                if (!this.isSetupDrawn) {
                    this.stage.visible(true);
                    this.mapGroup.drawElements(state);
                    this.setupGroup.drawElements(state);
                    this.fitStageIntoParentContainer();
                    this.isSetupDrawn = true;
                }
                this.setupGroup.update(state);
                break;

            case Phase.play:
                this.setupGroup.disable();
                if (!this.isPlayDrawn) {
                    this.stage.visible(true);
                    this.mapGroup.drawElements(state);
                    this.locationGroup.drawElements(state);
                    this.playerGroup.drawElements(state);
                    this.fitStageIntoParentContainer();
                    this.isPlayDrawn = true;
                }
                this.locationGroup.update(state);
                this.mapGroup.update(state);
                this.playerGroup.update(state);
                this.playerGroup.updatePlayerVp(localState.playerColor, localState.vp);
                toDisable && this.disable();
                break;

            default:
                throw new Error("Update case not covered!");
        }
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }

    public fitStageIntoParentContainer() {

        const container = document.getElementById('canvas')?.getBoundingClientRect();

        if (!container)
            throw new Error("Cannot find canvas container!");

        const elementWidth = container.width;

        const sceneWidth = 1200;
        const sceneHeight = 500;

        const scale = elementWidth / sceneWidth;

        this.stage.width(sceneWidth * scale);
        this.stage.height(sceneHeight * scale);
        this.stage.scale({ x: scale, y: scale });
    }
}

