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

        this.elements && this.distributeNodes(this.elements);
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

    public distributeNodes(elements: Array<RowElement>) {
        this.group.destroyChildren();
        this.elements = elements;

        if (!elements.length)
            return;

        const nodes: ElementList = elements.map(e => e.node);

        const sampleNode = nodes[0];
        const nodeHeight = sampleNode.height();
        const nodeWidth = sampleNode.width();
        const itemsPerRow = Math.floor(this.group.width() / nodeWidth);
        const rowCount = Math.ceil(nodes.length / itemsPerRow);
        const freeHeight = this.group.height() - rowCount * nodeHeight;

        if (freeHeight < 0)
            return;

        const nodeRows: Array<ElementList> = (() => {
            const matrix: Array<ElementList> = [];

            for (let r = 0; r < rowCount; r++) {
                const row: ElementList = [];

                for (let i = 0; i < itemsPerRow; i++) {
                    const node = nodes.shift();
                    node && row.push(node);
                }

                matrix.push(row);
            }

            return matrix;
        })();

        const distributedNodes: ElementList = [];
        const vSpacing = freeHeight / (rowCount + 1);

        let vDrift = vSpacing;
        for (const row of nodeRows) {
            const freeWidth = this.group.width() - (nodeWidth * row.length);
            const hSpacing = freeWidth / (row.length + 1);

            let hDrift = hSpacing;
            for (const node of row) {
                node.y(vDrift);
                node.x(hDrift);
                distributedNodes.push(node);
                hDrift += hSpacing + nodeWidth;
            }

            vDrift += vSpacing + nodeHeight;
        }

        this.group.add(...distributedNodes);
    }
}