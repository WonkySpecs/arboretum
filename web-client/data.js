const config = {
    canvas: { width: 1080, height: 720 },
    textures: [
        "maple",
        "cassia",
        "cherryBlossom",
        "spruce",
        "jacaranda",
        "oak",
        "dogwood",
        "royalPoinciana",
        "willow",
        "tulipPoplar",
        "deck" ],
    niceSuitNames: {
        "Maple": "maple",
        "Cassia": "cassia",
        "Cherry Blossom": "cherryBlossom",
        "Spruce": "spruce",
        "Jacaranda": "jacaranda",
        "Oak": "oak",
        "Dogwood": "dogwood",
        "Royal Poinciana": "royalPoinciana",
        "Willow": "willow",
        "Tulip Poplar": "tulipPoplar" },
    cardSpriteWidth: 40,
    wsURL: "ws://0.0.0.0:5050",
}

const gamePhase = {
    FIRST_DRAW: 0,
    SECOND_DRAW: 1,
    MOVE: 2,
}

const drawTarget = {
    DECK: undefined,
}

const buildMessage = {
    draw: target => JSON.stringify({"message_type": "draw", "draw_target": target}),
    play: function(playVal, playSuit, x, y, discardVal, discardSuit) {
        return JSON.stringify(
            {"message_type": "move",
             "play_val": playVal,
             "play_suit": playSuit,
             "play_x": x,
             "play_y": y,
             "discard_val": discardVal,
             "discard_suit": discardSuit});
    }
}
