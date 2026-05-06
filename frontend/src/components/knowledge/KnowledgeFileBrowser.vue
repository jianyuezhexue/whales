<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import type { KnowledgeFile, TreeNode } from "@/types/knowledge"

const { t } = useI18n()

const props = defineProps<{
  files: KnowledgeFile[]
  activeFile: KnowledgeFile | null
  isLoading: boolean
  loadDirectory: (dirPath: string) => Promise<KnowledgeFile[]>
}>()

const emit = defineEmits<{
  (e: "select-file", file: KnowledgeFile): void
  (e: "new-file", filename: string): void
  (e: "new-folder", foldername: string): void
  (e: "delete-file", file: KnowledgeFile): void
}>()

// ── Tree building ──────────────────────────────────────────

function filesToTreeNodes(entries: KnowledgeFile[]): TreeNode[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    if (a.name === "index.md") return -1
    if (b.name === "index.md") return 1
    return a.name.localeCompare(b.name)
  })

  const rootNodes: TreeNode[] = []

  for (const file of sorted) {
    const parts = file.path.split("/")
    let parentList = rootNodes
    let currentPath = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (isLast) {
        const existing = parentList.find((n) => n.path === file.path)
        if (!existing) {
          parentList.push({
            type: file.isDir ? "folder" : "file",
            name: part,
            path: file.path,
            file: file.isDir ? undefined : file,
            children: [],
            expanded: false,
            loading: false,
          })
        }
      } else {
        let folder = parentList.find((n) => n.path === currentPath && n.type === "folder")
        if (!folder) {
          folder = {
            type: "folder",
            name: part,
            path: currentPath,
            children: [],
            expanded: false,
            loading: false,
          }
          parentList.push(folder)
        }
        parentList = folder.children
      }
    }
  }

  // Sort root nodes
  rootNodes.sort((a, b) => {
    if (a.type === "folder" && b.type === "file") return -1
    if (a.type === "file" && b.type === "folder") return 1
    if (a.name === "index.md") return -1
    if (b.name === "index.md") return 1
    return a.name.localeCompare(b.name)
  })

  return rootNodes
}

// Convert directory listing entries to tree nodes directly (no path splitting).
// Each entry is a direct child — uses the entry's name as the node name.
function entriesToTreeNodes(entries: KnowledgeFile[]): TreeNode[] {
  const sorted = [...entries].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    if (a.name === "index.md") return -1
    if (b.name === "index.md") return 1
    return a.name.localeCompare(b.name)
  })

  return sorted.map((e) => ({
    type: e.isDir ? "folder" as const : "file" as const,
    name: e.name,
    path: e.path,
    file: e.isDir ? undefined : e,
    children: [],
    expanded: false,
    loading: false,
  }))
}

// Rebuild tree when files change
const rootNodes = ref<TreeNode[]>([])

watch(
  () => props.files,
  (newFiles) => {
    rootNodes.value = filesToTreeNodes(newFiles)
  },
  { immediate: true }
)

// ── Flatten tree for rendering ────────────────────────────

interface FlatEntry {
  node: TreeNode
  depth: number
}

function flattenVisible(nodes: TreeNode[]): FlatEntry[] {
  const result: FlatEntry[] = []
  function walk(list: TreeNode[], depth: number) {
    for (const n of list) {
      result.push({ node: n, depth })
      if (n.type === "folder" && n.expanded) {
        walk(n.children, depth + 1)
      }
    }
  }
  walk(nodes, 0)
  return result
}

const flatTree = computed(() => flattenVisible(rootNodes.value))

// ── Expand / collapse ─────────────────────────────────────

const currentFolderPath = ref("wiki")

async function toggleFolder(node: TreeNode) {
  if (node.type !== "folder") return

  // Mark as current working directory
  currentFolderPath.value = node.path

  if (node.expanded) {
    node.expanded = false
    return
  }

  // Expand: lazy-load children
  if (node.children.length === 0) {
    node.loading = true
    try {
      const children = await props.loadDirectory(node.path)
      node.children = entriesToTreeNodes(children)
    } catch {
      // ignore
    } finally {
      node.loading = false
    }
  }

  node.expanded = true
}

