
import { ClientConstants } from "./client_types";

const clientConstants: ClientConstants = {
    CONNECTION: {
        wsAddress: "ws://localhost:8080"
    },
    COLOR: {
        barrierDefault: "#003C43",
        barrierNavigator: "#FFFDD7",
        localShipBorder: "#FFFFFF",
        shipBorder: "#000000",
        playerPurple: "#A55A9A",
        playerYellow: "#FFC94A",
        playerRed: "#FF204E",
        playerGreen: "#87A922",
        illegal: "#FFF7D4",
        valid: "#A3FFD6",
        default: "#3887BE",
        anchored: "#52D3D8"
    },
    HEX_OFFSET_DATA: [
        { id: "center", x: 0, y: 0 },
        { id: "topLeft", x: 86, y: 150 },
        { id: "bottomRight", x: -86, y: -150 },
        { id: "topRight", x: -86, y: 150 },
        { id: "bottomLeft", x: 86, y: -150 },
        { id: "left", x: 172, y: 0 },
        { id: "right", x: -172, y: 0 }
    ],
    LOCATION_DATA: [
        // { name: "temple", fill: "#FFD700", island: '', settlement: "M 0,0 V 26.458333 H 26.458333 V 0 H 23.8125 V 10.583333 H 23.72878 A 10.583333,10.583333 0 0 0 13.229167,1.3229167 10.583333,10.583333 0 0 0 2.7352336,10.583333 h -0.0894 V 0 Z",},
    ],
    EVENT: {
        connected: "connected",
        action: "action",
        update: "update",
        error: "error",
        info: "info"
    }
}

export default clientConstants;