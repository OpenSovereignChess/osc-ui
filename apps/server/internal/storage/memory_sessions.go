package storage

import (
	"context"
	"sync"
)

type MemorySessions struct {
	mu     sync.Mutex
	next   int
	tokens map[string]string
}

func NewMemorySessions() *MemorySessions {
	return &MemorySessions{tokens: make(map[string]string)}
}

func (s *MemorySessions) CreateAnonymousSession(_ context.Context, tokenHash string) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.next++
	userID := prefixedID("usr")
	if userID == "" {
		userID = "user"
	}
	s.tokens[tokenHash] = userID
	return userID, nil
}

func (s *MemorySessions) UserByTokenHash(_ context.Context, tokenHash string) (string, bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	userID, ok := s.tokens[tokenHash]
	return userID, ok, nil
}
