package httpapi

import (
	"net/http"
	"testing"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/testutil"
)

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()
	db := testutil.OpenSQLite(t)
	return NewHandler(rooms.NewStore(db), db)
}
