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