import Konva from 'konva';
import { Coordinates } from '~/shared_types';

export function defineBobbing(node: Konva.Node, constraints: { pixelAmplitude: number, periodSeconds: number }) {
    const { pixelAmplitude, periodSeconds } = constraints;
    const period = periodSeconds * 1000;
    const staticY = node.y();

    return new Konva.Animation((frame) => {
        frame && node.y(pixelAmplitude * Math.sin((frame.time * 2 * Math.PI) / period) + staticY);
    }, null);
}

export function slideToPosition(node: Konva.Node, towards: Coordinates) {
    const tween = new Konva.Tween({
        node,
        duration: .66,           // seconds
        x: towards.x,
        y: towards.y,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => { tween.destroy(); },
    });

    tween.play();
}