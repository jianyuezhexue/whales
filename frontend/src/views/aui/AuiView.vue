<script setup lang="ts">
import { onMounted, ref, computed, nextTick, watch } from "vue"
import { useAuiPluginStore } from "@/stores/auiPlugin"
import type { AuiPluginMeta } from "@/stores/auiPlugin"
import CreateAuiModal from "@/components/aui/CreateAuiModal.vue"

const pluginStore = useAuiPluginStore()

const activeTab = ref<"installed" | "market">("installed")

onMounted(() => {
  pluginStore.loadInstalledPlugins()
  pluginStore.loadMarketPlugins()
})

// ── Plugin install / uninstall ──────────────────────────
const installingId = ref<string | null>(null)

async function onInstallPlugin(pluginId: string) {
  installingId.value = pluginId
  try {
    await pluginStore.installPlugin(pluginId)
  } finally {
    installingId.value = null
  }
}

async function onUninstallPlugin(pluginId: string) {
  try {
    await pluginStore.uninstallPlugin(pluginId)
  } catch {
    // ignore
  }
}

// ── Market search ──────────────────────────────────────
const marketSearch = ref("")

const filteredMarketPlugins = computed(() => {
  const q = marketSearch.value.trim().toLowerCase()
  if (!q) return pluginStore.marketPlugins
  return pluginStore.marketPlugins.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  )
})

// ── Plugin preview ──────────────────────────────────────
const previewPlugin = ref<AuiPluginMeta | null>(null)
const showPreviewModal = ref(false)
const previewJsonStr = ref("")
const previewJsonError = ref(false)
const previewMode = ref<'data' | 'render'>('data')
const previewContainerRef = ref<HTMLElement | null>(null)
let previewElement: HTMLElement | null = null

function openPreview(plugin: AuiPluginMeta) {
  previewPlugin.value = plugin
  previewJsonStr.value = JSON.stringify(plugin.sampleData, null, 2)
  previewJsonError.value = false
  previewMode.value = 'data'
  showPreviewModal.value = true
}

function onPreviewJsonInput(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value
  previewJsonStr.value = val
  try {
    const parsed = JSON.parse(val)
    previewJsonError.value = false
    updatePreviewData(parsed)
  } catch {
    previewJsonError.value = true
  }
}

async function mountPreviewElement() {
  if (!previewPlugin.value || !previewContainerRef.value) return

  const plugin = previewPlugin.value
  const tag = `aui-${plugin.id}`

  // Inject plugin assets
  await pluginStore.injectPlugin(plugin.id)

  // Wait for custom element to be defined (with timeout fallback)
  if (!customElements.get(tag)) {
    try {
      await Promise.race([
        customElements.whenDefined(tag),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
    } catch {
      return
    }
  }

  // Remove previous
  if (previewElement && previewElement.parentNode) {
    previewElement.parentNode.removeChild(previewElement)
  }

  // Parse data before creating element
  let renderData: any
  try {
    renderData = JSON.parse(previewJsonStr.value)
  } catch {
    renderData = plugin.sampleData
  }

  const el = document.createElement(tag) as HTMLElement & { data?: any }
  // Set data BEFORE appending so connectedCallback can access it
  el.data = renderData

  previewContainerRef.value.innerHTML = ""
  previewContainerRef.value.appendChild(el)
  previewElement = el
}

function updatePreviewData(data: any) {
  if (previewElement && "data" in previewElement) {
    ;(previewElement as any).data = data
  }
}

watch(showPreviewModal, (val) => {
  if (val) {
    nextTick(mountPreviewElement)
  } else {
    previewPlugin.value = null
    previewElement = null
  }
})

watch(previewMode, (mode) => {
  if (mode === 'render' && showPreviewModal.value) {
    nextTick(mountPreviewElement)
  }
})

watch(() => previewPlugin.value?.id, () => {
  if (showPreviewModal.value) {
    nextTick(mountPreviewElement)
  }
})

// ── "新建AUI" modal ─────────────────────────────────────
const showCreateModal = ref(false)
const createActiveTab = ref<'chat' | 'spec' | 'preview'>('chat')

// Chat tab
interface CreateChatMessage { role: 'user' | 'ai'; content: string }
const chatMessages = ref<CreateChatMessage[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatBodyRef = ref<HTMLElement | null>(null)
const chatTurn = ref(0)

// Generated files (populated by parsing AI code blocks)
const generatedFiles = ref<Record<string, string>>({
  'plugin.json': '',
  'renderer.js': '',
  'renderer.css': '',
})

// Preview tab
type FileTab = 'plugin.json' | 'renderer.js' | 'renderer.css'
const previewFileTab = ref<FileTab>('plugin.json')
const createPreviewContainerRef = ref<HTMLElement | null>(null)
let createPreviewElement: HTMLElement | null = null
const TEMP_PLUGIN_ID = '__temp_create_preview__'

function scrollCreateChatToBottom() {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
    }
  })
}

