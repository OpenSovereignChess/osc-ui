package rooms

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
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

type Repository interface {
	CreateGame(ctx context.Context, roomCode string, createdByUserID string) (*Room, error)
	Exists(ctx context.Context, roomCode string) (bool, error)
	ClaimSeat(ctx context.Context, roomCode string, userID string) (protocol.Seat, bool, error)
	Snapshot(ctx context.Context, roomCode string, userID string) (protocol.RoomState, error)
	ApplyMove(ctx context.Context, roomCode string, userID string, move protocol.ClientMove) (protocol.Move, error)
}

type Store struct {
	mu      sync.Mutex
	repo    Repository
	clients map[string]map[string]*Client
}

type Room struct {
	Code string
}

type Client struct {
	ID           string
	UserID       string
	Seat         protocol.Seat
	NewlyClaimed bool
	Send         chan []byte
}

func NewStore() *Store {
	return NewStoreWithRepository(NewMemoryRepository())
}

func NewStoreWithRepository(repo Repository) *Store {
	return &Store{
		repo:    repo,
		clients: make(map[string]map[string]*Client),
	}
}

func (s *Store) Create(userID string) (*Room, error) {
	for {
		code := roomCode()
		room, err := s.repo.CreateGame(context.Background(), code, userID)
		if errors.Is(err, ErrBadSequence) {
			continue
		}
		if err != nil {
			return nil, err
		}
		return room, nil
	}
}

func (s *Store) Exists(code string) bool {
	exists, err := s.repo.Exists(context.Background(), normalizeCode(code))
	return err == nil && exists
}

func (s *Store) Join(code string, userID string) (*Room, *Client, error) {
	code = normalizeCode(code)
	seat, newlyClaimed, err := s.repo.ClaimSeat(context.Background(), code, userID)
	if err != nil {
		return nil, nil, err
	}

	client := &Client{
		ID:           clientID(),
		UserID:       userID,
		Seat:         seat,
		NewlyClaimed: newlyClaimed,
		Send:         make(chan []byte, 16),
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clients[code] == nil {
		s.clients[code] = make(map[string]*Client)
	}
	s.clients[code][client.ID] = client
	return &Room{Code: code}, client, nil
}

func (s *Store) Leave(code string, clientID string) (*protocol.Player, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	code = normalizeCode(code)
	clients, ok := s.clients[code]
	if !ok {
		return nil, false
	}
	client, ok := clients[clientID]
	if !ok {
		return nil, false
	}

	delete(clients, clientID)
	close(client.Send)
	left := protocol.Player{ID: client.UserID, Seat: client.Seat}

	if len(clients) == 0 {
		delete(s.clients, code)
	}
	return &left, false
}

func (s *Store) Snapshot(code string, userID string) (protocol.RoomState, error) {
	return s.repo.Snapshot(context.Background(), normalizeCode(code), userID)
}

func (s *Store) ApplyMove(code string, userID string, move protocol.ClientMove) (protocol.Move, error) {
	return s.repo.ApplyMove(context.Background(), normalizeCode(code), userID, move)
}

func (s *Store) Broadcast(code string, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, client := range s.clients[normalizeCode(code)] {
		select {
		case client.Send <- message:
		default:
		}
	}
}

func (s *Store) BroadcastExcept(code string, exceptClientID string, message []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, client := range s.clients[normalizeCode(code)] {
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

	client, ok := s.clients[normalizeCode(code)][clientID]
	if !ok {
		return
	}
	select {
	case client.Send <- message:
	default:
	}
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
