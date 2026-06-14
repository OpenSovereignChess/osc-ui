package rooms

import (
	"errors"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

func TestJoinAutoSeatsPlayersThenObservers(t *testing.T) {
	store := NewStore()
	room := store.Create()

	_, player1, err := store.Join(room.Code)
	if err != nil {
		t.Fatalf("join player1: %v", err)
	}
	_, player2, err := store.Join(room.Code)
	if err != nil {
		t.Fatalf("join player2: %v", err)
	}
	_, observer, err := store.Join(room.Code)
	if err != nil {
		t.Fatalf("join observer: %v", err)
	}

	if player1.Seat != protocol.SeatPlayer1 {
		t.Fatalf("expected player1, got %s", player1.Seat)
	}
	if player2.Seat != protocol.SeatPlayer2 {
		t.Fatalf("expected player2, got %s", player2.Seat)
	}
	if observer.Seat != protocol.SeatObserver {
		t.Fatalf("expected observer, got %s", observer.Seat)
	}
}

func TestApplyMoveValidatesTurnAndSequence(t *testing.T) {
	store := NewStore()
	room := store.Create()
	_, player1, _ := store.Join(room.Code)
	_, player2, _ := store.Join(room.Code)

	_, err := store.ApplyMove(
		room.Code,
		player2.ID,
		protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"},
	)
	if !errors.Is(err, ErrWrongTurn) {
		t.Fatalf("expected wrong turn, got %v", err)
	}

	_, err = store.ApplyMove(
		room.Code,
		player1.ID,
		protocol.ClientMove{Seq: 2, Orig: "a2", Dest: "a3"},
	)
	if !errors.Is(err, ErrBadSequence) {
		t.Fatalf("expected bad sequence, got %v", err)
	}

	move, err := store.ApplyMove(
		room.Code,
		player1.ID,
		protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"},
	)
	if err != nil {
		t.Fatalf("apply move: %v", err)
	}
	if move.Seat != protocol.SeatPlayer1 || move.Seq != 1 {
		t.Fatalf("unexpected move: %+v", move)
	}

	state, err := store.Snapshot(room.Code, player2.ID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if state.Turn != protocol.SeatPlayer2 || state.Seq != 1 || len(state.Moves) != 1 {
		t.Fatalf("unexpected state: %+v", state)
	}
}

func TestObserversCannotMove(t *testing.T) {
	store := NewStore()
	room := store.Create()
	_, _, _ = store.Join(room.Code)
	_, _, _ = store.Join(room.Code)
	_, observer, _ := store.Join(room.Code)

	_, err := store.ApplyMove(
		room.Code,
		observer.ID,
		protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"},
	)
	if !errors.Is(err, ErrNotPlayer) {
		t.Fatalf("expected observer rejection, got %v", err)
	}
}

func TestLeaveKeepsEmptyRoomJoinable(t *testing.T) {
	store := NewStore()
	room := store.Create()
	_, player, _ := store.Join(room.Code)

	left, shouldBroadcast := store.Leave(room.Code, player.ID)
	if left == nil {
		t.Fatal("expected left player")
	}
	if shouldBroadcast {
		t.Fatal("expected no broadcast for empty room")
	}

	_, joined, err := store.Join(room.Code)
	if err != nil {
		t.Fatalf("expected room to remain joinable, got %v", err)
	}
	if joined.Seat != protocol.SeatPlayer1 {
		t.Fatalf("expected player1 after rejoin, got %s", joined.Seat)
	}
}

func TestSnapshotUsesEmptyMoveList(t *testing.T) {
	store := NewStore()
	room := store.Create()
	_, player, _ := store.Join(room.Code)

	state, err := store.Snapshot(room.Code, player.ID)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if state.Moves == nil {
		t.Fatal("expected empty move slice, got nil")
	}
	if len(state.Moves) != 0 {
		t.Fatalf("expected no moves, got %d", len(state.Moves))
	}
}
