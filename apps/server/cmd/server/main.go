package main

import (
	"context"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/opensovereignchess/osc-ui/apps/server/internal/httpapi"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/rooms"
	"github.com/opensovereignchess/osc-ui/apps/server/internal/storage"
)

func main() {
	addr := flag.String("addr", envOrDefault("OSC_SERVER_ADDR", ":8080"), "HTTP listen address")
	dbPath := flag.String("db", envOrDefault("OSC_DB_PATH", "osc.db"), "SQLite database path")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	db, err := storage.OpenSQLite(*dbPath)
	if err != nil {
		logger.Error("database open failed", "path", *dbPath, "error", err)
		os.Exit(1)
	}
	defer db.Close()

	server := &http.Server{
		Addr:              *addr,
		Handler:           httpapi.NewHandlerWithRoomsAndSessions(rooms.NewStoreWithRepository(db), db),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		logger.Info("server listening", "addr", server.Addr)
		errCh <- server.ListenAndServe()
	}()

	stopCh := make(chan os.Signal, 1)
	signal.Notify(stopCh, os.Interrupt, syscall.SIGTERM)

	select {
	case sig := <-stopCh:
		logger.Info("server stopping", "signal", sig.String())
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			logger.Error("server failed", "error", err)
			os.Exit(1)
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		logger.Error("server shutdown failed", "error", err)
		os.Exit(1)
	}
}

func envOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
