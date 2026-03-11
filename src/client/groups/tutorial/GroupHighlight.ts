import Konva from 'konva';
import { GroupLayoutData, LayerIds, Target } from '~/client_types';
import { Highlight } from './Highlight';
import { Coordinates } from '~/shared_types';

export abstract class GroupHighlight {
    protected group: Konva.Group;
    protected highlights: Map<Target, Highlight>;

    constructor(
        stage: Konva.Stage,
        layout: GroupLayoutData,
        highlights: Map<Target,Highlight>,
    ){
        this.group = new Konva.Group({ ...layout });
        stage.getLayers()[LayerIds.highlights].add(this.group);
        this.highlights = highlights;

        const nodes: Konva.Shape[] = [];
        this.highlights.forEach(highlight => {
            nodes.push(highlight.getElement());
        });

        this.group.add(...nodes);
    }

    public setPlacement(coordinates: Coordinates): void {
        this.group.x(coordinates.x).y(coordinates.y);
    }

    public update(targets: Array<Target>): void {
        this.highlights.forEach((highlight, key) => {
            if (targets.includes(key)) {
                highlight.isVisible() == false && highlight.show();
            } else {
                highlight.hide();
            }
        });
    }
}