import random
from collections import defaultdict
from typing import Dict

from arboretum.clients.base_client import BaseClient
from arboretum.clients.messages import MessageType
from arboretum.game.data import DrawTarget, Pos


class RandomRobot(BaseClient):
    def __init__(self, player_num, cards_in_deck):
        super(RandomRobot, self).__init__()
        self.num = player_num
        self.hand = []
        self.discard_counts: Dict[int, int] = defaultdict(int)  # player_num: count
        self.placed_at = []
        self.cards_in_deck = cards_in_deck

    def draw_generator(self):
        while True:
            choices = [(DrawTarget.PLAYER_DISCARD, n) for n, c in self.discard_counts.items() if c > 0]
            if self.cards_in_deck > 0:
                choices.append((DrawTarget.DECK, None))

            yield random.choice(choices)

    def move_generator(self):
        while True:
            to_play, to_discard = random.sample(self.hand, k=2)
            self.hand.remove(to_play)
            self.hand.remove(to_discard)
            yield to_play, \
                  random.choice(self.available_places()), \
                  to_discard

    def available_places(self):
        if not self.placed_at:
            return [Pos(0, 0)]

        def neighbours(p):
            return [Pos(p.x, p.y - 1), Pos(p.x, p.y + 1), Pos(p.x - 1, p.y), Pos(p.x + 1, p.y)]

        unique_neighbours = set([n for p in self.placed_at for n in neighbours(p)])
        return list(unique_neighbours - set(self.placed_at))

    def receive(self, msg):
        if msg.msg_type == MessageType.DRAW:
            self.hand.append(msg.card)
        elif msg.msg_type == MessageType.DISCARD:
            self.discard_counts[msg.player_num] += 1
        elif msg.msg_type == MessageType.PLAYED:
            if msg.player_num == self.num:
                self.placed_at.append(msg.pos)
        elif msg.msg_type == MessageType.CARD_TAKEN:
            if msg.player_num == -1:
                self.cards_in_deck -= 1
            else:
                self.discard_counts[msg.player_num] -= 1
