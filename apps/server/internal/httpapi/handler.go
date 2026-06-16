package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/ws"
)

type healthResponse struct {
	Status string `json:"status"`
}

type Handler struct {
	rooms *rooms.Store
}

type createRoomResponse struct {
	RoomCode string `json:"roomCode"`
	RoomURL  string `json:"roomUrl"`
}

func NewHandler() http.Handler {
	return NewHandlerWithRooms(rooms.NewStore())
}

func NewHandlerWithRooms(roomStore *rooms.Store) http.Handler {
	handler := &Handler{rooms: roomStore}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", handleRoot)
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("POST /api/rooms", handler.handleCreateRoom)
	mux.HandleFunc("OPTIONS /api/rooms", handleOptions)
	mux.HandleFunc("GET /api/rooms/{roomCode}/ws", handler.handleRoomWebsocket)
	return withCORS(mux)
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("Open Sovereign Chess server\n"))
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, healthResponse{Status: "ok"})
}

func handleOptions(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	room := h.rooms.Create()
	writeJSON(w, http.StatusCreated, createRoomResponse{
		RoomCode: room.Code,
		RoomURL:  "/play?room=" + room.Code,
	})
}

func (h *Handler) handleRoomWebsocket(w http.ResponseWriter, r *http.Request) {
	roomCode := strings.ToUpper(strings.TrimSpace(r.PathValue("roomCode")))
	if roomCode == "" {
		writeJSON(w, http.StatusBadRequest, protocol.Error{Message: "missing room code"})
		return
	}
	if !h.rooms.Exists(roomCode) {
		writeJSON(w, http.StatusNotFound, protocol.Error{Message: "room not found"})
		return
	}

	conn, err := ws.Upgrade(w, r)
	if err != nil {
		return
	}
	defer conn.Close()

	_, client, err := h.rooms.Join(roomCode)
	if err != nil {
		_ = conn.WriteText(mustEncode(protocol.TypeError, protocol.Error{Message: "room not found"}))
		return
	}
	defer h.leave(roomCode, client.ID)

	state, err := h.rooms.Snapshot(roomCode, client.ID)
	if err == nil {
		h.rooms.Send(roomCode, client.ID, mustEncode(protocol.TypeRoomState, state))
	}
	h.rooms.BroadcastExcept(roomCode, client.ID, mustEncode(protocol.TypePlayerJoined, protocol.PlayerEvent{
		Player: protocol.Player{ID: client.ID, Seat: client.Seat},
	}))

	go func() {
		for message := range client.Send {
			if err := conn.WriteText(message); err != nil {
				return
			}
		}
	}()

	for {
		message, err := conn.ReadText()
		if err != nil {
			if !errors.Is(err, io.EOF) {
				h.sendError(roomCode, client.ID, "connection read failed")
			}
			return
		}
		h.handleClientMessage(roomCode, client.ID, message)
	}
}

func (h *Handler) handleClientMessage(roomCode string, clientID string, message []byte) {
	var envelope protocol.Envelope
	if err := json.Unmarshal(message, &envelope); err != nil {
		h.sendError(roomCode, clientID, "invalid message")
		return
	}

	switch envelope.Type {
	case protocol.TypeJoinRoom:
		state, err := h.rooms.Snapshot(roomCode, clientID)
		if err != nil {
			h.sendError(roomCode, clientID, "room not found")
			return
		}
		h.rooms.Send(roomCode, clientID, mustEncode(protocol.TypeRoomState, state))
	case protocol.TypeMakeMove:
		move, err := protocol.Decode[protocol.ClientMove](envelope.Payload)
		if err != nil {
			h.sendMoveRejected(roomCode, clientID, 0, "invalid move")
			return
		}
		applied, err := h.rooms.ApplyMove(roomCode, clientID, move)
		if err != nil {
			h.sendMoveRejected(roomCode, clientID, move.Seq, moveRejectReason(err))
			return
		}
		h.rooms.Broadcast(roomCode, mustEncode(protocol.TypeMoveApplied, applied))
	default:
		h.sendError(roomCode, clientID, "unknown message type")
	}
}

func (h *Handler) leave(roomCode string, clientID string) {
	left, shouldBroadcast := h.rooms.Leave(roomCode, clientID)
	if left == nil || !shouldBroadcast {
		return
	}
	h.rooms.Broadcast(roomCode, mustEncode(protocol.TypePlayerLeft, protocol.PlayerEvent{Player: *left}))
}

func (h *Handler) sendError(roomCode string, clientID string, message string) {
	h.rooms.Send(roomCode, clientID, mustEncode(protocol.TypeError, protocol.Error{Message: message}))
}

func (h *Handler) sendMoveRejected(roomCode string, clientID string, seq int, reason string) {
	h.rooms.Send(roomCode, clientID, mustEncode(protocol.TypeMoveRejected, protocol.MoveRejected{
		Reason: reason,
		Seq:    seq,
	}))
}

func moveRejectReason(err error) string {
	switch {
	case errors.Is(err, rooms.ErrNotPlayer):
		return "observers cannot move"
	case errors.Is(err, rooms.ErrWrongTurn):
		return "wrong turn"
	case errors.Is(err, rooms.ErrBadSequence):
		return "bad sequence"
	default:
		return "move rejected"
	}
}

func mustEncode(messageType string, payload any) []byte {
	message, err := protocol.Encode(messageType, payload)
	if err != nil {
		panic(err)
	}
	return message
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		next.ServeHTTP(w, r)
	})
}
