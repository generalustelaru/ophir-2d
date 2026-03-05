import Konva from 'konva';
import { Instruction, LayerIds, RawEvents, Target } from '~/client_types';
import clientConstants from '../../client_constants';
import { NavigationButton } from './NavigationButton';

const { HUES } = clientConstants;
// TODO: handle screen rearrangement
export class InstructionPanel {
    private group: Konva.Group;
    private content: Konva.Text;
    private instructions: Array<Instruction> = [];
    private lastPage: number = 0;
    private currentPage: number = 0;
    private nextButton: NavigationButton;
    private backButton: NavigationButton;
    private sendHighlights: (highlights: Array<Target>) => void;

    constructor(
        stage: Konva.Stage,
        highlightsCallback: (highlights: Array<Target>) => void,
    ) {
        this.sendHighlights = highlightsCallback;

        const dimensions = {
            width: 300,
            height: 250,
        };

        this.group = new Konva.Group({
            draggable: true,
        });

        this.group.on(RawEvents.HOVER, () => {
            stage.container().style.cursor = 'grab';
        });
        this.group.on(RawEvents.LEAVE, () => {
            stage.container().style.cursor = 'default';
        });

        const background = new Konva.Rect({
            ...dimensions,
            fill: HUES.stampEdge,
            cornerRadius: 10,
            stroke: HUES.boneWhite,
            strokeWidth: 4,
        });

        this.content = new Konva.Text({
            width: dimensions.width - 15,
            height: dimensions.height - 15,
            fill: 'white',
            fontSize: 18,
            verticalAlign: 'top',
            x: 10,
            y: 10,
            fontFamily: 'Custom',
        });

        this.backButton = new NavigationButton(
            stage,
            () => { this.flip(-1); },
            { x: 10, y: 200 },
            'Back',
        );
        this.nextButton = new NavigationButton(
            stage,
            () => { this.flip(1); },
            { x: 70, y: 200 },
            'Next',
        );

        this.group.add(background, this.content, this.backButton.getElement(), this.nextButton.getElement());

        stage.getLayers()[LayerIds.overlay].add(this.group);
    }

    public updateContent(instructions: Array<Instruction>) {
        this.instructions = instructions;
        this.currentPage = 0;
        this.lastPage = instructions.length - 1;
        this.backButton.disable();
        this.lastPage == 0 ? this.nextButton.disable() : this.nextButton.enable();
        this.content.text(this.instructions[this.currentPage].text);
    }

    public flip(direction: -1 | 1) {
        if (direction == -1 && this.currentPage > 0) {
            this.currentPage -= 1;
        } else if (this.currentPage < this.lastPage) {
            this.currentPage += 1;
        }

        switch (this.currentPage) {
            case 0:
                this.backButton.disable();
                this.nextButton.enable();
                break;
            case this.lastPage:
                this.backButton.enable();
                this.nextButton.disable();
                break;
            default:
                this.backButton.enable();
                this.nextButton.enable();
                break;
        }

        const instruction = this.instructions[this.currentPage];
        this.content.text(instruction.text);
        this.sendHighlights(instruction.highlights);
    }
}