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
    print(sockets)
    return GameRunner([WSClient(ws) for ws in sockets])

async def connect(ws, _):
    lobby_id = None
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
            if lobby_id:
                lobbies[lobby_id].remove(ws)
                if not lobbies[lobby_id]:
                    print(f"Closing lobby {lobby_id}")
                    del lobbies[lobby_id]

            if parsed["room"] != lobby_id:
                print(f"User {user_num} joined room {parsed['room']}")
                lobby_id = parsed["room"]
                if lobby_id in lobbies:
                    lobbies[lobby_id].append(ws)
                else:
                    lobbies[lobby_id] = [ws]
                p_num = len(lobbies[lobby_id])

        elif parsed["message_type"] == "start":
            in_lobby_count = len(lobbies[lobby_id])
            if in_lobby_count < 2 or in_lobby_count > 4:
                print(f"Cannot start game with {in_lobby_count} players")
            else:
                print(f"User {user_num} started game {lobby_id} with {in_lobby_count} players")
                game = new_game(lobbies[lobby_id])
                print("Game built")
                print([c for c in lobbies[lobby_id] if c != ws])
                await asyncio.gather(*[client.send(json.dumps({"message_type": "game_starting"})) for client in lobbies[lobby_id] if client != ws])
                break

        elif parsed["message_type"] == "ready":
            print("Player {player_num} is ready")
            break

    if game:
        print("Game starting")
        await asyncio.sleep(1)
        await game.run()
        print(game.score())


if __name__ == "__main__":
    print(f"Serving web socket connections on {HOST}:{PORT}")
    loop = asyncio.get_event_loop()
    loop.run_until_complete(
        websockets.serve(connect, HOST, PORT))
    loop.run_forever()
