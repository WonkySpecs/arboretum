import asyncio
import json
import websockets

from lobby_messages import CreatedMessage, JoinedMessage, PlayerJoinedMessage, PlayerLeftMessage
from lobby import Lobby

HOST = '0.0.0.0'
PORT = 5050

lobbies = {}

next_user_num = 0


async def connect(ws, _):
    current_lobby_id = None
    global lobbies
    global next_user_num
    user_num = next_user_num
    next_user_num += 1
    game = None
    print(f"User {user_num} connected")
    async for message in ws:
        parsed = json.loads(message)
        print(f"User {user_num} received {parsed}")
        if parsed["message_type"] == "join":
            to_join = parsed["lobby"]
            if to_join != current_lobby_id:
                if current_lobby_id:
                    lobbies[current_lobby_id].disconnect(ws)
                    if lobbies[current_lobby_id].empty():
                        print(f"Closing empty lobby {current_lobby_id}")
                        del lobbies[current_lobby_id]
                    else:
                        await lobbies[current_lobby_id].broadcast(PlayerLeftMessage())

                current_lobby_id = to_join
                print(f"User {user_num} joined room {to_join}")
                if to_join in lobbies:
                    lobbies[to_join].join(ws)
                    await lobbies[to_join].broadcast(PlayerJoinedMessage())
                    await ws.send(JoinedMessage(to_join, lobbies[to_join].num_players()).serialize())
                else:
                    print(f"Opening lobby {to_join}")
                    lobbies[to_join] = Lobby(to_join, ws)
                    await ws.send(CreatedMessage(to_join).serialize())

        elif parsed["message_type"] == "start":
            lobby = lobbies[current_lobby_id]
            if not lobby.can_start():
                print(f"Cannot start game with {lobby.num_players()} players")
            else:
                print(f"User {user_num} started ready checks for {current_lobby_id} with {lobby.num_players()} players")
                await lobby.send_ready_checks()

        elif parsed["message_type"] == "ready":
            game = lobbies[current_lobby_id].ready(ws)
            break

    if game:
        print(f"All players ready, starting game {current_lobby_id}")
        del lobbies[current_lobby_id]
        await game.run()
    else:
        await ws.wait_closed()


if __name__ == "__main__":
    print(f"Serving web socket connections on {HOST}:{PORT}")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(
        websockets.serve(connect, HOST, PORT))
    loop.run_forever()
