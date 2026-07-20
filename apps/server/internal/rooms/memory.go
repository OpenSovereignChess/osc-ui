package rooms

import (
	"context"
	"sync"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

type MemoryRepository struct {
	mu    sync.Mutex
	games map[string]*memoryGame
}

type memoryGame struct {
	code    string
	turn    protocol.Seat
	seq     int
	moves   []protocol.Move
	seats   map[protocol.Seat]string
	created string
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{games: make(map[string]*memoryGame)}
}

func (r *MemoryRepository) CreateGame(_ context.Context, roomCode string, createdByUserID string) (*Room, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	code := normalizeCode(roomCode)
	if _, ok := r.games[code]; ok {
		return nil, ErrBadSequence
	}
	r.games[code] = &memoryGame{
		code:    code,
		turn:    protocol.SeatPlayer1,
		seats:   make(map[protocol.Seat]string),
		created: createdByUserID,
	}
	return &Room{Code: code}, nil
}

func (r *MemoryRepository) Exists(_ context.Context, roomCode string) (bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	_, ok := r.games[normalizeCode(roomCode)]
	return ok, nil
}

func (r *MemoryRepository) ClaimSeat(_ context.Context, roomCode string, userID string) (protocol.Seat, bool, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	game, ok := r.games[normalizeCode(roomCode)]
	if !ok {
		return "", false, ErrRoomNotFound
	}
	for seat, owner := range game.seats {
		if owner == userID {
			return seat, false, nil
		}
	}
	if game.seats[protocol.SeatPlayer1] == "" {
		game.seats[protocol.SeatPlayer1] = userID
		return protocol.SeatPlayer1, true, nil
	}
	if game.seats[protocol.SeatPlayer2] == "" {
		game.seats[protocol.SeatPlayer2] = userID
		return protocol.SeatPlayer2, true, nil
	}
	return protocol.SeatObserver, false, nil
}

func (r *MemoryRepository) Snapshot(_ context.Context, roomCode string, userID string) (protocol.RoomState, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	game, ok := r.games[normalizeCode(roomCode)]
	if !ok {
		return protocol.RoomState{}, ErrRoomNotFound
	}
	seat := protocol.SeatObserver
	players := make([]protocol.Player, 0, len(game.seats))
	for _, candidate := range []protocol.Seat{protocol.SeatPlayer1, protocol.SeatPlayer2} {
		owner := game.seats[candidate]
		if owner == "" {
			continue
		}
		players = append(players, protocol.Player{ID: owner, Seat: candidate})
		if owner == userID {
			seat = candidate
		}
	}
	moves := make([]protocol.Move, len(game.moves))
	copy(moves, game.moves)
	return protocol.RoomState{
		RoomCode: game.code,
		You:      protocol.Player{ID: userID, Seat: seat},
		Players:  players,
		Turn:     game.turn,
		Seq:      game.seq,
		Moves:    moves,
	}, nil
}

func (r *MemoryRepository) ApplyMove(_ context.Context, roomCode string, userID string, move protocol.ClientMove) (protocol.Move, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	game, ok := r.games[normalizeCode(roomCode)]
	if !ok {
		return protocol.Move{}, ErrRoomNotFound
	}
	seat := protocol.SeatObserver
	for candidate, owner := range game.seats {
		if owner == userID {
			seat = candidate
			break
		}
	}
	if seat == protocol.SeatObserver {
		return protocol.Move{}, ErrNotPlayer
	}
	if seat != game.turn {
		return protocol.Move{}, ErrWrongTurn
	}
	if move.Seq != game.seq+1 {
		return protocol.Move{}, ErrBadSequence
	}
	if err := ValidateMoveShape(move); err != nil {
		return protocol.Move{}, err
	}

	applied := protocol.Move{
		Seq:       move.Seq,
		Seat:      seat,
		Kind:      move.Kind,
		Orig:      move.Orig,
		Dest:      move.Dest,
		Promotion: move.Promotion,
		Color:     move.Color,
	}
	game.seq = move.Seq
	game.moves = append(game.moves, applied)
	game.turn = oppositeSeat(game.turn)
	return applied, nil
}

func ValidateMoveShape(move protocol.ClientMove) error {
	kind := move.Kind
	if kind == "" {
		kind = "move"
	}
	switch kind {
	case "move", "castle":
		if move.Orig == "" || move.Dest == "" || move.Orig == move.Dest {
			return ErrBadSequence
		}
	case "defect":
		if move.Color == "" {
			return ErrBadSequence
		}
	default:
		return ErrBadSequence
	}
	return nil
}
