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
    firstDraw: 0,
    secondDraw: 1,
    move: 2,
}
