
export class MapHex {
    constructor(width, name, x, y, fill) {

        return new Konva.RegularPolygon({
            x: width / 2,
            y: width / 2,
            offsetX: x,
            offsetY: y,
            sides: 6,
            radius: 100,
            fill: fill,
            stroke: 'black',
            strokeWidth: 1,
            id: name,
        });
    }
}

export class Ship {
    constructor(stageWidth, offsetX, offsetY, fill, id, isPlayerShip = false) {

        return new Konva.Rect({
            x: stageWidth / 2,
            y: stageWidth / 2,
            offsetX,
            offsetY,
            fill,
            stroke: isPlayerShip ? 'gold' : 'black',
            strokeWidth: 3,
            width: 40,
            height: 30,
            cornerRadius: [0, 0, 5, 30],
            id,
            draggable: isPlayerShip,
        });
    }
}