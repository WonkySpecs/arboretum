import json
import asyncio

from arboretum.clients.messages import Message
from arboretum.clients.base_client import AsyncBaseClient
from arboretum.game.data import Card, Pos, DrawTarget

class WSClient(AsyncBaseClient):
    def __init__(self, ws):
        super(WSClient, self).__init__()
        self.ws = ws

    async def next_message(self, target_msg_type: str):
        async for message in self.ws:
            msg_type, play = WSClient.parse_message(message)
            if msg_type == target_msg_type:
                self.next = play
                break

    async def draw_generator(self):
        while True:
            async for message in self.ws:
                msg_type, draw = WSClient.parse_message(message)
                if msg_type == "draw":
                    yield draw

    async def play_generator(self):
        while True:
            async for message in self.ws:
                msg_type, play = WSClient.parse_message(message)
                if msg_type == "play":
                    yield play

    def receive(self, msg):
        print(f"Received {msg}, one day maybe I'll even use it")

    @staticmethod
    def parse_message(msg):
        d = json.load(msg)
        if d['msg_type'] == 'draw':
            return (DrawTarget.from_str(d['target_type']), d['target_num'])
        elif d['msg_type'] == 'play':
            return (
                Card(Suit.from_str(d['play_suit']), int(d['play_val'])),
                Pos(x=int(d['play_x']), y=int(d['play_y'])),
                Card(Suit.from_str(d['discard_suit']), int(d['discard_val'])))
        raise RuntimeError(f"Unknown message type '{d['msg_type']}'. Message {msg}")
