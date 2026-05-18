<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <h2 class="modal-title">{{ data.name }}</h2>
          <button class="modal-close-btn" type="button" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Collection loading -->
          <div v-if="collectionLoading" class="modal-status">{{ t('skillpage.loading') }}</div>
          <div v-else-if="collectionError" class="modal-status modal-error">{{ t('skillpage.market-error') }}</div>
          <template v-else>
            <p class="modal-desc">{{ data.description || '—' }}</p>

            <!-- Skill type -->
            <template v-if="data.type === 'Skill'">
              <div class="modal-info-row">
                <span class="info-item"><em>{{ t('skillpage.detail-owner') }}</em>{{ data.owner || '—' }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-path') }}</em>{{ data.path || '—' }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-source') }}</em><a v-if="data.sourceUrl" :href="data.sourceUrl" target="_blank" class="modal-link">{{ data.sourceDeveloper || data.sourceUrl }}</a><span v-else>—</span></span>
                <span class="info-item"><em>{{ t('skillpage.detail-downloads') }}</em>{{ formatNum(data.downloads) }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-visits') }}</em>{{ formatNum(data.visits) }}</span>
              </div>
              <div v-if="data.tags.length > 0" class="modal-tags-row">
                <em class="info-label">{{ t('skillpage.detail-tags') }}</em>
                <span v-for="tag in data.tags" :key="tag" class="modal-tag">{{ tag }}</span>
              </div>
              <!-- Readme / Files tabs -->
              <div class="modal-tabs">
                <button :class="['modal-tab', { active: skillTab === 'readme' }]" @click="switchTab('readme')">{{ t('skillpage.detail-tab-readme') }}</button>
                <button :class="['modal-tab', { active: skillTab === 'files' }]" @click="switchTab('files')">{{ t('skillpage.detail-tab-files') }}</button>
              </div>
              <div v-if="skillTab === 'readme'" class="skill-readme">
                <div v-if="readmeLoading" class="modal-status">{{ t('skillpage.loading') }}</div>
                <div v-else-if="readmeError" class="modal-status modal-error">{{ t('skillpage.market-error') }}</div>
                <div v-else class="markdown-body" v-html="readmeHtml || '<p>—</p>'"></div>
              </div>
              <div v-if="skillTab === 'files'" class="skill-files-panel">
                <div v-if="filesLoading" class="modal-status">{{ t('skillpage.loading') }}</div>
                <div v-else-if="filesError" class="modal-status modal-error">{{ t('skillpage.market-error') }}</div>
                <div v-else class="files-layout">
                  <div class="file-tree">
                    <div v-if="fileTree.length === 0" class="file-tree-empty">{{ t('skillpage.detail-file-empty-dir') }}</div>
                    <FileTreeNode
                      v-for="node in fileTree"
                      :key="node.path"
                      :node="node"
                      :depth="0"
                      @select-file="openFile"
                      @toggle-dir="onToggleDir"
                    />
                  </div>
                  <div class="file-preview">
                    <div v-if="!filePreviewName" class="file-preview-hint">Select a file to preview</div>
                    <template v-else>
                      <div class="file-preview-header">{{ filePreviewName }}</div>
                      <pre class="file-preview-content"><code>{{ filePreviewContent }}</code></pre>
                    </template>
                  </div>
                </div>
              </div>
            </template>

            <!-- Collection type -->
            <template v-else-if="data.type === 'Collection'">
              <div class="modal-info-row">
                <span class="info-item"><em>{{ t('skillpage.detail-owner') }}</em>{{ data.owner || '—' }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-path') }}</em>{{ data.path || '—' }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-elements') }}</em>{{ formatNum(collectionElements) }}</span>
                <span class="info-item"><em>{{ t('skillpage.detail-favorites') }}</em>{{ formatNum(collectionFavorites) }}</span>
              </div>
              <div v-if="collectionOrgName || collectionCreator" class="modal-info-row">
                <span v-if="collectionOrgName" class="info-item"><em>{{ t('skillpage.detail-org') }}</em>{{ collectionOrgName }}</span>
                <span v-if="collectionCreator" class="info-item"><em>{{ t('skillpage.detail-creator') }}</em>{{ collectionCreator }}</span>
              </div>
            </template>

            <!-- BuiltIn type -->
            <template v-else>
              <p class="builtin-hint">Built-in skill</p>
            </template>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import { marked } from "marked"
import { FetchSkillCollectionInfo, FetchSkillReadme, FetchSkillFiles, FetchSkillFileContent } from "../../../../wailsjs/go/app/App"
import FileTreeNode from "./FileTreeNode.vue"

const { t } = useI18n()

interface FileNode {
  name: string
  path: string
  type: string
  size: number
  sha256?: string
  children?: FileNode[]
  _loading?: boolean
}

export interface SkillDetailData {
  id: string
  name: string
  description: string
  type: "Skill" | "Collection" | "BuiltIn"
  owner: string
  path: string
  sourceUrl?: string
  sourceDeveloper?: string
  downloads: number
  visits: number
  tags: string[]
  // For API calls
  rawPath?: string
  rawName?: string
  // Collection extra
  collectionFid?: string
}

