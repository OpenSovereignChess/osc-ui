package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/testutil"
)

func receiveEnvelope(t *testing.T, client *rooms.Client, messageType string) protocol.Envelope {
	t.Helper()
	select {
	case message := <-client.Send:
		var envelope protocol.Envelope
		if err := json.Unmarshal(message, &envelope); err != nil {
			t.Fatal(err)
		}
		if envelope.Type != messageType {
			t.Fatalf("expected %s, got %s", messageType, message)
		}
		return envelope
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for message")
		return protocol.Envelope{}
	}
}

func TestSQLiteActionMessagesAndCookieRecovery(t *testing.T) {
	path := filepath.Join(t.TempDir(), "osc.db")
	db := testutil.OpenSQLiteAt(t, path)
	store := rooms.NewStore(db)
	handler := NewHandler(store, db)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/api/rooms", nil))
	if response.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", response.Code, response.Body.String())
	}
	var room createRoomResponse
	if err := json.Unmarshal(response.Body.Bytes(), &room); err != nil {
		t.Fatal(err)
	}
	cookies := response.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("expected session cookie, got %v", cookies)
	}
	cookie := cookies[0]
	user1, ok, err := db.UserByTokenHash(context.Background(), tokenHash(cookie.Value))
	if err != nil || !ok {
		t.Fatalf("resolve cookie: %t %v", ok, err)
	}
	user2 := testutil.CreateUser(t, db, tokenHash("second"))
	observerID := testutil.CreateUser(t, db, tokenHash("observer"))
	clients := []*rooms.Client{}
	for _, user := range []string{user1, user2, observerID} {
		_, client, err := store.Join(room.RoomCode, user)
		if err != nil {
			t.Fatal(err)
		}
		clients = append(clients, client)
	}
	h := &Handler{rooms: store, sessions: db}
	for _, tc := range []struct {
		name   string
		client *rooms.Client
		move   protocol.ClientMove
		reason string
	}{
		{"observer", clients[2], protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"}, "observers cannot move"},
		{"wrong turn", clients[1], protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a3"}, "wrong turn"},
		{"wrong sequence", clients[0], protocol.ClientMove{Seq: 2, Orig: "a2", Dest: "a3"}, "bad sequence"},
		{"missing origin", clients[0], protocol.ClientMove{Seq: 1, Dest: "a3"}, "bad sequence"},
		{"missing destination", clients[0], protocol.ClientMove{Seq: 1, Orig: "a2"}, "bad sequence"},
		{"same square", clients[0], protocol.ClientMove{Seq: 1, Orig: "a2", Dest: "a2"}, "bad sequence"},
		{"bad castle", clients[0], protocol.ClientMove{Seq: 1, Kind: "castle", Orig: "i1"}, "bad sequence"},
		{"missing defection color", clients[0], protocol.ClientMove{Seq: 1, Kind: "defect"}, "bad sequence"},
		{"unknown action", clients[0], protocol.ClientMove{Seq: 1, Kind: "unknown"}, "bad sequence"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			before, err := store.Snapshot(room.RoomCode, user1)
			if err != nil {
				t.Fatal(err)
			}
			beforeGames, err := store.ListActiveGames(context.Background(), user1)
			if err != nil {
				t.Fatal(err)
			}
			h.handleClientMessage(room.RoomCode, tc.client.ID, tc.client.UserID, mustEncode(protocol.TypeMakeMove, tc.move))
			envelope := receiveEnvelope(t, tc.client, protocol.TypeMoveRejected)
			rejected, err := protocol.Decode[protocol.MoveRejected](envelope.Payload)
			if err != nil || rejected.Seq != tc.move.Seq || rejected.Reason != tc.reason {
				t.Fatalf("unexpected rejection: %+v %v", rejected, err)
			}
			after, err := store.Snapshot(room.RoomCode, user1)
			if err != nil || !reflect.DeepEqual(before, after) {
				t.Fatalf("rejection changed room: %+v %v", after, err)
			}
			afterGames, err := store.ListActiveGames(context.Background(), user1)
			if err != nil || !reflect.DeepEqual(beforeGames, afterGames) {
				t.Fatalf("rejection changed game metadata: %+v %v", afterGames, err)
			}
			for _, client := range clients {
				select {
				case message := <-client.Send:
					t.Fatalf("unexpected broadcast after rejection: %s", message)
				default:
				}
			}
		})
	}
	moves := []protocol.ClientMove{
		{Seq: 1, Orig: "a2", Dest: "a3", Promotion: "queen"},
		{Seq: 2, Kind: "castle", Orig: "i16", Dest: "j16"},
		{Seq: 3, Kind: "defect", Color: "navy"},
	}
	for i, move := range moves {
		client := clients[i%2]
		h.handleClientMessage(room.RoomCode, client.ID, client.UserID, mustEncode(protocol.TypeMakeMove, move))
		for _, recipient := range clients {
			envelope := receiveEnvelope(t, recipient, protocol.TypeMoveApplied)
			applied, err := protocol.Decode[protocol.Move](envelope.Payload)
			if err != nil || applied.Seq != move.Seq || applied.Seat != client.Seat || applied.Kind != move.Kind || applied.Orig != move.Orig || applied.Dest != move.Dest || applied.Color != move.Color || applied.Promotion != move.Promotion {
				t.Fatalf("unexpected accepted action: %+v %v", applied, err)
			}
		}
	}
	before, err := store.Snapshot(room.RoomCode, user1)
	if err != nil {
		t.Fatal(err)
	}
	if before.Seq != len(moves) || before.Turn != protocol.SeatPlayer2 || len(before.Moves) != len(moves) {
		t.Fatalf("unexpected final state: %+v", before)
	}
	for i, move := range moves {
		stored := before.Moves[i]
		if stored.Seq != move.Seq || stored.Kind != move.Kind || stored.Orig != move.Orig || stored.Dest != move.Dest || stored.Promotion != move.Promotion || stored.Color != move.Color {
			t.Fatalf("history out of order or changed: %+v", before.Moves)
		}
	}
	// A stale action must leave an already-populated history untouched as well.
	h.handleClientMessage(room.RoomCode, clients[1].ID, user2, mustEncode(protocol.TypeMakeMove, protocol.ClientMove{Seq: 3, Orig: "a15", Dest: "a14"}))
	receiveEnvelope(t, clients[1], protocol.TypeMoveRejected)
	unchanged, err := store.Snapshot(room.RoomCode, user1)
	if err != nil || !reflect.DeepEqual(before, unchanged) {
		t.Fatalf("stale action changed history: %+v %v", unchanged, err)
	}
	for _, client := range clients {
		store.Leave(room.RoomCode, client.ID)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db = testutil.OpenSQLiteAt(t, path)
	store = rooms.NewStore(db)
	handler = NewHandler(store, db)
	assertRoomEntry(t, roomEntryRequest(handler, room.RoomCode, cookie.Value), room.RoomCode, 2, protocol.SeatPlayer1)
	assertRoomEntry(t, roomEntryRequest(handler, room.RoomCode, "second"), room.RoomCode, 2, protocol.SeatPlayer2)
	assertRoomEntry(t, roomEntryRequest(handler, room.RoomCode, "observer"), room.RoomCode, 2, "")
	for i, user := range []string{user1, user2, observerID} {
		_, restored, err := store.Join(room.RoomCode, user)
		if err != nil {
			t.Fatal(err)
		}
		if restored.NewlyClaimed || restored.Seat != clients[i].Seat {
			t.Fatalf("seat changed after restart: %+v", restored)
		}
	}
	after, err := store.Snapshot(room.RoomCode, user1)
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatalf("restart changed state/history: %+v %v", after, err)
	}
	// Creating another room with the original cookie must reuse the durable user.
	request := httptest.NewRequest(http.MethodPost, "/api/rooms", nil)
	request.AddCookie(cookie)
	response = httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusCreated || len(response.Result().Cookies()) != 0 {
		t.Fatalf("identity was not recovered: %d %v", response.Code, response.Header())
	}
	games, err := store.ListActiveGames(context.Background(), user1)
	if err != nil || len(games) != 2 {
		t.Fatalf("expected both games under original identity: %+v %v", games, err)
	}
}
