package storage

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

func TestSQLiteListActiveGames(t *testing.T) {
	path := filepath.Join(t.TempDir(), "games.db")
	db, err := OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = db.Close() }()
	ctx := context.Background()
	creator, err := db.CreateAnonymousSession(ctx, "creator-token")
	if err != nil {
		t.Fatal(err)
	}
	opponent, err := db.CreateAnonymousSession(ctx, "opponent-token")
	if err != nil {
		t.Fatal(err)
	}
	observer, err := db.CreateAnonymousSession(ctx, "observer-token")
	if err != nil {
		t.Fatal(err)
	}
	for _, code := range []string{"UNCLAIMED", "PLAYING", "FINISHED", "FULL"} {
		if _, err := db.CreateGame(ctx, code, creator); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.CreateGame(ctx, "UNRELATED", opponent); err != nil {
		t.Fatal(err)
	}
	for _, user := range []string{creator, opponent, observer} {
		if _, _, err := db.ClaimSeat(ctx, "PLAYING", user); err != nil {
			t.Fatal(err)
		}
	}
	for _, user := range []string{opponent, observer} {
		if _, _, err := db.ClaimSeat(ctx, "FULL", user); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE games SET status = 'completed' WHERE room_code = 'FINISHED'`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ApplyMove(ctx, "PLAYING", creator, protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"}); err != nil {
		t.Fatal(err)
	}
	// Reopening proves discovery is based on persistence, not live clients.
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	games, err := db.ListActiveGames(ctx, creator)
	if err != nil || len(games) != 3 {
		t.Fatalf("expected three distinct active games: %+v, %v", games, err)
	}
	byCode := map[string]protocol.ActiveGameSummary{}
	for _, game := range games {
		byCode[game.RoomCode] = game
		if _, err := time.Parse(time.RFC3339Nano, game.CreatedAt); err != nil {
			t.Fatal(err)
		}
		if _, err := time.Parse(time.RFC3339Nano, game.UpdatedAt); err != nil {
			t.Fatal(err)
		}
	}
	unclaimed := byCode["UNCLAIMED"]
	if unclaimed.YourSeat != nil || unclaimed.ClaimedSeats != 0 {
		t.Fatalf("listing mutated unclaimed seats: %+v", unclaimed)
	}
	playing := byCode["PLAYING"]
	if playing.YourSeat == nil || *playing.YourSeat != protocol.SeatPlayer1 || playing.ClaimedSeats != 2 || playing.Seq != 1 || playing.Turn != protocol.SeatPlayer2 {
		t.Fatalf("wrong playing summary: %+v", playing)
	}
	if playing.UpdatedAt == playing.CreatedAt {
		t.Fatal("expected move to update timestamp")
	}
	full := byCode["FULL"]
	if full.YourSeat != nil || full.ClaimedSeats != 2 {
		t.Fatalf("wrong full-room creator summary: %+v", full)
	}
	games, err = db.ListActiveGames(ctx, observer)
	if err != nil || len(games) != 1 || games[0].RoomCode != "FULL" {
		t.Fatalf("spectator-only visit should not appear: %+v, %v", games, err)
	}
	games, err = db.ListActiveGames(ctx, "stranger")
	if err != nil || games == nil || len(games) != 0 {
		t.Fatalf("expected empty slice: %+v, %v", games, err)
	}
}

func TestSQLiteExpiredSessionCannotResolveUser(t *testing.T) {
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "sessions.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	if _, err := db.CreateAnonymousSession(ctx, "expired"); err != nil {
		t.Fatal(err)
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z'`); err != nil {
		t.Fatal(err)
	}
	if _, ok, err := db.UserByTokenHash(ctx, "expired"); err != nil || ok {
		t.Fatalf("expected expired session not to resolve: %t, %v", ok, err)
	}
}
