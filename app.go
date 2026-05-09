package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"changeme/internal/pty"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx        context.Context
	starCount  int
	ptyManager *pty.Manager
}

// NewApp creates a new App application struct
// NewApp 创建一个新的 App 应用程序
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
// startup 在应用程序启动时调用
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	// 在这里执行初始化设置
	a.ctx = ctx
	a.ptyManager = pty.NewManager(ctx)
}

// domReady is called after the front-end dom has been loaded
// domReady 在前端Dom加载完毕后调用
func (a *App) domReady(ctx context.Context) {
	// Add your action here
	// 在这里添加你的操作
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue,
// false will continue shutdown as normal.
// beforeClose在单击窗口关闭按钮或调用runtime.Quit即将退出应用程序时被调用.
// 返回 true 将导致应用程序继续，false 将继续正常关闭。
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
// 在应用程序终止时被调用
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
	// 在此处做一些资源释放的操作
	if a.ptyManager != nil {
		a.ptyManager.Shutdown()
	}
}

type StarResult struct {
	Message string `json:"message"`
	Count   int    `json:"count"`
}

func (a *App) StarMe() StarResult {
	a.starCount++
	fmt.Printf("hello %d\n", a.starCount)
	return StarResult{
		Message: fmt.Sprintf("hello %d", a.starCount),
		Count:   a.starCount,
	}
}

// SelectDirectory opens a native directory picker dialog and returns the selected path.
// SelectDirectory 打开原生文件夹选择对话框并返回选中的路径。
func (a *App) SelectDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择项目文件夹",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}

// ExportFile opens a save dialog with the suggested file name, writes the content to the selected path.
// ExportFile 打开保存对话框，将内容写入选择的文件路径。
func (a *App) ExportFile(suggestedName string, content string) (string, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "导出文件",
		DefaultFilename: suggestedName,
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files (*.json)",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil // user cancelled
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}
	return path, nil
}

// ImportFile opens a file dialog and returns the content of the selected JSON file.
// ImportFile 打开文件选择对话框并返回选中文件的内容。
func (a *App) ImportFile() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "导入文件",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "JSON Files (*.json)",
				Pattern:     "*.json",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if path == "" {
		return "", nil // user cancelled
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}
	return string(data), nil
}

// FileInfo represents a file or directory entry
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// EnsureKnowledgeDirs ensures the .whales/wiki directory exists under the project path.
// Creates an index.md file if it doesn't exist.
func (a *App) EnsureKnowledgeDirs(projectPath string) error {
	whalesDir := filepath.Join(projectPath, ".whales")
	wikiDir := filepath.Join(whalesDir, "wiki")

	if err := os.MkdirAll(wikiDir, 0755); err != nil {
		return fmt.Errorf("failed to create .whales/wiki directory: %w", err)
	}

	indexFile := filepath.Join(wikiDir, "index.md")
	if _, err := os.Stat(indexFile); os.IsNotExist(err) {
		defaultContent := "# Wiki知识\n\n在此编写Wiki知识内容...\n"
		if err := os.WriteFile(indexFile, []byte(defaultContent), 0644); err != nil {
			return fmt.Errorf("failed to create wiki/index.md: %w", err)
		}
	}

	return nil
}

// CreateKnowledgeDir creates a directory under the .whales directory.
// The relativePath should be relative to .whales/ (e.g., "wiki/subdir").
func (a *App) CreateKnowledgeDir(projectPath string, relativePath string) error {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return fmt.Errorf("invalid path: %s", relativePath)
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	if err := os.MkdirAll(fullPath, 0755); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", relativePath, err)
	}
	return nil
}

// ReadKnowledgeFile reads the content of a file under the .whales directory.
// The relativePath should be in the format "category/filename" (e.g., "project/index.md").
func (a *App) ReadKnowledgeFile(projectPath string, relativePath string) (string, error) {
	// Sanitize the relative path to prevent directory traversal
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return "", fmt.Errorf("invalid path: %s", relativePath)
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to read file %s: %w", relativePath, err)
	}
	return string(content), nil
}

// WriteKnowledgeFile writes content to a file under the .whales directory.
func (a *App) WriteKnowledgeFile(projectPath string, relativePath string, content string) error {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return fmt.Errorf("invalid path: %s", relativePath)
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to ensure directory: %w", err)
	}
	if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", relativePath, err)
	}
	return nil
}

// DeleteKnowledgeFile deletes a file under the .whales directory.
func (a *App) DeleteKnowledgeFile(projectPath string, relativePath string) error {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return fmt.Errorf("invalid path: %s", relativePath)
	}
	// Don't allow deleting index.md
	if filepath.Base(relativePath) == "index.md" {
		return fmt.Errorf("cannot delete index.md")
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file %s: %w", relativePath, err)
	}
	return nil
}

// ListKnowledgeFiles lists all files in a category directory under .whales.
func (a *App) ListKnowledgeFiles(projectPath string, category string) ([]FileInfo, error) {
	category = filepath.Clean(category)
	if strings.HasPrefix(category, "..") || filepath.IsAbs(category) {
		return nil, fmt.Errorf("invalid category: %s", category)
	}
	dirPath := filepath.Join(projectPath, ".whales", category)

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			return []FileInfo{}, nil
		}
		return nil, fmt.Errorf("failed to list directory %s: %w", category, err)
	}

	var result []FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}
		result = append(result, FileInfo{
			Name:    entry.Name(),
			Path:    filepath.Join(category, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Format("2006-01-02 15:04"),
		})
	}
	return result, nil
}

// --- PTY Terminal Methods ---

// PtyStart launches a shell command in a PTY for the given task.
// The frontend subscribes to "pty-output" and "pty-exit" events for output.
// initialInput is written to the PTY after the process has initialized.
// workDir sets the working directory for the command.
// PtyStart 为指定任务在PTY中启动shell命令。
func (a *App) PtyStart(taskId string, shellCommand string, initialInput string, workDir string) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Start(taskId, shellCommand, initialInput, workDir)
}

// PtyWrite sends keyboard input to an active PTY session.
// PtyWrite 向指定的PTY会话发送键盘输入。
func (a *App) PtyWrite(taskId string, input string) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Write(taskId, input)
}

// PtyStop terminates the PTY session for the given task.
// PtyStop 终止指定任务的PTY会话。
func (a *App) PtyStop(taskId string) error {
	if a.ptyManager == nil {
		return nil
	}
	return a.ptyManager.Stop(taskId)
}

// PtyResize adjusts the terminal dimensions for the given task.
// PtyResize 调整指定任务的终端尺寸。
func (a *App) PtyResize(taskId string, cols int, rows int) error {
	if a.ptyManager == nil {
		return fmt.Errorf("pty manager not initialized")
	}
	return a.ptyManager.Resize(taskId, cols, rows)
}
