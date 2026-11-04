package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/storage"
)

type readOnlySessions struct{ sessionStore }

func (readOnlySessions) CreateAnonymousSession(context.Context, string) (string, error) {
	panic("room lookup must not create a session")
}

type readOnlyRooms struct{ rooms.Repository }

func (readOnlyRooms) ClaimSeat(context.Context, string, string) (protocol.Seat, bool, error) {
	panic("room lookup must not claim a seat")
}

func roomEntryRequest(handler http.Handler, code, token string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodGet, "/api/rooms/"+code+"?userId=someone-else", nil)
	if token != "" {
		request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func assertRoomEntry(t *testing.T, response *httptest.ResponseRecorder, code string, count int, seat protocol.Seat) {
	t.Helper()
	if response.Code != http.StatusOK {
		t.Fatalf("unexpected response: %d %s", response.Code, response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "private, no-store" || len(response.Result().Cookies()) != 0 {
		t.Fatalf("unexpected cache/cookie headers: %v", response.Header())
	}
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(response.Body.Bytes(), &fields); err != nil || len(fields) != 3 {
		t.Fatalf("unexpected response fields: %s (%v)", response.Body.String(), err)
	}
	var body protocol.RoomEntry
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	actualSeat := protocol.Seat("")
	if body.YourSeat != nil {
		actualSeat = *body.YourSeat
	}
	if body.RoomCode != code || body.ClaimedSeats != count || actualSeat != seat {
		t.Fatalf("incorrect eligibility: %+v, seat %s", body, actualSeat)
	}
}

func TestRoomEntryDoesNotJoin(t *testing.T) {
	ctx := context.Background()
	sessions := storage.NewMemorySessions()
	users := []string{}
	for _, token := range []string{"first", "second", "stranger"} {
		user, err := sessions.CreateAnonymousSession(ctx, tokenHash(token))
		if err != nil {
			t.Fatal(err)
		}
		users = append(users, user)
	}
	for claimed := 0; claimed <= 2; claimed++ {
		repo := rooms.NewMemoryRepository()
		store := rooms.NewStoreWithRepository(readOnlyRooms{repo})
		room, err := store.Create(users[0])
		if err != nil {
			t.Fatal(err)
		}
		for i := 0; i < claimed; i++ {
			if _, _, err := repo.ClaimSeat(ctx, room.Code, users[i]); err != nil {
				t.Fatal(err)
			}
		}
		// No WebSocket clients are present, even when both seats are claimed.
		before, _ := store.Snapshot(room.Code, users[0])
		handler := NewHandlerWithRoomsAndSessions(store, readOnlySessions{sessions})
		for _, token := range []string{"", "invalid", "first", "second", "stranger"} {
			seat := protocol.Seat("")
			if token == "first" && claimed >= 1 {
				seat = protocol.SeatPlayer1
			}
			if token == "second" && claimed == 2 {
				seat = protocol.SeatPlayer2
			}
			assertRoomEntry(t, roomEntryRequest(handler, strings.ToLower(room.Code), token), room.Code, claimed, seat)
		}
		expired := NewHandlerWithRoomsAndSessions(store, expiredSessions{})
		assertRoomEntry(t, roomEntryRequest(expired, room.Code, "expired"), room.Code, claimed, "")
		after, _ := store.Snapshot(room.Code, users[0])
		if !reflect.DeepEqual(before, after) {
			t.Fatal("lookup changed room state")
		}
	}
}

type failingSnapshotRepository struct{ rooms.Repository }

func (failingSnapshotRepository) Snapshot(context.Context, string, string) (protocol.RoomState, error) {
	return protocol.RoomState{}, errors.New("private database details")
}

func TestRoomEntryErrorsAndCORS(t *testing.T) {
	for _, tc := range []struct {
		handler http.Handler
		status  int
	}{
		{NewHandlerWithRooms(rooms.NewStore()), http.StatusNotFound},
		{NewHandlerWithRoomsAndSessions(rooms.NewStore(), failingSessions{}), http.StatusInternalServerError},
		{NewHandlerWithRooms(rooms.NewStoreWithRepository(failingSnapshotRepository{})), http.StatusInternalServerError},
	} {
		response := roomEntryRequest(tc.handler, "MISSING", "token")
		if response.Code != tc.status || strings.Contains(response.Body.String(), "private") {
			t.Fatalf("unexpected error: %d %s", response.Code, response.Body.String())
		}
		if response.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("error must not be cached")
		}
		request := httptest.NewRequest(http.MethodOptions, "/api/rooms/ANY", nil)
		request.Header.Set("Origin", "https://web.example")
		response = httptest.NewRecorder()
		tc.handler.ServeHTTP(response, request)
		if response.Code != http.StatusNoContent || response.Header().Get("Access-Control-Allow-Origin") != "https://web.example" || response.Header().Get("Access-Control-Allow-Credentials") != "true" {
			t.Fatalf("unexpected preflight: %d %v", response.Code, response.Header())
		}
	}
}

func TestRoomEntryAfterSQLiteReopen(t *testing.T) {
	ctx := context.Background()
	path := filepath.Join(t.TempDir(), "osc.db")
	db, err := storage.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	for _, token := range []string{"first", "second"} {
		user, err := db.CreateAnonymousSession(ctx, tokenHash(token))
		if err != nil {
			t.Fatal(err)
		}
		if token == "first" {
			if _, err := db.CreateGame(ctx, "ABCD1234", user); err != nil {
				t.Fatal(err)
			}
		}
		if _, _, err := db.ClaimSeat(ctx, "ABCD1234", user); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	db, err = storage.OpenSQLite(path)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	handler := NewHandlerWithRoomsAndSessions(rooms.NewStoreWithRepository(readOnlyRooms{db}), readOnlySessions{db})
	assertRoomEntry(t, roomEntryRequest(handler, "abcd1234", "first"), "ABCD1234", 2, protocol.SeatPlayer1)
	assertRoomEntry(t, roomEntryRequest(handler, "ABCD1234", "second"), "ABCD1234", 2, protocol.SeatPlayer2)
	assertRoomEntry(t, roomEntryRequest(handler, "ABCD1234", ""), "ABCD1234", 2, "")
}
