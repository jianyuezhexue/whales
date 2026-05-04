package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx       context.Context
	starCount int
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

// KnowledgeDir represents a knowledge category directory
type KnowledgeDir struct {
	Key  string `json:"key"`
	Name string `json:"name"`
	Path string `json:"path"`
}

// FileInfo represents a file or directory entry
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// EnsureKnowledgeDirs ensures the .whales directory and all category subdirectories exist under the project path.
// Each category gets an index.md file if it doesn't exist.
func (a *App) EnsureKnowledgeDirs(projectPath string) ([]KnowledgeDir, error) {
	whalesDir := filepath.Join(projectPath, ".whales")
	categories := []struct {
		key  string
		name string
	}{
		{"project", "项目知识"},
		{"business", "业务知识"},
		{"workflow", "工作流程"},
		{"verifiable", "可验证知识"},
	}

	var result []KnowledgeDir

	if err := os.MkdirAll(whalesDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create .whales directory: %w", err)
	}

	for _, cat := range categories {
		catDir := filepath.Join(whalesDir, cat.key)
		if err := os.MkdirAll(catDir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create category directory %s: %w", cat.key, err)
		}
		indexFile := filepath.Join(catDir, "index.md")
		if _, err := os.Stat(indexFile); os.IsNotExist(err) {
			defaultContent := fmt.Sprintf("# %s\n\n在此编写%s内容...\n", cat.name, cat.name)
			if err := os.WriteFile(indexFile, []byte(defaultContent), 0644); err != nil {
				return nil, fmt.Errorf("failed to create index.md for %s: %w", cat.key, err)
			}
		}
		result = append(result, KnowledgeDir{
			Key:  cat.key,
			Name: cat.name,
			Path: catDir,
		})
	}

	return result, nil
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
