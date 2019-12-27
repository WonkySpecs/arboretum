let gameInfo = new GameInfo();
let lobbyInfo = new LobbyInfo();

window.onload = function() {
    let app = new PIXI.Application({width: config.CANVAS.width, height: config.CANVAS.height, antialias: true});
    PIXI.loader
        .add("spritesheet.png")
        .load(() => texturesLoaded(app))
}

function texturesLoaded(app) {
    let ws = new WebSocket("ws://" + window.location.hostname + ":" + config.WS_PORT)
    let textures = splitSpriteSheet(PIXI.loader.resources["spritesheet.png"].texture);
    let gameState = initGameState();
    let appState = newAppState(app);
    let sync = newStateSync(gameState, appState, null);
    bindControls(appState, ws);
    let messageHandler = newMessageHandler(ws, sync);
    let interactionHandler = newInteractionHandler(sync, gameState, messageHandler);
    let spriteBuilder = newSpriteBuilder(textures, interactionHandler);
    sync.setBuilder(spriteBuilder);

    document.getElementById("gameCanvas").appendChild(app.view);
}

function splitSpriteSheet(sheet) {
    let cardHeight = sheet.height;
    let textures = {};
    for ( let i = 0; i < config.suitNames.length; i++ ) {
        textures[config.suitNames[i]] = new PIXI.Texture(
            sheet,
            new PIXI.Rectangle(i * config.CARD_SPRITE_WIDTH, 0, config.CARD_SPRITE_WIDTH, cardHeight));
    }
    return textures;
}

let gameLog = {
    append: function(msg) {
        let entry = document.createElement("p");
        entry.innerHTML = msg;
        let log = document.getElementById("gameLog");
        log.insertBefore(entry, log.firstChild);
    },
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
        buildGhost: function(card) {
            let ghost = this.buildCard(card.val, card.suit);
            ghost.sprite.alpha = 0.5;
            ghost.sprite.on('pointerdown', _ => null);
            return ghost;
        },
        buildMoveTarget: function(targetType, x, y) {
            // TODO: Make these more noticeable - fading, glowing, ?
            let rect = new PIXI.Graphics();
            rect.lineStyle(2, 0x0033FF, 1);
            rect.beginFill(0x0033CC, 0.1);
            rect.drawRoundedRect(1, 1, config.CARD_SPRITE_WIDTH - 2, 62, 6) // Magic = about card sized TODO: Sort it
            rect.interactive = true;
            if (targetType === "discard") {
                rect.on('pointerdown', _ => interactionHandler.discardTargetClicked());
            } else if (targetType === "play") {
                rect.on('pointerdown', _ => interactionHandler.playTargetClicked(x, y));
            } else {
                throw "Unknown targetType for move target '" + targetType + "'";
            }
            interactionHandler.bindMoveTargetInteractions(rect, this);
            return rect;
        },
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
            this.myNum = playerNum;
            this.currentPlayer = 0;
            this.phase = gamePhase.FIRST_DRAW;
            this.hand = [];
            this.discards = [...Array(numPlayers)].map(_ => new Array());
            this.arboretums = [...Array(numPlayers)].map(_ => new Object());
            this.cardsInDeck = cardsInDeck;
            gameInfo.myNum = playerNum;
        },
        nextPhase: function () {
            this.phase = gamePhase.next(this.phase);
            if (this.phase === gamePhase.FIRST_DRAW) {
                this.currentPlayer = (this.currentPlayer + 1) % this.discards.length;
                gameLog.append("Now player " + (this.currentPlayer + 1) + "'s turn");
            }

            if (this.phase === gamePhase.FIRST_DRAW) {
                gameInfo.showDrawPhase(this.currentPlayer);
            } else if (this.phase === gamePhase.SECOND_DRAW) {
                gameInfo.secondDraw();
            } else {
                gameInfo.showMovePhase(this.currentPlayer);
            }
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
            throw "Expected to get " + cardStrFmt(val, suit) + ", but couldn't find it";
        },
        validPlayPositions: function() {
            if (this.arboretums[this.myNum][0] === undefined) {
                return [["0", "0"]];
            }
            let cardsAt = Object.keys(this.arboretums[this.myNum])
                .map(x => Object.keys(this.arboretums[this.myNum][x])
                        .map(y => [x, y]))
                .flat();
            // Looks like Sets don't even work for arrays (objects not literals) so
            // using them here is useless anyway
            let possible = new Set(cardsAt
                .map(([x, y]) => neighbours(x, y))
                .flat());
            validPositions = [];
            for ([x, y] of [...possible]) {
                let toInclude = true;
                for ([x2, y2] of cardsAt) {
                    if (x2 === x && y2 === y) {
                        toInclude = false;
                        break;
                    }
                }
                if (toInclude) {
                    validPositions.push([x, y]);
                }
            }
            return validPositions;
        },
        playCard: function(playerNum, card, x, y) {
            if (this.arboretums[playerNum][x] === undefined) {
                this.arboretums[playerNum][x] = {};
            }
            this.arboretums[playerNum][x][y] = card;
        }
    }
}

