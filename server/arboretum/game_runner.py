from typing import Dict
import asyncio

from arboretum.clients.base_client import BaseClient
from arboretum.clients.messages import DrawMessage, PlayMessage, CardTakenMessage, DiscardMessage, GameStartMessage
from arboretum.game.data import Game, Player
from arboretum.game.scoring import score_game


class GameRunner:
    game: Game
    player_clients: Dict[Player, BaseClient]

    def __init__(self, clients):
        self.game = Game(len(clients))
        self.player_clients = {p: c for (p, c) in zip(self.game.players, clients)}

    async def run(self):
        for p, c in self.player_clients.items():
            await self.broadcast(
                GameStartMessage(
                    player_num=p.num,
                    num_players=len(self.game.players),
                    cards_in_deck=len(self.game.deck)),
                [c])

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
            target_discard = await GameRunner.next_input(self._cur_client, "draw")
            valid, message = self.game.is_valid_draw_target(target_discard)
            if not valid:
                print(message)
            else:
                card = self.game.draw(target_discard)
                self.game.current_player.hand.append(card)
                await self.broadcast(DrawMessage(card=card), [self._cur_client])
                await self.broadcast(CardTakenMessage(
                    player_num=self.game.current_player.num, target_discard=target_discard))

    async def handle_move(self):
        valid = False
        while not valid:
            play_card, play_pos, discard_card = \
                await GameRunner.next_input(self._cur_client, "play")
            valid, message = self.game.current_player.is_valid_play(
                play_card,
                play_pos,
                discard_card)

            if not valid:
                print(message)
            else:
                self.game.current_player.play(
                    play_card,
                    play_pos,
                    discard_card)
                await self.broadcast(PlayMessage(
                    player_num=self.game.current_player.num,
                    card=play_card,
                    pos=play_pos))

                await self.broadcast(DiscardMessage(
                    player_num=self.game.current_player.num,
                    card=discard_card))

    @property
    def _cur_client(self):
        return self.player_clients[self.game.current_player]

    @property
    def _cur_player_num(self):
        return self.game.current_player.num

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
                return await client.gen_move.__anext__()
            else:
                return next(client.gen_move)
        raise RuntimeError(f"Unknown target_type {target_type}")

    async def broadcast(self, message, clients=None):
        clients = clients if clients else self.player_clients.values()
        for sync_client in [c for c in clients if not c.is_async]:
            sync_client.receive(message)
        await asyncio.gather(*[c.receive(message) for c in clients if c.is_async])
