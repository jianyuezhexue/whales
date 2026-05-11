import type { AuiInstance } from "@/types/aui"

let wailsApp: typeof import("../../wailsjs/go/app/App") | null = null

async function getWailsApp() {
  if (wailsApp) return wailsApp
  try {
    wailsApp = await import("../../wailsjs/go/app/App")
    return wailsApp
  } catch {
    return null
  }
}

function isWailsAvailable() {
  return typeof window !== "undefined" && (window as any).go?.main?.App !== undefined
}

const AUI_DIR = "aui"

export async function listAuis(projectPath: string): Promise<AuiInstance[]> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      try {
        const files = (await app.ListKnowledgeFiles(projectPath, AUI_DIR)) as any[]
        const auiList: AuiInstance[] = []
        for (const file of files) {
          if (file.isDir || !file.name.endsWith(".json")) continue
          try {
            const content = await app.ReadKnowledgeFile(projectPath, `${AUI_DIR}/${file.name}`)
            const parsed = JSON.parse(content)
            // Migrate old format: ensure fields, jsonSchema, sampleData, aiPrompt exist
            if (!parsed.fields) parsed.fields = parsed.schema || []
            if (!parsed.jsonSchema) parsed.jsonSchema = {}
            if (parsed.sampleData === undefined) parsed.sampleData = []
            if (!parsed.aiPrompt) parsed.aiPrompt = ""
            auiList.push(parsed)
          } catch {
            // skip corrupt files
          }
        }
        return auiList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      } catch {
        return []
      }
    }
  }
  return mockAuis()
}

export async function readAui(projectPath: string, id: string): Promise<AuiInstance | null> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      try {
        const content = await app.ReadKnowledgeFile(projectPath, `${AUI_DIR}/${id}.json`)
        return JSON.parse(content)
      } catch {
        return null
      }
    }
  }
  return mockAuis().find((a) => a.id === id) ?? null
}

export async function saveAui(projectPath: string, aui: AuiInstance): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      // Ensure aui directory exists
      await app.CreateKnowledgeDir(projectPath, AUI_DIR)
      await app.WriteKnowledgeFile(projectPath, `${AUI_DIR}/${aui.id}.json`, JSON.stringify(aui, null, 2))
      return
    }
  }
  console.log(`[Mock] Save AUI ${aui.id}:`, aui.name)
}

export async function deleteAui(projectPath: string, id: string): Promise<void> {
  if (isWailsAvailable()) {
    const app = await getWailsApp()
    if (app) {
      await app.DeleteKnowledgeFile(projectPath, `${AUI_DIR}/${id}.json`)
      return
    }
  }
  console.log(`[Mock] Delete AUI ${id}`)
}

// ── Mock data ──────────────────────────────────────────────

function mockAuis(): AuiInstance[] {
  const now = new Date().toISOString()
  return [
    {
      id: "moy9wbf9kz4g7u",
      name: "浏览器",
      description: "用于预览网页链接的浏览器组件",
      rendererType: "browser-preview",
      fields: [],
      jsonSchema: {},
      sampleData: { url: "https://example.com", title: "示例页面" },
      aiPrompt: "",
      createdAt: now,
      updatedAt: now,
    },
  ]
}