function newAppState(app) {
    // TODO: Make all sizes relative to stage size
    let handContainer = new PIXI.Container();
    let handRect = new PIXI.Rectangle(0, config.CANVAS.height - 100, config.CANVAS.width / 2, 100);

    let playerDiscardContainer = new PIXI.Container();
    let playerDiscardRect = new PIXI.Rectangle(config.CANVAS.width / 2 - 60, config.CANVAS.height - handRect.height - 80, 60, 80);

    let deckContainer = new PIXI.Container();
    let deckRect = new PIXI.Rectangle(config.CANVAS.width / 2 - 60 - 60, config.CANVAS.height - handRect.height - 80, 60, 80);

    let playerArboretum = new Arboretum(
        config.CANVAS.width / 2,
        config.CANVAS.height - handRect.height - deckRect.height,
        1.0);

    for ([container, rect] of [
            [handContainer, handRect],
            [playerDiscardContainer, playerDiscardRect],
            [deckContainer, deckRect]]) {
        container.x = rect.x;
        container.y = rect.y;
        app.stage.addChild(container);
    }
    playerArboretum.addToStage(app.stage, 0, 0);

    return {
        app: app,
        handContainer: handContainer,
        playerDiscard: playerDiscardContainer,
        deckContainer: deckContainer,
        playerArboretum: playerArboretum,
        opponentArboretums: null,
        moveTargets: [],
        initOpponents: function(numOpponents) {
            this.opponentArboretums = [];
            this.opponentDiscards = [];
            let discardWidth = 50;
            let discardHeight = 70;
            let arboretumWidth = config.CANVAS.width / 2 - discardWidth;
            let arboretumHeight = config.CANVAS.height / numOpponents;
            for (let i = 0; i < numOpponents; i++) {
                let arboretum = new Arboretum(
                    arboretumWidth,
                    arboretumHeight,
                    arboretumWidth / playerArboretum.width);
                arboretum.addToStage(
                    app.stage,
                    config.CANVAS.width / 2 + discardWidth,
                    arboretumHeight * i);

                let discard = new PIXI.Container()
                discard.x = config.CANVAS.width / 2;
                discard.y = arboretumHeight * i + arboretumHeight / 2 - discardHeight / 2;
                app.stage.addChild(discard);

                this.opponentArboretums.push(arboretum);
                this.opponentDiscards.push(discard);
            }
        },
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
        },
        addToMyDiscard: function(sprite) {
            playerDiscardContainer.addChild(sprite);
            sprite.x = 1;
            sprite.y = 1;
        },
        addToOpponentDiscard: function(sprite, opponentNum) {
            this.opponentDiscards[opponentNum].addChild(sprite);
            sprite.x = 8;
            sprite.y = 8;
        },
    }
}

