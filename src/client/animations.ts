import Konva from 'konva';

export function defineBobbing(node: Konva.Node, constraints: { pixelAmplitude: number, periodSeconds: number }) {
    const { pixelAmplitude, periodSeconds } = constraints;
    const period = periodSeconds * 1000;
    const staticY = node.y();

    return new Konva.Animation((frame) => {
        frame && node.y(pixelAmplitude * Math.sin((frame.time * 2 * Math.PI) / period) + staticY);
    }, null);
}