from collections import defaultdict
from typing import List, Dict

from .data import Player, Suit


def score_game(players: List[Player]) -> Dict[Player, int]:
    suits = set()
    for player in players:
        for card in player.arboretum.grid.values():
            suits.add(card.suit)

    player_suit_values: Dict[Player, Dict[Suit, int]] = dict()
    for player in players:
        suit_values: Dict[Suit, int] = defaultdict(int)
        for card in player.hand:
            suit_values[card.suit] += card.value
        player_suit_values[player] = suit_values

    scores: Dict[Player, int] = defaultdict(int)
    for suit in suits:
        scorers = who_scores(suit, player_suit_values)
        for scorer in scorers:
            scores[scorer] += score_suit(scorer.arboretum, suit)

    return scores


def who_scores(suit: Suit, remaining_card_scores: Dict[Player, Dict[Suit, int]]) -> List[Player]:
    scoring = list(remaining_card_scores.keys())
    highest_remaining = 0
    for player, card_scores in remaining_card_scores.items():
        suit_score = card_scores[suit]
        if suit_score > highest_remaining:
            highest_remaining = suit_score
            scoring = [player]
        elif card_scores[suit] == highest_remaining:
            scoring.append(player)

    return scoring


def score_suit(arboretum, suit):
    return 0
