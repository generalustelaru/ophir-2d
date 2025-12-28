import Konva from 'konva';
import { ElementList, GroupLayoutData } from '~/client/client_types';

type RowElement = {
    id: string,
    node: Konva.Group,
}

export class RowDistributor {
    private group: Konva.Group;
    private elements: Array<RowElement> | null;
    constructor(
        layout: GroupLayoutData,
        elements?: Array<RowElement>,
    ) {
        this.group = new Konva.Group({ ...layout });
        this.elements = elements || null;

        this.elements && this.setNodes(this.elements);
    }

    public getChildNode(id: string) {
        if (!this.elements)
            throw new Error('Row elements are not initialized!');

        const element = this.elements.find(e => e.id == id);

        if (!element)
            throw new Error('Sought node is not present!');

        return element.node;
    }

    public getElement() {
        return this.group;
    }

    public setNodes(elements: Array<RowElement>) {
        this.group.destroyChildren();
        this.elements = elements;

        if (!elements.length)
            return;

        const sampleNode = elements[0].node;
        const vPadding = (this.group.height() - sampleNode.height()) / 2;
        const nodeWidth = sampleNode.width();
        const freeWidth = this.group.width() - (nodeWidth * elements.length);
        const interSpace = freeWidth / (elements.length + 1);

        const nodes: ElementList = [];
        let drift = interSpace;
        for (const element of elements) {
            const node = element.node;
            node.y(vPadding);
            node.x(drift);
            nodes.push(node);
            drift += interSpace + nodeWidth;
        }

        this.group.add(...nodes);
    }
}