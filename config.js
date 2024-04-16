export const color = {
    playerRed: '#ff0000',
    playerGreen: 'lightGreen',
    illegal: '#e60049',
    valid: '#50e991',
    default: '#b3d4ff',
    currentHex: '#0bb4ff',
}

export const initialHexData = [
    { name: 'center', x: 0, y: 0 },
    { name: 'topLeft', x: 86, y: 150 },
    { name: 'bottomRight', x: -86, y: -150 },
    { name: 'topRight', x: -86, y: 150 },
    { name: 'bottomLeft', x: 86, y: -150 },
    { name: 'left', x: 172, y: 0 },
    { name: 'right', x: -172, y: 0 },
];

// export default {color, initialHexData}