package protocol

import (
	"encoding/json"
	"errors"
)

const (
	TypeJoinRoom     = "join_room"
	TypeMakeMove     = "make_move"
	TypeRoomState    = "room_state"
	TypePlayerJoined = "player_joined"
	TypePlayerLeft   = "player_left"
	TypeMoveApplied  = "move_applied"
	TypeMoveRejected = "move_rejected"
	TypeError        = "error"
)

type Seat string

const (
	SeatPlayer1  Seat = "player1"
	SeatPlayer2  Seat = "player2"
	SeatObserver Seat = "observer"
)

type Envelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type JoinRoom struct {
	RoomCode string `json:"roomCode"`
}

type ClientMove struct {
	Seq  int    `json:"seq"`
	Orig string `json:"orig"`
	Dest string `json:"dest"`
}

type Move struct {
	Seq  int    `json:"seq"`
	Seat Seat   `json:"seat"`
	Orig string `json:"orig"`
	Dest string `json:"dest"`
}

type Player struct {
	ID   string `json:"id"`
	Seat Seat   `json:"seat"`
}

type RoomState struct {
	RoomCode string   `json:"roomCode"`
	You      Player   `json:"you"`
	Players  []Player `json:"players"`
	Turn     Seat     `json:"turn"`
	Seq      int      `json:"seq"`
	Moves    []Move   `json:"moves"`
}

type PlayerEvent struct {
	Player Player `json:"player"`
}

type MoveRejected struct {
	Reason string `json:"reason"`
	Seq    int    `json:"seq"`
}

type Error struct {
	Message string `json:"message"`
}

func Decode[T any](payload json.RawMessage) (T, error) {
	var value T
	if len(payload) == 0 {
		return value, errors.New("missing payload")
	}
	if err := json.Unmarshal(payload, &value); err != nil {
		return value, err
	}
	return value, nil
}

func Encode(messageType string, payload any) ([]byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(Envelope{Type: messageType, Payload: body})
}
