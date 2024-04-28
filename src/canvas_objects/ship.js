import constants from '../constants.json';

const { COLOR } = constants;

export class Ship {
    constructor(stageWidth, offsetX, offsetY, fill, id, isPlayerShip = false) {

        let strokeColor = 'black';

        if (isPlayerShip) {
            strokeColor = fill == COLOR.playerWhite ? 'gold' : 'white';
        }

        return new Konva.Rect({
            x: stageWidth / 2,
            y: stageWidth / 2,
            offsetX,
            offsetY,
            fill,
            stroke: strokeColor,
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
            id,
            draggable: isPlayerShip,
        });
    }
}