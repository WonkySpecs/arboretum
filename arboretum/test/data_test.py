import unittest

from arboretum.data import Arboretum, Card, Suit, Pos


class DataTest(unittest.TestCase):
    @staticmethod
    def line():
        a = Arboretum()
        a.add_card(Card(Suit.CASSIA, 1), Pos(0, 0))
        a.add_card(Card(Suit.CASSIA, 8), Pos(7, 0))
        for i in range(1, 7):
            a.add_card(Card(Suit.OAK, i + 1), Pos(i, 0))
        return a

    @staticmethod
    def complicated():
        a = Arboretum()

        def add(suit, val, x, y):
            a.add_card(Card(suit, val), Pos(x, y))

        add(Suit.CASSIA, 1, -2, 0)
        add(Suit.OAK, 2, -1, 0)
        add(Suit.CASSIA, 3, 0, 0)
        add(Suit.CASSIA, 6, 1, 0)
        add(Suit.CASSIA, 7, 2, 0)
        add(Suit.DOGWOOD, 8, 3, 0)
        add(Suit.DOGWOOD, 1, -1, -1)
        add(Suit.CASSIA, 4, 0, -1)
        add(Suit.CASSIA, 5, 1, -1)
        add(Suit.JACARANDA, 3, -1, 1)
        add(Suit.DOGWOOD, 4, 0, 1)
        add(Suit.DOGWOOD, 5, 1, 1)
        return a

    @staticmethod
    def all_ascending(paths):
        for path in paths:
            last = 0
            for card in path:
                if card.value <= last:
                    return False
                last = card.value
        return True

    @staticmethod
    def all_two_plus(paths):
        return all(len(p) >= 2 for p in paths)

    def test_line(self):
        expected = [Card(Suit.CASSIA, 1)] + [Card(Suit.OAK, i) for i in range(2, 7)] + [Card(Suit.CASSIA, 8)]
        self.assertEqual(
            self.line().paths_for(Suit.CASSIA),
            [
                expected
            ])

    def test_complicated(self):
        def score_suit(suit):
            return self.complicated().paths_for(suit)

        self.assertEqual(score_suit(Suit.JACARANDA), [[]])
        dogwood_paths = score_suit(Suit.DOGWOOD)
        self.assertIn(
            [
                Card(Suit.DOGWOOD, 1),
                Card(Suit.CASSIA, 4),
                Card(Suit.CASSIA, 5),
                Card(Suit.CASSIA, 6),
                Card(Suit.CASSIA, 7),
                Card(Suit.DOGWOOD, 8), ],
            dogwood_paths)
        self.assertTrue(self.all_ascending(dogwood_paths))
        self.assertTrue(self.all_two_plus(dogwood_paths))
        cassia_paths = score_suit(Suit.CASSIA)
        self.assertIn(
            [
                Card(Suit.CASSIA, 1),
                Card(Suit.OAK, 2),
                Card(Suit.CASSIA, 3),
                Card(Suit.CASSIA, 6),
                Card(Suit.CASSIA, 7),
                Card(Suit.CASSIA, 8), ],
            cassia_paths)
        self.assertTrue(self.all_ascending(cassia_paths))
        self.assertTrue(self.all_two_plus(cassia_paths))