const props = defineProps<{
  visible: boolean
  data: SkillDetailData
}>()

defineEmits<{
  close: []
}>()

// ── Collection detail fetch ──
const collectionLoading = ref(false)
const collectionError = ref(false)
const collectionElements = ref(0)
const collectionFavorites = ref(0)
const collectionOrgName = ref("")
const collectionCreator = ref("")

// ── Skill tabs ──
const skillTab = ref<"readme" | "files">("readme")
const readmeLoading = ref(false)
const readmeError = ref(false)
const readmeContent = ref("")
const readmeHtml = computed(() => {
  if (!readmeContent.value) return ""
  try {
    return marked(readmeContent.value, { breaks: true }) as string
  } catch {
    return "<p>渲染错误</p>"
  }
})
const filesLoading = ref(false)
const filesError = ref(false)
const fileTree = ref<FileNode[]>([])
const filePreviewName = ref("")
const filePreviewContent = ref("")
const loadedDirs = new Set<string>()
const loadingDirs = new Set<string>()

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

function resetState() {
  skillTab.value = "readme"
  readmeLoading.value = false
  readmeError.value = false
  readmeContent.value = ""
  filesLoading.value = false
  filesError.value = false
  fileTree.value = []
  filePreviewName.value = ""
  filePreviewContent.value = ""
  loadedDirs.clear()
  loadingDirs.clear()
  collectionLoading.value = false
  collectionError.value = false
  collectionElements.value = 0
  collectionFavorites.value = 0
  collectionOrgName.value = ""
  collectionCreator.value = ""
}

watch(() => props.visible, async (v) => {
  if (!v) return
  resetState()

  if (props.data.type === "Collection" && props.data.collectionFid) {
    collectionLoading.value = true
    try {
      const jsonStr = await FetchSkillCollectionInfo(props.data.collectionFid)
      const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
      const d = json?.Data ?? {}
      collectionElements.value = d.ElementCount ?? 0
      collectionFavorites.value = d.FavoriteCount ?? 0
      collectionOrgName.value = d.Organization?.CnName || d.Organization?.Name || ""
      collectionCreator.value = d.Creator ?? ""
    } catch (e) {
      console.error("Collection detail fetch failed:", e)
      collectionError.value = true
    } finally {
      collectionLoading.value = false
    }
  }

  if (props.data.type === "Skill" && props.data.rawPath && props.data.rawName) {
    fetchReadme()
  }
})

async function switchTab(tab: "readme" | "files") {
  skillTab.value = tab
  if (tab === "readme" && !readmeContent.value && !readmeLoading.value) {
    await fetchReadme()
  }
  if (tab === "files" && fileTree.value.length === 0 && !filesLoading.value) {
    await fetchFiles()
  }
}

async function fetchReadme() {
  if (!props.data.rawPath || !props.data.rawName) return
  readmeLoading.value = true
  readmeError.value = false
  try {
    const jsonStr = await FetchSkillReadme(props.data.rawPath, props.data.rawName)
    const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
    readmeContent.value = json?.content || json?.Content || ""
  } catch (e) {
    console.error("Readme fetch failed:", e)
    readmeError.value = true
  } finally {
    readmeLoading.value = false
  }
}

async function fetchFiles() {
  if (!props.data.rawPath || !props.data.rawName) return
  filesLoading.value = true
  filesError.value = false
  try {
    const jsonStr = await FetchSkillFiles(props.data.rawPath, props.data.rawName, "master", "")
    const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
    const items = json?.Data?.Files ?? []
    fileTree.value = buildFileTree(items)
  } catch (e) {
    console.error("Files fetch failed:", e)
    filesError.value = true
  } finally {
    filesLoading.value = false
  }
}

async function openFile(filePath: string) {
  if (!props.data.rawPath || !props.data.rawName) return
  filePreviewName.value = filePath
  filePreviewContent.value = "Loading..."
  try {
    const jsonStr = await FetchSkillFileContent(props.data.rawPath, props.data.rawName, "master", filePath)
    const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
    const content = json?.Data?.Content ?? ""
    filePreviewContent.value = json?.Data?.IsBinary ? "[Binary file]" : content
  } catch (e) {
    console.error("File content fetch failed:", e)
    filePreviewContent.value = "Failed to load file"
  }
}

async function onToggleDir({ path, expanded }: { path: string; expanded: boolean }) {
  if (!expanded || loadedDirs.has(path) || loadingDirs.has(path)) return
  if (!props.data.rawPath || !props.data.rawName) return
  loadingDirs.add(path)
  const node = findNodeInTree(fileTree.value, path)
  if (node) node._loading = true
  try {
    const jsonStr = await FetchSkillFiles(props.data.rawPath, props.data.rawName, "master", path)
    const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
    const items = json?.Data?.Files ?? []
    if (node) {
      node.children = buildChildren(items)
      loadedDirs.add(path)
    }
  } catch (e) {
    console.error("Folder expand failed:", e)
  } finally {
    if (node) node._loading = false
    loadingDirs.delete(path)
  }
}

