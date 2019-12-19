window.onload = function() {
    let app = new PIXI.Application({width: config.canvas.width, height: config.canvas.height, antialias: true});
    PIXI.loader
        .add("spritesheet.png")
        .load(() => texturesLoaded(app))
}

function texturesLoaded(app) {
    let ws = new WebSocket(config.wsURL)
    let gameState = initGameState();
    let appState = newAppState(app);
    let sync = newStateSync(gameState, appState, null);
    bindControls(appState, ws);
    let messageHandler = newMessageHandler(ws, sync);
    let interactionHandler = newInteractionHandler(sync, gameState);
    let textures = splitSpriteSheet(PIXI.loader.resources["spritesheet.png"].texture, app);
    let spriteBuilder = newSpriteBuilder(textures, interactionHandler);
    sync.setBuilder(spriteBuilder);

    document.getElementById("gameCanvas").appendChild(app.view);
}

function splitSpriteSheet(sheet, app) {
    let cardHeight = sheet.height;
    let textures = {};
    for ( let i = 0; i < config.textures.length; i++ ) {
        textures[config.textures[i]] = new PIXI.Texture(
            sheet,
            new PIXI.Rectangle(i * config.cardSpriteWidth, 0, config.cardSpriteWidth, cardHeight));
    }
    return textures;
}

function newSpriteBuilder(textures, interactionHandler) {
    return {
        buildCard: function(value, suit) {
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
        },
        buildDeck: function(numCards) {
            let deckSprite = PIXI.Sprite.from(textures.deck);
            deckSprite.on('pointerdown', _ => interactionHandler.deckClicked());
            deckSprite.interactive = true;
            let text = new PIXI.Text(numCards.toString(), new PIXI.TextStyle( { fill: "blue" } ));
            text.x = 2;
            text.y = 25;
            deckSprite.addChild(text);
            return deckSprite;
        },
    };
}

function initGameState() {
    return {
        start: function(playerNum, numPlayers, cardsInDeck) {
            this.myNum = playerNum;
            this.currentPlayer = 0;
            this.phase = gamePhase.firstDraw;
            this.hand = [];
            this.discards = [...Array(numPlayers)].map(_ => []);
            // TODO: Arboretum data structure. Object? 2D array?
            this.arboretums = [...Array(numPlayers)].map(_ => []);
        }
    }
}

function newAppState(app) {
    // TODO: Make all sizes relative to stage size
    let handContainer = new PIXI.Container();
    let handRect = new PIXI.Rectangle(0, config.canvas.height - 100, config.canvas.width / 2, 100);

    let playerDiscardContainer = new PIXI.Container();
    let playerDiscardRect = new PIXI.Rectangle(config.canvas.width / 2 - 60, config.canvas.height - handRect.height - 80, 60, 80);

    let deckContainer = new PIXI.Container();
    let deckRect = new PIXI.Rectangle(config.canvas.width / 2 - 60 - 60, config.canvas.height - handRect.height - 80, 60, 80);

    let playerArboretum = new PIXI.Container();
    let playerArboretumRect = new PIXI.Rectangle(0, 0, config.canvas.width / 2, config.canvas.height - handRect.height - deckRect.height);

    for ([container, rect] of [
            [handContainer, handRect],
            [playerDiscardContainer, playerDiscardRect],
            [deckContainer, deckRect],
            [playerArboretum, playerArboretumRect]] ) {
        container.x = rect.x;
        container.y = rect.y;
        app.stage.addChild(container);
    }

    let debugRects = new PIXI.Graphics();
    debugRects.lineStyle(3, 0xFF0000);
    for (rect of [handRect, playerDiscardRect, deckRect, playerArboretumRect]) {
        debugRects.drawRect(rect.x, rect.y, rect.width, rect.height);
    }
    app.stage.addChild(debugRects);

    return {
        app: app,
        handContainer: handContainer,
        playerDiscard: playerDiscardContainer,
        deckContainer: deckContainer,
        playerArboretum: playerArboretum,
        debugRects: debugRects,
        resizeCardsInHand: function() {
            let numCards = handContainer.children.length;
            let margin = 10;
            let widthPerCard = Math.floor((handRect.width - margin * 2) / numCards);
            for (let i = 0; i < numCards; i++) {
                let child = handContainer.children[i];
                child.x = i * widthPerCard + margin;
            }
        }
    }
}

