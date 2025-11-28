import Konva from 'konva';
import { GameSetupPayload, MarketSlotKey, Phase, PlayState, SpecialistName, State } from '~/shared_types';
import { Communicator } from './Communicator';
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import { EventType, SailAttemptArgs } from '~/client_types';
import { EnrolmentGroup } from '../mega_groups/EnrolmentGroup';
import {
    SellGoodsModal, StartTurnModal, DonateGoodsModal,EndTurnModal, SailAttemptModal, RivalControlModal, ForceTurnModal,
    EndRivalTurnModal, AdvisorModal, ChancellorModal, PeddlerModal,
} from '../groups/modals/';
import clientConstants from '../client_constants';

export class CanvasService extends Communicator {
    private stage: Konva.Stage;
    private locationGroup: LocationGroup;
    private mapGroup: MapGroup;
    private playerGroup: PlayerGroup;
    private setupGroup: SetupGroup | null;
    private enrolmentGroup: EnrolmentGroup | null;
    private isEnrolmentDrawn: boolean = false;
    private isSetupDrawn: boolean = false;
    private isPlayDrawn: boolean = false;
    private startTurnModal: StartTurnModal;
    private endTurnModal: EndTurnModal;
    private sailAttemptModal: SailAttemptModal;
    private forceTurnModal: ForceTurnModal;
    private sellGoodsModal: SellGoodsModal | null = null;
    private donateGoodsModal: DonateGoodsModal | null = null;
    private rivalControlModal: RivalControlModal | null = null;
    private endRivalTurnModal: EndRivalTurnModal | null = null;
    private advisorModal: AdvisorModal | null = null;
    private chancellorModal: ChancellorModal | null = null;
    private peddlerModal: PeddlerModal | null = null;

