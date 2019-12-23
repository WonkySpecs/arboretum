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
    let interactionHandler = newInteractionHandler(sync, gameState, messageHandler);
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

let gameLog = {
    append: function(msg) {
        let text = "";
        if (typeof msg === "string") {
            text = msg;
        } else if (typeof msg === "object") {
            let kvs = [];
            Object.keys(msg).forEach((k, _) => kvs.push(k + ": " + msg[k]));
            text = kvs.reduce(
                function(acc, s, i) {
                    if ( i === 0 ) { return acc + s; }
                    else { return acc + ", " + s; }},
                "Message: ");
        } else {
            throw "Cannot append message to log, expected object or string, got " + typeof msg;
        }
        let log = document.createElement("p");
        log.innerHTML = text;
        document.getElementById("gameLog").appendChild(log);
    },
}

let info = {
    setText: function(msg) {
        document.getElementById("gameInfoText").textContent = msg;
    }
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
        buildMoveTarget: function(targetType, x, y) {
            // TODO: Make these more noticeable - fading, glowing, ?
            let rect = new PIXI.Graphics();
            rect.lineStyle(2, 0x0033FF, 1);
            rect.beginFill(0x0033CC, 0.1);
            rect.drawRoundedRect(8, 8, config.cardSpriteWidth, 64, 6) // Magic = about card sized TODO: Sort it
            rect.interactive = true;
            if (targetType === "discard") {
                rect.on('pointerdown', _ => interactionHandler.discardClicked());
            } else if (targetType === "play") {
                rect.on('pointerdown', _ => interactionHandler.playTargetClicked(x, y));
            } else {
                throw "Unknown targetType for move target '" + targetType + "'";
            }
            return rect;
        }
    };
}

function initGameState() {
    let neighbours = function(strX, strY) {
        let x = parseInt(strX);
        let y = parseInt(strY);
        return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
            .map(([x, y]) => [x.toString(), y.toString()]);
    }
    return {
        start: function(playerNum, numPlayers, cardsInDeck) {
            gameLog.append("Game started, you are player " + playerNum + " of " + numPlayers)
            this.myNum = playerNum;
            this.currentPlayer = 0;
            this.phase = gamePhase.FIRST_DRAW;
            this.hand = [];
            this.discards = [...Array(numPlayers)].map(_ => []);
            this.arboretums = [...Array(numPlayers)].map(_ => {});
            this.cardsInDeck = cardsInDeck;
        },
        nextPhase: function () {
            this.phase = gamePhase.next(this.phase);
        },

        isMyTurn: function() {
            return this.myNum == this.currentPlayer;
        },
        isDrawPhase: function() {
            return this.phase == gamePhase.FIRST_DRAW || this.phase == gamePhase.SECOND_DRAW;
        },
        isMovePhase: function() {
            return this.phase == gamePhase.MOVE;
        },
        isInHand: function(card) {
            return this.hand.includes(card);
        },
        drawingInitialHand: function() {
            return this.hand.length < 7;
        },
        retrieveCard: function(val, suit) {
            toSearch = [this.hand];
            for (searchTarget of toSearch) {
                for (card of searchTarget) {
                    if (card.val === val && card.suit === suit) {
                        return card;
                    }
                }
            }
            throw "Expected to get " + val + " of " + suit + ", but couldn't find it";
        },
        validPlayPositions: function() {
            if (this.arboretums[this.myNum] === undefined) {
                return [["0", "0"]];
            }
            let cardsAt = Object.keys(this.arboretums[this.myNum])
                .map(x => Object.keys(this.arboretums[this.myNum][x])
                        .map(y => [x, y]))
                .flat();
            let possible = cardsAt
                .map(([x, y]) => neighbours(x, y))
                .flat();
            for (pos of cardsAt) {
                possible.delete(pos);
            }
            return possible;
        },
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
        opponentArboretums: null,
        debugRects: debugRects,
        resizeCardsInHand: function() {
            let numCards = handContainer.children.length;
            let margin = 10;
            let widthPerCard = Math.floor((handRect.width - margin * 2) / numCards);
            for (let i = 0; i < numCards; i++) {
                let child = handContainer.children[i];
                child.x = i * widthPerCard + margin;
            }
        },
        decrementCardsInDeck: function() {
            let numCards = deckContainer.children[0].children[0];
            numCards.text = (parseInt(numCards.text) - 1).toString();
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
            if (!gameState.isDrawPhase) {
                throw "Attempted to draw card when it was not a draw phase";
            }
            let card = builder.buildCard(val, suit);
            if (!gameState.drawingInitialHand()) {
                gameState.nextPhase();
            }
            gameState.hand.push(card);
            appState.handContainer.addChild(card.sprite);
            appState.resizeCardsInHand(appState);
        },
        cardTaken: function(foo) { // TODO: Handle draw targets, for now assuming deck
            gameState.cardsInDeck -= 1;
            appState.decrementCardsInDeck();
        },
        playCard: function(playerNum, val, suit, x, y) {
            if (gameState.myNum === playerNum) {
                _playMyCard(val, suit, x, y);
            } else {
                let opponentNum = playerNum < gameState.myNum ? playerNum : playerNum - 1;
                _playOpponentCard(opponentNum, val, suit, x, y);
            }
            gameLog.append("Player " + playerNum + " played " + val + " of " + suit + " at (" + x + ", " + y + ")");
        },
        _playMyCard: function(val, suit, x, y) {
            // Remove card from hand, add it to arboretum
            let card = gameState.retrieveCard(val, suit);
            gameState.hand.splice(gameState.hand.indexOf(card), 1);
            appState.handContainer.removeChild(card.sprite);
            resizeCardsInHand(appState);
            appState.playerArboretum.addChild(card.sprite);
        },
        _playOpponentCard: function(opponentNum, val, suit, x, y) {
            let card = builder.buildCard(val, suit);
            appState.opponentArboretums[opponentNum].addChild(card.sprite);
        },
        createMoveTargets: function() {
            let discard = builder.buildMoveTarget("discard");
            appState.playerDiscard.addChild(discard);
            appState.moveTargets = [discard];
            let playTargetPositions = gameState.validPlayPositions();
            for ([x, y] of playTargetPositions) {
                let target = builder.buildMoveTarget("play", x, y);
                target.x = x * 100 + 200;   // TODO: Magic numbers for now, do proper layout in appState
                target.y = y * 100 + 200;
                appState.playerArboretum.addChild(target);
                appState.moveTargets.push(target);
            }
        },
        removeMoveTargets: function() {
            for (target of appState.moveTargets) {
                target.parent.removeChild(target);
            }
            appState.moveTargets = [];
        },
        setBuilder: function(b) {
            builder = b;
        },
    };
}

