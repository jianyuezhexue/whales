<template>
  <div class="knowledge-page page-layout">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t("knowledgepage.title") }}</h1>
      <div class="search-field" ref="searchRef">
        <svg class="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="searchQuery" class="search-input" type="text"
          :placeholder="t('knowledgepage.search-placeholder')" />

        <div v-if="showSearchResults" class="search-overlay">
          <div v-if="searchResults.length === 0" class="search-empty">
            {{ t("knowledgepage.search-no-results") }}
          </div>
          <div v-else class="search-results-list">
            <div v-for="result in searchResults" :key="result.file" class="result-item"
              @click="onSearchResultClick(result)">
              <div class="result-file">{{ result.file }}</div>
              <div class="result-snippet">{{ result.snippet }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No project selected -->
    <div v-if="!hasProject" class="no-project-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span>{{ t("knowledgepage.no-project") }}</span>
    </div>

    <!-- Two-panel body -->
    <div v-else class="knowledge-body">
      <!-- Left: Content area -->
      <div class="content-panel">
        <KnowledgeContent
          :active-file="activeFile"
          :file-content="fileContent"
          :edit-content="editContent"
          :is-editing="isEditing"
          :is-saving="isSavingContent"
          :is-loading="isLoadingContent"
          :error="error"
          @toggle-mode="toggleMode"
          @save="saveContent"
          @cancel-edit="cancelEdit"
          @update-edit-content="editContent = $event"
          @navigate-link="navigateToLink"
        />
      </div>

      <!-- Right: Tabbed panel (Files / Schema) -->
      <div class="right-panel">
        <div class="right-tabs">
          <button class="right-tab" :class="{ active: rightTab === 'files' }" @click="rightTab = 'files'">
            {{ t("knowledgepage.file-tab") }}
          </button>
          <button class="right-tab" :class="{ active: rightTab === 'schema' }" @click="rightTab = 'schema'">
            {{ t("knowledgepage.schema-tab") }}
          </button>
        </div>

        <div class="right-content">
          <KnowledgeFileBrowser
            v-if="rightTab === 'files'"
            :files="files"
            :active-file="activeFile"
            :is-loading="isLoadingFiles"
            :load-directory="loadDirectory"
            @select-file="selectFile"
            @new-file="onNewFile"
            @new-folder="onNewFolder"
            @delete-file="onDeleteFile"
          />

          <KnowledgeSchema
            v-else
            :schemas="schemas"
            :is-saving="isSavingSchema"
            @save-schema="onSaveSchema"
            @delete-schema="onDeleteSchema"
          />
        </div>
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteConfirm"
      :title="t('knowledgepage.delete')"
      :message="t('knowledgepage.delete-confirm')"
      :confirm-text="t('knowledgepage.delete')"
      :danger="true"
      @confirm="confirmDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { useProjectStore } from "@/stores/project"
import KnowledgeFileBrowser from "@/components/knowledge/KnowledgeFileBrowser.vue"
import KnowledgeContent from "@/components/knowledge/KnowledgeContent.vue"
import KnowledgeSchema from "@/components/knowledge/KnowledgeSchema.vue"
import ConfirmModal from "@/components/ConfirmModal.vue"
import {
  initKnowledge,
  listAllKnowledgeFiles,
  listDirectory,
  readKnowledgeFile,
  writeKnowledgeFile,
  deleteKnowledgeFile,
  createFolder,
} from "@/composables/useKnowledgeApi"
import type {
  KnowledgeFile,
  Schema,
  SearchResult,
} from "@/types/knowledge"

const { t } = useI18n()
const projectStore = useProjectStore()

// ── State ──────────────────────────────────────────────────

const files = ref<KnowledgeFile[]>([])
const activeFile = ref<KnowledgeFile | null>(null)
const fileContent = ref("")
const editContent = ref("")
const isEditing = ref(false)
const hasUnsavedChanges = computed(() => isEditing.value && editContent.value !== fileContent.value)

const schemas = ref<Schema[]>([])

const searchQuery = ref("")
const searchResults = ref<SearchResult[]>([])
const showSearchResults = ref(false)
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const isLoadingFiles = ref(false)
const isLoadingContent = ref(false)
const isSavingContent = ref(false)
const isSavingSchema = ref(false)
const error = ref<string | null>(null)

const showDeleteConfirm = ref(false)
const deletingFile = ref<KnowledgeFile | null>(null)

const rightTab = ref<"files" | "schema">("files")
const searchRef = ref<HTMLElement | null>(null)

// ── Computed ──────────────────────────────────────────────

const hasProject = computed(() => !!projectStore.currentProject)
const projectPath = computed(() => projectStore.currentProject?.path || "")

// ── Initialization ───────────────────────────────────────

onMounted(async () => {
  document.addEventListener("click", onDocumentClick)
  if (hasProject.value) await init()
})

watch(
  () => projectStore.currentProject?.path,
  async (newPath, oldPath) => {
    if (newPath && newPath !== oldPath) {
      await init()
    }
  }
)

async function init() {
  if (!projectPath.value) return
  try {
    await initKnowledge(projectPath.value)
    await loadAllFiles()
    await loadSchemas()
  } catch (e: any) {
    error.value = e.message || "初始化失败"
  }
}

// ── Load files ────────────────────────────────────────────

async function loadAllFiles() {
  if (!projectPath.value) return
  isLoadingFiles.value = true
  error.value = null
  try {
    files.value = await listAllKnowledgeFiles(projectPath.value)

    const index = files.value.find((f) => f.name === "index.md")
    if (index && !activeFile.value) {
      await selectFile(index)
    }
  } catch (e: any) {
    error.value = e.message || "加载文件列表失败"
  } finally {
    isLoadingFiles.value = false
  }
}

// ── File selection ───────────────────────────────────────

async function selectFile(file: KnowledgeFile) {
  if (hasUnsavedChanges.value) {
    if (!confirm(t("knowledgepage.unsaved-changes"))) return
  }

  activeFile.value = file
  isEditing.value = false
  error.value = null

  isLoadingContent.value = true
  try {
    const content = await readKnowledgeFile(projectPath.value, file.path)
    fileContent.value = content
    editContent.value = content
  } catch (e: any) {
    error.value = e.message || t("knowledgepage.read-error")
    fileContent.value = ""
    editContent.value = ""
  } finally {
    isLoadingContent.value = false
  }
}

// ── Index navigation ─────────────────────────────────────

function navigateToLink(filename: string) {
  const found = files.value.find((f) => f.name === filename)
  if (found) {
    selectFile(found)
  } else {
    error.value = `文件 "${filename}" 不存在`
  }
}

// ── Content editing ──────────────────────────────────────

function toggleMode() {
  if (isEditing.value) {
    editContent.value = fileContent.value
  }
  isEditing.value = !isEditing.value
}

function cancelEdit() {
  editContent.value = fileContent.value
  isEditing.value = false
}

async function saveContent() {
  if (!activeFile.value) return
  isSavingContent.value = true
  error.value = null
  try {
    await writeKnowledgeFile(projectPath.value, activeFile.value.path, editContent.value)
    fileContent.value = editContent.value
    isEditing.value = false
  } catch (e: any) {
    error.value = e.message || t("knowledgepage.save-error")
  } finally {
    isSavingContent.value = false
  }
}

// ── File management ──────────────────────────────────────

function onNewFile(relativePath: string) {
  if (!projectPath.value) return
  const name = relativePath.split("/").pop() || ""
  writeKnowledgeFile(projectPath.value, relativePath, `# ${name.replace(/\.md$/, "")}\n\n`)
    .then(() => loadAllFiles())
    .catch((e: any) => {
      error.value = e.message || t("knowledgepage.create-error")
    })
}

function onNewFolder(relativePath: string) {
  if (!projectPath.value) return
  createFolder(projectPath.value, relativePath)
    .then(() => loadAllFiles())
    .catch((e: any) => {
      error.value = e.message || t("knowledgepage.create-error")
    })
}

async function loadDirectory(dirPath: string): Promise<KnowledgeFile[]> {
  if (!projectPath.value) return []
  return listDirectory(projectPath.value, dirPath)
}

function onDeleteFile(file: KnowledgeFile) {
  deletingFile.value = file
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (!deletingFile.value) return
  const file = deletingFile.value
  deleteKnowledgeFile(projectPath.value, file.path)
    .then(() => {
      if (activeFile.value?.path === file.path) {
        activeFile.value = null
        fileContent.value = ""
        editContent.value = ""
      }
      return loadAllFiles()
    })
    .catch((e: any) => {
      error.value = e.message || t("knowledgepage.delete-error")
    })
    .finally(() => {
      showDeleteConfirm.value = false
      deletingFile.value = null
    })
}

// ── Schema ────────────────────────────────────────────────

async function loadSchemas() {
  if (!projectPath.value) return
  try {
    const content = await readKnowledgeFile(projectPath.value, "wiki/schema.json")
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      schemas.value = parsed
    } else if (parsed.fields && !parsed.id) {
      schemas.value = [{ id: crypto.randomUUID(), name: t("knowledgepage.schema-default-name"), fields: parsed.fields }]
    } else {
      schemas.value = [parsed]
    }
  } catch {
    schemas.value = [
      {
        id: crypto.randomUUID(),
        name: t("knowledgepage.schema-default-name"),
        fields: [
          { id: crypto.randomUUID(), name: "title", type: "string", required: true },
          { id: crypto.randomUUID(), name: "description", type: "string", required: false },
        ],
      },
    ]
  }
}

