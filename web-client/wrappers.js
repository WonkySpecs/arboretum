class Arboretum {
    constructor(width, height, spriteScale) {
        this.container = new PIXI.Container();
        this.width = width;
        this.height = height;
        this.spriteScale = spriteScale;
        this.gridPadding = 3;
    }

    addSprite(sprite, gridX, gridY) {
        sprite.scale.set(this.spriteScale);
        // Grid position 0, 0 is at the center of the arboretum.
        sprite.x = this.width / 2 - sprite.width / 2 + gridX * (sprite.width + this.gridPadding);
        sprite.y = this.height / 2 - sprite.height / 2 + gridY * (sprite.height + this.gridPadding);
        this.container.addChild(sprite);
    }

    addToStage(stage, x, y) {
        this.container.x = x;
        this.container.y = y;
        stage.addChild(this.container);
    }
}

class GameInfo {
    constructor() {
        this.title = document.getElementById("gameInfoTitle");
        this.wrapper = document.getElementById("gameInfo")
        this.info = document.createElement("p");
        this.playInfo = document.createElement("p");
        this.discardInfo = document.createElement("p");
        this.myTurn = false;
    }

    showDrawPhase(pNum) {
        this.myTurn = pNum === undefined;
        if (this.myTurn) {
            this.title.textContent = "Your draw phase";
            this.info.textContent = "Choose where to draw your first card from";
        } else {
            this.title.textContent = "Player " + (pNum + 1) + "'s draw phase";
            this.info.textContent = "They are deciding where to draw from";
        }
        this.wrapper.innerHTML = "";
        this.wrapper.appendChild(this.info);
    }

    secondDraw() {
        if (this.myTurn) {
            this.info.textContent = "Choose where to draw your second card from";
        } else {
            this.info.textContent = "They are deciding where to draw their second card from";
        }
    }

    showMovePhase(pNum) {
        this.myTurn = pNum === undefined;
        if (this.myTurn) {
            this.title.textContent = "Your move phase";
            this.discardInfo.textContent = "Choose a card to discard";
            this.playInfo.textContent = "Choose a card to play and a place to play it";
            document.getElementById("confirmMoveBtn").style.display = "inherit";
        } else {
            this.title.textContent = "Player " + (pNum + 1) + "'s move phase";
            this.discardInfo.textContent = "They are choosing what to discard";
            this.playInfo.textContent = "They are choosing what to play";
        }
        this.wrapper.innerHTML = "";
        this.wrapper.appendChild(this.discardInfo);
        this.wrapper.appendChild(this.playInfo);
    }

    setMoveInfo(playCard, playPos, discardCard) {

        if (playCard != null) {
            let x = playPos[0];
            let y = playPos[1];
            this.playInfo.textContent = "Playing: " + cardStrFmt(playCard.val, playCard.suit)
                                        + " at (" + x + ", " + y + ")";
        } else {
            this.playInfo.textContent = "Choose a card to play and a place to play it";
        }

        if (discardCard != null) {
            this.discardInfo.textContent = "Discarding: " + cardStrFmt(discardCard.val, discardCard.suit);
        } else {
            this.discardInfo.textContent = "Choose a card to discard";
        }
    }
}

class LobbyInfo {
    constructor() {
        this.lobbyNameEl = document.getElementById("lobbyName");
        this.numPlayersEl = document.getElementById("lobbyNumPlayers");
        this.lobbyName = null;
        this.numPlayers = null;
    }

    setLobby(name, numPlayers) {
        this.lobbyName = name;
        this.numPlayers = numPlayers;
        this.setText();
    }

    decrementPlayers() {
        this.numPlayers = this.numPlayers - 1;
        this.setText();
    }

    incrementPlayers() {
        this.numPlayers = this.numPlayers + 1;
        this.setText();
    }

    setText() {
        this.lobbyNameEl.textContent = "In lobby: " + this.lobbyName;
        this.numPlayersEl.textContent = "Current players: " + this.numPlayers + "/4";
    }
}
