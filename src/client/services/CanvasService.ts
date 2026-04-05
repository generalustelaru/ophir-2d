import Konva from 'konva';
import {
    GameSetupPayload, MarketSlotKey, Phase, PlayState, SpecialistName, Action, InfluenceRollBroadcast,
    NewRivalInfluenceBroadcast, State,
} from '~/shared_types';
import { Communicator } from './Communicator';
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import {
    Aspect, EventKey, Dimensions, DropBeforeLoadMessage, EventType, Instruction, InternalEvent, SailAttemptArgs, Target,
} from '~/client_types';
import { EnrolmentGroup } from '../mega_groups/EnrolmentGroup';
import {
    TradeModal, StartTurnModal, DonateCommoditiesModal,EndTurnModal, SailAttemptModal, RivalControlModal, ForceTurnModal,
    EndRivalTurnModal, AdvisorModal, ChancellorModal, PeddlerModal, DropBeforeLoadModal, SailResultModal,
} from '../groups/modals/';
import clientConstants from '../client_constants';
import { InstructionPanel } from '../groups/tutorial/InstructionPanel';
import { LocationHighlightGroup, MapHighlightsGroup, PlayerHighlightsGroup } from '../groups/tutorial';

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
    private sailResultModal: SailResultModal | null = null;
    private forceTurnModal: ForceTurnModal;
    private dropBeforeLoadModal: DropBeforeLoadModal;
    private tradeModal: TradeModal | null = null;
    private donateCommoditiesModal: DonateCommoditiesModal | null = null;
    private rivalControlModal: RivalControlModal | null = null;
    private endRivalTurnModal: EndRivalTurnModal | null = null;
    private advisorModal: AdvisorModal | null = null;
    private chancellorModal: ChancellorModal | null = null;
    private peddlerModal: PeddlerModal | null = null;
    private tutorialPanel: InstructionPanel | null = null;
    private mapHighlights: MapHighlightsGroup | null = null;
    private playerHighlights: PlayerHighlightsGroup | null = null;
    private locationHighlights: LocationHighlightGroup | null = null;
    private aspect: Aspect;
    private scale: number;
    private delayedResizing: number | null = null;

    constructor(isTutorial: boolean) {
        super();

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
            new Konva.Layer(), //  board
            new Konva.Layer(), //  ships
            new Konva.Layer(), //  highlights
            new Konva.Layer(), //  modals
        ]);

        // Common modals
        this.endTurnModal = new EndTurnModal(this.stage, this.aspect);
        this.sailAttemptModal = new SailAttemptModal(this.stage, this.aspect);
        this.startTurnModal = new StartTurnModal(this.stage, this.aspect);
        this.forceTurnModal = new ForceTurnModal(this.stage, this.aspect);
        this.dropBeforeLoadModal = new DropBeforeLoadModal(this.stage, this.aspect);

        this.locationGroup = new LocationGroup(
            this.stage,
            {
                ...clientConstants.GROUP_DIMENSIONS.location,
                ...clientConstants.LOCATION_PLACEMENT[this.aspect],
            },
            (data: DropBeforeLoadMessage) => this.dropBeforeLoad(data),
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
            (data: SailAttemptArgs) => this.sailAttemptModal.show(data),
            (data: DropBeforeLoadMessage) => this.dropBeforeLoad(data),
            (locationName) => this.locationGroup.flash(locationName),
        ); // mapGroup covers half the canvas (2 segments)

        if (isTutorial) {
            this.mapHighlights = new MapHighlightsGroup(
                this.stage,
                {
                    ...clientConstants.GROUP_DIMENSIONS.map,
                    ...clientConstants.MAP_PLACEMENT[this.aspect],
                },
            );

            this.playerHighlights = new PlayerHighlightsGroup(
                this.stage,
                {
                    ...clientConstants.GROUP_DIMENSIONS.player,
                    ...clientConstants.PLAYER_PLACEMENT[this.aspect],
                },
            );

            this.locationHighlights = new LocationHighlightGroup(
                this.stage,
                {
                    ...clientConstants.GROUP_DIMENSIONS.location,
                    ...clientConstants.LOCATION_PLACEMENT[this.aspect],
                },
            );
        }

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

    public notifyForTurn(): void {
        this.startTurnModal?.show();
    }

    public notifyRollSuspense(data: InfluenceRollBroadcast): void {
        if (data.color == localState.playerColor) {
            this.sailResultModal?.show(data);
        } else {
            this.playerGroup.simulateRollForPlayer(data);
        }
    }

    public notifyForRivalRoll(data: NewRivalInfluenceBroadcast) {
        this.playerGroup.simulateRollForRival(data);
    }

    public notifyForForceTurn(): void {
        this.forceTurnModal?.show();
    }

    public notifyForRivalControl(): void {
        this.rivalControlModal?.show();
    }

    // MARK: UPDATE
    public drawUpdateElements(state: State) {
        const { sessionPhase } = state;

        if (!localState.playerColor) {
            const event: InternalEvent = {
                type: EventType.internal,
                detail: {
                    key: EventKey.info,
                    message: sessionPhase == Phase.enrolment ? 'Registrations open!' : 'You are a spectator.',
                },
            };
            this.createEvent(event);
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

            default:
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
                this.dropBeforeLoadModal.update(state);
                this.tradeModal?.update(state);
                this.donateCommoditiesModal?.update(state);
                this.endTurnModal?.update(state);
                this.advisorModal?.update(state);
                this.chancellorModal?.update(state);
                this.peddlerModal?.update(state);

                if (sessionPhase == Phase.conclusion) {
                    this.disable();
                    this.locationGroup.switchToResults(state);
                    this.playerGroup.switchToResults(state);
                } else {
                    this.locationGroup.update(state);
                }
        }
    }

    public updateInstructions(instructions: Array<Instruction>) {

        if (!this.tutorialPanel) {
            this.tutorialPanel = new InstructionPanel(
                this.stage,
                this.aspect,
                (h) => { this.updateHighlights(h); },
            );
        }

        this.tutorialPanel.updateContent(instructions);
        this.updateHighlights(instructions[0].highlights);
    }

    private updateHighlights(targets: Array<Target>) {
        this.mapHighlights?.update(targets);
        this.locationHighlights?.update(targets);
        this.playerHighlights?.update(targets);
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
        this.sailResultModal?.repositionModal(this.aspect);
        this.forceTurnModal.repositionModal(this.aspect);
        this.dropBeforeLoadModal.repositionModal(this.aspect);

        this.tradeModal?.repositionModal(this.aspect);
        this.donateCommoditiesModal?.repositionModal(this.aspect);
        this.rivalControlModal?.repositionModal(this.aspect);
        this.endRivalTurnModal?.repositionModal(this.aspect);
        this.advisorModal?.repositionModal(this.aspect);
        this.chancellorModal?.repositionModal(this.aspect);
        this.peddlerModal?.repositionModal(this.aspect);

        this.tutorialPanel?.repositionPanel(this.aspect);
        this.mapHighlights?.setPlacement(clientConstants.MAP_PLACEMENT[this.aspect]);
        this.playerHighlights?.setPlacement(clientConstants.PLAYER_PLACEMENT[this.aspect]);
        this.locationHighlights?.setPlacement(clientConstants.LOCATION_PLACEMENT[this.aspect]);
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
        //TODO: return coordinate diff from modal base upon dragging and udate all modals with the offset
        //TODO: move all modal initializations here and absolve their updates from constantly getting local player

        if (state.rival.isIncluded) {
            this.rivalControlModal = new RivalControlModal(this.stage, this.aspect);
            this.endRivalTurnModal = new EndRivalTurnModal(this.stage, this.aspect);
            this.playerGroup.setRivalCallback(
                (isShiftingMarket: boolean) => { this.endRivalTurnModal!.show(isShiftingMarket);},
            );
        }

        this.sailResultModal = new SailResultModal(this.stage, this.aspect, localPlayer);

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
        this.tradeModal = new TradeModal(this.stage, this.aspect);
        this.donateCommoditiesModal = new DonateCommoditiesModal(this.stage, this.aspect);
        this.advisorModal = new AdvisorModal(
            this.stage,
            (slot: MarketSlotKey) => { this.donateCommoditiesModal!.show(slot); },
            this.aspect,
        );

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.tradeModal?.show(slot); },
            advisorCallback: () => { this.advisorModal!.show(); },
        });
    }

    private initializeForChancellor() {
        this.chancellorModal = new ChancellorModal(this.stage, this.aspect);
        this.donateCommoditiesModal = new DonateCommoditiesModal(this.stage, this.aspect);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.chancellorModal!.show(slot); },
            donateCommoditiesCallback: (slot: MarketSlotKey) => { this.donateCommoditiesModal!.show(slot); },
        });
    }

    private initializeForPeddler(state: PlayState) {
        const { marketFluctuations } = state.setup;
        this.peddlerModal = new PeddlerModal(
            this.stage,
            { ...marketFluctuations },
            this.aspect,
        );
        this.tradeModal = new TradeModal(this.stage, this.aspect);
        this.donateCommoditiesModal = new DonateCommoditiesModal(this.stage, this.aspect);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.tradeModal!.show(slot); },
            peddlerCallback: () => { this.peddlerModal!.show(); },
            donateCommoditiesCallback: (slot: MarketSlotKey) => { this.donateCommoditiesModal!.show(slot); },
        });
    }

    private initializeForOther() {
        this.tradeModal = new TradeModal(this.stage, this.aspect);
        this.donateCommoditiesModal = new DonateCommoditiesModal(this.stage, this.aspect);

        this.locationGroup.setCallbacks({
            tradeCallback: (slot: MarketSlotKey) => { this.tradeModal!.show(slot); },
            donateCommoditiesCallback: (slot: MarketSlotKey) => { this.donateCommoditiesModal!.show(slot); },
        });
    }

    private dropBeforeLoad(message: DropBeforeLoadMessage) {
        const detachedMessage = structuredClone(message);

        if (this.dropBeforeLoadModal.hasCargoRoom(detachedMessage.action == Action.buy_metal ? 2 : 1)) {
            this.createEvent({
                type: EventType.client,
                detail: { key: EventKey.client_message, message: detachedMessage },
            });
        } else {
            this.dropBeforeLoadModal.show(detachedMessage);
        }
    }
};
