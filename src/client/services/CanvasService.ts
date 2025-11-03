import Konva from 'konva';
import { GameSetupPayload, MarketSlotKey, Phase, State } from '~/shared_types';
import { Communicator } from './Communicator';
import { LocationGroup } from '../mega_groups/LocationGroup';
import { MapGroup } from '../mega_groups/MapGroup';
import { PlayerGroup } from '../mega_groups/PlayerGroup';
import { SetupGroup } from '../mega_groups/SetupGroup';
import localState from '../state';
import { EventType, SailAttemptArgs } from '~/client_types';
import { EnrolmentGroup } from '../mega_groups/EnrolmentGroup';
import { SellGoodsModal } from '../groups/modals/SellGodsModal';
import { StartTurnModal } from '../groups/modals/StartTurnModal';
import { DonateGoodsModal } from '../groups/modals/DonateGoodsModal';
import { EndTurnModal } from '../groups/modals/EndTurnModal';
import { SailAttemptModal } from '../groups/modals/SailAttemptModal';
import { RivalControlModal } from '../groups/modals/RivalControlModal';
import { ForceTurnModal } from '../groups/modals/ForceTurnModal';
import { EndRivalTurnModal } from '../groups/modals/EndRivalTurnModal';

export const CanvasService = new class extends Communicator {
    private stage: Konva.Stage;
    private locationGroup!: LocationGroup;
    private mapGroup!: MapGroup;
    private playerGroup!: PlayerGroup;
    private setupGroup!: SetupGroup;
    private enrolmentGroup!: EnrolmentGroup;
    private isEnrolmentDrawn: boolean = false;
    private isSetupDrawn: boolean = false;
    private isPlayDrawn: boolean = false;
    private startTurnModal!: StartTurnModal;
    private endTurnModal!: EndTurnModal;
    private forceTurnModal!: ForceTurnModal;
    private sellGoodsModal!: SellGoodsModal;
    private donateGoodsModal!: DonateGoodsModal;
    private sailAttemptModal!: SailAttemptModal;
    private rivalControlModal!: RivalControlModal;
    private endRivalTurnModal!: EndRivalTurnModal;

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
            new Konva.Layer(), // [1] for modals
            new Konva.Layer(), // [2] for popups, tooltips.
        ]);

        const segmentWidth = this.stage.width() / 4;

        document.fonts.ready.then(() => {
            this.donateGoodsModal = new DonateGoodsModal(this.stage);
            this.sellGoodsModal = new SellGoodsModal(this.stage);
            this.endTurnModal = new EndTurnModal(this.stage);
            this.startTurnModal = new StartTurnModal(this.stage);
            this.forceTurnModal = new ForceTurnModal(this.stage);
            this.sailAttemptModal = new SailAttemptModal(this.stage);
            this.rivalControlModal = new RivalControlModal(this.stage);
            this.endRivalTurnModal = new EndRivalTurnModal(this.stage);

            this.locationGroup = new LocationGroup(
                this.stage,
                {
                    height: this.stage.height(),
                    width: segmentWidth,
                    x: 0,
                    y: 0,
                },
                (slot: MarketSlotKey) => {this.sellGoodsModal.show(slot);},
                (slot: MarketSlotKey) => {this.donateGoodsModal.show(slot);},
            ); // locationGroup covers 1 segment, sitting on the left

            this.playerGroup = new PlayerGroup(
                this.stage,
                {
                    height: this.stage.height(),
                    width: segmentWidth,
                    x: segmentWidth * 3,
                    y: 0,
                },
                (isShiftingMarket: boolean) => {
                    this.endRivalTurnModal.show(isShiftingMarket);
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
                () => {this.endTurnModal.show();},
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
        }).catch(err => {
            console.error({ err });
            throw new Error('Could not initialize groups');
        });
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

    public drawUpdateElements(state: State, toDisable = false): void {

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
                    this.enrolmentGroup.drawElements();
                    this.fitStageIntoParentContainer();
                    this.isEnrolmentDrawn = true;
                }
                this.enrolmentGroup.update(state);
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
                this.sellGoodsModal?.update(state);
                this.donateGoodsModal?.update(state);
                this.endTurnModal?.update(state);
                this.rivalControlModal?.update(state);
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

        const container = document.getElementById('canvas')?.getBoundingClientRect();

        if (!container)
            throw new Error('Cannot find canvas container!');

        const elementWidth = container.width;

        const sceneWidth = 1200;
        const sceneHeight = 500;

        const scale = elementWidth / sceneWidth;

        this.stage.width(sceneWidth * scale);
        this.stage.height(sceneHeight * scale);
        this.stage.scale({ x: scale, y: scale });
    }
};

