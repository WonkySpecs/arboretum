from lobby_messages import ReadyCheckMessage
from arboretum.clients.ws_client import WSClient
from arboretum.game_runner import GameRunner
import asyncio
import json


class Lobby:
    MAX_PLAYERS = 4

    def __init__(self, name, creator_ws):
        self.name = name
        self.creator = creator_ws
        self.connected = [creator_ws]
        self.ready_checks = [False]
        self.game_runner = None

    def num_players(self):
        return len(self.connected)

    def can_join(self):
        return len(self.connected) <= self.MAX_PLAYERS

    def join(self, new_client):
        self.connected.append(new_client)
        self.ready_checks.append(False)

    def disconnect(self, client):
        i = self.connected.index(client)
        self.connected.pop(i)
        self.ready_checks.pop(i)

    def can_start(self):
        return 2 <= len(self.connected) <= self.MAX_PLAYERS

    async def send_ready_checks(self):
        await self.broadcast(ReadyCheckMessage())

    def ready(self, client):
        i = self.connected.index(client)
        self.ready_checks[i] = True
        if all(self.ready_checks):
            return GameRunner([WSClient(ws) for ws in self.connected])

    def empty(self):
        return not self.connected

    async def broadcast(self, msg):
        await asyncio.gather(*[client.send(msg.serialize()) for client in self.connected])
