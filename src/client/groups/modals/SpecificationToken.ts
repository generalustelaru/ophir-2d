import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, TradeGood, Unique } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client/client_constants';
import { FavorFactory, TradeGoodFactory } from '.';

const { HUES } = clientConstants;

type Update = {
    type: TradeGood | 'favor' | 'none',
    isClickable: boolean;
} | null

export class SpecificationToken extends Button implements Unique<DynamicGroupInterface<Update>> {

    private favorFactory: FavorFactory;
    private tradeGoodFactory: TradeGoodFactory;
    private symbolGroup: Konva.Group;
    private activeBackground: Konva.Rect;
    private currentSymbol: TradeGood | 'favor' | 'none' = 'none';

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        callback: ((index: number) => void) | null,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 0,
            height: 0,
        };

        super(stage, layout, callback);
        this.activeBackground = new Konva.Rect({
            width: 30,
            height: 30,
            stroke: HUES.boneWhite,
            strokeWidth: 1,
            x: -3,
            y: -3,
            cornerRadius: 5,
            fill: HUES.modalLightBlue,
            visible: false,
        });

        this.favorFactory = new FavorFactory({ x: -1, y: -1 });
        this.tradeGoodFactory = new TradeGoodFactory();
        this.symbolGroup = new Konva.Group();

        this.group.add(this.activeBackground, this.symbolGroup);
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {
    // TODO: move logic into constructor and alternate hiding and showing the elements instead of destroying and recreating.
        if (data == null) {
            this.symbolGroup.destroyChildren();
            this.activeBackground.visible(false);
            this.disable();
            return;
        }

        const { type, isClickable } = data;

        if (type == this.currentSymbol)
            return;

        this.currentSymbol = type;
        this.symbolGroup.destroyChildren();

        switch(type) {
            case 'none':
                break;
            case 'favor':
                this.symbolGroup.add(
                    this.favorFactory.produceElement(),
                );
                break;
            default:
                this.symbolGroup.add(
                    this.tradeGoodFactory.produceElement(type),
                );
        }

        if (isClickable) {
            this.enable();
            this.activeBackground.visible(true);
        } else {
            this.disable();
            this.activeBackground.visible(false);
        }
    }
}