// ── File selection ────────────────────────────────────────

function selectFileNode(node: TreeNode) {
  if (node.type === "file" && node.file) {
    emit("select-file", node.file)
  }
}

function isIndexFile(file: KnowledgeFile): boolean {
  return file.name === "index.md"
}

// ── New file modal ────────────────────────────────────────

const showNewFile = ref(false)
const newFileName = ref("")
const newFileNameInput = ref<HTMLInputElement | null>(null)

function openNewFile() {
  newFileName.value = ""
  showNewFile.value = true
  setTimeout(() => newFileNameInput.value?.focus(), 50)
}

function confirmNewFile() {
  const name = newFileName.value.trim()
  if (!name) return
  const filename = name.endsWith(".md") ? name : `${name}.md`
  emit("new-file", `${currentFolderPath.value}/${filename}`)
  showNewFile.value = false
  newFileName.value = ""
}

function closeNewFile() {
  showNewFile.value = false
  newFileName.value = ""
}

// ── New folder modal ──────────────────────────────────────

const showNewFolder = ref(false)
const newFolderName = ref("")
const newFolderNameInput = ref<HTMLInputElement | null>(null)

function openNewFolder() {
  newFolderName.value = ""
  showNewFolder.value = true
  setTimeout(() => newFolderNameInput.value?.focus(), 50)
}

function confirmNewFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  emit("new-folder", `${currentFolderPath.value}/${name}`)
  showNewFolder.value = false
  newFolderName.value = ""
}

function closeNewFolder() {
  showNewFolder.value = false
  newFolderName.value = ""
}
</script>

