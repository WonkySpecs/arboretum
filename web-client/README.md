The web client is designed as a set of component objects, each with a defined set of responsibilities, which react to a) inputs (clicks) from the user, and b) messages received from the websocket connection to the game server. PIXI is used for rendering.

The components are:
- `appState`: Holds references to the PIXI app and containers. Responsible for laying out sprites within containers.
- `gameState`: Stores the state of game in plain values/objects. This is the one I'm not sure is necessary, but seems reasonable to keep separate from the state of the 'view', which `appState` represents.
- `stateSync`: The main reactive component of the program, it is responsible for modifying the game and app states in a way that keeps them consistent.
- `spriteBuilder`: Builds sprite instances using preloaded textures.
- `messageHandler`: Parses incoming messages from the websocket connection to the server, calls methods on the `stateSync`.
- `interactionHandler`: Sprite interaction handlers, `<sprite>.on('<action>', ... `, are bound to functions of this object.
