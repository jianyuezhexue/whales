package app

import "fmt"

// PtyStart launches a shell command in a PTY for the given task
func (a *App) PtyStart(taskId string, shellCommand string, initialInput string, workDir string) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Start(taskId, shellCommand, initialInput, workDir)
}

// PtyWrite sends keyboard input to an active PTY session
func (a *App) PtyWrite(taskId string, input string) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Write(taskId, input)
}

// PtyStop terminates the PTY session for the given task
func (a *App) PtyStop(taskId string) error {
	if a.ptyManager == nil {
		return nil
	}
	return a.ptyManager.Stop(taskId)
}

// PtyResize adjusts the terminal dimensions for the given task
func (a *App) PtyResize(taskId string, cols int, rows int) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Resize(taskId, cols, rows)
}