function newInteractionHandler(stateSync, gameState, messageHandler) {
    let _selectedCard = null;
    let _moveCache = [null, null];  // [[cardToPlay, [x, y]], cardToDiscard]. This is going to lead to bugs
    return {
        cardClicked: function(card) {
            if (!gameState.isMyTurn()) {
                return
            }

            if (gameState.isDrawPhase()) { // TODO: and card is on top of discard)
                // Draw from appropriate discard
            } else if (gameState.isMovePhase() && gameState.isInHand(card)) {
                _selectedCard = card;
                stateSync.createMoveTargets();
            }
        },
        deckClicked: function() {
            if (gameState.isMyTurn() && gameState.isDrawPhase()) {
                messageHandler.sendDrawMessage(null)
            }
        },
        discardClicked: function() {
            if (_selectedCard == null) {
                console.log("The discard target existed when it shouldn't have");
                return
            }

            info.setText("Discarding " + _selectedCard.val + " of " + _selectedCard.suit);
            _moveCache[1] = _selectedCard;
            _selectedCard = null;
            stateSync.removeMoveTargets();
        },
        playTargetClicked: function(x, y) {
            if (_selectedCard == null) {
                console.log("A play target existed when it shouldn't have");
                return
            }

            info.setText("Playing " + _selectedCard.val + " of " + _selectedCard.suit + " at (" + x + ", " + y + ")");;
            _moveCache[0] = [_selectedCard, [x, y]];
            _selectedCard = null;
            stateSync.removeMoveTargets();
        }
    };
}

function newMessageHandler(ws, stateSync) {
    handler = {
        handle: function(msg) {
            msg = JSON.parse(msg.data)
            gameLog.append(msg);
            switch (msg.message_type) {
                case "ready_check":
                    ws.send(JSON.stringify({"message_type": "ready"}));
                    break;

                case "game_start":
                    stateSync.newGame(
                        msg.player_num, msg.num_players, msg.cards_in_deck);
                    break;

                case "draw":
                    stateSync.cardDrawn(
                        msg.card_value,
                        config.niceSuitNames[msg.card_suit]);
                    break;

                case "taken":
                    stateSync.cardTaken(123);   // TODO: draw target
                    break;

                case "played":
                    stateSync.playCard(
                        msg.player_num, msg.card_val, msg.card_suit, msg.x, msg.y);
                    break;

                default:
                    console.log("Message with unknown type " + msg.message_type);
            }
        },
        sendDrawMessage: function(drawTarget) {
            ws.send(buildMessage.draw(drawTarget))
        }
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
