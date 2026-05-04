<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useProjectStore } from "@/stores/project";
import { marked } from "marked";
import {
  EnsureKnowledgeDirs,
  ReadKnowledgeFile,
  WriteKnowledgeFile,
  ListKnowledgeFiles,
  DeleteKnowledgeFile,
} from "../../wailsjs/go/main/App";
import { main } from "../../wailsjs/go/models";

type FileInfo = main.FileInfo;

const { t } = useI18n();
const projectStore = useProjectStore();

// Tab definitions
const tabs = [
  { key: "project", labelKey: "knowledgepage.tab-project" },
  { key: "business", labelKey: "knowledgepage.tab-business" },
  { key: "workflow", labelKey: "knowledgepage.tab-workflow" },
  { key: "verifiable", labelKey: "knowledgepage.tab-verifiable" },
];

const activeTab = ref("project");
const loading = ref(false);
const editing = ref(false);
const editContent = ref("");
const fileContent = ref("");
const renderedHtml = ref("");
const files = ref<FileInfo[]>([]);
const filePanelOpen = ref(false);
const selectedFile = ref("index.md");
const showNewFileModal = ref(false);
const newFileName = ref("");

// Get the current project path
const projectPath = computed(() => projectStore.currentProject?.path || "");

// Get the relative path for the current tab's selected file
const currentRelativePath = computed(
  () => `${activeTab.value}/${selectedFile.value}`
);

// Load knowledge directory structure
async function initKnowledge() {
  if (!projectPath.value) return;
  loading.value = true;
  try {
    await EnsureKnowledgeDirs(projectPath.value);
    await loadFiles();
    await loadFileContent();
  } catch (err) {
    console.error("Failed to init knowledge dirs:", err);
  } finally {
    loading.value = false;
  }
}

// Load file list for current tab
async function loadFiles() {
  if (!projectPath.value) return;
  try {
    const result = await ListKnowledgeFiles(projectPath.value, activeTab.value);
    files.value = result || [];
  } catch (err) {
    console.error("Failed to list files:", err);
    files.value = [];
  }
}

// Load file content
async function loadFileContent() {
  if (!projectPath.value) return;
  editing.value = false;
  try {
    const content = await ReadKnowledgeFile(
      projectPath.value,
      currentRelativePath.value
    );
    fileContent.value = content;
    renderMarkdown(content);
  } catch (err) {
    console.error("Failed to read file:", err);
    fileContent.value = "";
    renderedHtml.value = "";
  }
}

// Render markdown to HTML
function renderMarkdown(content: string) {
  renderedHtml.value = marked(content) as string;
}

// Switch tab
async function switchTab(key: string) {
  activeTab.value = key;
  selectedFile.value = "index.md";
  await loadFiles();
  await loadFileContent();
}

// Select a file from the file panel
async function selectFile(file: FileInfo) {
  if (file.isDir) return;
  selectedFile.value = file.name;
  await loadFileContent();
}

// Start editing
function startEdit() {
  editContent.value = fileContent.value;
  editing.value = true;
}

// Cancel editing
function cancelEdit() {
  editing.value = false;
}

// Save content
async function saveContent() {
  if (!projectPath.value) return;
  try {
    await WriteKnowledgeFile(
      projectPath.value,
      currentRelativePath.value,
      editContent.value
    );
    fileContent.value = editContent.value;
    renderMarkdown(editContent.value);
    editing.value = false;
  } catch (err) {
    console.error("Failed to save file:", err);
  }
}

// Toggle file panel
function toggleFilePanel() {
  filePanelOpen.value = !filePanelOpen.value;
}

// Create new file
async function createNewFile() {
  if (!newFileName.value.trim()) return;
  const name = newFileName.value.trim().endsWith(".md")
    ? newFileName.value.trim()
    : `${newFileName.value.trim()}.md`;
  if (!projectPath.value) return;

  try {
    const relativePath = `${activeTab.value}/${name}`;
    await WriteKnowledgeFile(
      projectPath.value,
      relativePath,
      `# ${newFileName.value.trim()}\n\n`
    );
    showNewFileModal.value = false;
    newFileName.value = "";
    await loadFiles();
    selectedFile.value = name;
    await loadFileContent();
  } catch (err) {
    console.error("Failed to create file:", err);
  }
}

