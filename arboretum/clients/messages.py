from enum import Enum
from typing import Optional

from arboretum.game.data import Card, Pos


class MessageType(Enum):
    DRAW = "draw"
    DISCARD = "discard"
    PLAYED = "played"
    CARD_TAKEN = "taken"


class Message:
    def __init__(self,
                 msg_type: MessageType,
                 card: Optional[Card] = None,
                 player_num: Optional[int] = None,
                 pos: Optional[Pos] = None):
        self.msg_type = msg_type
        self.card = card
        self.player_num = player_num
        self.pos = pos

    def __str__(self):
        return f"{self.msg_type}[card: {self.card}, player: {self.player_num}, pos: {self.pos}]"


class DrawMessage(Message):
    def __init__(self, card: Card):
        super().__init__(MessageType.DRAW, card=card)


class DiscardMessage(Message):
    def __init__(self, card: Card, player_num: int):
        super().__init__(MessageType.DISCARD, card=card, player_num=player_num)


class PlayMessage(Message):
    def __init__(self, card: Card, pos: Pos, player_num: int):
        super().__init__(MessageType.PLAYED, card=card, pos=pos, player_num=player_num)


class CardTakenMessage(Message):
    def __init__(self, player_num: Optional[int]):
        super().__init__(MessageType.CARD_TAKEN, player_num=player_num)
