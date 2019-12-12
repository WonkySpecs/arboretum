import random
from collections import namedtuple
from enum import Enum, auto
from typing import List, Dict, Tuple, Optional, Iterator

Pos = namedtuple("Pos", ["x", "y"])


class Suit(Enum):
    CASSIA = "Cassia"
    SPRUCE = "Spruce"
    DOGWOOD = "Dogwood"
    MAPLE = "Maple"
    JACARANDA = "Jacaranda"
    ROYAL_POINCIANA = "Royal Poinciana"
    CHERRY_BLOSSOM = "Cherry Blossom"
    OAK = "Oak"
    TULIP_POPLAR = "Tulip Poplar"
    WILLOW = "Willow"

    @staticmethod
    def shortcuts() -> Dict[str, 'Suit']:
        return {
            "c": Suit.CASSIA,
            "s": Suit.SPRUCE,
            "d": Suit.DOGWOOD,
            "m": Suit.MAPLE,
            "j": Suit.JACARANDA,
            "rp": Suit.ROYAL_POINCIANA,
            "tp": Suit.TULIP_POPLAR,
            "o": Suit.OAK,
            "cb": Suit.CHERRY_BLOSSOM,
            "w": Suit.WILLOW,
        }

    @staticmethod
    def from_str(s):
        if s in Suit.shortcuts():
            return Suit.shortcuts()[s]

        for suit in Suit:
            if suit.value == s:
                return suit
        raise ValueError(f"No suit '{s}'")

    def short_name(self):
        reversed_shortcuts = {
            v: k for k, v in Suit.shortcuts().items()
        }
        return reversed_shortcuts[self]


class Card:
    __slots__ = ("suit", "value")

    def __init__(self, suit: Suit, value: int):
        self.suit = suit
        self.value = value

    def __repr__(self):
        return f"{self.value} {self.suit.value}"

    def __eq__(self, other):
        if not isinstance(other, Card):
            return False
        return self.suit == other.suit and self.value == other.value

    def short_format(self):
        return f"{self.value}{self.suit.short_name():2}"


def new_deck(num_suits: int, chosen_suits: Optional[List[Suit]] = None) -> List[Card]:
    if chosen_suits and len(chosen_suits) != num_suits:
        raise ValueError(
            f"Supposed to generate deck with {num_suits} suits, but was given {len(chosen_suits)} chosen suits")
    suits = chosen_suits if chosen_suits else random.sample(list(Suit), k=num_suits)
    deck = [Card(suit, val) for suit in suits for val in range(1, 9)]
    random.shuffle(deck)
    return deck


class Arboretum:
    grid: Dict[Pos, Card]

    def __init__(self):
        self.grid = {}

    def is_valid_place_pos(self, pos: Pos) -> Tuple[bool, Optional[str]]:
        if not self.grid:
            if pos == Pos(0, 0):
                return True, None
            else:
                return False, "First card must be at 0, 0"

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

    def increasing_neighbours(self, pos: Pos) -> Iterator[Pos]:
        if pos not in self.grid:
            return iter([])
        val = self.grid[pos].value
        neighbours = self.neighbours(pos)
        return filter(lambda p: p in self.grid and self.grid[p].value > val, neighbours)

    def paths_for(self, suit: Suit) -> List[List[Card]]:
        """
        Get all paths beginning and ending with a card of the given suit.
        :param suit: the suit to start and end paths with.
        :return: A list of paths, which are lists of cards.
        """
        cards_in_suit = [(pos, card) for pos, card in self.grid.items() if card.suit == suit]
        if len(cards_in_suit) < 2:
            return []
        cards_in_suit.sort(key=lambda pos_card: pos_card[1].value, reverse=True)
        all_paths = []
        for start_pos, start_card in cards_in_suit[1:]:
            paths = list(self.bfs(start_pos, start_card.suit))
            if paths:
                all_paths.extend(paths)
                for new_path in paths:
                    for existing_path in all_paths:
                        if new_path[-1] == existing_path[0]:
                            joined = new_path + existing_path[1:]
                            all_paths.append(joined)
        return all_paths

    def bfs(self, pos: Pos, target_suit: Suit) -> Iterator[List[Card]]:
        queue = [(pos, [self.grid[pos]])]
        while queue:
            (cur_pos, path) = queue.pop(0)
            for next_pos in self.increasing_neighbours(cur_pos):
                next_path = path + [self.grid[next_pos]]
                if self.grid[next_pos].suit == target_suit:
                    yield next_path
                else:
                    queue.append((next_pos, next_path))


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

    def is_valid_play(self, to_place: Card, place_pos: Pos, to_discard: Card) -> Tuple[bool, Optional[str]]:
        if not any([to_place == c for c in self.hand]):
            return False, f"Cannot play card '{to_place}' because you don't have it"

        if not any([to_discard == c for c in self.hand]):
            return False, f"Cannot discard card '{to_discard}' because you don't have it"

        return self.arboretum.is_valid_place_pos(place_pos)

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
        self.player_turn = 0
        self.finished = False

        for player in self.players:
            for _ in range(Game.STARTING_CARDS):
                player.hand.append(self.deck.pop())

    @staticmethod
    def num_suits(num_players: int) -> int:
        if num_players in [2, 3, 4]:
            return num_players * 2 + 2
        raise ValueError("Number of players must be 2, 3, or 4")

    def is_valid_draw_target(self, target_discard: Optional[int]) -> Tuple[bool, Optional[str]]:
        if target_discard == None:
            if self.deck:
                return True, None
            else:
                exit(-1)
                return False, "No cards left in deck to draw"

        valid = len(self.players[target_discard].discard) > 0
        if valid:
            return True, None
        else:
            exit(-1)
            return False, f"Cannot take from player {target_discard}, they have no discard pile"

    def draw(self, target_discard: Optional[int]) -> Card:
        if not target_discard:
            drawn_card = self.deck.pop()
            if not self.deck:
                self.finished = True
            return drawn_card

        return self.players[target_discard].discard.pop()

    @property
    def current_player(self) -> Player:
        return self.players[self.player_turn]
