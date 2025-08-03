import Konva from "konva";
import { DynamicGroupInterface } from "~/client_types";
import { InterfaceButton } from "../InterfaceButton";
import { ShipToken } from "../ShipToken";
import clientConstants from "~/client_constants";
import { Coordinates, PlayerColor, PlayerEntry } from "~/shared_types";

const { COLOR } = clientConstants;

type ColorCardUpdate = {
    player: PlayerEntry | null
}
export class ColorCard extends InterfaceButton implements DynamicGroupInterface<ColorCardUpdate> {

    private background: Konva.Rect;
    private shipToken: ShipToken;
    constructor(
        stage: Konva.Stage,
        position: Coordinates,
        color: PlayerColor,
        _state: ColorCardUpdate,
    ) {
        const layout = {
            x: position.x,
            y: position.y,
            width: 200,
            height: 300,
        }

        super(stage, layout, ()=>{});

        this.background = new Konva.Rect({
            width: layout.width,
            height: layout.height,
            fill: COLOR.templeDarkBlue,
            cornerRadius: 15,
        });

        this.shipToken = new ShipToken(COLOR[color], { scale: 4, position: { x: 40, y: 50 }});
        this.group.add(this.background, this.shipToken.getElement());
    }

    getElement(): Konva.Group {
        return this.group;
    }
    update(state: ColorCardUpdate): void {
        console.log(state)
    }
}