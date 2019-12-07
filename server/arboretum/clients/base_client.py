from typing import Tuple, Optional, Iterator

from arboretum.game.data import Card, Pos, DrawTarget


class BaseClient:
    def __init__(self):
        self.gen_play = self.play_generator()
        self.gen_draw = self.draw_generator()

    def draw_generator(self) -> Iterator[Tuple[DrawTarget, Optional[int]]]:
        self.raise_not_implemented("draw_generator")

    def play_generator(self) -> Iterator[Tuple[Card, Pos, Card]]:
        self.raise_not_implemented("play_generator")

    def receive(self, msg) -> None:
        self.raise_not_implemented("receive")

    def raise_not_implemented(self, func_name):
        raise NotImplementedError(f"{func_name} not implemented for {self.__class__}")