package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// FileInfo represents a file or directory entry
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime string `json:"modTime"`
}

// EnsureKnowledgeDirs ensures the .whales/wiki directory exists under the project path
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

// CreateKnowledgeDir creates a directory under the .whales directory
func (a *App) CreateKnowledgeDir(projectPath string, relativePath string) error {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return fmt.Errorf("invalid path: %s", relativePath)
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	return os.MkdirAll(fullPath, 0755)
}

// ReadKnowledgeFile reads the content of a file under the .whales directory
func (a *App) ReadKnowledgeFile(projectPath string, relativePath string) (string, error) {
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

// WriteKnowledgeFile writes content to a file under the .whales directory
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

// DeleteKnowledgeFile deletes a file under the .whales directory
func (a *App) DeleteKnowledgeFile(projectPath string, relativePath string) error {
	relativePath = filepath.Clean(relativePath)
	if strings.HasPrefix(relativePath, "..") || filepath.IsAbs(relativePath) {
		return fmt.Errorf("invalid path: %s", relativePath)
	}
	if filepath.Base(relativePath) == "index.md" {
		return fmt.Errorf("cannot delete index.md")
	}
	fullPath := filepath.Join(projectPath, ".whales", relativePath)
	if err := os.Remove(fullPath); err != nil {
		return fmt.Errorf("failed to delete file %s: %w", relativePath, err)
	}
	return nil
}

// ListKnowledgeFiles lists all files in a category directory under .whales
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