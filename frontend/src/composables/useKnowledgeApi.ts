import type { KnowledgeFile } from "@/types/knowledge"

// Dynamically import Wails bindings
let wailsApp: typeof import("../../wailsjs/go/main/App") | null = null

async function getWailsApp() {
  if (wailsApp) return wailsApp
  try {
    wailsApp = await import("../../wailsjs/go/main/App")
    return wailsApp
  } catch {
    return null
  }
}

function isWailsAvailable() {
  return typeof window !== "undefined" && (window as any).go?.main?.App !== undefined
}

const CATEGORIES = ["wiki"]

// Internal init – ensures the .whales directory structure exists
export async function initKnowledge(projectPath: string): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      await app.EnsureKnowledgeDirs(projectPath)
    }
  }
}

// List all knowledge files across all categories
export async function listAllKnowledgeFiles(projectPath: string): Promise<KnowledgeFile[]> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      const allFiles: KnowledgeFile[] = []
      for (const cat of CATEGORIES) {
        try {
          const files = (await app.ListKnowledgeFiles(projectPath, cat)) as unknown as KnowledgeFile[]
          allFiles.push(...files)
        } catch {
          // skip categories that don't exist
        }
      }
      return allFiles
    }
  }
  // Mock fallback
  return mockFiles()
}

// List files in a specific directory (subpath under .whales/)
export async function listDirectory(projectPath: string, dirPath: string): Promise<KnowledgeFile[]> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      try {
        const files = (await app.ListKnowledgeFiles(projectPath, dirPath)) as unknown as KnowledgeFile[]
        return files
      } catch {
        return []
      }
    }
  }
  return mockListDirectory(dirPath)
}

// Create a folder directly via the Go backend (no .gitkeep)
export async function createFolder(projectPath: string, folderPath: string): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app && (app as any).CreateKnowledgeDir) {
      await (app as any).CreateKnowledgeDir(projectPath, folderPath)
      return
    }
  }
  console.log(`[Mock] Create folder ${folderPath}`)
}

export async function readKnowledgeFile(projectPath: string, relativePath: string): Promise<string> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      return await app.ReadKnowledgeFile(projectPath, relativePath)
    }
  }
  return mockFileContent(relativePath)
}

export async function writeKnowledgeFile(
  projectPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      await app.WriteKnowledgeFile(projectPath, relativePath, content)
      return
    }
  }
  console.log(`[Mock] Write ${relativePath}: ${content.slice(0, 50)}...`)
}

export async function deleteKnowledgeFile(projectPath: string, relativePath: string): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      await app.DeleteKnowledgeFile(projectPath, relativePath)
      return
    }
  }
  console.log(`[Mock] Delete ${relativePath}`)
}

// ── Mock data ──────────────────────────────────────────────

function mockFiles(): KnowledgeFile[] {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16)
  return [
    { name: "index.md", path: "wiki/index.md", isDir: false, size: 120, modTime: now },
    { name: "architecture.md", path: "wiki/architecture.md", isDir: false, size: 340, modTime: now },
    { name: "requirements.md", path: "wiki/requirements.md", isDir: false, size: 560, modTime: now },
    { name: "api", path: "wiki/api", isDir: true, size: 0, modTime: now },
    { name: "guides", path: "wiki/guides", isDir: true, size: 0, modTime: now },
  ]
}

function mockListDirectory(dirPath: string): KnowledgeFile[] {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16)
  if (dirPath === "wiki/api") {
    return [
      { name: "auth.md", path: "wiki/api/auth.md", isDir: false, size: 200, modTime: now },
      { name: "endpoints.md", path: "wiki/api/endpoints.md", isDir: false, size: 450, modTime: now },
      { name: "v1", path: "wiki/api/v1", isDir: true, size: 0, modTime: now },
    ]
  }
  if (dirPath === "wiki/guides") {
    return [
      { name: "getting-started.md", path: "wiki/guides/getting-started.md", isDir: false, size: 310, modTime: now },
      { name: "best-practices.md", path: "wiki/guides/best-practices.md", isDir: false, size: 220, modTime: now },
    ]
  }
  if (dirPath === "wiki/api/v1") {
    return [
      { name: "users.md", path: "wiki/api/v1/users.md", isDir: false, size: 180, modTime: now },
      { name: "projects.md", path: "wiki/api/v1/projects.md", isDir: false, size: 250, modTime: now },
    ]
  }
  return []
}

function mockFileContent(relativePath: string): string {
  if (relativePath.endsWith("index.md")) {
    return `# 知识索引

欢迎来到知识管理页面。以下是本文档库的内容索引：

## 快速导航

- [架构文档](./architecture.md)
- [需求文档](./requirements.md)

## 说明

本目录为自动化生成的 Wiki 风格知识库，每个 markdown 文件代表一个知识条目。
`
  }

  if (relativePath.endsWith("architecture.md")) {
    return `# 架构文档

## 系统概述

本系统采用 Wails v2 + Vue 3 架构。

## 技术栈

- 前端: Vue 3 + TypeScript + Pinia
- 后端: Go + Wails v2
- 样式: SCSS + Tailwind CSS

## 目录结构

\`\`\`
frontend/
├── src/
│   ├── views/       # 页面视图
│   ├── components/  # 公共组件
│   ├── stores/      # Pinia 状态管理
│   └── router/      # 路由配置
\`\`\`
`
  }

  if (relativePath.endsWith("requirements.md")) {
    return `# 需求文档

## 功能需求

1. 项目管理 - 创建、编辑、删除项目
2. Agent 管理 - 配置 AI Agent
3. 知识管理 - 知识索引、文件管理、Schema 设计

## 非功能需求

- 桌面应用，原生体验
- 支持中英文国际化
`
  }

  return `# ${relativePath}\n\n内容加载中...\n`
}
