const constants = {
    "HEX_COUNT": 7,
    "CONNECTION": {
        "wsAddress": "ws://localhost:8080"
    },
    "STATUS": {
        "empty": "empty",
        "lobby": "lobby",
        "full": "full",
        "started": "started"
    },
    "MOVE_HINT": {
        "valid": "valid",
        "home": "home",
        "illegal": "illegal"
    },
    "COLOR": {
        "barrierDefault": "#003C43",
        "barrierNavigator": "#FFFDD7",
        "localShipBorder": "#FFD700",
        "shipBorder": "#000000",
        "playerPurple": "#A55A9A",
        "playerYellow": "#F5E049",
        "playerRed": "#FF204E",
        "playerGreen": "#87A922",
        "illegal": "#FFF7D4",
        "valid": "#A3FFD6",
        "default": "#3887BE",
        "anchored": "#52D3D8"
    },
    "HEX_OFFSET_DATA": [
        { "id": "center", "x": 0, "y": 0 },
        { "id": "topLeft", "x": 86, "y": 150 },
        { "id": "bottomRight", "x": -86, "y": -150 },
        { "id": "topRight", "x": -86, "y": 150 },
        { "id": "bottomLeft", "x": 86, "y": -150 },
        { "id": "left", "x": 172, "y": 0 },
        { "id": "right", "x": -172, "y": 0 }
    ],
    "ACTION": {
        "inquire": "inquire",
        "enroll": "enroll",
        "start": "start",
        "move": "move",
        "refresh": "refresh"
    },
    "EVENT" : {
        "connected": "connected",
        "action": "action",
        "update": "update",
        "error": "code_error",
        "info": "info"
    }
}

export default constants;