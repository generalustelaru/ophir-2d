import Konva from 'konva';
import { DiceSix, Unique } from '~/shared_types';
import { Coordinates } from '~/shared_types';
import { Hue, DynamicGroupInterface } from '~/client_types';
import clientConstants from '~/client/client_constants';

const { ROLL_SUSPENSE_MS } = clientConstants;

type PipDataElement = { position: Coordinates, included: Array<DiceSix>, element: Konva.Circle | null }
type PipData = Array<PipDataElement>
type Update = { value: DiceSix }
export class InfluenceDial implements Unique<DynamicGroupInterface<Update>> {
    private group: Konva.Group;
    private body: Konva.Rect;
    private dotMatrix: PipData;

    constructor(
        position: Coordinates,
        hue: Hue,
    ) {
        this.group = new Konva.Group({
            width: 50,
            height: 50,
            x: position.x,
            y: position.y,
        });

        this.body = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: hue,
            cornerRadius: 10,
        });
        this.group.add(this.body);

        const pipData: PipData = [
            { position: { x: 10, y: 10 }, included: [2, 3, 4, 5, 6], element: null },
            { position: { x: 10, y: 25 }, included: [6], element: null },
            { position: { x: 10, y: 40 }, included: [4, 5, 6], element: null },
            { position: { x: 40, y: 10 }, included: [4, 5, 6], element: null },
            { position: { x: 40, y: 25 }, included: [6], element: null },
            { position: { x: 40, y: 40 }, included: [2, 3, 4, 5, 6], element: null },
            { position: { x: 25, y: 25 }, included: [1, 3, 5], element: null },
        ];

        pipData.forEach(pip => {
            const element = new Konva.Circle({
                x: pip.position.x,
                y: pip.position.y,
                radius: 6,
                fill: 'black',
            });
            pip.element = element;
            this.group.add(element);
        });

        this.dotMatrix = pipData;
        this.displayValue(1);
    }

    public update(data: Update): void {
        const { value } = data;

        this.displayValue(value);
    }

    public selfDestroy() {
        this.group.destroyChildren();
        this.group.visible(false);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    private displayValue(value: DiceSix) {

        for (let i = 0; i < 7; i++) {
            const dot = this.dotMatrix[i];

            if (dot.included.includes(value)) {
                dot.element?.show();
            } else {
                dot.element?.hide();
            }
        }
    }

    public async simulateRoll(result: DiceSix): Promise<void> {
        return new Promise(resolve => {
            let fauxRolled = Math.ceil(Math.random() * 6);

            const rollInterval = setInterval(() => {
                let roll = fauxRolled;

                while (roll == fauxRolled) roll = Math.ceil(Math.random() * 5);

                fauxRolled = roll;
                this.displayValue(roll as DiceSix);
            }, 150);

            setTimeout(() => {
                clearInterval(rollInterval);
                this.displayValue(result);
                resolve();
            }, ROLL_SUSPENSE_MS);
        });
    }
}