function parseAndStoreGeneratedFiles(content: string) {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)```/)
  const jsMatch = content.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/)
  const cssMatch = content.match(/```css\s*\n([\s\S]*?)```/)

  if (jsonMatch) generatedFiles.value['plugin.json'] = jsonMatch[1].trim()
  if (jsMatch) generatedFiles.value['renderer.js'] = jsMatch[1].trim()
  if (cssMatch) generatedFiles.value['renderer.css'] = cssMatch[1].trim()
}

function generatePluginCode(): string {
  return `根据你的需求，我设计了一个统计指标卡片插件。以下是完整的插件文件：

### plugin.json

\`\`\`json
{
  "id": "stat-card",
  "name": "统计卡片",
  "version": "1.0.0",
  "author": "AI Generated",
  "description": "统计指标卡片渲染器，支持标签、数值、趋势变化和图标展示",
  "icon": "📈",
  "category": "dashboard",
  "tags": ["统计", "指标", "仪表盘", "数据"],
  "entry": "renderer.js",
  "style": "renderer.css",
  "dataSchema": {
    "type": "array",
    "items": {
      "type": "object",
      "required": ["label", "value"],
      "properties": {
        "label": { "type": "string", "title": "指标名称" },
        "value": { "type": "number", "title": "指标数值" },
        "trend": { "type": "number", "title": "变化趋势(%)" },
        "icon": { "type": "string", "title": "图标" },
        "color": { "type": "string", "title": "主题色" }
      }
    }
  },
  "sampleData": [
    { "label": "总收入", "value": 48200, "trend": 12.5, "icon": "💰", "color": "#6366f1" },
    { "label": "活跃用户", "value": 3842, "trend": 8.3, "icon": "👥", "color": "#8b5cf6" },
    { "label": "完成率", "value": 96, "trend": -2.1, "icon": "✅", "color": "#10b981" },
    { "label": "转化率", "value": 24, "trend": 5.7, "icon": "🔄", "color": "#f59e0b" }
  ]
}
\`\`\`

### renderer.js

\`\`\`javascript
class AuiStatCard extends HTMLElement {
  constructor() {
    super();
    this._data = [];
  }

  set data(val) {
    this._data = val || [];
    this.render();
  }

  get data() {
    return this._data;
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const data = this._data;
    const shadow = this.shadowRoot || this.attachShadow({ mode: 'open' });

    if (!data || data.length === 0) {
      shadow.innerHTML = '<div style="padding:32px;text-align:center;color:#9ca3af;">暂无数据</div>';
      return;
    }

    const cards = data.map(item => {
      const trend = item.trend || 0;
      const trendIcon = trend >= 0 ? '▲' : '▼';
      const trendColor = trend >= 0 ? '#10b981' : '#ef4444';
      const color = item.color || '#6366f1';
      const formattedValue = typeof item.value === 'number'
        ? item.value.toLocaleString()
        : item.value;

      return \`<div class="stat-card">
        <div class="stat-header">
          <span class="stat-icon" style="background:\${color}18;">\${item.icon || '📊'}</span>
          <span class="stat-label">\${item.label}</span>
        </div>
        <div class="stat-value">\${formattedValue}</div>
        <div class="stat-trend" style="color:\${trendColor};">
          \${trendIcon} \${Math.abs(trend)}%
        </div>
      </div>\`;
    }).join('');

    shadow.innerHTML = \`<style>
      :host { display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
      .stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; transition: box-shadow 0.15s; }
      .stat-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
      .stat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .stat-icon { width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 16px; }
      .stat-label { font-size: 12px; color: #6b7280; }
      .stat-value { font-size: 24px; font-weight: 700; color: #1f1f1f; line-height: 1.2; }
      .stat-trend { font-size: 12px; margin-top: 4px; font-weight: 500; }
    </style>
    <div class="stat-grid">\${cards}</div>\`;
  }
}

customElements.define('aui-stat-card', AuiStatCard);
\`\`\`

### renderer.css

\`\`\`css
/* Stat Card plugin styles - minimal, main styles in Shadow DOM */
/* This file can hold page-level overrides if needed */
\`\`\`

插件已生成完毕！你可以在「预览」标签页中查看渲染效果。如需调整，请继续描述你的修改需求。`
}

