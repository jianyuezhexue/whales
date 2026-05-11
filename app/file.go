package app

import (
	"fmt"
	"os"
	"os/exec"
	goruntime "runtime"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// StarResult is a trivial return type for StarMe
type StarResult struct {
	Message string `json:"message"`
	Count   int    `json:"count"`
}

// StarMe is a placeholder demo method
func (a *App) StarMe() StarResult {
	a.starCount++
	return StarResult{
		Message: fmt.Sprintf("hello %d", a.starCount),
		Count:   a.starCount,
	}
}

// SelectDirectory opens a native directory picker dialog
func (a *App) SelectDirectory() (string, error) {
	path, err := wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "选择项目文件夹",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// ExportFile opens a save dialog and writes content to the selected path
func (a *App) ExportFile(suggestedName string, content string) (string, error) {
	path, err := wailsRuntime.SaveFileDialog(a.ctx, wailsRuntime.SaveDialogOptions{
		Title:           "导出文件",
		DefaultFilename: suggestedName,
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return "", err
	}
	return path, nil
}

// ImportFile opens a file dialog and returns the content of the selected JSON file
func (a *App) ImportFile() (string, error) {
	path, err := wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: "导入文件",
		Filters: []wailsRuntime.FileFilter{
			{DisplayName: "JSON Files (*.json)", Pattern: "*.json"},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// OpenProjectDirectory opens the given path in the system file manager
func (a *App) OpenProjectDirectory(path string) error {
	if path == "" {
		return fmt.Errorf("project path is empty")
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("directory does not exist: %w", err)
	}

	var cmd *exec.Cmd
	switch goruntime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	case "windows":
		cmd = exec.Command("explorer", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Start()
}