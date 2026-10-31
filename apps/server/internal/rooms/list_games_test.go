package rooms

import (
	"context"
	"testing"
	"time"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

func TestListActiveGamesMembershipAndDurableSeats(t *testing.T) {
	store := NewStore()
	ctx := context.Background()
	room, err := store.Create("creator")
	if err != nil {
		t.Fatal(err)
	}
	games, err := store.ListActiveGames(ctx, "creator")
	if err != nil || len(games) != 1 {
		t.Fatalf("expected creator's unclaimed game: %+v, %v", games, err)
	}
	initial := games[0]
	if initial.YourSeat != nil || initial.ClaimedSeats != 0 || initial.Seq != 0 {
		t.Fatalf("listing claimed a seat: %+v", initial)
	}
	if _, err := time.Parse(time.RFC3339Nano, initial.CreatedAt); err != nil {
		t.Fatalf("bad creation time: %v", err)
	}
	if initial.CreatedAt != initial.UpdatedAt {
		t.Fatal("creation timestamps should match")
	}

	_, creator, err := store.Join(room.Code, "creator")
	if err != nil {
		t.Fatal(err)
	}
	_, _, _ = store.Join(room.Code, "opponent")
	_, _, _ = store.Join(room.Code, "spectator")
	_, _ = store.Create("unrelated")
	games, err = store.ListActiveGames(ctx, "creator")
	if err != nil || len(games) != 1 || games[0].YourSeat == nil || *games[0].YourSeat != protocol.SeatPlayer1 || games[0].ClaimedSeats != 2 {
		t.Fatalf("expected one owned game: %+v, %v", games, err)
	}
	store.Leave(room.Code, creator.ID)
	games, err = store.ListActiveGames(ctx, "opponent")
	if err != nil || len(games) != 1 || games[0].YourSeat == nil || *games[0].YourSeat != protocol.SeatPlayer2 || games[0].ClaimedSeats != 2 {
		t.Fatalf("disconnect changed membership: %+v, %v", games, err)
	}
	for _, user := range []string{"spectator", "stranger"} {
		games, err := store.ListActiveGames(ctx, user)
		if err != nil || games == nil || len(games) != 0 {
			t.Fatalf("expected empty list for %s: %+v, %v", user, games, err)
		}
	}
	if _, err := store.ApplyMove(room.Code, "creator", protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"}); err != nil {
		t.Fatal(err)
	}
	games, err = store.ListActiveGames(ctx, "creator")
	if err != nil || len(games) != 1 {
		t.Fatalf("list after move: %+v, %v", games, err)
	}
	if games[0].Seq != 1 || games[0].Turn != protocol.SeatPlayer2 || games[0].UpdatedAt == initial.UpdatedAt {
		t.Fatalf("move not reflected: %+v", games[0])
	}
}

func TestListActiveGamesCreatorWithoutSeatInFullGame(t *testing.T) {
	store := NewStore()
	room, err := store.Create("creator")
	if err != nil {
		t.Fatal(err)
	}
	_, _, _ = store.Join(room.Code, "first")
	_, _, _ = store.Join(room.Code, "second")
	games, err := store.ListActiveGames(context.Background(), "creator")
	if err != nil || len(games) != 1 || games[0].YourSeat != nil || games[0].ClaimedSeats != 2 {
		t.Fatalf("expected creator with no seat: %+v, %v", games, err)
	}
}
