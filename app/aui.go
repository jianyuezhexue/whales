package app

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// AuiPluginMeta describes an installed AUI plugin
type AuiPluginMeta struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Version     string                 `json:"version"`
	Author      string                 `json:"author"`
	Description string                 `json:"description"`
	Icon        string                 `json:"icon"`
	Category    string                 `json:"category"`
	Tags        []string               `json:"tags"`
	DataSchema  map[string]interface{} `json:"dataSchema"`
	SampleData  interface{}            `json:"sampleData"`
	Entry       string                 `json:"entry"`
	Style       string                 `json:"style"`
}

// AuiPluginAssets holds the JS and CSS content of a plugin for injection
type AuiPluginAssets struct {
	JS  string `json:"js"`
	CSS string `json:"css"`
}

// pluginsDir returns the path to the aui-plugins directory
func (a *App) pluginsDir(projectPath string) string {
	return filepath.Join(projectPath, ".whales", "aui-plugins")
}

// ListAuiPlugins scans the aui-plugins directory and returns metadata for all installed plugins
func (a *App) ListAuiPlugins(projectPath string) ([]AuiPluginMeta, error) {
	dir := a.pluginsDir(projectPath)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []AuiPluginMeta{}, nil
		}
		return nil, fmt.Errorf("failed to read plugins directory: %w", err)
	}

	var plugins []AuiPluginMeta
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		metaPath := filepath.Join(dir, entry.Name(), "plugin.json")
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}
		var meta AuiPluginMeta
		if json.Unmarshal(data, &meta) != nil {
			continue
		}
		plugins = append(plugins, meta)
	}
	return plugins, nil
}

// LoadAuiPlugin reads the JS and CSS assets of an installed plugin
func (a *App) LoadAuiPlugin(projectPath string, pluginId string) (*AuiPluginAssets, error) {
	pluginDir := filepath.Join(a.pluginsDir(projectPath), pluginId)

	// Read plugin.json to get entry/style file names
	metaPath := filepath.Join(pluginDir, "plugin.json")
	metaData, err := os.ReadFile(metaPath)
	if err != nil {
		return nil, fmt.Errorf("plugin %s not found", pluginId)
	}
	var meta AuiPluginMeta
	if err := json.Unmarshal(metaData, &meta); err != nil {
		return nil, fmt.Errorf("invalid plugin.json for %s", pluginId)
	}

	assets := &AuiPluginAssets{}

	// Read JS entry
	if meta.Entry != "" {
		entryPath := filepath.Join(pluginDir, meta.Entry)
		jsData, err := os.ReadFile(entryPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s for plugin %s: %w", meta.Entry, pluginId, err)
		}
		assets.JS = string(jsData)
	}

	// Read CSS (optional)
	if meta.Style != "" {
		cssPath := filepath.Join(pluginDir, meta.Style)
		cssData, err := os.ReadFile(cssPath)
		if err == nil {
			assets.CSS = string(cssData)
		}
	}

	return assets, nil
}

// InstallAuiPlugin installs a plugin from a zip file content
func (a *App) InstallAuiPlugin(projectPath string, pluginId string, zipContent string) error {
	// TODO: For now we use file-based installation (plugin directory already exists)
	// Future: accept zip content, extract, validate, and install
	pluginDir := filepath.Join(a.pluginsDir(projectPath), pluginId)
	if err := os.MkdirAll(pluginDir, 0755); err != nil {
		return fmt.Errorf("failed to create plugin directory: %w", err)
	}
	return nil
}

// UninstallAuiPlugin removes an installed plugin directory
func (a *App) UninstallAuiPlugin(projectPath string, pluginId string) error {
	// Validate plugin ID to prevent path traversal
	if strings.Contains(pluginId, "/") || strings.Contains(pluginId, "..") {
		return fmt.Errorf("invalid plugin id: %s", pluginId)
	}
	pluginDir := filepath.Join(a.pluginsDir(projectPath), pluginId)
	if err := os.RemoveAll(pluginDir); err != nil {
		return fmt.Errorf("failed to uninstall plugin %s: %w", pluginId, err)
	}
	return nil
}