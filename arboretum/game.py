from collections import defaultdict
from typing import List, Dict

from .data import Player, Suit, Card


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
            paths = scorer.arboretum.paths_for(suit)
            scores[scorer] += max([score_path(p) for p in paths])

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


def score_path(path: List[Card]) -> int:
    """
    Scores valid paths.
    :param path:
    :return:
    """
    score = len(path)
    if path[0].value == 1:
        score +=1
    if path[-1].value == 8:
        score += 2
    if len(path) >= 4 and all([c.suit == path[0].suit for c in path]):
        score += len(path)
    return score
