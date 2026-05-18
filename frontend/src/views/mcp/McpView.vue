<template>
  <div class="mcp-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t('menu.mcp') }}</h1>
    </div>

    <!-- Tabs -->
    <div class="mcp-tabs">
      <button
        :class="['mcp-tab', { active: activeTab === 'installed' }]"
        @click="activeTab = 'installed'"
      >
        {{ t('mcppage.installed-tab') }}
      </button>
      <button
        :class="['mcp-tab', { active: activeTab === 'market' }]"
        @click="activeTab = 'market'"
      >
        {{ t('mcppage.market-tab') }}
      </button>
    </div>

    <!-- Tab: Installed MCPs -->
    <div v-show="activeTab === 'installed'" class="tab-content">
      <div v-if="installedMcps.length === 0" class="empty-state">
        <div class="empty-icon">🔌</div>
        <div class="empty-title">{{ t('mcppage.installed-empty') }}</div>
        <div class="empty-subtitle">{{ t('mcppage.installed-empty-subtitle') }}</div>
      </div>
      <div v-else class="mcp-grid">
        <div v-for="mcp in installedMcps" :key="mcp.id" class="mcp-card">
          <div class="mcp-card-header">
            <span class="mcp-color-dot" :style="{ backgroundColor: mcp.color }"></span>
            <span class="mcp-name">{{ mcp.name }}</span>
            <span class="mcp-installed-badge">{{ t('mcppage.installed') }}</span>
          </div>
          <div class="mcp-card-body">
            <p class="mcp-desc">{{ mcp.description }}</p>
          </div>
          <div class="mcp-card-meta">
            <span v-if="mcp.toolsCount > 0" class="mcp-meta-item">{{ t('mcppage.tools-count', { count: mcp.toolsCount }) }}</span>
            <span v-if="mcp.stars > 0" class="mcp-meta-item">{{ t('mcppage.stars', { count: mcp.stars }) }}</span>
          </div>
          <div class="mcp-card-footer">
            <button class="mcp-action-btn mcp-uninstall-btn" type="button" @click="uninstallMcp(mcp.id)">
              {{ t('mcppage.uninstall') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: MCP Marketplace -->
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
            :placeholder="t('mcppage.search-placeholder')"
            @input="onSearchInput"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="market-status">
        <span>{{ t('mcppage.loading') }}</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="market-status market-error">
        <span>{{ t('mcppage.market-error') }}</span>
        <button class="market-retry-btn" type="button" @click="fetchMarket">{{ t('mcppage.page-prev') }}</button>
      </div>

      <!-- Empty -->
      <div v-else-if="marketMcps.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-title">{{ t('mcppage.market-empty') }}</div>
        <div class="empty-subtitle">{{ t('mcppage.market-empty-subtitle') }}</div>
      </div>

      <!-- Grid -->
      <template v-else>
        <div class="mcp-grid">
          <div v-for="mcp in marketMcps" :key="mcp.id" class="mcp-card">
            <div class="mcp-card-header">
              <span class="mcp-color-dot" :style="{ backgroundColor: mcp.color }"></span>
              <span class="mcp-name">{{ mcp.name }}</span>
              <span v-if="isInstalled(mcp.id)" class="mcp-installed-badge">{{ t('mcppage.installed') }}</span>
            </div>
            <div class="mcp-card-body">
              <p class="mcp-desc">{{ mcp.description }}</p>
            </div>
            <div class="mcp-card-meta">
              <span v-if="mcp.toolsCount > 0" class="mcp-meta-item">{{ t('mcppage.tools-count', { count: mcp.toolsCount }) }}</span>
              <span v-if="mcp.stars > 0" class="mcp-meta-item">{{ t('mcppage.stars', { count: mcp.stars }) }}</span>
            </div>
            <div class="mcp-card-footer">
              <button v-if="!isInstalled(mcp.id)" class="mcp-action-btn mcp-install-btn" type="button" @click="installMcp(mcp)">
                {{ t('mcppage.install') }}
              </button>
              <button v-else class="mcp-action-btn mcp-installed-btn" type="button" disabled>
                {{ t('mcppage.installed') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div class="market-pagination">
          <button
            class="market-page-btn"
            :disabled="pageNumber <= 1"
            @click="goPage(pageNumber - 1)"
          >{{ t('mcppage.page-prev') }}</button>
          <span class="market-page-info">{{ t('mcppage.page-info', { current: pageNumber, total: totalPages, count: totalCount }) }}</span>
          <button
            class="market-page-btn"
            :disabled="pageNumber >= totalPages"
            @click="goPage(pageNumber + 1)"
          >{{ t('mcppage.page-next') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"
import { FetchMcpMarket, FetchMcpMarketWithCookies } from "../../../wailsjs/go/app/App"

const { t } = useI18n()

const activeTab = ref<"installed" | "market">("installed")

// ── Market state ────────────────────────────────────────
interface McpItem {
  id: string
  name: string
  description: string
  color: string
  toolsCount: number
  stars: number
  category: string
  publisher: string
}

const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#a855f7"]

const marketMcps = ref<McpItem[]>([])
const loading = ref(false)
const error = ref(false)
const marketSearch = ref("")
const pageNumber = ref(1)
const pageSize = 30
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

let searchTimer: ReturnType<typeof setTimeout> | null = null

// ── Installed state (localStorage) ──────────────────────
const STORAGE_KEY = "whales-installed-mcps"

function loadInstalledIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveInstalledIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

const installedIds = ref<string[]>(loadInstalledIds())
const installedDetails = ref<McpItem[]>(loadInstalledDetails())

function loadInstalledDetails(): McpItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY + "-details")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveInstalledDetails(items: McpItem[]) {
  localStorage.setItem(STORAGE_KEY + "-details", JSON.stringify(items))
}

const installedMcps = computed(() => installedDetails.value)

function isInstalled(id: string): boolean {
  return installedIds.value.includes(id)
}

function installMcp(mcp: McpItem) {
  if (isInstalled(mcp.id)) return
  installedIds.value = [...installedIds.value, mcp.id]
  saveInstalledIds(installedIds.value)
  installedDetails.value = [...installedDetails.value, mcp]
  saveInstalledDetails(installedDetails.value)
}

function uninstallMcp(id: string) {
  installedIds.value = installedIds.value.filter(i => i !== id)
  saveInstalledIds(installedIds.value)
  installedDetails.value = installedDetails.value.filter(d => d.id !== id)
  saveInstalledDetails(installedDetails.value)
}

// ── Color hash ──────────────────────────────────────────
function getColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

// ── WAF challenge solving via hidden iframe ─────────────
// The MCP API is protected by Alibaba Cloud WAF. The Go backend detects the
// challenge, injects a postMessage interception into the HTML, and returns it
// to the frontend. We load it in a hidden iframe where the original WAF JS
// computes the cookie and posts it back to us. We then pass the cookie to
// the Go backend for the actual API request.

let wafIframe: HTMLIFrameElement | null = null

function cleanupWafIframe() {
  if (wafIframe) {
    try { document.body.removeChild(wafIframe) } catch { /* ignore */ }
    wafIframe = null
  }
}

function solveWafChallenge(wafHtml: string): Promise<string> {
  cleanupWafIframe()

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe")
    iframe.style.display = "none"
    // No sandbox — WAF JS may need full DOM/cookie access that sandbox blocks
    iframe.srcdoc = wafHtml
    wafIframe = iframe

    console.log("[solveWafChallenge] iframe created (no sandbox), html length:", wafHtml.length)

    const timeout = setTimeout(() => {
      console.log("[solveWafChallenge] TIMEOUT after 15s")
      cleanupWafIframe()
      reject(new Error("WAF challenge timed out"))
    }, 15000)

    const onMessage = (event: MessageEvent) => {
      // Log all messages from any source for debugging
      if (event.data && typeof event.data === 'object') {
        console.log("[solveWafChallenge] postMessage received, keys:", Object.keys(event.data).join(","), "type:", event.data.type)
      }
      if (event.data?.type === "waf-cookie" && event.data?.acw_sc__v2) {
        console.log("[solveWafChallenge] WAF cookie captured! length:", event.data.acw_sc__v2.length)
        clearTimeout(timeout)
        window.removeEventListener("message", onMessage)
        cleanupWafIframe()
        resolve(event.data.acw_sc__v2)
      }
    }
    window.addEventListener("message", onMessage)

    iframe.onerror = () => {
      console.log("[solveWafChallenge] iframe onerror fired")
      clearTimeout(timeout)
      window.removeEventListener("message", onMessage)
      cleanupWafIframe()
      reject(new Error("WAF iframe failed to load"))
    }

    document.body.appendChild(iframe)
    console.log("[solveWafChallenge] iframe appended to DOM")
  })
}

// ── Data fetching ───────────────────────────────────────
function parseMarketJson(json: any) {
  const items = json?.Data?.MCPServers ?? json?.Data?.Items ?? []
  totalCount.value = json?.Data?.TotalCount ?? 0
  console.log("[parseMarketJson] items:", items.length, "total:", totalCount.value, "keys:", Object.keys(json?.Data ?? {}).join(","))
  marketMcps.value = items.map((item: any) => ({
    id: item.Id ?? item.id ?? "",
    name: item.Name ?? item.name ?? "Unknown",
    description: item.Description ?? item.description ?? "",
    color: getColor(item.Id ?? item.id ?? ""),
    toolsCount: item.ToolsCount ?? item.toolsCount ?? item.Tools?.length ?? 0,
    stars: item.Stars ?? item.stars ?? item.StarCount ?? 0,
    category: item.Category ?? item.category ?? "",
    publisher: item.Publisher ?? item.publisher ?? "",
  }))
}

async function fetchMarket() {
  loading.value = true
  error.value = false
  try {
    const raw = await FetchMcpMarket(pageSize, pageNumber.value, marketSearch.value)
    console.log("[fetchMarket] raw length:", raw.length, "first 100:", raw.substring(0, 100))
    const parsed = JSON.parse(raw)

    // Check if this is a WAF challenge wrapper
    if (parsed._waf) {
      console.log("[fetchMarket] WAF detected, acwTc:", typeof parsed.acwTc, "html length:", parsed.html?.length)
      const acwTc: string = parsed.acwTc
      const wafHtml: string = parsed.html

      // Solve the WAF challenge in the browser context
      console.log("[fetchMarket] solving WAF challenge...")
      const acwScV2 = await solveWafChallenge(wafHtml)
      console.log("[fetchMarket] WAF solved, cookie length:", acwScV2.length, "first 20:", acwScV2.substring(0, 20))

      // Retry with cookies
      const raw2 = await FetchMcpMarketWithCookies(
        pageSize, pageNumber.value, marketSearch.value, acwTc, acwScV2,
      )
      console.log("[fetchMarket] retry raw2 length:", raw2.length, "first 100:", raw2.substring(0, 100))
      parseMarketJson(JSON.parse(raw2))
    } else {
      // No WAF — parse directly
      console.log("[fetchMarket] no WAF, parsing directly")
      parseMarketJson(parsed)
    }
  } catch (e) {
    console.error("MCP market fetch error:", e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNumber.value = 1
    fetchMarket()
  }, 300)
}

function goPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  pageNumber.value = page
  fetchMarket()
}

watch(marketSearch, () => {
  if (marketSearch.value === "") {
    pageNumber.value = 1
    fetchMarket()
  }
})

onMounted(() => {
  fetchMarket()
})

onUnmounted(() => {
  cleanupWafIframe()
})
</script>

<style lang="scss" scoped>
.mcp-page {
  display: flex;
  flex-direction: column;
  height: 100%;

  .page-header {
    margin-bottom: 0;
    padding-bottom: 16px;
  }
}

// ── Tabs ────────────────────────────────────────────────
.mcp-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.mcp-tab {
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
  display: flex;
  flex-direction: column;
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

// ── Status states ──────────────────────────────────────
.market-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #9a9a9a;
  font-size: 14px;
}

.market-error {
  color: #e74c3c;
}

.market-retry-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  color: #1f1f1f;
  transition: all 0.15s;

  &:hover { background: #f5f5f5; }
}

// ── Card grid ──────────────────────────────────────────
.mcp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  align-content: start;
}

.mcp-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.mcp-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.mcp-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mcp-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcp-installed-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  flex-shrink: 0;
}

.mcp-card-body {
  flex: 1;
  margin-bottom: 10px;
}

.mcp-desc {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mcp-card-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.mcp-meta-item {
  font-size: 11px;
  color: #9a9a9a;
  font-family: "JetBrainsMono", sans-serif;
}

.mcp-card-footer {
  display: flex;
  justify-content: flex-end;
}

.mcp-action-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;
}

.mcp-install-btn {
  border: none;
  background: #1f1f1f;
  color: #ffffff;

  &:hover { opacity: 0.85; }
}

.mcp-uninstall-btn {
  border: 1px solid #e5e5e5;
  background: #ffffff;
  color: #e74c3c;

  &:hover { background: #fef2f2; }
}

.mcp-installed-btn {
  border: 1px solid #e5e5e5;
  background: #fafafa;
  color: #9a9a9a;
  cursor: not-allowed;
}

// ── Pagination ─────────────────────────────────────────
.market-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px 0 8px;
  margin-top: auto;
}

.market-page-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) { background: #f5f5f5; }
  &:disabled {
    color: #c0c0c0;
    cursor: not-allowed;
  }
}

.market-page-info {
  font-size: 12px;
  color: #6b6b6b;
  font-family: "JetBrainsMono", sans-serif;
}
</style>
