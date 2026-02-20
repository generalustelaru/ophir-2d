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
}

export class SpecificationToken extends Button implements Unique<DynamicGroupInterface<Update>> {
    private tokens: Map<TradeGood|'favor', Konva.Group> = new Map();
    private activeBackground: Konva.Rect;

    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        callback: ((index: number) => void) | null,
        switchToFavor: boolean,
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

        const tradeGoodFactory = new TradeGoodFactory();
        const symbols: Array<TradeGood> = ['linen', 'ebony', 'gems', 'marble'];

        for (const symbol of symbols) {
            this.tokens.set(
                symbol,
                tradeGoodFactory.produceElement(symbol),
            );
        }

        if (switchToFavor) {
            const favorFactory = new FavorFactory({ x: -1, y: -1 });
            this.tokens.set('favor', favorFactory.produceElement());
        }

        const tokenGroup = new Konva.Group().add(...(()=> {
            const nodes: Array<Konva.Group> = [];
            this.tokens.forEach(token => {
                nodes.push(token);
            });
            return nodes;
        })());

        this.group.add(this.activeBackground, tokenGroup);
    }

    public getElement() {
        return this.group;
    }

    public update(data: Update) {
        this.tokens.forEach(token => token.hide());
        this.activeBackground.visible(false);
        this.disable();

        const { type, isClickable } = data;

        type != 'none' && this.tokens.get(type)?.show();

        if (isClickable) {
            this.enable();
            this.activeBackground.visible(true);
        } else {
            this.disable();
            this.activeBackground.visible(false);
        }
    }
}
