window.onload = function() {
    let app = new PIXI.Application({width: 600, height: 400, antialias: true});
    document.body.appendChild(app.view);
    PIXI.loader
        .add("testImage.png")
        .load(() => texturesLoaded(app, ws))
}

function texturesLoaded(app, ws) {
    let sprite = new PIXI.Sprite(
        PIXI.loader.resources["testImage.png"].texture);
    app.stage.addChild(sprite);
}

