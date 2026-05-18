package app

import (
	"archive/zip"
	"bufio"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalSkillInfo describes a locally installed skill from .claude/skills/
type LocalSkillInfo struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Path        string `json:"path"`
}

// FetchLocalSkills scans <projectPath>/.claude/skills/ for installed skills.
// Skills can be either directories containing SKILL.md, or .skill ZIP files.
func (a *App) FetchLocalSkills(projectPath string) ([]LocalSkillInfo, error) {
	skillDir := filepath.Join(projectPath, ".claude", "skills")

	entries, err := os.ReadDir(skillDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []LocalSkillInfo{}, nil
		}
		return nil, fmt.Errorf("failed to read skills directory: %w", err)
	}

	var skills []LocalSkillInfo
	for _, entry := range entries {
		if entry.IsDir() {
			info := readLocalSkillDir(filepath.Join(skillDir, entry.Name()), entry.Name())
			if info != nil {
				skills = append(skills, *info)
			}
		} else if strings.HasSuffix(entry.Name(), ".skill") {
			info := readLocalSkillZip(filepath.Join(skillDir, entry.Name()), strings.TrimSuffix(entry.Name(), ".skill"))
			if info != nil {
				skills = append(skills, *info)
			}
		}
	}
	return skills, nil
}

func readLocalSkillDir(dir string, dirName string) *LocalSkillInfo {
	data, err := os.ReadFile(filepath.Join(dir, "SKILL.md"))
	if err != nil {
		data, err = os.ReadFile(filepath.Join(dir, "skill.md"))
		if err != nil {
			return nil
		}
	}
	name, desc := parseSkillFrontmatter(string(data))
	if name == "" {
		name = dirName
	}
	return &LocalSkillInfo{
		ID:          dirName,
		Name:        name,
		Description: desc,
		Path:        dir,
	}
}

func readLocalSkillZip(zipPath string, skillName string) *LocalSkillInfo {
	r, err := zip.OpenReader(zipPath)
	if err != nil {
		return nil
	}
	defer r.Close()

	for _, f := range r.File {
		if !f.FileInfo().IsDir() && (f.Name == "SKILL.md" || strings.HasSuffix(f.Name, "/SKILL.md")) {
			rc, err := f.Open()
			if err != nil {
				continue
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				continue
			}
			name, desc := parseSkillFrontmatter(string(data))
			if name == "" {
				name = skillName
			}
			return &LocalSkillInfo{
				ID:          skillName,
				Name:        name,
				Description: desc,
				Path:        zipPath,
			}
		}
	}
	return nil
}

func parseSkillFrontmatter(content string) (name string, description string) {
	rest, ok := strings.CutPrefix(content, "---\n")
	if !ok {
		rest, ok = strings.CutPrefix(content, "---\r\n")
		if !ok {
			return "", ""
		}
	}

	end := strings.Index(rest, "\n---")
	if end < 0 {
		end = strings.Index(rest, "\r\n---")
		if end < 0 {
			return "", ""
		}
	}
	fm := rest[:end]

	scanner := bufio.NewScanner(strings.NewReader(fm))
	var descLines []string
	currentKey := ""

	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "#") {
			continue
		}

		colonIdx := strings.Index(line, ":")
		if colonIdx >= 0 {
			k := strings.TrimSpace(line[:colonIdx])
			v := strings.TrimSpace(line[colonIdx+1:])

			if k == "name" || k == "description" {
				if currentKey == "description" {
					description = strings.Join(descLines, " ")
					descLines = nil
				}
				currentKey = k
				if k == "name" {
					name = strings.Trim(v, "\"'")
					currentKey = ""
				} else if v != "" && v != ">" && v != "|" {
					descLines = append(descLines, strings.Trim(v, "\"'"))
				}
				continue
			}
		}

		if currentKey == "description" && line != "" {
			descLines = append(descLines, strings.TrimSpace(line))
		}
	}

	if currentKey == "description" {
		description = strings.Join(descLines, " ")
	}

	return name, description
}
