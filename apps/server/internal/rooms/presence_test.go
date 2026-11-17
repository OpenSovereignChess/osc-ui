package rooms_test

import (
	"sync"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
)

func TestLiveClientsShareDurableSeatAndSynchronizeChannels(t *testing.T) {
	store, creator, user1, user2, _ := newTestStore(t)
	room, err := store.Create(creator)
	if err != nil {
		t.Fatal(err)
	}
	_, first, err := store.Join(room.Code, user1)
	if err != nil {
		t.Fatal(err)
	}
	_, second, err := store.Join(room.Code, user1)
	if err != nil {
		t.Fatal(err)
	}
	if !first.NewlyClaimed || second.NewlyClaimed || second.Seat != first.Seat || first.ID == second.ID {
		t.Fatalf("unexpected same-user clients: %+v %+v", first, second)
	}
	store.BroadcastExcept(room.Code, first.ID, []byte("other tab"))
	select {
	case message := <-second.Send:
		if string(message) != "other tab" {
			t.Fatalf("unexpected message: %s", message)
		}
	default:
		t.Fatal("other tab did not receive broadcast")
	}
	select {
	case message := <-first.Send:
		t.Fatalf("excluded client received %s", message)
	default:
	}

	// Full channels must not block, and concurrent sends/leaves must not panic.
	var wg sync.WaitGroup
	for i := 0; i < 4; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				store.Broadcast(room.Code, []byte("broadcast"))
				store.BroadcastExcept(room.Code, first.ID, []byte("except"))
				store.Send(room.Code, first.ID, []byte("direct"))
			}
		}()
	}
	store.Leave(room.Code, first.ID)
	store.Leave(room.Code, second.ID)
	wg.Wait()
	for range first.Send {
	}
	for range second.Send {
	}
	_, replacement, err := store.Join(room.Code, user2)
	if err != nil {
		t.Fatal(err)
	}
	if replacement.Seat != protocol.SeatPlayer2 {
		t.Fatalf("disconnect freed a durable seat: %s", replacement.Seat)
	}
	_, restored, err := store.Join(room.Code, user1)
	if err != nil {
		t.Fatal(err)
	}
	if restored.Seat != protocol.SeatPlayer1 || restored.NewlyClaimed {
		t.Fatalf("original seat not restored: %+v", restored)
	}
}