<template>
  <div class="kb-files-panel">
    <div class="panel-header">
      <span>{{ t("knowledgepage.all-files") }}</span>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading" class="file-list">
      <div v-for="i in 6" :key="i" class="skeleton-row" />
    </div>

    <!-- Tree view -->
    <div v-else-if="flatTree.length > 0" class="file-list">
      <div
        v-for="entry in flatTree"
        :key="entry.node.path"
        class="file-item"
        :class="{
          active:
            entry.node.type === 'file' &&
            entry.node.file &&
            activeFile?.path === entry.node.file.path,
          'is-folder': entry.node.type === 'folder',
        }"
        :style="{ paddingLeft: entry.depth * 16 + 8 + 'px' }"
        @click="
          entry.node.type === 'folder'
            ? toggleFolder(entry.node)
            : selectFileNode(entry.node)
        "
      >
        <!-- Chevron -->
        <span v-if="entry.node.type === 'folder'" class="folder-chevron" :class="{ expanded: entry.node.expanded }">
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <span v-else class="folder-chevron spacer" />

        <!-- Folder icon -->
        <svg
          v-if="entry.node.type === 'folder'"
          class="file-icon folder-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <!-- File icon -->
        <svg
          v-else
          class="file-icon"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>

        <span class="file-name">{{ entry.node.name }}</span>

        <!-- Loading spinner for folder -->
        <span v-if="entry.node.type === 'folder' && entry.node.loading" class="loading-spinner" />

        <!-- Index badge -->
        <span
          v-if="entry.node.type === 'file' && entry.node.file && isIndexFile(entry.node.file)"
          class="file-badge"
        >
          {{ t("knowledgepage.file-index-badge") }}
        </span>

        <!-- Delete button -->
        <button
          v-if="entry.node.type === 'file' && entry.node.file && !isIndexFile(entry.node.file)"
          class="file-delete"
          type="button"
          :title="t('knowledgepage.delete')"
          @click.stop="emit('delete-file', entry.node.file!)"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <svg
        viewBox="0 0 24 24"
        width="32"
        height="32"
        fill="none"
        stroke="#c0c0c0"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
      <span class="empty-text">{{ t("knowledgepage.empty-content") }}</span>
    </div>

    <!-- Action buttons -->
    <div class="action-btns">
      <button class="action-btn" type="button" @click="openNewFile">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {{ t("knowledgepage.new-file") }}
      </button>
      <button class="action-btn" type="button" @click="openNewFolder">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <line x1="9" y1="14" x2="15" y2="14" />
        </svg>
        {{ t("knowledgepage.new-folder") }}
      </button>
    </div>

    <!-- New file modal -->
    <div v-if="showNewFile" class="modal-overlay" @click.self="closeNewFile">
      <div class="modal-panel">
        <div class="modal-title">{{ t("knowledgepage.new-file") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("knowledgepage.file-name") }}</label>
            <input
              ref="newFileNameInput"
              v-model="newFileName"
              class="form-input"
              type="text"
              :placeholder="t('knowledgepage.new-file-placeholder')"
              @keyup.enter="confirmNewFile"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="closeNewFile">
            {{ t("knowledgepage.cancel-edit") }}
          </button>
          <button class="btn btn-confirm" type="button" :disabled="!newFileName.trim()" @click="confirmNewFile">
            {{ t("knowledgepage.create") }}
          </button>
        </div>
      </div>
    </div>

    <!-- New folder modal -->
    <div v-if="showNewFolder" class="modal-overlay" @click.self="closeNewFolder">
      <div class="modal-panel">
        <div class="modal-title">{{ t("knowledgepage.new-folder") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("knowledgepage.folder-name") }}</label>
            <input
              ref="newFolderNameInput"
              v-model="newFolderName"
              class="form-input"
              type="text"
              :placeholder="t('knowledgepage.folder-name-placeholder')"
              @keyup.enter="confirmNewFolder"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="closeNewFolder">
            {{ t("knowledgepage.cancel-edit") }}
          </button>
          <button class="btn btn-confirm" type="button" :disabled="!newFolderName.trim()" @click="confirmNewFolder">
            {{ t("knowledgepage.create") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kb-files-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 36px;
  font-size: 13px;
  font-weight: 600;
  color: #4a4a4a;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #1f1f1f;
  transition: background 0.1s;

  &:hover {
    background-color: #f5f5f5;
  }

  &.active {
    background-color: #f0f0f0;
    font-weight: 500;
  }

  &.is-folder {
    color: #4a4a4a;
  }

  .folder-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: #9a9a9a;
    transition: transform 0.15s;

    &.expanded {
      transform: rotate(90deg);
    }

    &.spacer {
      visibility: hidden;
    }
  }

  .file-icon {
    flex-shrink: 0;
    color: #9a9a9a;
  }

  .folder-icon {
    color: #6b8cff;
  }

  .file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-badge {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    color: #2563eb;
    background-color: color-mix(in srgb, #2563eb 8%, transparent);
    border: 1px solid color-mix(in srgb, #2563eb 15%, transparent);
  }

  .loading-spinner {
    width: 12px;
    height: 12px;
    border: 1.5px solid #e5e5e5;
    border-top-color: #9a9a9a;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  .file-delete {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    border: none;
    background: transparent;
    color: #9a9a9a;
    border-radius: 4px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s, color 0.15s, background 0.15s;

    &:hover {
      color: #e74c3c;
      background-color: #fef2f2;
    }
  }

  &:hover .file-delete {
    opacity: 1;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.skeleton-row {
  height: 28px;
  margin: 4px 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .empty-text {
    font-size: 13px;
    color: #c0c0c0;
  }
}

.action-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px dashed #d0d0d0;
  border-radius: 6px;
  background: transparent;
  color: #6b6b6b;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background-color: #fafafa;
  }
}

// Modal
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-panel {
  width: 380px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  padding: 20px 24px 0;
}

.modal-body {
  padding: 20px 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: #4a4a4a;
}

.form-input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
}

.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &.btn-cancel {
    border: 1px solid #e5e5e5;
    background: #ffffff;
    color: #4a4a4a;
    &:hover { background-color: #f5f5f5; }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;
    &:hover { opacity: 0.85; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
</style>