function getSimulatedAiResponse(turn: number): string {
  if (turn === 1) {
    return `你好！我可以帮你创建 AUI 插件。请告诉我更多细节：

1. **插件用途**：你想用它展示什么类型的数据？（如统计指标、任务列表、图表等）
2. **数据字段**：每条数据包含哪些属性？（例如：标题、数值、趋势百分比、图标等）
3. **视觉风格**：偏好什么布局？（卡片网格、列表、表格等）

请描述你的需求，我会生成完整的插件文件（plugin.json + renderer.js + renderer.css）。`
  }
  return generatePluginCode()
}

function onSendChatMessage() {
  if (!chatInput.value.trim() || chatLoading.value) return
  chatMessages.value.push({ role: 'user', content: chatInput.value.trim() })
  chatInput.value = ''
  chatTurn.value++
  chatLoading.value = true
  scrollCreateChatToBottom()

  setTimeout(() => {
    const aiContent = getSimulatedAiResponse(chatTurn.value)
    chatMessages.value.push({ role: 'ai', content: aiContent })
    chatLoading.value = false
    scrollCreateChatToBottom()
    parseAndStoreGeneratedFiles(aiContent)
  }, 1200)
}

// Tab 3 preview helpers
function extractTagFromJs(js: string): string | null {
  const match = js.match(/customElements\.define\s*\(\s*['"]([^'"]+)['"]/)
  return match ? match[1] : null
}

function injectTempPluginAssets() {
  cleanupTempPlugin()

  const js = generatedFiles.value['renderer.js']
  const css = generatedFiles.value['renderer.css']

  if (js) {
    const tag = extractTagFromJs(js)
    // If already registered, skip re-injection
    if (tag && customElements.get(tag)) return

    const script = document.createElement('script')
    script.textContent = js
    script.setAttribute('data-aui-plugin', TEMP_PLUGIN_ID)
    document.head.appendChild(script)
  }
  if (css) {
    const style = document.createElement('style')
    style.textContent = css
    style.setAttribute('data-aui-plugin', TEMP_PLUGIN_ID)
    document.head.appendChild(style)
  }
}

function cleanupTempPlugin() {
  document.querySelectorAll(`[data-aui-plugin="${TEMP_PLUGIN_ID}"]`).forEach(el => el.remove())
  if (createPreviewElement && createPreviewElement.parentNode) {
    createPreviewElement.parentNode.removeChild(createPreviewElement)
  }
  createPreviewElement = null
}

async function mountCreatePreview() {
  if (!createPreviewContainerRef.value) return
  if (!generatedFiles.value['renderer.js']) return

  const tag = extractTagFromJs(generatedFiles.value['renderer.js'])
  if (!tag) return

  injectTempPluginAssets()

  // Small delay for script to execute
  await new Promise(r => setTimeout(r, 100))

  if (!customElements.get(tag)) {
    try {
      await Promise.race([
        customElements.whenDefined(tag),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
    } catch {
      return
    }
  }

  if (createPreviewElement && createPreviewElement.parentNode) {
    createPreviewElement.parentNode.removeChild(createPreviewElement)
  }

  let sampleData: any
  try {
    const pluginJson = JSON.parse(generatedFiles.value['plugin.json'])
    sampleData = pluginJson.sampleData
  } catch {
    sampleData = []
  }

  const el = document.createElement(tag) as HTMLElement & { data?: any }
  el.data = sampleData

  createPreviewContainerRef.value.innerHTML = ''
  createPreviewContainerRef.value.appendChild(el)
  createPreviewElement = el
}

watch(createActiveTab, (val) => {
  if (val === 'preview' && generatedFiles.value['renderer.js']) {
    nextTick(mountCreatePreview)
  }
})

watch(showCreateModal, (val) => {
  if (!val) {
    cleanupTempPlugin()
    chatMessages.value = []
    chatTurn.value = 0
    chatInput.value = ''
    generatedFiles.value = { 'plugin.json': '', 'renderer.js': '', 'renderer.css': '' }
    createActiveTab.value = 'chat'
  }
})
</script>

<template>
  <div class="aui-page page-layout">
    <div class="page-header">
      <h1 class="page-title">AUI管理</h1>
      <div class="header-actions">
        <button class="add-btn" @click="showCreateModal = true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>新建AUI</span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="aui-tabs">
      <button
        :class="['aui-tab', { active: activeTab === 'installed' }]"
        @click="activeTab = 'installed'"
      >
        已安装插件
      </button>
      <button
        :class="['aui-tab', { active: activeTab === 'market' }]"
        @click="activeTab = 'market'"
      >
        AUI市场
      </button>
    </div>

    <!-- Tab: Installed Plugins -->
    <div v-show="activeTab === 'installed'" class="tab-content">
      <div v-if="pluginStore.installedPlugins.length === 0" class="empty-state">
        <div class="empty-icon">🧩</div>
        <div class="empty-title">暂无已安装插件</div>
        <div class="empty-subtitle">前往「AUI市场」浏览并安装插件</div>
      </div>
      <div v-else class="plugin-grid">
        <div v-for="plugin in pluginStore.installedPlugins" :key="plugin.id" class="plugin-card">
          <div class="plugin-icon">{{ plugin.icon }}</div>
          <div class="plugin-body">
            <div class="plugin-name">{{ plugin.name }}</div>
            <div class="plugin-desc">{{ plugin.description }}</div>
            <div class="plugin-meta">
              <span class="plugin-version">v{{ plugin.version }}</span>
              <span class="plugin-category">{{ plugin.category }}</span>
              <span class="plugin-meta-spacer"></span>
              <button class="plugin-preview-btn" title="预览" @click="openPreview(plugin)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
          <div class="plugin-actions">
            <button class="plugin-btn plugin-btn-uninstall" @click="onUninstallPlugin(plugin.id)">
              卸载
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Marketplace -->
    <div v-show="activeTab === 'market'" class="tab-content">
      <div class="market-toolbar">
        <div class="market-search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            class="market-search"
            v-model="marketSearch"
            placeholder="搜索插件..."
          />
        </div>
      </div>

      <div v-if="filteredMarketPlugins.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">未找到匹配的插件</div>
        <div class="empty-subtitle">试试其他关键词</div>
      </div>
      <div v-else class="plugin-grid">
        <div v-for="plugin in filteredMarketPlugins" :key="plugin.id" class="plugin-card">
          <div class="plugin-icon">{{ plugin.icon }}</div>
          <div class="plugin-body">
            <div class="plugin-name">{{ plugin.name }}</div>
            <div class="plugin-desc">{{ plugin.description }}</div>
            <div class="plugin-meta">
              <span class="plugin-version">v{{ plugin.version }}</span>
              <span class="plugin-downloads">{{ plugin.downloads }} 次下载</span>
              <span v-if="plugin.rating" class="plugin-rating">★ {{ plugin.rating }}</span>
              <span class="plugin-price">{{ plugin.price }}</span>
            </div>
          </div>
          <div class="plugin-actions">
            <button
              v-if="pluginStore.isInstalled(plugin.id)"
              class="plugin-btn plugin-btn-installed"
              disabled
            >
              已安装
            </button>
            <button
              v-else
              class="plugin-btn plugin-btn-install"
              :disabled="installingId === plugin.id"
              @click="onInstallPlugin(plugin.id)"
            >
              {{ installingId === plugin.id ? '安装中...' : '安装' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreviewModal && previewPlugin" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="preview-panel">
        <div class="preview-header">
          <div class="preview-title">{{ previewPlugin.icon }} {{ previewPlugin.name }} - 预览</div>
          <div class="preview-toggle">
            <button
              :class="['preview-toggle-btn', { active: previewMode === 'data' }]"
              title="JSON 数据"
              @click="previewMode = 'data'"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </button>
            <button
              :class="['preview-toggle-btn', { active: previewMode === 'render' }]"
              title="渲染效果"
              @click="previewMode = 'render'"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <button class="preview-close" @click="showPreviewModal = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="preview-body">
          <!-- Data editor (full page) -->
          <div v-show="previewMode === 'data'" class="preview-data-full">
            <div class="preview-data-header">
              <span class="preview-data-title">JSON 数据</span>
              <span v-if="previewJsonError" class="preview-json-error">格式错误</span>
            </div>
            <textarea
              class="preview-json-editor"
              :value="previewJsonStr"
              :class="{ 'has-error': previewJsonError }"
              @input="onPreviewJsonInput"
              spellcheck="false"
            />
          </div>
          <!-- Render preview (full page) -->
          <div v-show="previewMode === 'render'" class="preview-render-full">
            <div class="preview-render-area" ref="previewContainerRef"></div>
          </div>
        </div>
      </div>
    </div>

        <!-- "新建AUI" Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="preview-panel">
        <div class="preview-header">
          <div class="preview-title">新建AUI</div>
          <button class="preview-close" @click="showCreateModal = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="create-tabs">
          <button :class="['create-tab-btn', { active: createActiveTab === 'chat' }]" @click="createActiveTab = 'chat'">AI对话生成</button>
          <button :class="['create-tab-btn', { active: createActiveTab === 'spec' }]" @click="createActiveTab = 'spec'">格式说明</button>
          <button :class="['create-tab-btn', { active: createActiveTab === 'preview' }]" @click="createActiveTab = 'preview'">预览</button>
        </div>
        <div class="preview-body">
          <div v-show="createActiveTab === 'chat'" class="create-chat-content">
            <div class="chat-messages" ref="chatBodyRef">
              <div v-if="chatMessages.length === 0" class="chat-empty">
                <p>描述你需要的插件，AI 将自动生成插件文件</p>
                <p class="chat-empty-hint">例如：我需要一个展示销售数据的统计卡片插件</p>
              </div>
              <div v-for="(msg, idx) in chatMessages" :key="idx" :class="['chat-message', msg.role === 'user' ? 'msg-user' : 'msg-ai']">
                <div class="msg-role">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
                <div class="msg-content" v-text="msg.content" />
              </div>
              <div v-if="chatLoading" class="chat-message msg-ai">
                <div class="msg-role">AI</div>
                <div class="msg-content msg-loading">AI 思考中...</div>
              </div>
            </div>
            <div class="chat-input-bar">
              <textarea v-model="chatInput" class="chat-input" placeholder="描述你需要的插件..." rows="2" :disabled="chatLoading" @keydown.enter.exact.prevent="onSendChatMessage" />
              <button class="btn-send" :disabled="!chatInput.trim() || chatLoading" @click="onSendChatMessage">{{ chatLoading ? '...' : '发送' }}</button>
            </div>
          </div>
          <div v-show="createActiveTab === 'spec'" class="create-spec-content">
            <div class="spec-section">
              <div class="spec-section-title">1. 文件结构概览</div>
              <p>每个 AUI 插件是一个独立的目录，位于 .whales/aui-plugins/插件ID/ 下，包含以下文件：</p>
              <ul>
                <li>plugin.json — 必需，插件元数据清单</li>
                <li>renderer.js — 必需，插件渲染入口，定义 Custom Element</li>
                <li>renderer.css — 可选，插件全局样式</li>
              </ul>
            </div>
            <div class="spec-section">
              <div class="spec-section-title">2. plugin.json 字段参考</div>
              <p>插件清单文件包含以下 12 个字段：id, name, version, author, description, icon, category, tags, entry, style, dataSchema, sampleData。所有字段均为必需。</p>
              <ul>
                <li>id — 插件唯一标识，用作自定义元素标签名 (aui-id)</li>
                <li>name — 插件显示名称</li>
                <li>version — 语义化版本号</li>
                <li>author — 作者名称</li>
                <li>description — 插件功能简介</li>
                <li>icon — 插件图标，推荐 emoji</li>
                <li>category — 分类：chart、dashboard、project、tool 等</li>
                <li>tags — 标签数组，用于搜索和筛选</li>
                <li>entry — JS 入口文件名，通常为 renderer.js</li>
                <li>style — CSS 样式文件名，通常为 renderer.css</li>
                <li>dataSchema — JSON Schema 对象</li>
                <li>sampleData — 示例数据</li>
              </ul>
            </div>
            <div class="spec-section">
              <div class="spec-section-title">3. renderer.js API 契约</div>
              <p>每个插件必须定义一个继承 HTMLElement 的自定义元素类，通过 customElements.define() 注册，标签名为 aui-插件ID。</p>
              <p>必须实现的接口：</p>
              <ol>
                <li>data 属性 — getter/setter，setter 调用 render()</li>
                <li>connectedCallback() — 插入 DOM 时调用 render()</li>
                <li>Shadow DOM — this.attachShadow(...) 实现样式隔离</li>
                <li>customElements.define() — 注册自定义元素</li>
              </ol>
            </div>
            <div class="spec-section">
              <div class="spec-section-title">4. renderer.css 约定</div>
              <ul>
                <li>此文件为可选，样式注入到宿主页面</li>
                <li>主要视觉样式应放在 Shadow DOM 中</li>
                <li>可使用 :host 或 ::part() 选择器</li>
              </ul>
            </div>
            <div class="spec-section">
              <div class="spec-section-title">5. sampleData 格式要求</div>
              <ul>
                <li>必须是合法的 JSON 数据</li>
                <li>必须与 dataSchema 定义一致</li>
                <li>用于预览渲染和测试</li>
                <li>建议提供 3-5 条示例数据</li>
              </ul>
            </div>
          </div>

          <div v-show="createActiveTab === 'preview'" class="create-preview-content">
            <div v-if="!generatedFiles['renderer.js']" class="preview-empty">
              <p>请先在AI对话生成中生成插件代码</p>
            </div>
            <div v-else class="preview-split">
              <div class="preview-left">
                <div class="file-tabs">
                  <button :class="['file-tab', { active: previewFileTab === 'plugin.json' }]" @click="previewFileTab = 'plugin.json'">plugin.json</button>
                  <button :class="['file-tab', { active: previewFileTab === 'renderer.js' }]" @click="previewFileTab = 'renderer.js'">renderer.js</button>
                  <button :class="['file-tab', { active: previewFileTab === 'renderer.css' }]" @click="previewFileTab = 'renderer.css'">renderer.css</button>
                </div>
                <pre class="code-display">{{ generatedFiles[previewFileTab] }}</pre>
              </div>
              <div class="preview-right">
                <div class="preview-right-title">渲染效果</div>
                <div class="preview-render-area" ref="createPreviewContainerRef"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.aui-page {
  display: flex;
  flex-direction: column;
  height: 100%;

  .page-header {
    margin-bottom: 0;
    padding-bottom: 16px;
  }
}

// ── Tabs ────────────────────────────────────────────────
.aui-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.aui-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  border: none;
  background: none;
  color: #6b6b6b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;

  &:hover { color: #1f1f1f; }
  &.active {
    color: #1f1f1f;
    border-bottom-color: #1f1f1f;
    font-weight: 600;
  }
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

// ── Empty state ────────────────────────────────────────
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .empty-icon {
    font-size: 48px;
    line-height: 1;
  }

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 12px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: #9a9a9a;
  }
}

// ── Market toolbar ─────────────────────────────────────
.market-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.market-search-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #9a9a9a;
  pointer-events: none;
}

.market-search {
  width: 100%;
  height: 30px;
  padding: 0 10px 0 30px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
}

// ── Plugin grid ─────────────────────────────────────────
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plugin-card {
  position: relative;
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background-color: #ffffff;
  transition: all 0.15s ease;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.plugin-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  border-radius: 8px;
  background: #f5f5f5;
}

.plugin-body {
  flex: 1;
  min-width: 0;
}

.plugin-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  margin-bottom: 4px;
}

.plugin-desc {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.plugin-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.plugin-meta-spacer {
  flex: 1;
}

.plugin-version,
.plugin-downloads,
.plugin-rating,
.plugin-price,
.plugin-category {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
}

.plugin-version {
  background: #f0f0f0;
  color: #6b6b6b;
}

.plugin-category {
  background: #f0f0ff;
  color: #6366f1;
}

.plugin-downloads {
  background: #f0f8f0;
  color: #10b981;
}

.plugin-rating {
  background: #fefce8;
  color: #d97706;
}

.plugin-price {
  background: #f0f5ff;
  color: #2563eb;
}

.plugin-preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #ffffff;
  color: #9a9a9a;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background: #fafafa;
  }
}

.plugin-actions {
  display: flex;
  align-items: flex-start;
  flex-shrink: 0;
}

.plugin-btn {
  height: 28px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;

  &.plugin-btn-install {
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover { opacity: 0.85; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }

  &.plugin-btn-installed {
    background-color: #f0f0f0;
    color: #9a9a9a;
    cursor: default;
  }

  &.plugin-btn-uninstall {
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover { opacity: 0.85; }
  }
}

// ── Modal overlay ──────────────────────────────────────
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

// ── Preview modal ──────────────────────────────────────
.preview-panel {
  width: 86vw;
  max-width: 1100px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.preview-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9a9a9a;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #f0f0f0; color: #1f1f1f; }
}

.preview-body {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

// ── Preview: Header toggle icons ────────────────────────
.preview-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  margin-right: 12px;
}

.preview-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e5e5e5;
  background: #ffffff;
  color: #9a9a9a;
  cursor: pointer;
  transition: all 0.15s;

  &:first-child { border-radius: 4px 0 0 4px; }
  &:last-child { border-radius: 0 4px 4px 0; }

  &:hover {
    background: #f0f0f0;
    color: #4a4a4a;
  }

  &.active {
    background: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
  }
}

// ── Preview: Full-page data editor ───────────────────────
.preview-data-full {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.preview-data-title {
  font-size: 13px;
  font-weight: 500;
  color: #4a4a4a;
}

.preview-json-error {
  font-size: 12px;
  color: #ef4444;
}

.preview-json-editor {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #f9fafb;
  font-family: "JetBrainsMono", "Menlo", monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #1f1f1f;
  resize: none;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus { border-color: #1f1f1f; }
  &.has-error { border-color: #ef4444; }
}

// ── Preview: Full-page render ────────────────────────────
.preview-render-full {
  height: 100%;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  overflow: hidden;
}

.preview-render-area {
  height: 100%;
  overflow: auto;
  padding: 12px;
}

// ── Header actions ──────────────────────────────────────
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover { opacity: 0.85; }
}

// ── Create AUI: Segmented tabs ──────────────────────────
.create-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.create-tab-btn {
  height: 28px;
  padding: 0 14px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  color: #6b6b6b;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover { background-color: #f0f0f0; }

  &.active {
    background-color: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
  }
}

// ── Create AUI: Chat ─────────────────────────────────────
.create-chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 120px;
}

.chat-empty {
  text-align: center;
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 13px;

  p { margin: 4px 0; }
}

.chat-empty-hint {
  font-size: 12px;
  color: #d1d5db;
}

.chat-message {
  margin-bottom: 10px;
  max-width: 90%;
}

.msg-user {
  margin-left: auto;

  .msg-role { color: #1f1f1f; }
  .msg-content { background: #f0f0f0; color: #1f1f1f; }
}

.msg-ai {
  .msg-role { color: #10b981; }
  .msg-content { background: #f0fdf4; color: #1f1f1f; }
}

.msg-role {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 2px;
}

.msg-content {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.msg-loading {
  color: #9ca3af;
  font-style: italic;
}

.chat-input-bar {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.chat-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-family: "JetBrainsMono", sans-serif;
  font-size: 12px;
  line-height: 1.5;
  color: #1f1f1f;
  resize: none;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
  &:disabled { background: #f5f5f5; opacity: 0.6; }
}

.btn-send {
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s;
  flex-shrink: 0;

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// ── Create AUI: Format Spec ─────────────────────────────
.create-spec-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #374151;

  .spec-section {
    margin-bottom: 24px;
  }

  .spec-section-title {
    font-size: 15px;
    font-weight: 600;
    color: #1f1f1f;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
  }

  .spec-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: #4a4a4a;
    margin: 12px 0 6px;
  }

  ul, ol {
    margin: 4px 0;
    padding-left: 20px;

    li { margin: 3px 0; }
  }

  p { margin: 6px 0; }
}

// ── Create AUI: Preview ─────────────────────────────────
.create-preview-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 13px;
}

.file-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: 8px;
}

.file-tab {
  height: 26px;
  padding: 0 12px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #f9fafb;
  color: #6b6b6b;
  font-size: 11px;
  font-family: "JetBrainsMono", monospace;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #f0f0f0; }

  &.active {
    background: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
  }
}

.code-display {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-family: "JetBrainsMono", "Menlo", monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #374151;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