function onSaveSchema(schema: Schema) {
  isSavingSchema.value = true
  const idx = schemas.value.findIndex((s) => s.id === schema.id)
  if (idx !== -1) {
    schemas.value[idx] = schema
  } else {
    schemas.value.push(schema)
  }
  saveSchemasToDisk()
}

function onDeleteSchema(id: string) {
  schemas.value = schemas.value.filter((s) => s.id !== id)
  saveSchemasToDisk()
}

async function saveSchemasToDisk() {
  if (!projectPath.value) return
  error.value = null
  try {
    await writeKnowledgeFile(projectPath.value, "wiki/schema.json", JSON.stringify(schemas.value, null, 2))
  } catch (e: any) {
    error.value = e.message || t("knowledgepage.save-schema-error")
  } finally {
    isSavingSchema.value = false
  }
}

// ── Search ────────────────────────────────────────────────

watch(searchQuery, (val) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  if (val.length < 2) {
    searchResults.value = []
    showSearchResults.value = false
    return
  }
  searchDebounceTimer = setTimeout(() => performSearch(val), 300)
})

async function performSearch(query: string) {
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const file of files.value) {
    try {
      const content = await readKnowledgeFile(projectPath.value, file.path)
      const lowerContent = content.toLowerCase()
      const idx = lowerContent.indexOf(q)
      if (idx !== -1) {
        const start = Math.max(0, idx - 40)
        const end = Math.min(content.length, idx + q.length + 40)
        let snippet = content.slice(start, end)
        if (start > 0) snippet = "..." + snippet
        if (end < content.length) snippet += "..."
        results.push({ file: file.name, snippet })
      }
    } catch {
      // skip
    }
  }

  searchResults.value = results
  showSearchResults.value = true
}

