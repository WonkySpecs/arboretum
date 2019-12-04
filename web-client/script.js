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
    let gameState = newGameState(1, 4);
    let appState = newAppState(app);
    let s = appState.playerArboretumSize;
    for ( let [x, y] of [[0, 0], [0, s.height - 64], [s.width - 40, 0], [s.width - 40, s.height - 64]]) {
        console.log(x, y);
        let card = builder.build(Math.floor(Math.random() * 8) + 1, config.suits[Math.floor(Math.random() * config.suits.length)]);
        card.sprite.x = x;
        card.sprite.y = y;
        appState.playerArboretum.addChild(card.sprite);
    }

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

function newGameState(playerNum, numPlayers) {
    return {
        playerNum: playerNum,
        currentPlayer: 1,
        hand: [],
        discards: [...Array(numPlayers)].map(_ => []),
        arboretums: [...Array(numPlayers)].map(_ => []),
    }
}

function newAppState(app) {
    let handContainer = new PIXI.Container();
    let handRect = new PIXI.Rectangle(0, config.canvas.height - 100, config.canvas.width / 2, 100);

    let playerDiscardContainer = new PIXI.Container();
    let playerDiscardRect = new PIXI.Rectangle(config.canvas.width / 2 - 60, config.canvas.height - handRect.height - 80, 60, 80);

    let deckContainer = new PIXI.Container();
    let deckRect = new PIXI.Rectangle(config.canvas.width / 2 - 60 - 60, config.canvas.height - handRect.height - 80, 60, 80);

    let playerArboretum = new PIXI.Container();
    let playerArboretumRect = new PIXI.Rectangle(0, 0, config.canvas.width / 2, config.canvas.height - handRect.height - deckRect.height);

    for (container of [handContainer, playerDiscardContainer, deckContainer, playerArboretum] ) {
        app.stage.addChild(container);
    }

    return {
        app: app,
        hand: handContainer,
        handSize: handRect,
        playerDiscard: playerDiscardContainer,
        playerDiscardSize: playerDiscardRect,
        deck: deckContainer,
        deckSize: deckRect,
        playerArboretum: playerArboretum,
        playerArboretumSize: playerArboretumRect,
    }
}
