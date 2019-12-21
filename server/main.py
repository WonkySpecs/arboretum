import asyncio
import json
import websockets

from arboretum.clients.ws_client import WSClient
from arboretum.game_runner import GameRunner

HOST = '0.0.0.0'
PORT = 5050

lobbies = {}

next_user_num = 0


def new_game(sockets):
    return GameRunner([WSClient(ws) for ws in sockets])


async def connect(ws, _):
    in_lobby = None
    p_num = None
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
            if to_join != in_lobby:
                if in_lobby:
                    lobbies[in_lobby].remove(ws)
                    if not lobbies[in_lobby]:
                        print(f"Closing empty lobby {in_lobby}")
                        del lobbies[in_lobby]

                if to_join != in_lobby:
                    in_lobby = to_join
                    print(f"User {user_num} joined room {to_join}")
                    if to_join in lobbies:
                        lobbies[to_join].append(ws)
                    else:
                        print(f"Opening lobby {to_join}")
                        lobbies[to_join] = [ws]
                    p_num = len(lobbies[to_join])

        elif parsed["message_type"] == "start":
            in_lobby_count = len(lobbies[in_lobby])
            if in_lobby_count < 2 or in_lobby_count > 4:
                print(f"Cannot start game with {in_lobby_count} players")
            else:
                print(f"User {user_num} started game {in_lobby} with {in_lobby_count} players")
                game = new_game(lobbies[in_lobby])
                await asyncio.gather(*[client.send(json.dumps({"message_type": "ready_check"}))
                                       for client in lobbies[in_lobby] if client != ws])
                break

        elif parsed["message_type"] == "ready":
            print(f"User {user_num} is ready")
            break

    if game:
        print("Game starting")
        await asyncio.sleep(1)
        await game.run()
        print(game.score())
    else:
        await ws.wait_closed()


if __name__ == "__main__":
    print(f"Serving web socket connections on {HOST}:{PORT}")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(
        websockets.serve(connect, HOST, PORT))
    loop.run_forever()
