import Konva from 'konva';
import { ClientMessage, Coordinates } from '~/shared_types';
import { ActionButton } from '../popular';

export class AcceptButton extends ActionButton {

    private buttonBackground: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        actionMessage: ClientMessage | null,
        label: string,
        dismissCallback: Function,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 50,
            height: 30,
        };

        super(stage, layout, actionMessage);

        this.buttonBackground = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: actionMessage ? 'green' : 'brown',
        });

        this.setEnabled(!!actionMessage);

        const buttonLabel = new Konva.Text({
            width: layout.width,
            height: layout.height,
            fontSize: 14,
            fontStyle: 'bold',
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            text: label,
            fontFamily: 'Custom',
        });

        this.group.add(this.buttonBackground, buttonLabel);

        this.group.on('click', () => {
            if (this.isActive)
                dismissCallback();
        });
    }

    setAcceptable(isAcceptable: boolean) {
        this.buttonBackground.fill(isAcceptable ? 'green' : 'brown');
        this.setEnabled(isAcceptable);
    }

    public getElement() {
        return this.group;
    }
}
