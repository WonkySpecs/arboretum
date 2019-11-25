import unittest

from arboretum.data import Suit, Card, Player
from arboretum.scoring import score_path, calc_player_suit_values


class GameTest(unittest.TestCase):
    def test_score_path_perfect_path(self):
        path = [Card(Suit.OAK, i) for i in range(1, 9)]
        self.assertEqual(score_path(path), 19)

    def test_score_path_too_short_for_double(self):
        path = [Card(Suit.CASSIA, 3), Card(Suit.CASSIA, 4), Card(Suit.CASSIA, 7)]
        self.assertEqual(score_path(path), 3)

    def test_score_path_doubled(self):
        path = [Card(Suit.CASSIA, 3), Card(Suit.CASSIA, 4), Card(Suit.CASSIA, 6), Card(Suit.CASSIA, 7)]
        self.assertEqual(score_path(path), 8)

    def test_score_path_missed_double(self):
        path = [Card(Suit.CASSIA, 3), Card(Suit.OAK, 4), Card(Suit.CASSIA, 6), Card(Suit.CASSIA, 7)]
        self.assertEqual(score_path(path), 4)

    def test_score_path_from_one(self):
        path = [Card(Suit.CASSIA, 1), Card(Suit.OAK, 4), Card(Suit.CASSIA, 6)]
        self.assertEqual(score_path(path), 4)

    def test_score_path_to_eight(self):
        path = [Card(Suit.CASSIA, 2), Card(Suit.OAK, 4), Card(Suit.CASSIA, 8)]
        self.assertEqual(score_path(path), 5)

    def test_score_path_from_one_to_eight(self):
        path = [Card(Suit.CASSIA, 1), Card(Suit.JACARANDA, 2), Card(Suit.OAK, 4), Card(Suit.CASSIA, 8)]
        self.assertEqual(score_path(path), 7)

    @staticmethod
    def hands():
        p1 = Player(1)
        p1.hand = [
            Card(Suit.WILLOW, 1),
            Card(Suit.WILLOW, 2),
            Card(Suit.WILLOW, 3),
            Card(Suit.WILLOW, 4),
            Card(Suit.WILLOW, 5),
            Card(Suit.WILLOW, 6),
            Card(Suit.WILLOW, 7),
        ]

        p2 = Player(2)
        p2.hand = [
            Card(Suit.WILLOW, 8),
            Card(Suit.OAK, 1),
            Card(Suit.OAK, 8),
            Card(Suit.JACARANDA, 1),
            Card(Suit.JACARANDA, 2),
            Card(Suit.JACARANDA, 3),
        ]
        return [p1, p2]

    def test_calc_player_suit_values(self):
        [p1, p2] = self.hands()
        values = calc_player_suit_values([p1, p2])
        self.assertEqual(values[p1][Suit.WILLOW], 28)

        self.assertEqual(values[p2][Suit.WILLOW], 0)
        self.assertEqual(values[p2][Suit.OAK], 9)
        self.assertEqual(values[p2][Suit.JACARANDA], 6)
