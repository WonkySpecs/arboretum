import json
import asyncio  # type: ignore

from arboretum.clients.base_client import AsyncBaseClient
from arboretum.game.data import Card, Pos, Suit


class WSClient(AsyncBaseClient):
    def __init__(self, ws):
        super(WSClient, self).__init__()
        self.ws = ws

    async def next_message(self, target_msg_type: str):
        async for message in self.ws:
            d = json.load(message)
            if d['message_type'] != target_msg_type:
                continue

            if d['message_type'] == 'draw':
                return d.get('draw_target')
            elif d['message_type'] == 'play':
                return (
                    Card(Suit.from_str(d['play_suit']), int(d['play_val'])),
                    Pos(x=int(d['play_x']), y=int(d['play_y'])),
                    Card(Suit.from_str(d['discard_suit']), int(d['discard_val'])),
                    d['discard_pile'])
            raise RuntimeError(
                f"Unknown message type '{d['msg_type']}'. Message {message}")

    async def draw_generator(self):
        while True:
            yield await self.next_message('draw')

    async def move_generator(self):
        while True:
            yield await self.next_message('draw')

    async def receive(self, msg):
        await self.ws.send(msg.serialize())
