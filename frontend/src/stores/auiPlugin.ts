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

export interface BuiltinComponent {
  id: string
  name: string
  description: string
  icon: string
  sampleData: any
}

const sampleHtmlPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>项目周报</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fa;color:#1f2937;padding:32px;line-height:1.6}
.card{background:#fff;border-radius:10px;padding:24px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
h1{font-size:22px;margin-bottom:8px}h2{font-size:16px;color:#6366f1;margin-bottom:12px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px}
.stat{padding:20px;border-radius:8px;text-align:center}.stat-value{font-size:28px;font-weight:700}
.stat-label{font-size:12px;color:#6b7280;margin-top:4px}
.stat-green{background:#ecfdf5}.stat-green .stat-value{color:#10b981}
.stat-blue{background:#eff6ff}.stat-blue .stat-value{color:#3b82f6}
.stat-amber{background:#fffbeb}.stat-amber .stat-value{color:#d97706}
.task-list{list-style:none}.task-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f3f4f6}
.task-status{font-size:11px;padding:2px 8px;border-radius:10px}
.status-done{background:#ecfdf5;color:#10b981}.status-progress{background:#eff6ff;color:#3b82f6}.status-todo{background:#f9fafb;color:#9ca3af}
.badge{display:inline-block;font-size:11px;padding:3px 10px;border-radius:12px;margin-right:6px;background:#f3f4f6;color:#6b7280}
</style></head>
<body>
<h1>📊 项目周报 — 第23周</h1>
<div class="stats">
<div class="stat stat-green"><div class="stat-value">12</div><div class="stat-label">已完成任务</div></div>
<div class="stat stat-blue"><div class="stat-value">5</div><div class="stat-label">进行中</div></div>
<div class="stat stat-amber"><div class="stat-value">3</div><div class="stat-label">待处理</div></div>
</div>
<div class="card">
<h2>📋 本周关键任务</h2>
<ul class="task-list">
<li class="task-item"><span>🔐 用户认证模块重构</span><span class="task-status status-done">已完成</span></li>
<li class="task-item"><span>📱 移动端适配优化</span><span class="task-status status-done">已完成</span></li>
<li class="task-item"><span>⚡ API性能优化</span><span class="task-status status-progress">进行中</span></li>
<li class="task-item"><span>📝 技术文档更新</span><span class="task-status status-todo">待开始</span></li>
</ul>
</div>
<div class="card">
<h2>🏷 里程碑</h2>
<span class="badge">v2.3 已发布</span><span class="badge">v2.4 规划中</span><span class="badge">Q3 目标确认</span>
</div>
</body></html>`

export const BUILTIN_COMPONENTS: BuiltinComponent[] = [
  {
    id: "html-viewer",
    name: "HTML预览",
    description: "渲染本地HTML文件，支持自包含HTML页面的完整预览",
    icon: "📄",
    sampleData: {
      path: ".whales/output/report.html",
      inlineHtml: sampleHtmlPage,
    },
  },
  {
    id: "image-viewer",
    name: "图片浏览",
    description: "加载本地图片文件夹，以网格图库方式浏览，支持灯箱放大查看",
    icon: "🖼️",
    sampleData: {
      path: ".whales/output/images/",
      demoImages: [
        "https://picsum.photos/seed/aui1/400/400",
        "https://picsum.photos/seed/aui2/400/300",
        "https://picsum.photos/seed/aui3/300/400",
        "https://picsum.photos/seed/aui4/400/400",
        "https://picsum.photos/seed/aui5/400/300",
        "https://picsum.photos/seed/aui6/300/400",
        "https://picsum.photos/seed/aui7/400/400",
        "https://picsum.photos/seed/aui8/400/300",
      ],
    },
  },
  {
    id: "video-viewer",
    name: "视频播放",
    description: "加载本地视频文件夹，以网格方式浏览，支持灯箱放大播放",
    icon: "▶️",
    sampleData: {
      path: ".whales/output/videos/",
      demoVideos: [
        "/demo-videos/sample1.mp4",
        "/demo-videos/sample2.mp4",
      ],
    },
  },
  {
    id: "browser-preview",
    name: "浏览器预览",
    description: "在嵌入式浏览器中预览URL链接或HTML页面",
    icon: "🌐",
    sampleData: { url: "https://example.com", title: "Example" },
  },
]

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