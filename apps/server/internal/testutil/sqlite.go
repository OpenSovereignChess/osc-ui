// Package testutil provides file-backed SQLite fixtures for integration tests.
package testutil

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/storage"
)

func OpenSQLite(t *testing.T) *storage.SQLite {
	t.Helper()
	return OpenSQLiteAt(t, filepath.Join(t.TempDir(), "osc.db"))
}

func OpenSQLiteAt(t *testing.T, path string) *storage.SQLite {
	t.Helper()
	db, err := storage.OpenSQLite(path)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})
	return db
}

// CreateUser seeds both a user and session so foreign-key references are real.
// tokenHash must be unique within this database.
func CreateUser(t *testing.T, db *storage.SQLite, tokenHash string) string {
	t.Helper()
	user, err := db.CreateAnonymousSession(context.Background(), tokenHash)
	if err != nil {
		t.Fatalf("create anonymous session: %v", err)
	}
	return user
}
