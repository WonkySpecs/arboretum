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
        let suit = config.cardSprites[spriteIndex];
        let card = PIXI.Sprite.from(textures[suit]);
        card.x = Math.random() * (config.canvas.width - card.width);
        card.y = Math.random() * (config.canvas.height - card.height);
        let num = Math.floor(Math.random() * 8) + 1;
        let text = new PIXI.Text(num.toString())
        text.x = 12;
        text.y = 15;
        card.addChild(text);
        card.interactive = true;
        card.on('pointerdown', _ => console.log("Clicked " + num.toString() + " of " + suit));
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
