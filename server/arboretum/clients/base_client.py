from typing import Tuple, Optional, Iterator

from arboretum.game.data import Card, Pos, DrawTarget


class BaseClient:
    def __init__(self, is_async=False):
        self.is_async = is_async
        self.gen_move = self.move_generator()
        self.gen_draw = self.draw_generator()

    def draw_generator(self) -> Iterator[Tuple[DrawTarget, Optional[int]]]:
        self.raise_not_implemented("draw_generator")

    def move_generator(self) -> Iterator[Tuple[Card, Pos, Card, int]]:
        self.raise_not_implemented("move_generator")

    def receive(self, msg) -> None:
        self.raise_not_implemented("receive")

    def raise_not_implemented(self, func_name):
        raise NotImplementedError(f"{func_name} not implemented for {self.__class__}")


class AsyncBaseClient(BaseClient):
    def __init__(self):
        super(AsyncBaseClient, self).__init__(is_async=True)

    async def draw_generator(self) -> Iterator[Tuple[DrawTarget, Optional[int]]]:
        self.raise_not_implemented("(async) draw_generator")

    async def move_generator(self) -> Iterator[Tuple[Card, Pos, Card, int]]:
        self.raise_not_implemented("(async) move_generator")

    async def receive(self, msg) -> None:
        self.raise_not_implemented("(async) receive")
