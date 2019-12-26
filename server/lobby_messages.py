import json


class BaseMessage:
    def __init__(self, message_type):
        self.message_type = message_type

    def serialize(self):
        return json.dumps(self.__dict__)


class CreatedMessage(BaseMessage):
    def __init__(self, lobby_id):
        super(CreatedMessage, self).__init__("lobby_created")
        self.lobby_id = lobby_id


class JoinedMessage(BaseMessage):
    def __init__(self, lobby_id, num_players):
        super(JoinedMessage, self).__init__("lobby_joined")
        self.lobby_id = lobby_id
        self.num_players = num_players


class PlayerJoinedMessage(BaseMessage):
    def __init__(self):
        super(PlayerJoinedMessage, self).__init__("lobby_player_joined")


class PlayerLeftMessage(BaseMessage):
    def __init__(self):
        super(PlayerLeftMessage, self).__init__("lobby_player_left")


class ReadyCheckMessage(BaseMessage):
    def __init__(self):
        super(ReadyCheckMessage, self).__init__("ready_check")
