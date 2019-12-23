from enum import Enum
from typing import Optional
import json

from arboretum.game.data import Card, Pos


class MessageType(Enum):
    DRAW = "draw"
    DISCARD = "discard"
    PLAYED = "played"
    CARD_TAKEN = "taken"
    GAME_START = "game_start"


class Message:
    def __init__(self,
                 msg_type: MessageType,
                 player_num: int):
        self.msg_type = msg_type
        self.player_num = player_num

    def serialize(self):
        d = {k: v for k, v in self.__dict__.items() if v is not None}
        if "card" in d:
            d["card_suit"] = d["card"].suit.value
            d["card_val"] = d["card"].value
            del d["card"]

        if "pos" in d:
            d["x"] = d["pos"].x
            d["y"] = d["pos"].y
            del d["pos"]

        d["message_type"] = d["msg_type"].value
        del d["msg_type"]
        return json.dumps(d)


class DrawMessage(Message):
    def __init__(self, card: Card):
        super().__init__(MessageType.DRAW, -1)
        self.card = card


class DiscardMessage(Message):
    def __init__(self, card: Card, player_num: int):
        super().__init__(
            MessageType.DISCARD,
            player_num=player_num)
        self.card = card


class PlayMessage(Message):
    def __init__(self, card: Card, pos: Pos, player_num: int):
        super().__init__(MessageType.PLAYED, player_num=player_num)
        self.card = card
        self.pos = pos


class CardTakenMessage(Message):
    def __init__(self, player_num: int, target_discard: Optional[int] = None):
        super().__init__(MessageType.CARD_TAKEN, player_num=player_num)
        self.target_discard = target_discard


class GameStartMessage(Message):
    def __init__(self, player_num: int, num_players: int, cards_in_deck: int):
        super().__init__(MessageType.GAME_START, player_num)
        self.num_players = num_players
        self.cards_in_deck = cards_in_deck