function newStateSync(gameState, appState) {
    let builder = null;

    return {
        newGame: function(yourNum, numPlayers, numCards) {
            document.getElementById("lobbyControls").style.display = "none";
            gameLog.append("Game starting");
            gameLog.append("You are player " + (yourNum + 1) + " of " + numPlayers)

            gameState.start(yourNum, numPlayers, numCards);
            appState.initOpponents(numPlayers - 1);
            let deck = builder.buildDeck(numCards);
            appState.deckContainer.addChild(deck);
            gameInfo.showDrawPhase(gameState.currentPlayer);
        },
        cardDrawn: function(val, suit) {
            gameLog.append(cardStrFmt(val, suit) + " added to hand");
            if (!gameState.isDrawPhase) {
                throw "Attempted to draw card when it was not a draw phase";
            }
            let card = builder.buildCard(val, suit);
            gameState.hand.push(card);
            appState.handContainer.addChild(card.sprite);
            appState.resizeCardsInHand(appState);
        },
        cardTaken: function(fromDiscard) {
            let fromDeck = fromDiscard == undefined;
            let logMessage = "Player " + (gameState.currentPlayer + 1) + " took";
            if (fromDiscard === undefined) {
                gameState.cardsInDeck -= 1;
                appState.decrementCardsInDeck();
                logMessage += " a card from the deck";
            } else {
                if (fromDiscard == gameState.myNum) {
                    appState.playerDiscard.removeChildAt(appState.playerDiscard.children.length - 1);
                } else {
                    // TODO: Rethink opponent/player split, this is silly, look how much simpler gameState is
                    let opponentNum = fromDiscard < gameState.myNum ? fromDiscard : fromDiscard - 1;
                    appState.opponentDiscards[opponentNum]
                        .removeChildAt(appState.opponentDiscards[opponentNum].children.length - 1);
                }
                let taken = gameState.discards[fromDiscard].pop();
                logMessage += " the " + cardStrFmt(taken.val, taken.suit) +
                    " from player " + (fromDiscard + 1) + "'s discard";
            }
            gameLog.append(logMessage);
            gameState.nextPhase();
        },
        playCard: function(playerNum, val, suit, x, y) {
            if (gameState.myNum === playerNum) {
                this._playMyCard(val, suit, x, y);
            } else {
                let opponentNum = playerNum < gameState.myNum ? playerNum : playerNum - 1;
                this._playOpponentCard(opponentNum, val, suit, x, y);
            }
            gameLog.append("Player " + (playerNum + 1) + " played " + cardStrFmt(val, suit) + " at (" + x + ", " + y + ")");
            gameState.nextPhase();
        },
        _playMyCard: function(val, suit, x, y) {
            // Remove card from hand, add it to arboretum
            let card = gameState.retrieveCard(val, suit);
            gameState.hand.splice(gameState.hand.indexOf(card), 1);
            gameState.playCard(gameState.myNum, card, x, y);
            appState.handContainer.removeChild(card.sprite);
            appState.resizeCardsInHand();
            appState.playerArboretum.addSprite(card.sprite, x, y);
            document.getElementById("confirmMoveBtn").style.display = "none";
        },
        _playOpponentCard: function(opponentNum, val, suit, x, y) {
            let card = builder.buildCard(val, suit);
            gameState.playCard(gameState.currentPlayer, card, x, y);
            appState.opponentArboretums[opponentNum].addSprite(card.sprite, x, y);
        },
        discardCard: function(playerNum, val, suit) {
            gameLog.append("Player " + (playerNum + 1) + " discarded the " + cardStrFmt(val, suit));
            if (gameState.myNum === playerNum) {
                let card = gameState.retrieveCard(val, suit);
                gameState.hand.splice(gameState.hand.indexOf(card), 1);
                gameState.discards[playerNum].push(card);
                appState.handContainer.removeChild(card.sprite);
                appState.resizeCardsInHand();
                appState.addToMyDiscard(card.sprite);
            } else {
                let card = builder.buildCard(val, suit);
                let opponentNum = playerNum < gameState.myNum ? playerNum : playerNum - 1;
                gameState.discards[playerNum].push(card);
                appState.addToOpponentDiscard(card.sprite, opponentNum);
            }
        },
        createMoveTargets: function() {
            if (appState.moveTargets.length > 0) {
                console.log("Tried to create move targets when they already existed, probably a double click");
                return;
            }
            let discardTarget = builder.buildMoveTarget("discard");
            appState.playerDiscard.addChild(discardTarget);
            appState.moveTargets = [discardTarget];
            let playTargetPositions = gameState.validPlayPositions();
            for ([x, y] of playTargetPositions) {
                let target = builder.buildMoveTarget("play", x, y);
                appState.playerArboretum.addSprite(target, x, y);
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
    let _moveCache = [null, null, null];  // [cardToPlay, [x, y], cardToDiscard]. This is going to lead to bugs

    let _confirmBtn = document.getElementById("confirmMoveBtn");
    _confirmBtn.onclick = function() {
        messageHandler.sendMoveMessage(..._moveCache);
        _moveCache = [null, null, null];
        _confirmBtn.disabled = true;
    }

    return {
        cardClicked: function(card) {
            if (!gameState.isMyTurn()) {
                return
            }

            if (gameState.isDrawPhase()) {
                // If card is at top of discard, draw it
                let stackTops = gameState.discards.map(a => a[a.length - 1]);
                for (let i = 0; i < stackTops.length; i ++) {
                    if (stackTops[i] === card) {
                        messageHandler.sendDrawMessage(i);
                    }
                }
            } else if (gameState.isMyTurn() && gameState.isMovePhase() && gameState.isInHand(card)) {
                _selectedCard = card;
                stateSync.createMoveTargets();
            }
        },
        deckClicked: function() {
            if (gameState.isMyTurn() && gameState.isDrawPhase()) {
                messageHandler.sendDrawMessage(null)
            }
        },
        discardTargetClicked: function() {
            this._handleTargetClicked("discard");
        },
        playTargetClicked: function(x, y) {
            this._handleTargetClicked("play", [x, y]);
        },
        _handleTargetClicked: function(targetType, pos) {
            if (_selectedCard == null) {
                console.log("A " + targetType + " existed when it shouldn't have");
                stateSync.removeMoveTargets();
                return
            }

            if (targetType === "play") {
                _moveCache[0] = _selectedCard;
                _moveCache[1] = pos;
            } else {
                _moveCache[2] = _selectedCard;
            }

            let otherSelectedIdx = targetType === "play" ? 2 : 0;
            let otherSelectedCard = _moveCache[otherSelectedIdx];

            if (otherSelectedCard == _selectedCard) {
                _moveCache[otherSelectedIdx] = null;
            }

            if (_moveCache[0] != null && _moveCache[2] != null) {
                confirmMoveBtn.disabled = false;
            } else {
                confirmMoveBtn.disabled = true;
            }

            gameInfo.setMoveInfo(..._moveCache);
            _selectedCard = null;
            stateSync.removeMoveTargets();
        },
        bindMoveTargetInteractions: function(target, builder) {
            let _ghost = null;
            let createGhost = function() {
                _ghost = builder.buildGhost(_selectedCard);
                target.addChild(_ghost.sprite);
            }
            let removeGhost = function() {
                target.removeChild(_ghost.sprite);
                _ghost = null;
            }
            target.on('pointerover', createGhost);
            target.on('pointerout', removeGhost);
        }
    };
}

function newMessageHandler(ws, stateSync) {
    handler = {
        handle: function(msg) {
            msg = JSON.parse(msg.data)
            switch (msg.message_type) {
                case "lobby_created":
                    lobbyInfo.setLobby(msg.lobby_id, 1);
                    break;

                case "lobby_joined":
                    lobbyInfo.setLobby(msg.lobby_id, msg.num_players);
                    break;

                case "lobby_player_joined":
                    lobbyInfo.incrementPlayers();
                    break;

                case "lobby_player_left":
                    lobbyInfo.decrementPlayers();
                    break;

                case "ready_check":
                    ws.send(JSON.stringify({"message_type": "ready"}));
                    break;

                case "game_start":
                    stateSync.newGame(
                        msg.player_num, msg.num_players, msg.cards_in_deck);
                    break;

                case "draw":
                    stateSync.cardDrawn(
                        msg.card_val,
                        msg.card_suit);
                    break;

                case "taken":
                    stateSync.cardTaken(msg.target_discard);
                    break;

                case "played":
                    stateSync.playCard(
                        msg.player_num, msg.card_val, msg.card_suit, msg.x, msg.y);
                    break;

                case "discard":
                    stateSync.discardCard(
                        msg.player_num, msg.card_val, msg.card_suit);
                    break;

                case "game_over":
                    gameInfo.displayScores(msg.scores, parseInt(msg.winner));
                    break;

                default:
                    console.log("Message with unknown type " + msg.message_type);
                    console.log(msg);
            }
        },
        sendDrawMessage: function(drawTarget) {
            ws.send(buildMessage.draw(drawTarget))
        },
        sendMoveMessage: function(playCard, playPos, discardCard) {
            ws.send(buildMessage.play(
                playCard.val, playCard.suit,
                playPos[0], playPos[1],
                discardCard.val, discardCard.suit));
        }
    }
    ws.onmessage = msg => handler.handle(msg);
    return handler
}

function bindControls(appState, ws) {
    // Bind the event handlers of all HTML controls.
    // Will hopefully eventually replace most/all with PIXI rendered controls.
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

function cardStrFmt(val, suit) {
    return val + " of " + suit;
}
