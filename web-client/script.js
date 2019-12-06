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
    wsURL: "ws://0.0.0.0:5050"
}

window.onload = function() {
    let app = new PIXI.Application({width: config.canvas.width, height: config.canvas.height, antialias: true});
    PIXI.loader
        .add("spritesheet.png")
        .load(() => texturesLoaded(app))
}

function texturesLoaded(app) {
    let ws = new WebSocket(config.wsURL)
    ws.onopen = function() {
        ws.send(JSON.stringify({ message_type: "join", room: "123" }));
        ws.send(JSON.stringify({ message_type: "start"}));
        ws.send(JSON.stringify({ message_type: "disconnect"}));
    }
    let gameState = newGameState(1, 4);
    let sync = stateSync(gameState, newAppState(app), null);
    let interactionHandler = newInteractionHandler(sync, gameState);
    let messageHandler = newMessageHandler(ws);
    let textures = splitSpriteSheet(PIXI.loader.resources["spritesheet.png"].texture, app);
    let builder = cardBuilder(textures, interactionHandler);
    sync.setBuilder(builder);

    clock = 0;
    c = 0;
    app.ticker.add(function(delta) {
        clock += delta;
        if (clock > 50) {
            if ( c < 20) {
                clock = 0;
                c += 1;
                sync.cardDrawn(3, "oak");
            } else {
                clock = 0;
                sync.cardPlayed(gameState.hand[0]);
            }
        }
    });

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

function cardBuilder(textures, interactionHandler) {
    return {
        build: function(value, suit) {
            let card = { val: value, suit: suit };
            let sprite = PIXI.Sprite.from(textures[suit]);
            sprite.on('pointerdown', _ => interactionHandler.cardClicked(card));
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
    handContainer.x = handRect.x;
    handContainer.y = handRect.y;

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

function stateSync(gameState, appState) {
    let resizeCardSpritesInHand = function(appState) {
        let numCards = appState.hand.children.length;
        let margin = 10;
        let widthPerCard = Math.floor((appState.handSize.width - margin * 2) / numCards);
        for (let i = 0; i < numCards; i++) {
            let child = appState.hand.children[i];
            child.x = i * widthPerCard + margin;
        }
    }
    let builder = null;

    return {
        cardDrawn: function(val, suit) {
            let card = builder.build(val, suit);
            gameState.hand.push(card);
            appState.hand.addChild(card.sprite);
            resizeCardSpritesInHand(appState);
        },
        cardPlayed: function(val, suit) {
            let card = builder.build(val, suit);
            gameState.hand.splice(gameState.hand.indexOf(card), 1);
            appState.hand.removeChild(card.sprite);
            resizeCardSpritesInHand(appState);
        },
        removeCard: function(card) {
            card.sprite.parent.removeChild(card.sprite);
        },
        setBuilder: function(b) { builder = b; },
    };
}

function newInteractionHandler(stateSync, gameState) {
    return {
        cardClicked: function(card) {
            console.log("Clicked " + card.val + " of " + card.suit);
            stateSync.removeCard(card);
        },
    };
}

function newMessageHandler(ws, stateSync) {
    ws.onmessage = function(msg) {
        console.log(msg);
    }

    return {};
}
