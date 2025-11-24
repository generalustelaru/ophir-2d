import Konva from 'konva';
import { DynamicGroupInterface } from '~/client_types';
import { Coordinates, TradeGood, Unique } from '~/shared_types';
import { Button } from '../popular';
import clientConstants from '~/client/client_constants';
import { FavorFactory, TradeGoodFactory} from './';

const { COLOR } = clientConstants;

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
            stroke: COLOR.boneWhite,
            strokeWidth: 1,
            x: -3,
            y: -3,
            cornerRadius: 5,
            fill: COLOR.modalLightBlue,
            visible: false,
        });

        this.favorFactory = new FavorFactory({ x: -1, y: -1 });
        this.tradeGoodFactory = new TradeGoodFactory();
        this.symbolGroup = new Konva.Group();

        this.group.add(this.activeBackground, this.symbolGroup);
        console.log('I\'m here!');
    }

    public getElement() {
        return this.group;
    }


    public update(data: Update) {

        if (data == null) {
            this.symbolGroup.destroyChildren();
            this.activeBackground.visible(false);
            this.disable();
            return;
        }

        const { type, isClickable } = data;
        console.log('updating', { data });

        if (type == this.currentSymbol)
            return;

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

    // public selfDestruct(): null {
    //     this.group.destroy();
    //     return null;
    // }
}