function newStateSync(gameState, appState) {
    let builder = null;

    return {
        newGame: function(yourNum, numPlayers, numCards) {
            gameState.start(yourNum, numPlayers, numCards);
            let deck = builder.buildDeck(numCards);
            appState.deckContainer.addChild(deck);
            let tempInfoTextThing = new PIXI.Text(
                numPlayers.toString() + "-player game",
                new PIXI.TextStyle({
                    fill: 'white'
                }));
            appState.app.stage.addChild(tempInfoTextThing);
        },
        cardDrawn: function(val, suit) {
            let card = builder.buildCard(val, suit);
            gameState.hand.push(card);
            appState.handContainer.addChild(card.sprite);
            appState.resizeCardsInHand(appState);
        },
        cardPlayed: function(val, suit) {
            let card = builder.buildCard(val, suit);
            gameState.hand.splice(gameState.hand.indexOf(card), 1);
            appState.handContainer.removeChild(card.sprite);
            resizeCardsInHand(appState);
        },
        removeCard: function(card) {
            card.sprite.parent.removeChild(card.sprite);
        },
        setBuilder: function(b) {
            builder = b;
        },
    };
}

function newInteractionHandler(stateSync, gameState) {
    return {
        cardClicked: function(card) {
            console.log("Clicked " + card.val + " of " + card.suit);
            stateSync.removeCard(card);
        },
        deckClicked: function() {
            stateSync.cardDrawn(123, "oak");
        },
    };
}

function newMessageHandler(ws, stateSync) {
    let player_num = null;
    handler = {
        handle: function(msg) {
            console.log(msg);
            msg = JSON.parse(msg.data)
            this._log(msg);
            if ( msg.message_type === "game_starting" ) {
                console.log("Sending ready");
                ws.send(JSON.stringify({"message_type": "ready"}));
            } else if (msg.message_type === "draw" ) {
                stateSync.cardDrawn(
                    msg.card_value,
                    config.niceSuitNames[msg.card_suit]);
            } else if (msg.message_type === "game_start" ) {
                stateSync.newGame(
                    msg.player_num, msg.num_players, msg.cards_in_deck);
                player_num = msg.player_num;

            } else {
                console.log("Message with unknown type " + msg.message_type);
            }
        },
        _log: function(msg) {
            // Write message to 'log' element, as a game history/info for player.
            // TODO: Better message format. Do a layout function per message type.
            let kvs = [];
            Object.keys(msg).forEach((k, _) => kvs.push(k + ": " + msg[k]));
            let log = document.createElement("p");
            log.innerHTML = kvs.reduce(
                function(acc, s, i) {
                    if ( i === 0 ) { return acc + s; }
                    else { return acc + ", " + s; }},
                "Message: ");
            document.getElementById("gameLog").appendChild(log);
        },
    }
    ws.onmessage = msg => handler.handle(msg);
    return handler
}

function bindControls(appState, ws) {
    // Bind the event handlers of all HTML controls.
    // Will hopefully eventually replace most/all with PIXI rendered controls.
    debugCheckbox = document.getElementById("debugCheckbox");
    debugCheckbox.onchange = function() {
        appState.debugRects.visible = debugCheckbox.checked;
    }
    bindLobbyButtonFunctions(ws);
}

function bindLobbyButtonFunctions(ws) {
    // Adhoc lobby system until I put something real in
    document.getElementById("joinBtn").onclick = function() {
        ws.send(JSON.stringify({
            "message_type": "join",
            "lobby": document.getElementById("roomIdInput").value }));
    };

    document.getElementById("startBtn").onclick = function() {
        ws.send(JSON.stringify({ "message_type": "start" }));
    };
}
