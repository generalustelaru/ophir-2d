import Konva from 'konva';
import { Aspect, Instruction, LayerIds, Target } from '~/client_types';
import clientConstants from '../../client_constants';
import { NavigationButton } from './NavigationButton';

const { HUES, PLAYER_PLACEMENT } = clientConstants;
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
        aspect: Aspect,
        highlightsCallback: (highlights: Array<Target>) => void,
    ) {
        this.sendHighlights = highlightsCallback;

        const dimensions = {
            width: 300,
            height: 250,
        };

        const { x, y } = PLAYER_PLACEMENT[aspect];

        this.group = new Konva.Group({
            x: x,
            y: y + 235,
        });

        const background = new Konva.Rect({
            ...dimensions,
            fill: HUES.stampEdge,
            cornerRadius: 10,
            stroke: HUES.boneWhite,
            strokeWidth: 2,
        });

        this.content = new Konva.Text({
            width: dimensions.width - 15,
            height: dimensions.height - 15,
            fill: 'white',
            fontSize: 18,
            verticalAlign: 'top',
            lineHeight: 1.3,
            x: 10,
            y: 10,
            fontFamily: 'Custom',
        });

        this.backButton = new NavigationButton(
            stage,
            () => { this.flip(-1); },
            { x: 10, y: 195 },
            'Back',
        );
        this.nextButton = new NavigationButton(
            stage,
            () => { this.flip(1); },
            { x: 70, y: 195 },
            'Next',
        );

        this.group.add(background, this.content, this.backButton.getElement(), this.nextButton.getElement());

        stage.getLayers()[LayerIds.board].add(this.group);
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

    public repositionPanel(aspect: Aspect) {
        const { x, y } = PLAYER_PLACEMENT[aspect];
        this.group.x( x).y(y + 235);
    }
}