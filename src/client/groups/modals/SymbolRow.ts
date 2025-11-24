import Konva from 'konva';
import { Coordinates, SpecialistName, Unique } from '~/shared_types';
import { DynamicGroupInterface, Specification, GroupLayoutData } from '~/client_types';
import { SpecificationToken } from './SpecificationToken';

type Update = {
    specifications: Array<Specification>,
    specialist: SpecialistName.peddler | SpecialistName.chancellor | null,
}

const segmentWidth = 30;

export class SymbolRow implements Unique<DynamicGroupInterface<Update>> {

    private group: Konva.Group;
    private tokens: Array<SpecificationToken>;
    private referenceX: number;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        switchCallback: ((index: number) => void) | null,
    ) {
        this.group = new Konva.Group({ ...layout });
        this.referenceX = layout.x;

        const vOffset = 4;
        const tokenPositions: Array<Coordinates> = [
            { x: segmentWidth, y: vOffset },
            { x: segmentWidth * 2, y: vOffset },
            { x: segmentWidth * 3, y: vOffset },
        ];

        this.tokens = tokenPositions.map((position, index) => {
            return new SpecificationToken(
                stage,
                { ...position },
                switchCallback ? () => switchCallback(index) : null,
            );
        });

        for (const token of this.tokens) {
            this.group.add(token.getElement());
        }
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {
        const { specifications, specialist } = data;
        const omitSymbol = specialist == SpecialistName.chancellor ? 'favor' : 'none';

        this.tokens.forEach((token, index) => {
            const entry = specifications[index];

            if(!entry)
                return token.update(null);

            token.update({
                type: entry.isOmited ? omitSymbol : entry.name,
                isClickable: !entry.isLocked,
            });
        });

        this.group.x(this.referenceX + (3 - specifications.length) * segmentWidth);
    }
}