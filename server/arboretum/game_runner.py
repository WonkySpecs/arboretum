from typing import Tuple, Optional, Dict
import asyncio

from arboretum.clients.base_client import BaseClient
from arboretum.clients.messages import DrawMessage, PlayMessage, CardTakenMessage, DiscardMessage
from arboretum.clients.random_robot import RandomRobot
from arboretum.game.data import Game, DrawTarget, Card, Suit, Pos, Player
from arboretum.game.scoring import score_game


class GameRunner:
    game: Game
    player_clients: Dict[Player, BaseClient]

    def __init__(self, clients):
        self.game = Game(len(clients))
        self.player_clients = { p: c for (p, c) in zip(self.game.players, clients) }

    async def run(self):
        for player in self.game.players:
            for c in player.hand:
                await self.broadcast(DrawMessage(card=c), [self.player_clients[player]])

        while not self.game.finished:
            for _ in range(2):
                await self.handle_draw()
            await self.handle_move()

            self.game.player_turn = (self.game.player_turn + 1) % len(self.game.players)

    async def handle_draw(self):
        valid = False
        while not valid:
            draw_type, target = await GameRunner.next_input(self._cur_client, "draw")
            valid, message = self.game.is_valid_draw_target(draw_type, target)
            if not valid:
                print(message)
            else:
                card = self.game.draw(draw_type, target)
                self.game.current_player.hand.append(card)
                await self.broadcast(DrawMessage(card=card), [self._cur_client])
                await self.broadcast(
                    CardTakenMessage(player_num=target if target is not None else -1))

    async def handle_move(self):
        valid = False
        while not valid:
            play_card, pos, discard_card = await GameRunner.next_input(self._cur_client, "play")
            valid, message = self.game.current_player.is_valid_play(play_card, pos, discard_card)
            if not valid:
                print(message)
            else:
                self.game.current_player.play(play_card, pos, discard_card)
                await self.broadcast(PlayMessage(play_card, pos, self.game.current_player.num))
                await self.broadcast(DiscardMessage(discard_card, self.game.current_player.num))

    @property
    def _cur_client(self):
        return self.player_clients[self.game.current_player]

    def score(self):
        return score_game(self.game.players)

    @staticmethod
    async def next_input(client, target_type):
        if target_type == "draw":
            if client.is_async:
                return await client.gen_draw.__anext__()
            else:
                return next(client.gen_draw)
        elif target_type == "play":
            if client.is_async:
                return await client.gen_play.__anext__()
            else:
                return next(client.gen_play)
        raise RuntimeException(f"Unknown target_type {target_type}")

    async def broadcast(self, message, clients=None):
        clients = clients if clients else self.player_clients.values()
        for sync_client in [c for c in clients if not c.is_async]:
            sync_client.receive(message)
        await asyncio.gather(*[c.receive(message) for c in clients if c.is_async])