function buildFileTree(items: any[]): FileNode[] {
  const roots: FileNode[] = []
  const map = new Map<string, FileNode>()
  const sorted = [...items].sort((a: any, b: any) => {
    if (a.Type !== b.Type) return a.Type === "tree" ? -1 : 1
    return (a.Name ?? "").localeCompare(b.Name ?? "")
  })
  for (const item of sorted) {
    const node: FileNode = {
      name: item.Name ?? item.name ?? "",
      path: item.Path ?? item.path ?? "",
      type: item.Type ?? item.type ?? "blob",
      size: item.Size ?? item.Size ?? 0,
      sha256: item.Sha256 ?? item.sha256 ?? "",
      children: [],
    }
    map.set(node.path, node)
    const parentPath = node.path.includes("/") ? node.path.substring(0, node.path.lastIndexOf("/")) : ""
    const parent = parentPath ? map.get(parentPath) : null
    if (parent) {
      parent.children = parent.children || []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

function buildChildren(items: any[]): FileNode[] {
  return [...items]
    .sort((a: any, b: any) => {
      if (a.Type !== b.Type) return a.Type === "tree" ? -1 : 1
      return (a.Name ?? "").localeCompare(b.Name ?? "")
    })
    .map((item: any) => ({
      name: item.Name ?? item.name ?? "",
      path: item.Path ?? item.path ?? "",
      type: item.Type ?? item.type ?? "blob",
      size: item.Size ?? item.Size ?? 0,
      sha256: item.Sha256 ?? item.sha256 ?? "",
      children: [],
    }))
}

function findNodeInTree(nodes: FileNode[], path: string): FileNode | null {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, path)
      if (found) return found
    }
  }
  return null
}
</script>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 520px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &.modal-lg { width: 760px; }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  font-size: 20px;
  color: #9a9a9a;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover { background: #f5f5f5; color: #1f1f1f; }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.modal-status {
  text-align: center;
  padding: 40px 0;
  color: #9a9a9a;
  font-size: 14px;
  &.modal-error { color: #e74c3c; }
}

.modal-desc {
  font-size: 13px;
  color: #4b4b4b;
  line-height: 1.6;
  margin: 0 0 16px 0;
}

.modal-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 6px;
}

.info-item {
  font-size: 12px;
  color: #1f1f1f;
  white-space: nowrap;
  em {
    font-style: normal;
    color: #9a9a9a;
    margin-right: 4px;
  }
}

.modal-tags-row {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.info-label {
  font-style: normal;
  font-size: 12px;
  color: #9a9a9a;
  margin-right: 6px;
}

.modal-link {
  color: #6366f1;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.modal-tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 11px;
  color: #4b4b4b;
}

// ── Tabs ──
.modal-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.modal-tab {
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

// ── Readme ──
.skill-readme {
  max-height: 400px;
  overflow-y: auto;
}

.markdown-body {
  font-size: 13px;
  line-height: 1.7;
  color: #1f1f1f;

  h1 { font-size: 18px; font-weight: 700; margin: 14px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #f0f0f0; }
  h2 { font-size: 15px; font-weight: 700; margin: 12px 0 6px; }
  h3 { font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
  h4, h5, h6 { font-size: 12px; font-weight: 600; margin: 8px 0 4px; }
  p { margin: 6px 0; }
  a { color: #6366f1; text-decoration: underline; cursor: pointer; &:hover { color: #4f46e5; } }
  ul, ol { padding-left: 20px; margin: 6px 0; }
  li { margin: 3px 0; }
  code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 11px; font-family: "JetBrainsMono", monospace; }
  pre {
    background: #f5f5f5; padding: 10px 14px; border-radius: 5px; overflow-x: auto; margin: 10px 0;
    border: 1px solid #e5e5e5; font-size: 11px;
    code { background: transparent; padding: 0; border-radius: 0; }
  }
  blockquote {
    margin: 10px 0; padding: 6px 14px; border-left: 3px solid #e5e5e5; color: #6b6b6b;
    background: #fafafa; border-radius: 0 4px 4px 0;
  }
  hr { margin: 16px 0; border: none; border-top: 1px solid #e5e5e5; }
  table {
    width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;
    th, td { padding: 6px 10px; border: 1px solid #e5e5e5; text-align: left; }
    th { background: #fafafa; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
  }
  img { max-width: 100%; border-radius: 4px; }
}

// ── Files panel ──
.skill-files-panel {
  max-height: 400px;
  overflow: hidden;
}

.files-layout {
  display: flex;
  gap: 0;
  height: 360px;
}

.file-tree {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  overflow-y: auto;
  padding: 4px 0;
}

.file-tree-empty {
  font-size: 12px;
  color: #9a9a9a;
  padding: 16px;
  text-align: center;
}

.file-preview {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.file-preview-hint {
  font-size: 12px;
  color: #9a9a9a;
  padding: 40px 16px;
  text-align: center;
}

.file-preview-header {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 500;
  color: #9a9a9a;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  font-family: "JetBrainsMono", monospace;
  code { white-space: pre-wrap; word-break: break-word; }
}

.builtin-hint {
  font-size: 13px;
  color: #9a9a9a;
  text-align: center;
  padding: 40px 0;
}
</style>
