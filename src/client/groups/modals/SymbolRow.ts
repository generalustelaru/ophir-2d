import Konva from 'konva';
import { Coordinates, Unique } from '~/shared_types';
import { DynamicGroupInterface, Specification, GroupLayoutData } from '~/client_types';
import { SpecificationToken } from './SpecificationToken';

type Update = { specifications: Array<Specification> }

const segmentWidth = 30;

export class SymbolRow implements Unique<DynamicGroupInterface<Update>> {

    private group: Konva.Group;
    private tokens: Array<SpecificationToken>;
    private referenceX: number;
    private omitSymbol: 'favor' | 'none';

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        switchCallback: ((index: number) => void) | null,
        switchToFavor: boolean,
    ) {
        this.omitSymbol = switchToFavor ? 'favor' : 'none';
        this.group = new Konva.Group({ ...layout });
        this.referenceX = layout.x;

        const vOffset = 4;
        const tokenPositions: Array<Coordinates> = [
            { x: segmentWidth, y: vOffset },
            { x: segmentWidth * 2, y: vOffset },
            { x: segmentWidth * 3, y: vOffset },
            { x: segmentWidth * 4, y: vOffset },
        ];

        this.tokens = tokenPositions.map((position, index) => {
            return new SpecificationToken(
                stage,
                { ...position },
                switchCallback ? () => switchCallback(index) : null,
                switchToFavor,
            );
        });

        this.group.add(...this.tokens.map(
            token => token.getElement(),
        ));
    }

    public getElement() {
        return this.group;
    }

    public update(update: Update) {
        const { specifications } = update;

        this.tokens.forEach((token, index) => {
            if (specifications[index]) {
                const { isOmited, name, isLocked } = specifications[index];
                token.update({
                    type: isOmited ? this.omitSymbol : name,
                    isClickable: !isLocked,
                });
            } else {
                token.update({ type: 'none',isClickable: false });
            }
        });

        this.group.x(this.referenceX + (3 - specifications.length) * segmentWidth);
    }
}