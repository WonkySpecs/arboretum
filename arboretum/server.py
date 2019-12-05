import asyncio
import json

import websockets

HOST = '0.0.0.0'
PORT = 5050

lobbies = {}


async def connect(ws, _):
    print(f"User connected")
    lobby_id = None
    async for message in ws:
        parsed = json.loads(message)
        if parsed["message_type"] == "join":
            if lobby_id:
                lobbies[lobby_id].remove(ws)
                if not lobbies[lobby_id]:
                    print(f"Closing lobby {lobby_id}")
                    del lobbies[lobby_id]

            if parsed["room"] != lobby_id:
                print(f"User joined room {parsed['room']}")
                lobby_id = parsed["room"]
                if lobby_id in lobbies:
                    lobbies[lobby_id].append(ws)
                else:
                    lobbies[lobby_id] = [ws]
        elif parsed["message_type"] == "start":
            in_lobby_count = len(lobbies[lobby_id])
            if in_lobby_count < 2 or in_lobby_count > 4:
                print(f"Cannot start game with {in_lobby_count} players")
            else:
                print(f"Starting game {lobby_id} with {in_lobby_count} players")
        elif parsed["message_type"] == "disconnect":
            if lobby_id:
                print(f"User disconnecting from {lobby_id}")
                lobbies[lobby_id].remove(ws)


if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(
        websockets.serve(connect, HOST, PORT))
    print(f"Serving web socket connections on {HOST}:{PORT}")
    asyncio.get_event_loop().run_forever()
