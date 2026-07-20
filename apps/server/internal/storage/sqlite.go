package storage

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	_ "modernc.org/sqlite"
)

type SQLite struct {
	db *sql.DB
}

func OpenSQLite(path string) (*SQLite, error) {
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	store := &SQLite{db: db}
	if err := store.init(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *SQLite) Close() error {
	return s.db.Close()
}

func (s *SQLite) init(ctx context.Context) error {
	statements := []string{
		`PRAGMA journal_mode = WAL`,
		`PRAGMA foreign_keys = ON`,
		`PRAGMA busy_timeout = 5000`,
		`CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			kind TEXT NOT NULL,
			display_name TEXT,
			created_at TEXT NOT NULL,
			last_seen_at TEXT NOT NULL
		)`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id),
			token_hash TEXT NOT NULL UNIQUE,
			created_at TEXT NOT NULL,
			last_seen_at TEXT NOT NULL,
			expires_at TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS games (
			id TEXT PRIMARY KEY,
			room_code TEXT NOT NULL UNIQUE,
			status TEXT NOT NULL,
			turn_seat TEXT NOT NULL,
			seq INTEGER NOT NULL DEFAULT 0,
			created_by_user_id TEXT REFERENCES users(id),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			completed_at TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS game_seats (
			game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
			seat TEXT NOT NULL,
			user_id TEXT NOT NULL REFERENCES users(id),
			claimed_at TEXT NOT NULL,
			PRIMARY KEY (game_id, seat),
			UNIQUE (game_id, user_id)
		)`,
		`CREATE TABLE IF NOT EXISTS moves (
			game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
			seq INTEGER NOT NULL,
			seat TEXT NOT NULL,
			kind TEXT NOT NULL DEFAULT '',
			orig TEXT NOT NULL DEFAULT '',
			dest TEXT NOT NULL DEFAULT '',
			promotion TEXT NOT NULL DEFAULT '',
			color TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL,
			PRIMARY KEY (game_id, seq)
		)`,
	}
	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return err
		}
	}
	return nil
}

func (s *SQLite) CreateAnonymousSession(ctx context.Context, tokenHash string) (string, error) {
	now := nowString()
	userID := prefixedID("usr")
	sessionID := prefixedID("ses")

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer rollback(tx)

	if _, err := tx.ExecContext(ctx, `INSERT INTO users (id, kind, created_at, last_seen_at) VALUES (?, 'anonymous', ?, ?)`, userID, now, now); err != nil {
		return "", err
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO sessions (id, user_id, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)`, sessionID, userID, tokenHash, now, now); err != nil {
		return "", err
	}
	if err := tx.Commit(); err != nil {
		return "", err
	}
	return userID, nil
}

func (s *SQLite) UserByTokenHash(ctx context.Context, tokenHash string) (string, bool, error) {
	var userID string
	err := s.db.QueryRowContext(ctx, `
		SELECT users.id
		FROM sessions
		JOIN users ON users.id = sessions.user_id
		WHERE sessions.token_hash = ?
			AND (sessions.expires_at IS NULL OR sessions.expires_at > ?)
	`, tokenHash, nowString()).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	now := nowString()
	if _, err := s.db.ExecContext(ctx, `UPDATE users SET last_seen_at = ? WHERE id = ?`, now, userID); err != nil {
		return "", false, err
	}
	if _, err := s.db.ExecContext(ctx, `UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?`, now, tokenHash); err != nil {
		return "", false, err
	}
	return userID, true, nil
}

func (s *SQLite) CreateGame(ctx context.Context, roomCode string, createdByUserID string) (*rooms.Room, error) {
	now := nowString()
	code := normalizeCode(roomCode)
	result, err := s.db.ExecContext(ctx, `
		INSERT OR IGNORE INTO games (id, room_code, status, turn_seat, seq, created_by_user_id, created_at, updated_at)
		VALUES (?, ?, 'active', ?, 0, ?, ?, ?)
	`, prefixedID("gam"), code, protocol.SeatPlayer1, createdByUserID, now, now)
	if err != nil {
		return nil, err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}
	if rows == 0 {
		return nil, rooms.ErrBadSequence
	}
	return &rooms.Room{Code: code}, nil
}

func (s *SQLite) Exists(ctx context.Context, roomCode string) (bool, error) {
	var exists int
	err := s.db.QueryRowContext(ctx, `SELECT 1 FROM games WHERE room_code = ?`, normalizeCode(roomCode)).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func (s *SQLite) ClaimSeat(ctx context.Context, roomCode string, userID string) (protocol.Seat, bool, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", false, err
	}
	defer rollback(tx)

	gameID, err := gameIDByCode(ctx, tx, roomCode)
	if err != nil {
		return "", false, err
	}

	seat, found, err := seatForUser(ctx, tx, gameID, userID)
	if err != nil || found {
		return seat, false, err
	}

	for _, candidate := range []protocol.Seat{protocol.SeatPlayer1, protocol.SeatPlayer2} {
		result, err := tx.ExecContext(ctx, `INSERT OR IGNORE INTO game_seats (game_id, seat, user_id, claimed_at) VALUES (?, ?, ?, ?)`, gameID, candidate, userID, nowString())
		if err != nil {
			return "", false, err
		}
		rows, err := result.RowsAffected()
		if err != nil {
			return "", false, err
		}
		if rows == 1 {
			if err := tx.Commit(); err != nil {
				return "", false, err
			}
			return candidate, true, nil
		}
		seat, found, err = seatForUser(ctx, tx, gameID, userID)
		if err != nil || found {
			if err := tx.Commit(); err != nil {
				return "", false, err
			}
			return seat, false, err
		}
	}

	if err := tx.Commit(); err != nil {
		return "", false, err
	}
	return protocol.SeatObserver, false, nil
}

func (s *SQLite) Snapshot(ctx context.Context, roomCode string, userID string) (protocol.RoomState, error) {
	code := normalizeCode(roomCode)
	var gameID string
	var turn protocol.Seat
	var seq int
	err := s.db.QueryRowContext(ctx, `SELECT id, turn_seat, seq FROM games WHERE room_code = ?`, code).Scan(&gameID, &turn, &seq)
	if errors.Is(err, sql.ErrNoRows) {
		return protocol.RoomState{}, rooms.ErrRoomNotFound
	}
	if err != nil {
		return protocol.RoomState{}, err
	}

	players := []protocol.Player{}
	you := protocol.Player{ID: userID, Seat: protocol.SeatObserver}
	rows, err := s.db.QueryContext(ctx, `SELECT user_id, seat FROM game_seats WHERE game_id = ? ORDER BY seat`, gameID)
	if err != nil {
		return protocol.RoomState{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var player protocol.Player
		if err := rows.Scan(&player.ID, &player.Seat); err != nil {
			return protocol.RoomState{}, err
		}
		players = append(players, player)
		if player.ID == userID {
			you.Seat = player.Seat
		}
	}
	if err := rows.Err(); err != nil {
		return protocol.RoomState{}, err
	}

	moves, err := s.moves(ctx, gameID)
	if err != nil {
		return protocol.RoomState{}, err
	}
	return protocol.RoomState{RoomCode: code, You: you, Players: players, Turn: turn, Seq: seq, Moves: moves}, nil
}

func (s *SQLite) ApplyMove(ctx context.Context, roomCode string, moveUserID string, move protocol.ClientMove) (protocol.Move, error) {
	if err := rooms.ValidateMoveShape(move); err != nil {
		return protocol.Move{}, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return protocol.Move{}, err
	}
	defer rollback(tx)

	var gameID string
	var turn protocol.Seat
	var seq int
	err = tx.QueryRowContext(ctx, `SELECT id, turn_seat, seq FROM games WHERE room_code = ?`, normalizeCode(roomCode)).Scan(&gameID, &turn, &seq)
	if errors.Is(err, sql.ErrNoRows) {
		return protocol.Move{}, rooms.ErrRoomNotFound
	}
	if err != nil {
		return protocol.Move{}, err
	}

	seat, found, err := seatForUser(ctx, tx, gameID, moveUserID)
	if err != nil {
		return protocol.Move{}, err
	}
	if !found || seat == protocol.SeatObserver {
		return protocol.Move{}, rooms.ErrNotPlayer
	}
	if seat != turn {
		return protocol.Move{}, rooms.ErrWrongTurn
	}
	if move.Seq != seq+1 {
		return protocol.Move{}, rooms.ErrBadSequence
	}

	applied := protocol.Move{Seq: move.Seq, Seat: seat, Kind: move.Kind, Orig: move.Orig, Dest: move.Dest, Promotion: move.Promotion, Color: move.Color}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO moves (game_id, seq, seat, kind, orig, dest, promotion, color, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, gameID, applied.Seq, applied.Seat, applied.Kind, applied.Orig, applied.Dest, applied.Promotion, applied.Color, nowString()); err != nil {
		return protocol.Move{}, mapConstraintToBadSequence(err)
	}
	if _, err := tx.ExecContext(ctx, `UPDATE games SET seq = ?, turn_seat = ?, updated_at = ? WHERE id = ?`, move.Seq, oppositeSeat(turn), nowString(), gameID); err != nil {
		return protocol.Move{}, err
	}
	if err := tx.Commit(); err != nil {
		return protocol.Move{}, err
	}
	return applied, nil
}

func (s *SQLite) moves(ctx context.Context, gameID string) ([]protocol.Move, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT seq, seat, kind, orig, dest, promotion, color FROM moves WHERE game_id = ? ORDER BY seq`, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	moves := []protocol.Move{}
	for rows.Next() {
		var move protocol.Move
		if err := rows.Scan(&move.Seq, &move.Seat, &move.Kind, &move.Orig, &move.Dest, &move.Promotion, &move.Color); err != nil {
			return nil, err
		}
		moves = append(moves, move)
	}
	return moves, rows.Err()
}

func gameIDByCode(ctx context.Context, tx *sql.Tx, roomCode string) (string, error) {
	var gameID string
	err := tx.QueryRowContext(ctx, `SELECT id FROM games WHERE room_code = ?`, normalizeCode(roomCode)).Scan(&gameID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", rooms.ErrRoomNotFound
	}
	return gameID, err
}

func seatForUser(ctx context.Context, tx *sql.Tx, gameID string, userID string) (protocol.Seat, bool, error) {
	var seat protocol.Seat
	err := tx.QueryRowContext(ctx, `SELECT seat FROM game_seats WHERE game_id = ? AND user_id = ?`, gameID, userID).Scan(&seat)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	return seat, err == nil, err
}

func rollback(tx *sql.Tx) {
	_ = tx.Rollback()
}

func oppositeSeat(seat protocol.Seat) protocol.Seat {
	if seat == protocol.SeatPlayer1 {
		return protocol.SeatPlayer2
	}
	return protocol.SeatPlayer1
}

func normalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func nowString() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}

func prefixedID(prefix string) string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("%s_%s", prefix, strings.TrimRight(base32.StdEncoding.EncodeToString(b[:]), "="))
}

func mapConstraintToBadSequence(err error) error {
	if strings.Contains(strings.ToLower(err.Error()), "constraint") {
		return rooms.ErrBadSequence
	}
	return err
}
