config = {
    canvas: { width: 1080, height: 720 },
    suits: [
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
    wsURL: "ws://127.0.0.1"
}

window.onload = function() {
    let app = new PIXI.Application({width: config.canvas.width, height: config.canvas.height, antialias: true});
    PIXI.loader
        .add("spritesheet.png")
        .load(() => texturesLoaded(app))
}

function texturesLoaded(app) {
    let textures = splitSpriteSheet(PIXI.loader.resources["spritesheet.png"].texture, app);
    let builder = cardBuilder(textures);
    for (let i = 0; i < 1000; i++ ) {
        let card = builder.build(Math.floor(Math.random() * 8) + 1, config.suits[Math.floor(Math.random() * config.suits.length)]);
        card.sprite.x = Math.random() * (config.canvas.width - card.sprite.width);
        card.sprite.y = Math.random() * (config.canvas.height - card.sprite.height);
        app.stage.addChild(card.sprite);
    }
    console.log(app.stage);
    document.body.appendChild(app.view);
}

function splitSpriteSheet(sheet, app) {
    let cardHeight = sheet.height;
    let textures = {};
    for ( let i = 0; i < config.suits.length; i++ ) {
        textures[config.suits[i]] = new PIXI.Texture(
            sheet,
            new PIXI.Rectangle(i * config.cardSpriteWidth, 0, config.cardSpriteWidth, cardHeight));
    }
    return textures;
}

function cardBuilder(textures, inputManager) {
    return {
        build: function(value, suit) {
            let card = { val: value, suit: suit };
            let sprite = PIXI.Sprite.from(textures[suit]);
            sprite.on('pointerdown', _ => cardClicked(card));
            sprite.interactive = true;

            let text = new PIXI.Text(value.toString())
            text.x = 12;
            text.y = 15;
            sprite.addChild(text);
            card.sprite = sprite;

            return card;
        }
    };
}

function cardClicked(card) {
    console.log("Clicked " + card.val + " of " + card.suit);
}
