<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { marked } from "marked"
import type { KnowledgeFile } from "@/types/knowledge"

const { t } = useI18n()

const props = defineProps<{
  activeFile: KnowledgeFile | null
  fileContent: string
  editContent: string
  isEditing: boolean
  isSaving: boolean
  isLoading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (e: "toggle-mode"): void
  (e: "save"): void
  (e: "cancel-edit"): void
  (e: "update-edit-content", content: string): void
  (e: "navigate-link", filename: string): void
}>()

const renderedHtml = computed(() => {
  if (!props.fileContent) return ""
  try {
    return marked(props.fileContent, { breaks: true }) as string
  } catch {
    return "<p>渲染错误</p>"
  }
})

function onContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  const anchor = target.closest("a")
  if (!anchor) return
  const href = anchor.getAttribute("href") || ""
  // Only handle .md links
  if (href.endsWith(".md")) {
    event.preventDefault()
    // Strip leading ./ if present
    const filename = href.replace(/^\.\//, "")
    emit("navigate-link", filename)
  }
}
</script>

<template>
  <div class="kb-center-panel">
    <!-- Header -->
    <div class="panel-header">
      <span class="file-label">{{ activeFile?.name || "" }}</span>
      <div v-if="activeFile" class="mode-toggle">
        <button
          class="mode-btn"
          :class="{ active: !isEditing }"
          type="button"
          :disabled="!isEditing"
          @click="emit('toggle-mode')"
        >
          {{ t("knowledgepage.preview") }}
        </button>
        <button
          class="mode-btn"
          :class="{ active: isEditing }"
          type="button"
          :disabled="isEditing"
          @click="emit('toggle-mode')"
        >
          {{ t("knowledgepage.edit") }}
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="error-banner">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <!-- No file selected -->
    <div v-if="!activeFile && !isLoading" class="empty-state">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d0d0d0" stroke-width="1.2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <span class="empty-title">{{ t("knowledgepage.select-file") }}</span>
      <span class="empty-hint">{{ t("knowledgepage.select-file-hint") }}</span>
    </div>

    <!-- Loading -->
    <div v-if="isLoading && activeFile" class="loading-state">
      <div class="loading-spinner" />
      <span>{{ t("knowledgepage.loading") }}</span>
    </div>

    <!-- Content area -->
    <div
      v-if="activeFile && !isLoading"
      class="content-area"
      :class="{ editing: isEditing }"
    >
      <!-- Preview mode -->
      <div v-show="!isEditing" class="preview-area" @click="onContentClick">
        <div class="markdown-body" v-html="renderedHtml" />
      </div>

      <!-- Edit mode -->
      <textarea
        v-show="isEditing"
        class="editor-area"
        :value="editContent"
        @input="emit('update-edit-content', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <!-- Edit actions bar -->
    <div v-if="isEditing && activeFile" class="edit-actions">
      <button class="btn btn-cancel" type="button" @click="emit('cancel-edit')">
        {{ t("knowledgepage.cancel-edit") }}
      </button>
      <button class="btn btn-confirm" type="button" :disabled="isSaving" @click="emit('save')">
        {{ isSaving ? `${t("knowledgepage.save")}...` : t("knowledgepage.save") }}
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kb-center-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 36px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.file-label {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mode-toggle {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;

  .mode-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 26px;
    padding: 0;
    border: none;
    background: #ffffff;
    color: #6b6b6b;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    cursor: pointer;
    transition: all 0.15s;

    &:first-child {
      border-right: 1px solid #e5e5e5;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #ececec;
      color: #1f1f1f;
      font-weight: 500;
    }

    &:disabled {
      cursor: default;
    }
  }
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  font-size: 13px;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  flex-shrink: 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 8px;
  }

  .empty-hint {
    font-size: 13px;
    color: #9a9a9a;
  }
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #9a9a9a;
  font-size: 13px;

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e5e5e5;
    border-top-color: #1f1f1f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  &.editing {
    // Edit mode: textarea fills the space
  }
}

.preview-area {
  height: 100%;
  overflow-y: auto;
  padding: 4px 0;
}

.editor-area {
  width: 100%;
  height: 100%;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #ffffff;
  font-family: "JetBrainsMono", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #1f1f1f;
  outline: none;
  resize: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus {
    border-color: #1f1f1f;
  }
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 0 0;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
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

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

// Markdown body styles
.markdown-body {
  font-size: 14px;
  line-height: 1.7;
  color: #1f1f1f;

  h1 { font-size: 20px; font-weight: 700; margin: 16px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }
  h2 { font-size: 16px; font-weight: 700; margin: 14px 0 8px; }
  h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
  h4, h5, h6 { font-size: 13px; font-weight: 600; margin: 10px 0 4px; }

  p { margin: 8px 0; }

  a {
    color: #2563eb;
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      color: #1d4ed8;
    }
  }

  ul, ol {
    padding-left: 20px;
    margin: 8px 0;
  }

  li { margin: 4px 0; }

  code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: "JetBrainsMono", monospace;
  }

  pre {
    background: #f5f5f5;
    padding: 12px 16px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 12px 0;
    border: 1px solid #e5e5e5;

    code {
      background: transparent;
      padding: 0;
      border-radius: 0;
    }
  }

  blockquote {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 3px solid #e5e5e5;
    color: #6b6b6b;
    background: #fafafa;
    border-radius: 0 6px 6px 0;
  }

  hr {
    margin: 20px 0;
    border: none;
    border-top: 1px solid #e5e5e5;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13px;

    th, td {
      padding: 8px 12px;
      border: 1px solid #e5e5e5;
      text-align: left;
    }

    th {
      background: #fafafa;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: #fafafa;
    }
  }

  img {
    max-width: 100%;
    border-radius: 6px;
  }
}
</style>
