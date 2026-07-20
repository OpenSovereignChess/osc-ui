package storage

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

func TestSQLitePersistsAnonymousGame(t *testing.T) {
	path := filepath.Join(t.TempDir(), "osc.db")
	ctx := context.Background()

	db, err := OpenSQLite(path)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	user1, err := db.CreateAnonymousSession(ctx, "token-1")
	if err != nil {
		t.Fatalf("create user1: %v", err)
	}
	user2, err := db.CreateAnonymousSession(ctx, "token-2")
	if err != nil {
		t.Fatalf("create user2: %v", err)
	}
	if _, err := db.CreateGame(ctx, "ABCD1234", user1); err != nil {
		t.Fatalf("create game: %v", err)
	}
	seat1, claimed1, err := db.ClaimSeat(ctx, "ABCD1234", user1)
	if err != nil {
		t.Fatalf("claim user1: %v", err)
	}
	seat2, claimed2, err := db.ClaimSeat(ctx, "ABCD1234", user2)
	if err != nil {
		t.Fatalf("claim user2: %v", err)
	}
	if !claimed1 || !claimed2 || seat1 != protocol.SeatPlayer1 || seat2 != protocol.SeatPlayer2 {
		t.Fatalf("unexpected seats: %s %s", seat1, seat2)
	}
	if _, err := db.ApplyMove(ctx, "ABCD1234", user1, protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"}); err != nil {
		t.Fatalf("apply move: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite: %v", err)
	}

	db, err = OpenSQLite(path)
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer db.Close()

	loadedUser1, ok, err := db.UserByTokenHash(ctx, "token-1")
	if err != nil || !ok {
		t.Fatalf("load user1: %s %t %v", loadedUser1, ok, err)
	}
	if loadedUser1 != user1 {
		t.Fatalf("expected same anonymous user %s, got %s", user1, loadedUser1)
	}
	reclaimed, newlyClaimed, err := db.ClaimSeat(ctx, "ABCD1234", user1)
	if err != nil {
		t.Fatalf("reclaim seat: %v", err)
	}
	if newlyClaimed || reclaimed != protocol.SeatPlayer1 {
		t.Fatalf("expected player1, got %s", reclaimed)
	}
	state, err := db.Snapshot(ctx, "ABCD1234", user2)
	if err != nil {
		t.Fatalf("snapshot: %v", err)
	}
	if state.Seq != 1 || state.Turn != protocol.SeatPlayer2 || len(state.Moves) != 1 {
		t.Fatalf("unexpected restored state: %+v", state)
	}
}
