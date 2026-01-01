import Konva from 'konva';
import { GameSetupPayload, MarketSlotKey, Phase, PlayState, SpecialistName, State } from '~/shared_types';
import { Communicator } from './Communicator';
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import { Aspect, Dimensions, EventType, SailAttemptArgs } from '~/client_types';
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
    private aspect: Aspect;
    private scale: number;
    private delayedResizing: number | null = null;

    constructor() {
        super();
        // TODO: Reduce group.add() calls.throughout subclasses

        const { width, height, scale, aspect } = this.calculateDimensions();
        this.scale = scale;
        this.aspect = aspect;

        const dimensions = clientConstants.STAGE_AREA[this.aspect];
        this.stage = new Konva.Stage({
            container: 'canvas',
            visible: false,
            opacity: 1,
            ...dimensions,
        });

        this.stage.width(width);
        this.stage.height(height);
        this.stage.scale({ x: scale, y: scale });

        this.stage.add(...[
            new Konva.Layer(), //  base
            new Konva.Layer(), //  map
            new Konva.Layer(), //  modal
            new Konva.Layer(), //  overlay.
        ]);

        // Common modals
        this.endTurnModal = new EndTurnModal(this.stage, this.aspect);
        this.sailAttemptModal = new SailAttemptModal(this.stage, this.aspect);
        this.startTurnModal = new StartTurnModal(this.stage, this.aspect);
        this.forceTurnModal = new ForceTurnModal(this.stage, this.aspect);

        this.locationGroup = new LocationGroup(
            this.stage,
            {
                ...clientConstants.GROUP_DIMENSIONS.location,
                ...clientConstants.LOCATION_PLACEMENT[this.aspect],
            },
        ); // locationGroup covers 1 segment

        this.playerGroup = new PlayerGroup(
            this.stage,
            {
                ...clientConstants.GROUP_DIMENSIONS.player,
                ...clientConstants.PLAYER_PLACEMENT[this.aspect],
            },
        ); // playerGroup covers 1 segment

        this.mapGroup = new MapGroup(
            this.stage,
            {
                ...clientConstants.GROUP_DIMENSIONS.map,
                ...clientConstants.MAP_PLACEMENT[this.aspect],
            },
            () => { this.endTurnModal.show(); },
        ); // mapGroup covers half the canvas (2 segments)

        this.setupGroup = new SetupGroup(
            this.stage,
            { ...clientConstants.STAGE_AREA[this.aspect] },
        );

        this.enrolmentGroup = new EnrolmentGroup(
            this.stage,
            { ...clientConstants.STAGE_AREA[this.aspect] },
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
    public drawUpdateElements(state: State, hasGameEnded = false) {
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
                this.mapGroup.update(state);
                this.playerGroup.update(state);
                this.playerGroup.updatePlayerVp(localState.playerColor, localState.vp);
                this.sellGoodsModal?.update(state);
                this.donateGoodsModal?.update(state);
                this.endTurnModal?.update(state);
                this.advisorModal?.update(state);
                this.chancellorModal?.update(state);
                this.peddlerModal?.update(state);

                if (hasGameEnded) {
                    this.disable();
                    this.locationGroup.switchToResults(state);
                    this.playerGroup.switchToResults(state);
                } else {
                    this.locationGroup.update(state);
                }
        }
    }

    public disable(): void {
        this.locationGroup.disable();
        this.mapGroup.disable();
        this.playerGroup.disable();
    }

    public handleResize() {

        if (this.delayedResizing != null) {
            clearTimeout(this.delayedResizing);
        }

        this.delayedResizing = window.setTimeout(() => {
            this.updateGroupLayouts();
            this.delayedResizing = null;
        }, 250);
    }

    private updateGroupLayouts() {
        const { width, height, scale, aspect } = this.calculateDimensions();

        if (scale == this.scale && aspect == this.aspect)
            return;

        this.scale = scale;
        this.aspect = aspect;
        this.stage.width(width);
        this.stage.height(height);
        this.stage.scale({ x: scale, y: scale });

        this.enrolmentGroup?.adjustDimensions(clientConstants.STAGE_AREA[this.aspect]);
        this.setupGroup?.adjustDimensions(clientConstants.STAGE_AREA[this.aspect]);

        this.locationGroup.setPlacement(clientConstants.LOCATION_PLACEMENT[this.aspect]);
        this.mapGroup.setPlacement(clientConstants.MAP_PLACEMENT[this.aspect]);
        this.playerGroup.setPlacement(clientConstants.PLAYER_PLACEMENT[this.aspect]);

        this.startTurnModal.repositionModal(this.aspect);
        this.endTurnModal.repositionModal(this.aspect);
        this.sailAttemptModal.repositionModal(this.aspect);
        this.forceTurnModal.repositionModal(this.aspect);

        this.sellGoodsModal?.repositionModal(this.aspect);
        this.donateGoodsModal?.repositionModal(this.aspect);
        this.rivalControlModal?.repositionModal(this.aspect);
        this.endRivalTurnModal?.repositionModal(this.aspect);
        this.advisorModal?.repositionModal(this.aspect);
        this.chancellorModal?.repositionModal(this.aspect);
        this.peddlerModal?.repositionModal(this.aspect);
    }

    private calculateDimensions() {
        const {
            width: conainerWidth,
            height: containerHeight,
        } = ((): Dimensions => {
            const container = document.getElementById('canvas')?.getBoundingClientRect();

            if (!container)
                throw new Error('Cannot find canvas container!');

            return container;
        })();

        if (containerHeight == 0 || conainerWidth == 0) {
            console.error({ elementHeight: containerHeight, elementWidth: conainerWidth });
            throw new Error('Container size is incompatible!');
        }

        const aspect = conainerWidth > containerHeight ? Aspect.wide : Aspect.tall;
        const { width: sceneWidth, height: sceneHeight } = clientConstants.STAGE_AREA[aspect];
        const widthScale = conainerWidth / sceneWidth;
        const heightScale = containerHeight / sceneHeight;
        const scale = Math.min(widthScale, heightScale);

        return {
            aspect,
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
            this.rivalControlModal = new RivalControlModal(this.stage, this.aspect);
            this.endRivalTurnModal = new EndRivalTurnModal(this.stage, this.aspect);
            this.playerGroup.setRivalCallback(
                (isShiftingMarket: boolean) => { this.endRivalTurnModal!.show(isShiftingMarket);},
            );
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
        this.sellGoodsModal = new SellGoodsModal(this.stage, this.aspect);
        this.donateGoodsModal = new DonateGoodsModal(this.stage, this.aspect);
        this.advisorModal = new AdvisorModal(
            this.stage,
            (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
            this.aspect,
        );

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal?.show(slot); },
            advisorCallback: () => { this.advisorModal!.show(); },
        });
    }

    private initializeForChancellor() {
        this.chancellorModal = new ChancellorModal(this.stage, this.aspect);
        this.donateGoodsModal = new DonateGoodsModal(this.stage, this.aspect);

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
            this.aspect,
        );
        this.sellGoodsModal = new SellGoodsModal(this.stage, this.aspect);
        this.donateGoodsModal = new DonateGoodsModal(this.stage, this.aspect);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal!.show(slot); },
            peddlerCallback: () => { this.peddlerModal!.show(); },
            donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }

    private initializeForOther() {
        this.sellGoodsModal = new SellGoodsModal(this.stage, this.aspect);
        this.donateGoodsModal = new DonateGoodsModal(this.stage, this.aspect);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.sellGoodsModal!.show(slot); },
            donateGoodsCallback: (slot: MarketSlotKey) => { this.donateGoodsModal!.show(slot); },
        });
    }
};