function onSearchResultClick(result: SearchResult) {
  searchQuery.value = ""
  showSearchResults.value = false
  const file = files.value.find((f) => f.name === result.file)
  if (file) selectFile(file)
}

function onDocumentClick(e: MouseEvent) {
  if (searchRef.value && !searchRef.value.contains(e.target as Node)) {
    showSearchResults.value = false
  }
}
</script>

<style lang="scss" scoped>
.knowledge-page {
  height: 100%;
  display: flex;
  flex-direction: column;

  .page-header {
    flex-shrink: 0;
    margin-bottom: 0;
    padding-bottom: 16px;
  }

  .search-field {
    position: relative;
    display: flex;
    align-items: center;
    width: 280px;
    flex-shrink: 0;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: #9a9a9a;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    height: 32px;
    padding: 0 10px 0 32px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;

    &:focus { border-color: #1f1f1f; }
    &::placeholder { color: #c0c0c0; }
  }

  .search-overlay {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 320px;
    overflow-y: auto;
    padding: 4px;
    background: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 50;
  }

  .search-empty {
    padding: 16px;
    text-align: center;
    font-size: 13px;
    color: #9a9a9a;
  }

  .result-item {
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.1s;
    &:hover { background: #f5f5f5; }
  }

  .result-file { font-size: 13px; font-weight: 500; color: #1f1f1f; margin-bottom: 2px; }
  .result-snippet { font-size: 11px; color: #9a9a9a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .no-project-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #9a9a9a;
    font-size: 14px;
  }
}

.knowledge-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0;
  border-top: 1px solid #e5e5e5;
  margin: 0 -20px;
  padding: 0 20px;
  overflow: hidden;
}

.content-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.right-panel {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e5e5;
  padding-left: 16px;
  overflow: hidden;
}

.right-tabs {
  display: flex;
  gap: 0;
  flex-shrink: 0;
  height: 36px;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 8px;
}

.right-tab {
  flex: 1;
  height: 100%;
  padding: 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6b6b6b;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { color: #1f1f1f; }

  &.active {
    color: #1f1f1f;
    font-weight: 600;
    border-bottom-color: #1f1f1f;
  }
}

.right-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
