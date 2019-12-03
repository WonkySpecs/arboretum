config = {
    canvas: { width: 600, height: 400 },
    cardSprites: [
        "maple",
        "cassia",
        "cherryBlossom",
        "spruce",
        "jacaranda",
        "oak",
        "dogwood",
        "royalPoinciana",
        "willow",
        "tulipPoplar"],
    cardSpriteWidth: 40,
}
window.onload = function() {
    let app = new PIXI.Application({width: config.canvas.width, height: config.canvas.height, antialias: true});
    PIXI.loader
        .add("spritesheet.png")
        .load(() => texturesLoaded(app))
    console.log(app);
}

function texturesLoaded(app) {
    let textures = splitSpriteSheet(PIXI.loader.resources["spritesheet.png"].texture, app);
    for (let i = 0; i < 1000; i++ ) {
        let spriteIndex = Math.floor(Math.random() * config.cardSprites.length)
        let card = PIXI.Sprite.from(textures[config.cardSprites[spriteIndex]]);
        card.x = Math.random() * (config.canvas.width - card.width);
        card.y = Math.random() * (config.canvas.height - card.height);
        app.stage.addChild(card);
    }
    document.body.appendChild(app.view);
}

function splitSpriteSheet(sheet, app) {
    let cardHeight = sheet.height;
    let textures = {};
    for ( let i = 0; i < config.cardSprites.length; i++ ) {
        textures[config.cardSprites[i]] = new PIXI.Texture(
            sheet,
            new PIXI.Rectangle(i * config.cardSpriteWidth, 0, config.cardSpriteWidth, cardHeight));
    }
    return textures;
}
