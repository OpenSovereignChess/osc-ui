package rooms

import (
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

var (
	ErrRoomNotFound = errors.New("room not found")
	ErrNotPlayer    = errors.New("observers cannot move")
	ErrWrongTurn    = errors.New("wrong turn")
	ErrBadSequence  = errors.New("bad sequence")
)

type Store struct {
	mu    sync.Mutex
	rooms map[string]*Room
}

type Room struct {
	Code    string
	turn    protocol.Seat
	seq     int
	moves   []protocol.Move
	clients map[string]*Client
}

type Client struct {
	ID   string
	Seat protocol.Seat
	Send chan []byte
}

func NewStore() *Store {
	return &Store{rooms: make(map[string]*Room)}
}

func (s *Store) Create() *Room {
	s.mu.Lock()
	defer s.mu.Unlock()

	for {
		code := roomCode()
		if _, ok := s.rooms[code]; ok {
			continue
		}
		room := &Room{
			Code:    code,
			turn:    protocol.SeatPlayer1,
			clients: make(map[string]*Client),
		}
		s.rooms[code] = room
		fmt.Printf("Created room %s\n", code)
		return room
	}
}

func (s *Store) Exists(code string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, ok := s.rooms[normalizeCode(code)]
	return ok
}

func (s *Store) Join(code string) (*Room, *Client, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return nil, nil, ErrRoomNotFound
	}

	client := &Client{
		ID:   clientID(),
		Seat: room.nextSeat(),
		Send: make(chan []byte, 16),
	}
	room.clients[client.ID] = client
	return room, client, nil
}

func (s *Store) Leave(code string, clientID string) (*protocol.Player, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return nil, false
	}
	client, ok := room.clients[clientID]
	if !ok {
		return nil, false
	}

	delete(room.clients, clientID)
	close(client.Send)
	fmt.Printf("Client %s left room %s\n", clientID, code)
	left := protocol.Player{ID: client.ID, Seat: client.Seat}
	if len(room.clients) == 0 {
		return &left, false
	}
	return &left, true
}

func (s *Store) Snapshot(code string, clientID string) (protocol.RoomState, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, client, err := s.roomAndClient(code, clientID)
	if err != nil {
		return protocol.RoomState{}, err
	}
	return room.snapshot(client), nil
}

func (s *Store) ApplyMove(code string, clientID string, move protocol.ClientMove) (protocol.Move, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, client, err := s.roomAndClient(code, clientID)
	if err != nil {
		return protocol.Move{}, err
	}
	if client.Seat == protocol.SeatObserver {
		return protocol.Move{}, ErrNotPlayer
	}
	if client.Seat != room.turn {
		return protocol.Move{}, ErrWrongTurn
	}
	if move.Seq != room.seq+1 {
		return protocol.Move{}, ErrBadSequence
	}
	if move.Orig == "" || move.Dest == "" || move.Orig == move.Dest {
		return protocol.Move{}, ErrBadSequence
	}

	applied := protocol.Move{
		Seq:  move.Seq,
		Seat: client.Seat,
		Orig: move.Orig,
		Dest: move.Dest,
	}
	room.seq = move.Seq
	room.moves = append(room.moves, applied)
	room.turn = oppositeSeat(room.turn)
	return applied, nil
}

func (s *Store) Broadcast(code string, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return
	}
	for _, client := range room.clients {
		select {
		case client.Send <- message:
		default:
		}
	}
}

func (s *Store) BroadcastExcept(code string, exceptClientID string, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return
	}
	for _, client := range room.clients {
		if client.ID == exceptClientID {
			continue
		}
		select {
		case client.Send <- message:
		default:
		}
	}
}

func (s *Store) Send(code string, clientID string, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return
	}
	client, ok := room.clients[clientID]
	if !ok {
		return
	}
	select {
	case client.Send <- message:
	default:
	}
}

func (s *Store) roomAndClient(code string, clientID string) (*Room, *Client, error) {
	room, ok := s.rooms[normalizeCode(code)]
	if !ok {
		return nil, nil, ErrRoomNotFound
	}
	client, ok := room.clients[clientID]
	if !ok {
		return nil, nil, ErrRoomNotFound
	}
	return room, client, nil
}

func (r *Room) snapshot(client *Client) protocol.RoomState {
	players := make([]protocol.Player, 0, len(r.clients))
	for _, peer := range r.clients {
		players = append(players, protocol.Player{ID: peer.ID, Seat: peer.Seat})
	}
	moves := append([]protocol.Move(nil), r.moves...)
	return protocol.RoomState{
		RoomCode: r.Code,
		You:      protocol.Player{ID: client.ID, Seat: client.Seat},
		Players:  players,
		Turn:     r.turn,
		Seq:      r.seq,
		Moves:    moves,
	}
}

func (r *Room) nextSeat() protocol.Seat {
	hasPlayer1 := false
	hasPlayer2 := false
	for _, client := range r.clients {
		hasPlayer1 = hasPlayer1 || client.Seat == protocol.SeatPlayer1
		hasPlayer2 = hasPlayer2 || client.Seat == protocol.SeatPlayer2
	}
	if !hasPlayer1 {
		return protocol.SeatPlayer1
	}
	if !hasPlayer2 {
		return protocol.SeatPlayer2
	}
	return protocol.SeatObserver
}

func oppositeSeat(seat protocol.Seat) protocol.Seat {
	if seat == protocol.SeatPlayer1 {
		return protocol.SeatPlayer2
	}
	return protocol.SeatPlayer1
}

func normalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func roomCode() string {
	var b [5]byte
	_, _ = rand.Read(b[:])
	return strings.TrimRight(base32.StdEncoding.EncodeToString(b[:]), "=")
}

func clientID() string {
	var b [9]byte
	_, _ = rand.Read(b[:])
	return strings.TrimRight(base32.StdEncoding.EncodeToString(b[:]), "=")
}
