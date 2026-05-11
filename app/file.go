package app

import (
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择项目文件夹",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// ExportFile opens a save dialog and writes content to the selected path
func (a *App) ExportFile(suggestedName string, content string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出文件",
		DefaultFilename: suggestedName,
		Filters: []runtime.FileFilter{
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
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "导入文件",
		Filters: []runtime.FileFilter{
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