    constructor() {
        super();
        // TODO: Reduce group.add() calls.throughout subclasses

        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: false,
            opacity: 1,
            width: 1200,
            height: 500,
        });

        this.stage.add(...[
            new Konva.Layer(), //  base
            new Konva.Layer(), //  map
            new Konva.Layer(), //  modal
            new Konva.Layer(), //  overlay.
        ]);

        const segmentWidth = this.stage.width() / 4;

        // Common modals
        this.endTurnModal = new EndTurnModal(this.stage);
        this.sailAttemptModal = new SailAttemptModal(this.stage);
        this.startTurnModal = new StartTurnModal(this.stage);
        this.forceTurnModal = new ForceTurnModal(this.stage);

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
            () => { this.endTurnModal.show(); },
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

    public openSailAttemptModal(data: SailAttemptArgs) {
        this.sailAttemptModal?.show(data);
    };

    public notifyForTurn(): void {
        this.startTurnModal?.show();
    }

    public notifyForForceTurn(): void {
        this.forceTurnModal?.show();
    }

    public notifyForRivalControl(): void {
        this.rivalControlModal?.show();
    }

    // MARK: UPDATE
    public drawUpdateElements(state: State, toDisable = false) {
        const { sessionPhase } = state;

        if (!localState.playerColor) {
            this.createEvent({
                type: EventType.info,
                detail: {
                    text: sessionPhase == Phase.enrolment
                        ? 'Registrations open!'
                        : 'You are a spectator.',
                },
            });
        }

        this.fitStageIntoParentContainer();

        switch (sessionPhase) {
            case Phase.enrolment:
                if (!this.isEnrolmentDrawn) {
                    this.stage.visible(true);
                    this.enrolmentGroup?.drawElements();
                    this.isEnrolmentDrawn = true;
                }
                this.enrolmentGroup?.update(state);
                break;

            case Phase.setup:
                this.enrolmentGroup = this.enrolmentGroup?.selfDecomission() || null;
                if (!this.isSetupDrawn) {
                    this.stage.visible(true);
                    this.mapGroup.drawElements(state);
                    this.setupGroup?.drawElements(state);
                    this.isSetupDrawn = true;
                }
                this.setupGroup?.update(state);
                break;

            case Phase.play:
                this.setupGroup = this.setupGroup?.selfDecomission() || null;
                if (!this.isPlayDrawn) {
                    this.initializeModals(state);
                    this.stage.visible(true);
                    this.mapGroup.drawElements(state);
                    this.locationGroup.drawElements(state);
                    this.playerGroup.drawElements(state);
                    this.isPlayDrawn = true;
                }
                this.sellGoodsModal?.update(state);
                this.donateGoodsModal?.update(state);
                this.endTurnModal?.update(state);
                this.rivalControlModal?.update(state);
                this.advisorModal?.update(state);
                this.chancellorModal?.update(state);
                this.peddlerModal?.update(state);
                this.locationGroup.update(state);
                this.mapGroup.update(state);
                this.playerGroup.update(state);
                this.playerGroup.updatePlayerVp(localState.playerColor, localState.vp);
                toDisable && this.disable();
                break;

            default:
                throw new Error('Update case not covered!');
        }
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }

    public fitStageIntoParentContainer() {
        const { width, height, scale } = this.calculateDimensions();

        this.stage.width(width);
        this.stage.height(height);
        this.stage.scale({ x: scale, y: scale });
    }

    private calculateDimensions() {
        const container = document.getElementById('canvas')?.getBoundingClientRect();

        if (!container)
            throw new Error('Cannot find canvas container!');

        const elementWidth = container.width;

        const {
            width: sceneWidth ,
            height: sceneHeight,
        } = clientConstants.STAGE_AREA;

        const scale = elementWidth / sceneWidth;

        return {
            width: sceneWidth * scale,
            height: sceneHeight * scale,
            scale,
        };
    }

    private initializeModals(state: PlayState) {
        const localPlayer = state.players.find(p => p.color == localState.playerColor);

        if (!localPlayer)
            return;

        if (state.rival.isIncluded) {
            this.rivalControlModal = new RivalControlModal(this.stage);
            this.endRivalTurnModal = new EndRivalTurnModal(this.stage);
            this.playerGroup.setRivalCallback(
                (isShiftingMarket: boolean) => { this.endRivalTurnModal!.show(isShiftingMarket);},
            );
            // this.mapGroup.
        }

        switch (localPlayer.specialist.name) {
            case SpecialistName.advisor:
                this.initializeForAdvisor();
                break;
            case SpecialistName.chancellor:
                this.initializeForChancellor();
                break;
            case SpecialistName.peddler:
                this.initializeForPeddler(state);
                break;
            default:
                this.initializeForOther();
        }
    }

    private initializeForAdvisor() {
        this.sellGoodsModal = new SellGoodsModal(this.stage);
        this.donateGoodsModal = new DonateGoodsModal(this.stage);
        this.advisorModal = new AdvisorModal(
            this.stage,
            (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        );

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal?.show(slot); },
            advisorCallback: () => { this.advisorModal!.show(); },
            // donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }

    private initializeForChancellor() {
        this.chancellorModal = new ChancellorModal(this.stage);
        this.donateGoodsModal = new DonateGoodsModal(this.stage);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.chancellorModal!.show(slot); },
            donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }

    private initializeForPeddler(state: PlayState) {
        const { marketFluctuations } = state.setup;
        this.peddlerModal = new PeddlerModal(
            this.stage,
            { ...marketFluctuations },
        );
        this.sellGoodsModal = new SellGoodsModal(this.stage);
        this.donateGoodsModal = new DonateGoodsModal(this.stage);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal!.show(slot); },
            peddlerCallback: () => { this.peddlerModal!.show(); },
            donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }

    private initializeForOther() {
        this.sellGoodsModal = new SellGoodsModal(this.stage);
        this.donateGoodsModal = new DonateGoodsModal(this.stage);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal!.show(slot); },
            donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }
};

