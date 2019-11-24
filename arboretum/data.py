import random
from collections import namedtuple
from enum import Enum
from typing import List, Dict, Tuple, Optional

Pos = namedtuple("Pos", ["x", "y"])


class Suit(Enum):
    CASSIA = "Cassia"
    MAGNOLIA = "Magnolia"
    DOGWOOD = "Dogwood"
    MAPLE = "Maple"
    JACARANDA = "Jacaranda"
    ROYAL_POINCIANA = "Royal Poinciana"
    OLIVE = "Olive"
    OAK = "Oak"
    LILAC = "Lilac"
    WILLOW = "Willow"


class Card:
    __slots__ = ("suit", "value")

    def __init__(self, suit: Suit, value: int):
        self.suit = suit
        self.value = value

    def __repr__(self):
        return f"{self.value} of {self.suit.value}"


def new_deck(num_suits: int, chosen_suits: Optional[List[Suit]] = None) -> List[Card]:
    if chosen_suits and len(chosen_suits) != num_suits:
        raise ValueError(
            f"Supposed to generate deck with {num_suits} suits, but was given {len(chosen_suits)} chosen suits")
    suits = chosen_suits if chosen_suits else random.choices(list(Suit), k=num_suits)
    deck = [Card(suit, val) for suit in suits for val in range(1, 9)]
    random.shuffle(deck)
    return deck


class Arboretum:
    grid: Dict[Pos, Card]

    def __init__(self):
        self.grid = {}

    def is_valid_play_pos(self, pos: Pos) -> Tuple[bool, Optional[str]]:
        if pos in self.grid:
            return False, "Cannot place on top of existing card"

        for existing_pos in self.grid.keys():
            if pos in self.neighbours(existing_pos):
                return True, None

        return False, "Card must be placed next to an existing card"

    def add_card(self, card: Card, pos: Pos):
        self.grid[pos] = card

    @staticmethod
    def neighbours(pos: Pos) -> List[Pos]:
        return [
            Pos(pos.x, pos.y + 1),
            Pos(pos.x, pos.y - 1),
            Pos(pos.x + 1, pos.y),
            Pos(pos.x - 1, pos.y),
        ]

    def paths_for(self, suit: Suit) -> List[List[Card]]:
        cards_in_suit = [(pos, card) for pos, card in self.grid.items() if card.suit == suit]
        if len(cards_in_suit) < 2:
            return [[]]
        cards_in_suit.sort(key=lambda pos_card: pos_card[1].value, reverse=True)
        for start_pos, start_card in cards_in_suit[1:]:
            print(start_card, start_pos)
        return [[]]


class Player:
    __slots__ = ("num", "hand", "discard", "arboretum")

    num: int
    hand: List[Card]
    discard: List[Card]
    arboretum: Arboretum

    def __init__(self, num):
        self.num = num
        self.hand = []
        self.discard = []
        self.arboretum = Arboretum()

    def is_valid_play(self, to_play: Card, pos: Pos, to_discard: Card) -> Tuple[bool, Optional[str]]:
        if to_play not in self.hand:
            return False, "Cannot play card you don't have"

        if to_discard not in self.hand:
            return False, "Cannot discard card you don't have"

        return self.arboretum.is_valid_play_pos(pos)

    def play(self, to_play: Card, pos: Pos, to_discard: Card):
        self.arboretum.add_card(to_play, pos)
        self.hand.remove(to_play)

        self.discard.append(to_discard)
        self.hand.remove(to_discard)


class Game:
    STARTING_CARDS = 7
    players: List[Player]

    def __init__(self, num_players: int, chosen_suits: Optional[List[Suit]] = None):
        self.players = [Player(i) for i in range(num_players)]
        self.deck = new_deck(self.num_suits(num_players), chosen_suits)

        for player in self.players:
            for _ in range(Game.STARTING_CARDS):
                player.hand.append(self.deck.pop())

    @staticmethod
    def num_suits(num_players: int) -> int:
        if num_players in [2, 3, 4]:
            return num_players * 2 + 2
        raise ValueError("Number of players must be 2, 3, or 4")
