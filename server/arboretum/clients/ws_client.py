import json
import asyncio

from arboretum.clients.messages import Message
from arboretum.clients.base_client import BaseClient
from arboretum.game.data import Card, Pos, DrawTarget

class WSClient(BaseClient):
    def __init__(self, ws):
        super(WSClient, self).__init__()
        self.ws = ws
        self.next = None

    async def next_message(self, target_msg_type: str):
        async for message in self.ws:
            msg_type, play = WSClient.parse_message(message)
            if msg_type == target_msg_type:
                self.next = play
                break

    def draw_generator(self):
        while True:
            try:
                asyncio.get_event_loop().run_until_complete(
                    self.next_message("draw"))
            except RuntimeError:
                print("YES IM IGNORING THIS")
            if not self.next:
                raise RuntimeError("WSClient draw generator failed to set next draw")
            y = self.next
            self.next = None
            yield y

    def play_generator(self):
        while True:
            try:
                asyncio.get_event_loop().run_until_complete(
                    self.next_message("play"))
            except RuntimeError:
                print("YES IM IGNORING THIS")
            if not self.next:
                raise RuntimeError("WSClient play generator failed to set next play")
            y = self.next
            self.next = None
            yield y

    def receive(self, msg):
        print("Yup I definitely received that")

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
