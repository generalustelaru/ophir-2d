import Konva from 'konva';
import { DynamicGroupInterface, GroupLayoutData, Unique } from '~/client_types';
import { Player } from '~/shared_types';
import clientConstants from '~/client_constants';

const { COLOR } = clientConstants;

export class SpecialistCard implements Unique<DynamicGroupInterface<string>> {
    private group: Konva.Group;
    private isLocalPlayer: boolean;
    private name: Konva.Text;

    constructor(
        layout: GroupLayoutData,
        player: Player,
        isLocalPlayer: boolean,
    ) {
        this.isLocalPlayer = isLocalPlayer;
        this.group = new Konva.Group({
            width: layout.width,
            height: layout.height,
            visible: false,
        });

        const background = new Konva.Rect({
            width: this.group.width(),
            height: this.group.height(),
            fill: COLOR[`dark${player.color}`],
            cornerRadius: 5,
        });

        const { specialist } = player;
        this.name = new Konva.Text({
            x: 0,
            y: 14,
            width: this.group.width() / 2,
            height: this.group.height(),
            text: isLocalPlayer ? 'You' : player.name,
            fontSize: 14,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'top',
            fontFamily: 'Custom',
            fill: 'white',
        });

        const description = new Konva.Text({
            x: 0,
            y: 20,
            width: this.group.width() - 5,
            height: this.group.height(),
            text: specialist.description,
            fontSize: 14,
            lineHeight: 1.3,
            fontStyle: 'bold',
            ellipsis: true,
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Custom',
            fill: 'white',
        });

        this.group.add(background, this.name, description);
    }

    public getElement(): Konva.Group {
        return this.group;
    }

    public toggle(): void {
        this.group.visible() ? this.group.hide(): this.group.show();
    }

    public update(playerName: string): void {
        this.name.text(this.isLocalPlayer ? 'You' : playerName);

    }
}