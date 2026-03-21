import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, Unique } from '~/shared_types';
import { rotate } from '~/client/animations';
import { Button } from '.';
import Konva from 'konva';
import constants from '~/client_constants';

const { ICON_DATA, HUES } = constants;

type AnchorStatus =  { disabled: boolean, anchored: boolean }
export class AnchorButton extends Button implements Unique<DynamicGroupInterface<AnchorStatus>> {
    private anchor: Konva.Path;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        clickCallback: Function | null,
    ) {
        const layout = { width: 50, height: 50, x: position.x, y: position.y };

        super(
            stage,
            layout,
            clickCallback,
        );

        const hoverZone = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            hidden: true,
        });

        this.anchor = new Konva.Path({
            data: ICON_DATA.anchor.shape,
            fill: HUES.disabled,
            scale: { x: 1.5, y: 1.5 },
        });

        // Get the bounding box of the path
        const rect = this.anchor.getSelfRect();
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        // Set offset to the center of the bounding box
        this.anchor.offsetX(centerX);
        this.anchor.offsetY(centerY);
        // Adjust x/y to compensate, so the shape doesn't visually jump
        this.anchor.x(this.anchor.x() + centerX);
        this.anchor.y(this.anchor.y() + centerY);

        this.group.add(hoverZone, this.anchor);
    }

    public update(update: AnchorStatus) {

        switch (true) {
            case update.disabled:
                this.anchor.fill(HUES.disabled);
                break;
            case update.anchored:
                this.anchor.fill(HUES.goGreen);
                break;
            default:
                this.anchor.fill(HUES.stopRed);
                break;
        }

        (update.anchored && false == update.disabled) ? this.enable() : this.disable();

        rotate(this.anchor, .50, update.anchored ? 0 : -45);
    }

    public getElement() {
        return this.group;
    }
}