<script setup lang="ts">
import { onMounted, ref, computed, nextTick, watch } from "vue"
import { useAuiPluginStore } from "@/stores/auiPlugin"
import type { AuiPluginMeta } from "@/stores/auiPlugin"

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
const previewContainerRef = ref<HTMLElement | null>(null)
let previewElement: HTMLElement | null = null

function openPreview(plugin: AuiPluginMeta) {
  previewPlugin.value = plugin
  previewJsonStr.value = JSON.stringify(plugin.sampleData, null, 2)
  previewJsonError.value = false
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

  if (!customElements.get(tag)) return

  // Remove previous
  if (previewElement && previewElement.parentNode) {
    previewElement.parentNode.removeChild(previewElement)
  }

  previewElement = document.createElement(tag)

  previewContainerRef.value.innerHTML = ""
  previewContainerRef.value.appendChild(previewElement)

  // Set data AFTER appending so connectedCallback can see it
  try {
    const data = JSON.parse(previewJsonStr.value)
    ;(previewElement as any).data = data
  } catch {
    ;(previewElement as any).data = plugin.sampleData
  }
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

watch(() => previewPlugin.value?.id, () => {
  if (showPreviewModal.value) {
    nextTick(mountPreviewElement)
  }
})
</script>

<template>
  <div class="aui-page page-layout">
    <div class="page-header">
      <h1 class="page-title">AUI管理</h1>
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
          <button class="preview-close" @click="showPreviewModal = false">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="preview-body">
          <div class="preview-split">
            <!-- Left: JSON editor -->
            <div class="preview-left">
              <div class="preview-left-header">
                <span class="preview-left-title">JSON 数据</span>
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
            <!-- Right: Live preview -->
            <div class="preview-right">
              <div class="preview-right-title">渲染效果</div>
              <div class="preview-render-area" ref="previewContainerRef"></div>
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

.preview-split {
  display: flex;
  gap: 16px;
  height: 100%;
}

.preview-left {
  width: 42%;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.preview-left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.preview-left-title {
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

.preview-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  overflow: hidden;
}

.preview-right-title {
  font-size: 13px;
  font-weight: 500;
  color: #4a4a4a;
  padding: 10px 12px 0;
  flex-shrink: 0;
}

.preview-render-area {
  flex: 1;
  overflow: auto;
  padding: 12px;
}
</style>