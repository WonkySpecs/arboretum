import unittest

from arboretum.data import Suit, Card
from arboretum.game import score_path


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
