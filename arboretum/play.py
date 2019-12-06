from typing import Tuple, Optional, Dict

from arboretum.clients.base_client import BaseClient
from arboretum.clients.messages import DrawMessage, PlayMessage, CardTakenMessage, DiscardMessage
from arboretum.clients.random_robot import RandomRobot
from arboretum.game.data import Game, DrawTarget, Card, Suit, Pos, Player
from arboretum.game.scoring import score_game


class Match:
    def __init__(self, clients):
        self.game = Game(len(clients))
        self.player_clients = { p: c for (p, c) in zip(self.game.players, clients) }
        for player in self.game.players:
            for c in player.hand:
                self.player_clients[player].receive(DrawMessage(card=c))

    def run(self):
        while not self.game.finished:
            cur_client = self.player_clients[self.game.current_player]
            for i in range(2):
                valid = False
                while not valid:
                    draw_type, target = next(cur_client.gen_draw)
                    valid, message = self.game.is_valid_draw_target(draw_type, target)
                    if not valid:
                        print(message)
                    else:
                        card = self.game.draw(draw_type, target)
                        self.game.current_player.hand.append(card)
                        cur_client.receive(DrawMessage(card=card))
                        for client in self.player_clients.values():
                            client.receive(
                                CardTakenMessage(
                                    player_num=target if target is not None else -1))

            valid = False
            while not valid:
                play_card, pos, discard_card = next(cur_client.gen_play)
                valid, message = self.game.current_player.is_valid_play(play_card, pos, discard_card)
                if not valid:
                    print(message)
                else:
                    self.game.current_player.play(play_card, pos, discard_card)
                    for client in self.player_clients.values():
                        client.receive(PlayMessage(play_card, pos, self.game.current_player.num))
                        client.receive(DiscardMessage(discard_card, self.game.current_player.num))
            self.game.player_turn = (self.game.player_turn + 1) % len(self.game.players)

    def score(self):
        return score_game(self.game.players)
