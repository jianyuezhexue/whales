package app

import (
	"context"
	"fmt"
	"strings"

	"changeme/internal/pty"

	"path/filepath"
)

// App struct
type App struct {
	ctx        context.Context
	starCount  int
	ptyManager *pty.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.ptyManager = pty.NewManager(ctx)
}

// DomReady is called after the front-end dom has been loaded
func (a *App) DomReady(ctx context.Context) {}

// BeforeClose is called when the application is about to quit
func (a *App) BeforeClose(ctx context.Context) (prevent bool) {
	return false
}

// Shutdown is called at application termination
func (a *App) Shutdown(ctx context.Context) {
	if a.ptyManager != nil {
		a.ptyManager.Shutdown()
	}
}

// helper: validate and clean a relative path under .whales/
func (a *App) whalesPath(projectPath, relativePath string) (string, error) {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return "", fmt.Errorf("invalid path: %s", relativePath)
	}
	return filepath.Join(projectPath, ".whales", relativePath), nil
}