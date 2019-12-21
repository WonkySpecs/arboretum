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
    FIRST_DRAW: "Draw 1",
    SECOND_DRAW: "Draw 2",
    MOVE: "Move",
    next: function(phase) {
        switch (phase) {
            case this.FIRST_DRAW:
                return this.SECOND_DRAW;
            case this.SECOND_DRAW:
                return this.MOVE;
            case this.MOVE:
                return this.FIRST_DRAW;
        }
    }
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