// Delete file
async function deleteFile(file: FileInfo) {
  if (!confirm(t("knowledgepage.delete-confirm"))) return;
  if (!projectPath.value) return;
  try {
    await DeleteKnowledgeFile(projectPath.value, file.path);
    if (selectedFile.value === file.name) {
      selectedFile.value = "index.md";
    }
    await loadFiles();
    await loadFileContent();
  } catch (err) {
    console.error("Failed to delete file:", err);
  }
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Watch for project changes
watch(
  () => projectStore.currentProjectId,
  () => {
    if (projectStore.currentProject) {
      initKnowledge();
    }
  }
);

onMounted(() => {
  if (projectStore.currentProject) {
    initKnowledge();
  }
});
</script>

<template>
  <div class="knowledge-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t("knowledgepage.title") }}</h1>
    </div>

    <div v-if="!projectStore.currentProject" class="no-project">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <div class="empty-title">{{ t("knowledgepage.no-project") }}</div>
    </div>

    <div v-else class="knowledge-content">
      <!-- Tabs -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ t(tab.labelKey) }}
        </button>

        <div class="tab-actions">
          <button class="action-btn" :title="t('knowledgepage.files')" @click="toggleFilePanel">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item active">{{ activeTab }}</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">{{ selectedFile }}</span>
      </div>

      <!-- Editor toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <span class="file-name-display">{{ selectedFile }}</span>
        </div>
        <div class="toolbar-right">
          <template v-if="editing">
            <button class="toolbar-btn" @click="cancelEdit">{{ t("knowledgepage.cancel-edit") }}</button>
            <button class="toolbar-btn primary" @click="saveContent">{{ t("knowledgepage.save") }}</button>
          </template>
          <template v-else>
            <button class="toolbar-btn" @click="startEdit">{{ t("knowledgepage.edit") }}</button>
          </template>
        </div>
      </div>

      <!-- Content area -->
      <div class="content-area" :class="{ 'panel-open': filePanelOpen }">
        <!-- Main content -->
        <div class="main-content">
          <div v-if="loading" class="loading-state">Loading...</div>
          <div v-else-if="editing" class="editor-wrapper">
            <textarea
              v-model="editContent"
              class="markdown-editor"
              spellcheck="false"
            ></textarea>
          </div>
          <div v-else class="preview-wrapper">
            <div v-if="renderedHtml" class="markdown-body" v-html="renderedHtml"></div>
            <div v-else class="empty-content">{{ t("knowledgepage.empty-content") }}</div>
          </div>
        </div>

        <!-- File panel -->
        <div v-if="filePanelOpen" class="file-panel">
          <div class="panel-header">
            <span class="panel-title">{{ t("knowledgepage.files") }}</span>
            <button class="panel-close-btn" @click="filePanelOpen = false">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <button class="new-file-btn" @click="showNewFileModal = true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t("knowledgepage.new-file") }}
          </button>
          <div class="file-list">
            <div
              v-for="file in files"
              :key="file.name"
              class="file-item"
              :class="{ active: selectedFile === file.name }"
            >
              <div class="file-item-main" @click="selectFile(file)">
                <svg v-if="file.isDir" viewBox="0 0 24 24" width="14" height="14" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span class="file-name">{{ file.name }}</span>
              </div>
              <button v-if="!file.isDir && file.name !== 'index.md'" class="file-delete-btn" @click.stop="deleteFile(file)" :title="t('knowledgepage.delete')">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <span class="file-size">{{ formatSize(file.size) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New file modal -->
    <div v-if="showNewFileModal" class="modal-overlay" @click.self="showNewFileModal = false">
      <div class="modal-panel">
        <div class="modal-title">{{ t("knowledgepage.new-file") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("knowledgepage.file-name") }}</label>
            <input
              v-model="newFileName"
              class="form-input"
              type="text"
              :placeholder="t('knowledgepage.new-file-placeholder')"
              @keyup.enter="createNewFile"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showNewFileModal = false">
            {{ t("knowledgepage.cancel-edit") }}
          </button>
          <button class="btn btn-confirm" type="button" @click="createNewFile">
            {{ t("knowledgepage.create") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.knowledge-page {
  .no-project {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 8px;

    .empty-title {
      font-size: 14px;
      font-weight: 600;
      color: #4a4a4a;
      margin-top: 12px;
    }
  }

  .knowledge-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 16px;
    flex-shrink: 0;

    .tab-btn {
      height: 32px;
      padding: 0 16px;
      border: none;
      background: transparent;
      font-size: 13px;
      font-family: "JetBrainsMono", sans-serif;
      color: #6b6b6b;
      cursor: pointer;
      border-radius: 6px 6px 0 0;
      position: relative;
      transition: all 0.15s ease;

      &:hover {
        color: #1f1f1f;
        background-color: #f5f5f5;
      }

      &.active {
        color: #1f1f1f;
        font-weight: 600;

        &::after {
          content: "";
          position: absolute;
          bottom: -1px;
          left: 8px;
          right: 8px;
          height: 2px;
          background-color: #1f1f1f;
          border-radius: 1px;
        }
      }
    }

    .tab-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: #6b6b6b;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: #ececec;
        color: #1f1f1f;
      }
    }
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #9a9a9a;
    margin-bottom: 12px;
    flex-shrink: 0;

    .breadcrumb-item {
      &.active {
        color: #4a4a4a;
        font-weight: 500;
      }
    }

    .breadcrumb-separator {
      color: #d0d0d0;
    }
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    padding: 0 8px;
    background-color: #fafafa;
    border: 1px solid #e5e5e5;
    border-radius: 6px 6px 0 0;
    flex-shrink: 0;

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .file-name-display {
        font-size: 12px;
        color: #6b6b6b;
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .toolbar-btn {
      height: 24px;
      padding: 0 10px;
      border: 1px solid #e5e5e5;
      background: #ffffff;
      font-size: 12px;
      font-family: "JetBrainsMono", sans-serif;
      color: #4a4a4a;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: #f5f5f5;
      }

      &.primary {
        background-color: #1f1f1f;
        color: #ffffff;
        border-color: #1f1f1f;

        &:hover {
          opacity: 0.85;
        }
      }
    }
  }

  .content-area {
    display: flex;
    flex: 1;
    min-height: 0;
    border: 1px solid #e5e5e5;
    border-top: none;
    border-radius: 0 0 6px 6px;
    overflow: hidden;

    .main-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    &.panel-open .main-content {
      // When panel is open, main content still takes remaining space
    }

    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: #9a9a9a;
      font-size: 13px;
    }

    .editor-wrapper {
      flex: 1;
      display: flex;
      min-height: 0;

      .markdown-editor {
        flex: 1;
        width: 100%;
        height: 100%;
        padding: 16px;
        border: none;
        outline: none;
        resize: none;
        font-family: "JetBrainsMono", monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #1f1f1f;
        background-color: #ffffff;
        box-sizing: border-box;
      }
    }

    .preview-wrapper {
      flex: 1;
      overflow-y: auto;
      padding: 16px;

      .empty-content {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: #9a9a9a;
        font-size: 13px;
        height: 200px;
      }
    }

    .file-panel {
      width: 220px;
      flex-shrink: 0;
      border-left: 1px solid #e5e5e5;
      background-color: #fafafa;
      display: flex;
      flex-direction: column;

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-bottom: 1px solid #e5e5e5;

        .panel-title {
          font-size: 12px;
          font-weight: 600;
          color: #1f1f1f;
        }

        .panel-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #9a9a9a;
          border-radius: 4px;
          cursor: pointer;

          &:hover {
            background-color: #ececec;
            color: #1f1f1f;
          }
        }
      }

      .new-file-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        width: calc(100% - 16px);
        height: 28px;
        margin: 8px 8px 4px;
        padding: 0 8px;
        border: 1px dashed #d0d0d0;
        background: transparent;
        font-size: 12px;
        font-family: "JetBrainsMono", sans-serif;
        color: #6b6b6b;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: #9a9a9a;
          color: #1f1f1f;
          background-color: #f0f0f0;
        }
      }

      .file-list {
        flex: 1;
        overflow-y: auto;
        padding: 4px 8px 8px;

        .file-item {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 30px;
          padding: 0 6px 0 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #4a4a4a;
          transition: all 0.1s ease;

          .file-item-main {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-width: 0;
            cursor: pointer;
          }

          svg {
            flex-shrink: 0;
            color: #9a9a9a;
          }

          .file-name {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .file-delete-btn {
            display: none;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border: none;
            background: transparent;
            color: #c0c0c0;
            border-radius: 3px;
            cursor: pointer;
            flex-shrink: 0;

            &:hover {
              background-color: #fce4e4;
              color: #e74c3c;
            }
          }

          .file-size {
            flex-shrink: 0;
            font-size: 11px;
            color: #c0c0c0;
          }

          &:hover {
            background-color: #f0f0f0;

            .file-delete-btn {
              display: flex;
            }

            .file-size {
              display: none;
            }
          }

          &.active {
            background-color: #ececec;
            color: #1f1f1f;
            font-weight: 500;
          }
        }
      }
    }
  }

  // Markdown body styles
  .markdown-body {
    font-size: 14px;
    line-height: 1.7;
    color: #1f1f1f;

    :deep(h1) {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e5;
    }

    :deep(h2) {
      font-size: 20px;
      font-weight: 600;
      margin: 24px 0 12px;
    }

    :deep(h3) {
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0 8px;
    }

    :deep(p) {
      margin: 0 0 12px;
    }

    :deep(ul),
    :deep(ol) {
      margin: 0 0 12px;
      padding-left: 24px;
    }

    :deep(code) {
      font-family: "JetBrainsMono", monospace;
      font-size: 13px;
      background-color: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }

    :deep(pre) {
      background-color: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      padding: 12px 16px;
      overflow-x: auto;
      margin: 0 0 12px;

      code {
        background: none;
        padding: 0;
        font-size: 13px;
      }
    }

    :deep(blockquote) {
      border-left: 3px solid #d0d0d0;
      margin: 0 0 12px;
      padding: 4px 16px;
      color: #6b6b6b;
    }

    :deep(a) {
      color: #1f1f1f;
      text-decoration: underline;
    }

    :deep(table) {
      border-collapse: collapse;
      width: 100%;
      margin: 0 0 12px;

      th,
      td {
        border: 1px solid #e5e5e5;
        padding: 8px 12px;
        text-align: left;
      }

      th {
        background-color: #fafafa;
        font-weight: 600;
      }
    }

    :deep(hr) {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 16px 0;
    }
  }
}

// Modal styles (shared with other pages)
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

.modal-panel {
  width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    padding: 20px 24px 0;
    flex-shrink: 0;
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

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
    background-color: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    transition: border-color 0.15s ease;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }
}

.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;

  &.btn-cancel {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #4a4a4a;

    &:hover {
      background-color: #f5f5f5;
    }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>