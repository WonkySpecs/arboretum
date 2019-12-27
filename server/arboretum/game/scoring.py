from collections import defaultdict
from typing import List, Dict, Set

from .data import Player, Suit, Card


def score_game(players: List[Player]) -> Dict[Player, int]:
    player_suit_values = calc_player_suit_values(players)
    suits = set(suit for suit_scores in player_suit_values.values() for suit in suit_scores.keys())
    scores: Dict[Player, int] = {p: 0 for p in players}
    for suit in suits:
        scorers = who_scores(suit, player_suit_values)
        for scorer in scorers:
            paths = scorer.arboretum.paths_for(suit)
            if paths:
                scores[scorer] += max([score_path(p) for p in paths])

    return scores


def calc_player_suit_values(players: List[Player]) -> Dict[Player, Dict[Suit, int]]:
    # All the suits we care about scoring
    suits: Set[Suit] = set()
    # All the ones held in hands
    ones: Dict[Suit, Player] = {}
    for player in players:
        for card in player.arboretum.grid.values():
            suits.add(card.suit)
        for card in player.hand:
            if card.value == 1:
                ones[card.suit] = player

    player_suit_values: Dict[Player, Dict[Suit, int]] = dict()
    for player in players:
        suit_values: Dict[Suit, int] = defaultdict(int)
        for card in player.hand:
            # Value of 8 is ignored if another player has the 1 of the same suit
            if card.value == 8 and card.suit in ones and ones[card.suit] != player:
                continue
            suit_values[card.suit] += card.value
        player_suit_values[player] = suit_values
    return player_suit_values


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
        score += 1
    if path[-1].value == 8:
        score += 2
    if len(path) >= 4 and all([c.suit == path[0].suit for c in path]):
        score += len(path)
    return score
