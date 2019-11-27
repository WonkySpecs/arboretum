from typing import Tuple, Optional, Dict

from arboretum.clients.base_client import BaseClient
from arboretum.clients.messages import DrawMessage, PlayMessage, CardTakenMessage, DiscardMessage
from arboretum.clients.random_robot import RandomRobot
from arboretum.game.data import Game, DrawTarget, Card, Suit, Pos, Player
from arboretum.game.scoring import score_game


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

num_players = 2
num_games = 25000
p1_wins = p2_wins = draws = 0
zero_draws = 0
for i in range(num_games):
    if i % 1000 == 0:
        print(f"Game {i}")
    game = Game(num_players)
    clients: Dict[Player, BaseClient] = {game.players[i]: RandomRobot(i, len(game.deck)) for i in range(num_players)}

    for player in game.players:
        for c in player.hand:
            clients[player].receive(DrawMessage(card=c))

    while not game.finished:
        cur_client = clients[game.current_player]
        for i in range(2):
            valid = False
            while not valid:
                draw_type, target = next(cur_client.gen_draw)
                valid, message = game.is_valid_draw_target(draw_type, target)
                if not valid:
                    print(message)
                else:
                    card = game.draw(draw_type, target)
                    game.current_player.hand.append(card)
                    cur_client.receive(DrawMessage(card=card))
                    for client in clients.values():
                        client.receive(CardTakenMessage(player_num=target if target is not None else -1))

        valid = False
        while not valid:
            play_card, pos, discard_card = next(cur_client.gen_play)
            valid, message = game.current_player.is_valid_play(play_card, pos, discard_card)
            if not valid:
                print(message)
            else:
                game.current_player.play(play_card, pos, discard_card)
                for client in clients.values():
                    client.receive(PlayMessage(play_card, pos, game.current_player.num))
                    client.receive(DiscardMessage(discard_card, game.current_player.num))
        game.player_turn = (game.player_turn + 1) % num_players
    scores = score_game(game.players)
    if scores[game.players[0]] > scores[game.players[1]]:
        p1_wins += 1
    elif scores[game.players[0]] < scores[game.players[1]]:
        p2_wins += 1
    else:
        draws += 1
        if scores[game.players[0]] == 0:
            zero_draws += 1
print(p1_wins, p2_wins, draws, zero_draws)
