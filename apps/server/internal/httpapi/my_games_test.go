package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/testutil"
)

func TestMyGamesSessionScope(t *testing.T) {
	sessions := testutil.OpenSQLite(t)
	user, err := sessions.CreateAnonymousSession(context.Background(), tokenHash("valid-token"))
	if err != nil {
		t.Fatal(err)
	}
	store := rooms.NewStore(sessions)
	room, err := store.Create(user)
	if err != nil {
		t.Fatal(err)
	}
	anotherUser := testutil.CreateUser(t, sessions, tokenHash("another-token"))
	if _, err := store.Create(anotherUser); err != nil {
		t.Fatal(err)
	}
	handler := NewHandler(store, sessions)
	for _, token := range []string{"", "invalid-token", "valid-token"} {
		t.Run(token, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/api/me/games?userId=another-user", nil)
			if token != "" {
				request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: token})
			}
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Fatalf("unexpected status: %d", response.Code)
			}
			if response.Header().Get("Cache-Control") != "private, no-store" || len(response.Result().Cookies()) != 0 {
				t.Fatalf("unexpected cache/cookie headers: %v", response.Header())
			}
			var body protocol.MyGamesResponse
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if body.Games == nil {
				t.Fatal("expected array, not null")
			}
			if token == "valid-token" {
				if len(body.Games) != 1 || body.Games[0].RoomCode != room.Code || body.Games[0].YourSeat != nil {
					t.Fatalf("incorrect scoped games: %+v", body.Games)
				}
			} else if len(body.Games) != 0 {
				t.Fatalf("unexpected games: %+v", body.Games)
			}
			for _, secret := range []string{user, anotherUser, "another-user", "valid-token", "tokenHash", "moves"} {
				if strings.Contains(response.Body.String(), secret) {
					t.Fatalf("response contains private/unnecessary field %s", secret)
				}
			}
		})
	}
}

type failingListRepository struct{ rooms.Repository }

func (failingListRepository) ListActiveGames(context.Context, string) ([]protocol.ActiveGameSummary, error) {
	return nil, errors.New("private database details")
}

type failingSessions struct{ sessionStore }

func (failingSessions) UserByTokenHash(context.Context, string) (string, bool, error) {
	return "", false, errors.New("private session details")
}

func TestMyGamesFailures(t *testing.T) {
	sessions := testutil.OpenSQLite(t)
	testutil.CreateUser(t, sessions, tokenHash("valid"))
	for _, handler := range []http.Handler{
		NewHandler(rooms.NewStore(failingListRepository{sessions}), sessions),
		NewHandler(rooms.NewStore(sessions), failingSessions{sessions}),
	} {
		request := httptest.NewRequest(http.MethodGet, "/api/me/games", nil)
		request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "valid"})
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, request)
		if response.Code != http.StatusInternalServerError || strings.Contains(response.Body.String(), "private") {
			t.Fatalf("expected generic error: %d %s", response.Code, response.Body.String())
		}
		if response.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("error response must not be cached")
		}
	}
}

type expiredSessions struct{ sessionStore }

func (expiredSessions) UserByTokenHash(context.Context, string) (string, bool, error) {
	return "", false, nil
}

func TestMyGamesExpiredSession(t *testing.T) {
	// The embedded nil sessionStore also ensures no new session is created.
	handler := NewHandler(rooms.NewStore(testutil.OpenSQLite(t)), expiredSessions{})
	request := httptest.NewRequest(http.MethodGet, "/api/me/games", nil)
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "expired"})
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusOK || strings.TrimSpace(response.Body.String()) != `{"games":[]}` || len(response.Result().Cookies()) != 0 {
		t.Fatalf("unexpected response: %d %s", response.Code, response.Body.String())
	}
}
