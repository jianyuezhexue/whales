import { ref } from "vue"
import { defineStore } from "pinia"
import { useProjectStore } from "./project"

export interface AuiPluginMeta {
  id: string
  name: string
  version: string
  author: string
  description: string
  icon: string
  category: string
  tags: string[]
  dataSchema: Record<string, any>
  sampleData: any
  entry: string
  style: string
}

export interface MarketPlugin extends AuiPluginMeta {
  price: string
  downloads: number
  rating: number
  screenshot: string
}

// Dynamically import Wails bindings
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

export const useAuiPluginStore = defineStore("auiPlugin", () => {
  const projectStore = useProjectStore()

  const installedPlugins = ref<AuiPluginMeta[]>([])
  const marketPlugins = ref<MarketPlugin[]>([])
  const loadedPlugins = ref<Set<string>>(new Set())
  const isLoading = ref(false)

  // Load installed plugin list from Go backend
  async function loadInstalledPlugins() {
    const path = projectStore.currentProject?.path
    if (!path) return
    isLoading.value = true
    try {
      if (isWailsAvailable()) {
        const app = await getWailsApp()
        if (app) {
          const result = await app.ListAuiPlugins(path)
          installedPlugins.value = (result as any[]) || []
        }
      } else {
        // Mock: return gantt and calendar as installed
        installedPlugins.value = [
          {
            id: "gantt",
            name: "甘特图",
            version: "1.0.0",
            author: "Whales Team",
            description: "项目进度甘特图渲染器",
            icon: "📊",
            category: "chart",
            tags: ["项目管理", "时间线", "进度"],
            dataSchema: { type: "array", items: { type: "object", required: ["title", "startDate", "endDate"] } },
            sampleData: [
              { title: "需求分析", startDate: "2025-01-01", endDate: "2025-01-15", progress: 100, color: "#6366f1" },
              { title: "技术方案", startDate: "2025-01-10", endDate: "2025-01-25", progress: 60, color: "#8b5cf6" },
              { title: "开发实现", startDate: "2025-01-20", endDate: "2025-02-15", progress: 30, color: "#0ea5e9" },
              { title: "测试验收", startDate: "2025-02-10", endDate: "2025-02-28", progress: 0, color: "#14b8a6" },
            ],
            entry: "renderer.js",
            style: "renderer.css",
          },
          {
            id: "calendar",
            name: "日历视图",
            version: "1.0.0",
            author: "Whales Team",
            description: "日历视图渲染器",
            icon: "🗓",
            category: "chart",
            tags: ["日历", "日程", "时间管理"],
            dataSchema: { type: "array", items: { type: "object", required: ["title", "date"] } },
            sampleData: [
              { title: "项目评审", date: "2025-01-20", color: "#ef4444", desc: "第一阶段评审会议" },
              { title: "版本发布", date: "2025-02-01", color: "#10b981", desc: "v1.0 正式发布" },
              { title: "团队建设", date: "2025-02-15", color: "#f59e0b", desc: "季度团建活动" },
            ],
            entry: "renderer.js",
            style: "renderer.css",
          },
        ]
      }
    } catch {
      installedPlugins.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Load marketplace plugin list
  async function loadMarketPlugins() {
    if (isWailsAvailable()) {
      const app = await getWailsApp()
      if (app) {
        const result = await app.FetchMarketPlugins()
        marketPlugins.value = (result as any[]) || []
        return
      }
    }
    // Mock marketplace data
    marketPlugins.value = [
      {
        id: "gantt", name: "甘特图", version: "1.0.0", author: "Whales Team",
        description: "项目进度甘特图渲染器", icon: "📊", category: "chart",
        tags: ["项目管理", "时间线", "进度"], price: "免费", downloads: 1280, rating: 4.8,
        dataSchema: {}, sampleData: [
          { title: "需求分析", startDate: "2025-01-01", endDate: "2025-01-15", progress: 100, color: "#6366f1" },
          { title: "技术方案", startDate: "2025-01-10", endDate: "2025-01-25", progress: 60, color: "#8b5cf6" },
          { title: "开发实现", startDate: "2025-01-20", endDate: "2025-02-15", progress: 30, color: "#0ea5e9" },
        ], entry: "renderer.js", style: "renderer.css",
        screenshot: "",
      },
      {
        id: "calendar", name: "日历视图", version: "1.0.0", author: "Whales Team",
        description: "日历视图渲染器", icon: "🗓", category: "chart",
        tags: ["日历", "日程", "时间管理"], price: "免费", downloads: 856, rating: 4.5,
        dataSchema: {}, sampleData: [
          { title: "项目评审", date: "2025-01-20", color: "#ef4444", desc: "第一阶段评审会议" },
          { title: "版本发布", date: "2025-02-01", color: "#10b981", desc: "v1.0 正式发布" },
          { title: "团队建设", date: "2025-02-15", color: "#f59e0b", desc: "季度团建活动" },
        ], entry: "renderer.js", style: "renderer.css",
        screenshot: "",
      },
      {
        id: "mindmap", name: "思维导图", version: "1.0.0", author: "Whales Team",
        description: "思维导图渲染器", icon: "🧠", category: "chart",
        tags: ["思维导图", "头脑风暴"], price: "¥9.9/月", downloads: 2340, rating: 4.9,
        dataSchema: {}, sampleData: { root: "项目规划" }, entry: "renderer.js", style: "renderer.css",
        screenshot: "",
      },
      {
        id: "kanban", name: "看板", version: "1.0.0", author: "Whales Team",
        description: "看板视图渲染器", icon: "📋", category: "project",
        tags: ["看板", "任务管理", "敏捷"], price: "免费", downloads: 3100, rating: 4.7,
        dataSchema: {}, sampleData: [
          { title: "设计原型", status: "done", assignee: "Alice", priority: "high" },
          { title: "开发接口", status: "doing", assignee: "Bob", priority: "high" },
          { title: "编写文档", status: "todo", assignee: "Carol", priority: "medium" },
        ], entry: "renderer.js", style: "renderer.css",
        screenshot: "",
      },
      {
        id: "stat-card", name: "统计卡片", version: "1.0.0", author: "Whales Team",
        description: "统计指标卡片渲染器", icon: "📈", category: "dashboard",
        tags: ["统计", "指标", "仪表盘"], price: "免费", downloads: 1890, rating: 4.6,
        dataSchema: {}, sampleData: [
          { label: "总收入", value: 48200, trend: 12.5, icon: "💰" },
          { label: "活跃用户", value: 3842, trend: 8.3, icon: "👥" },
          { label: "完成率", value: 96, trend: -2.1, icon: "✅" },
        ], entry: "renderer.js", style: "renderer.css",
        screenshot: "",
      },
    ]
  }

  // Inject plugin JS/CSS into the WebView (lazy load)
  async function injectPlugin(pluginId: string) {
    if (loadedPlugins.value.has(pluginId)) return

    const path = projectStore.currentProject?.path
    if (!path) return

    if (isWailsAvailable()) {
      const app = await getWailsApp()
      if (app) {
        const assets = await app.LoadAuiPlugin(path, pluginId) as any
        if (!assets) return

        // Inject CSS
        if (assets.css) {
          const existing = document.querySelector(`style[data-aui-plugin="${pluginId}"]`)
          if (existing) existing.remove()
          const style = document.createElement("style")
          style.textContent = assets.css
          style.setAttribute("data-aui-plugin", pluginId)
          document.head.appendChild(style)
        }

        // Inject JS
        if (assets.js) {
          const existing = document.querySelector(`script[data-aui-plugin="${pluginId}"]`)
          if (existing) existing.remove()
          const script = document.createElement("script")
          script.textContent = assets.js
          script.setAttribute("data-aui-plugin", pluginId)
          document.head.appendChild(script)
        }
      }
    } else {
      // Mock mode: fetch plugin files from dev server
      const stylePath = `/aui-plugins/${pluginId}/renderer.css`
      const scriptPath = `/aui-plugins/${pluginId}/renderer.js`

      try {
        const cssRes = await fetch(stylePath)
        if (cssRes.ok) {
          const css = await cssRes.text()
          const existing = document.querySelector(`style[data-aui-plugin="${pluginId}"]`)
          if (existing) existing.remove()
          const style = document.createElement("style")
          style.textContent = css
          style.setAttribute("data-aui-plugin", pluginId)
          document.head.appendChild(style)
        }
      } catch { /* plugin may not have CSS */ }

      try {
        const jsRes = await fetch(scriptPath)
        if (jsRes.ok) {
          const js = await jsRes.text()
          const existing = document.querySelector(`script[data-aui-plugin="${pluginId}"]`)
          if (existing) existing.remove()
          const script = document.createElement("script")
          script.textContent = js
          script.setAttribute("data-aui-plugin", pluginId)
          document.head.appendChild(script)
        }
      } catch { /* plugin may not have JS */ }
    }

    loadedPlugins.value.add(pluginId)
  }

  // Remove injected plugin assets
  function ejectPlugin(pluginId: string) {
    document.querySelectorAll(`[data-aui-plugin="${pluginId}"]`).forEach(el => el.remove())
    loadedPlugins.value.delete(pluginId)
  }

  // Check if a plugin is installed
  function isInstalled(pluginId: string): boolean {
    return installedPlugins.value.some(p => p.id === pluginId)
  }

  // Get combined renderer options: built-in + installed plugins
  function getRendererOptions(): { value: string; label: string }[] {
    const builtIn = [
      { value: "table", label: "数据表格" },
      { value: "browser-preview", label: "浏览器预览" },
      { value: "todo", label: "任务代办" },
    ]
    const plugins = installedPlugins.value.map(p => ({
      value: p.id,
      label: p.name,
    }))
    return [...builtIn, ...plugins]
  }

  // Install plugin from marketplace
  async function installPlugin(pluginId: string) {
    const path = projectStore.currentProject?.path
    if (!path) return

    if (isWailsAvailable()) {
      const app = await getWailsApp()
      if (app) {
        await app.InstallAuiPlugin(path, pluginId, "")
        // Reload plugin list after install
        await loadInstalledPlugins()
        // Inject the newly installed plugin
        await injectPlugin(pluginId)
      }
    } else {
      // Mock: add to installed list
      const marketPlugin = marketPlugins.value.find(p => p.id === pluginId)
      if (marketPlugin && !isInstalled(pluginId)) {
        installedPlugins.value.push({
          id: marketPlugin.id,
          name: marketPlugin.name,
          version: marketPlugin.version,
          author: marketPlugin.author,
          description: marketPlugin.description,
          icon: marketPlugin.icon,
          category: marketPlugin.category,
          tags: marketPlugin.tags,
          dataSchema: marketPlugin.dataSchema,
          sampleData: marketPlugin.sampleData,
          entry: marketPlugin.entry,
          style: marketPlugin.style,
        })
      }
    }
  }

  // Uninstall plugin
  async function uninstallPlugin(pluginId: string) {
    const path = projectStore.currentProject?.path
    if (!path) return

    // Remove from DOM first
    ejectPlugin(pluginId)

    if (isWailsAvailable()) {
      const app = await getWailsApp()
      if (app) {
        await app.UninstallAuiPlugin(path, pluginId)
        await loadInstalledPlugins()
      }
    } else {
      // Mock: remove from installed list
      installedPlugins.value = installedPlugins.value.filter(p => p.id !== pluginId)
    }
  }

  return {
    installedPlugins,
    marketPlugins,
    loadedPlugins,
    isLoading,
    loadInstalledPlugins,
    loadMarketPlugins,
    injectPlugin,
    ejectPlugin,
    isInstalled,
    getRendererOptions,
    installPlugin,
    uninstallPlugin,
  }
})