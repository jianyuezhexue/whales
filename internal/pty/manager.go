package pty

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Session represents an active PTY session for a task.
type Session struct {
	cmd    *exec.Cmd
	ptmx   *os.File
	cancel context.CancelFunc
}

// Manager manages PTY sessions keyed by task ID.
type Manager struct {
	sessions map[string]*Session
	mu       sync.Mutex
	ctx      context.Context
}

// NewManager creates a new PTY session manager.
func NewManager(ctx context.Context) *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
		ctx:      ctx,
	}
}

// Start launches a command in a pseudo-terminal for the given task.
// If initialInput is non-empty, it will be written to the PTY after a short delay.
// If workDir is non-empty, it sets the working directory for the command.
func (m *Manager) Start(taskID, shellCommand, initialInput, workDir string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.sessions[taskID]; exists {
		return fmt.Errorf("session already exists for task %s", taskID)
	}

	ctx, cancel := context.WithCancel(m.ctx)
	cmd := exec.CommandContext(ctx, "sh", "-c", shellCommand)
	if workDir != "" {
		cmd.Dir = workDir
	}

	ptmx, err := pty.Start(cmd)
	if err != nil {
		cancel()
		return fmt.Errorf("failed to start PTY: %w", err)
	}

	session := &Session{
		cmd:    cmd,
		ptmx:   ptmx,
		cancel: cancel,
	}
	m.sessions[taskID] = session

	go m.readLoop(taskID, session)

	if initialInput != "" {
		s := session
		go func() {
			time.Sleep(800 * time.Millisecond)
			s.ptmx.Write([]byte(initialInput + "\r"))
		}()
	}

	return nil
}

// readLoop continuously reads from the PTY and emits output via Wails events.
func (m *Manager) readLoop(taskID string, s *Session) {
	buf := make([]byte, 4096)
	for {
		n, err := s.ptmx.Read(buf)
		if n > 0 {
			runtime.EventsEmit(m.ctx, "pty-output", taskID, string(buf[:n]))
		}
		if err != nil {
			if err != io.EOF {
				runtime.EventsEmit(m.ctx, "pty-output", taskID, fmt.Sprintf("\r\n[Error: %v]\r\n", err))
			}
			runtime.EventsEmit(m.ctx, "pty-exit", taskID, 0)
			return
		}
	}
}

// Write sends input to the PTY for the given task.
func (m *Manager) Write(taskID, input string) error {
	m.mu.Lock()
	s, ok := m.sessions[taskID]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("no session for task %s", taskID)
	}
	_, err := s.ptmx.Write([]byte(input))
	return err
}

// Stop terminates the PTY session for the given task.
func (m *Manager) Stop(taskID string) error {
	m.mu.Lock()
	s, ok := m.sessions[taskID]
	if ok {
		delete(m.sessions, taskID)
	}
	m.mu.Unlock()
	if !ok {
		return nil
	}
	s.cancel()
	s.ptmx.Close()
	return nil
}

// Resize changes the terminal window size for the given task.
func (m *Manager) Resize(taskID string, cols, rows int) error {
	m.mu.Lock()
	s, ok := m.sessions[taskID]
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("no session for task %s", taskID)
	}
	return pty.Setsize(s.ptmx, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

// Shutdown stops all active sessions. Called on app shutdown.
func (m *Manager) Shutdown() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for id, s := range m.sessions {
		s.cancel()
		s.ptmx.Close()
		delete(m.sessions, id)
	}
}
