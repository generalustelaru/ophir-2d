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

export async function slideToPosition(
    node: Konva.Node,
    towards: Coordinates,
    duration: number,
    effect?: string,
): Promise<true> {
    return new Promise(resolve => {
        const easing = (() => {
            switch (effect) {
                case 'EaseIn':
                    return Konva.Easings.EaseIn;
                case 'Linear':
                    return Konva.Easings.Linear;
                default:
                    return Konva.Easings.EaseInOut;
            }
        })();
        const tween = new Konva.Tween({
            node,
            duration,
            x: towards.x,
            y: towards.y,
            easing,
            onFinish: () => {
                tween.destroy();
                resolve(true);
            },
        });
        tween.play();

    });
}

export async function fade(node: Konva.Node, duration: number, opacity: number): Promise<void> {
    return new Promise(resolve => {
        const tween = new Konva.Tween({
            node,
            duration,
            opacity,
            easing: Konva.Easings.EaseOut,
            onFinish: () => {
                tween.destroy();
                resolve();
            },
        });
        tween.play();
    });
}

export async function rotate(node: Konva.Node, duration: number, deg: number): Promise<void> {
    return new Promise(resolve => {
        const tween = new Konva.Tween({
            node,
            duration,
            rotation: deg,
            easing: Konva.Easings.EaseOut,
            onFinish: () => {
                tween.destroy();
                resolve();
            },
        });
        tween.play();
    });
}
