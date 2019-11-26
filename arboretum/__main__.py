from typing import Tuple, Optional

from game.data import Game, DrawTarget, Card, Suit, Pos
from game.scoring import score_game


def get_draw_target_from_input() -> Tuple[DrawTarget, Optional[int]]:
    s_in = input("Where to draw from? 'deck' or '<player number>'")
    if not s_in or s_in == "deck":
        return DrawTarget.DECK, None
    else:
        return DrawTarget.PLAYER_DISCARD, int(s_in)


def top_of_discards(game):
    return str({
        p.num: str(p.discard[-1]) if p.discard else "" for p in game.players
    })


def get_play_from_input():
    print("Choose play, separated by commas: val,suit,x,y,discard_val,discard_suit")
    (val, suit, x, y, disc_val, disc_suit) = input().split(",")
    return Card(Suit.from_str(suit), int(val)), Pos(int(x), int(y)), Card(Suit.from_str(disc_suit), int(disc_val))


num_players = int(input("Num players:"))
game = Game(num_players)

while not game.finished:
    print(f"\nPlayer {game.player_turn + 1}'s turn")
    print(f"Your arboretum:\n{game.current_player.arboretum.formatted()}")
    for i in range(2):
        print(f"Your hand: {game.current_player.hand}")
        print(f"Draw {i + 1}/2, choose 'deck' or from {top_of_discards(game)}")
        valid = False
        while not valid:
            draw_type, target = get_draw_target_from_input()
            valid, message = game.is_valid_draw_target(draw_type, target)
            if not valid:
                print(message)
            else:
                game.current_player.hand.append(game.draw(draw_type, target))
        print()

    print(f"Your hand: {game.current_player.hand}")
    valid = False
    while not valid:
        play_card, pos, discard_card = get_play_from_input()
        valid, message = game.current_player.is_valid_play(play_card, pos, discard_card)
        if not valid:
            print(message)
        else:
            game.current_player.play(play_card, pos, discard_card)
            game.player_turn = (game.player_turn + 1) % num_players

print(f"Scores:\n{score_game(game.players)}")
