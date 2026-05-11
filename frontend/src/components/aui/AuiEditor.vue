<script setup lang="ts">
import { ref, computed } from "vue"
import { useAuiStore } from "@/stores/aui"
import { useAuiPluginStore } from "@/stores/auiPlugin"
import { BUILTIN_RENDERER_OPTIONS } from "@/types/aui"
import type { AuiFieldType } from "@/types/aui"

const store = useAuiStore()
const pluginStore = useAuiPluginStore()

const rendererOptions = computed(() => {
  const builtIn = BUILTIN_RENDERER_OPTIONS
  const plugins = pluginStore.installedPlugins.map(p => ({
    value: p.id,
    label: p.name,
    labelEn: p.name,
  }))
  return [...builtIn, ...plugins]
})

const aui = computed(() => store.selectedAui)

// ── Tabs ──────────────────────────────────────────────────
const activeTab = ref<"fields" | "schema" | "ai">("fields")

// ── Field type options ─────────────────────────────────────
const fieldTypeOptions: { value: AuiFieldType; label: string }[] = [
  { value: "text", label: "文本" },
  { value: "longtext", label: "长文本" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔" },
  { value: "link", label: "链接" },
  { value: "date", label: "日期" },
  { value: "tag", label: "标签" },
  { value: "image", label: "图片" },
]

// ── Field editor ───────────────────────────────────────────
function onAddField() {
  if (!aui.value) return
  store.addField(aui.value.id)
}

function onRemoveField(fieldId: string) {
  if (!aui.value) return
  store.removeField(aui.value.id, fieldId)
}

function onUpdateField(fieldId: string, key: string, value: any) {
  if (!aui.value) return
  store.updateField(aui.value.id, fieldId, { [key]: value })
}

// ── Renderer type change ──────────────────────────────────
function onRendererTypeChange(e: Event) {
  if (!aui.value) return
  const val = (e.target as HTMLSelectElement).value as AuiFieldType
  store.updateAui(aui.value.id, { rendererType: val as any })
}

// ── Basic info ────────────────────────────────────────────
function onNameChange(e: Event) {
  if (!aui.value) return
  store.updateAui(aui.value.id, { name: (e.target as HTMLInputElement).value })
}

function onDescChange(e: Event) {
  if (!aui.value) return
  store.updateAui(aui.value.id, { description: (e.target as HTMLTextAreaElement).value })
}

// ── Sample data editor ───────────────────────────────────
const sampleDataStr = computed(() => {
  if (!aui.value) return ""
  try {
    return JSON.stringify(aui.value.sampleData, null, 2)
  } catch {
    return ""
  }
})

const sampleDataError = ref(false)

function onSampleDataInput(e: Event) {
  if (!aui.value) return
  const val = (e.target as HTMLTextAreaElement).value
  try {
    const parsed = JSON.parse(val)
    store.updateAui(aui.value.id, { sampleData: parsed })
    sampleDataError.value = false
  } catch {
    sampleDataError.value = true
  }
}

// ── JSON Schema view ─────────────────────────────────────
const jsonSchemaStr = computed(() => {
  if (!aui.value) return ""
  try {
    return JSON.stringify(aui.value.jsonSchema, null, 2)
  } catch {
    return ""
  }
})

// ── AI chat ──────────────────────────────────────────────
const aiChatInput = ref("")
const aiChatMessages = ref<{ role: "user" | "ai"; content: string }[]>([])
const aiChatLoading = ref(false)

function onAiChatSend() {
  if (!aiChatInput.value.trim()) return
  aiChatMessages.value.push({ role: "user", content: aiChatInput.value })
  const prompt = aiChatInput.value
  aiChatInput.value = ""
  aiChatLoading.value = true

  // TODO: 接入真实 AI 后端
  setTimeout(() => {
    aiChatMessages.value.push({
      role: "ai",
      content: `已收到您的需求：「${prompt}」。AI 生成功能将在接入大模型后端后支持，届时将自动根据描述生成字段定义和示例数据。`,
    })
    aiChatLoading.value = false
  }, 800)
}

// ── Save ──────────────────────────────────────────────────
const isSaving = ref(false)

async function onSave() {
  if (!aui.value) return
  isSaving.value = true
  try {
    await store.save(aui.value.id)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="aui-editor" v-if="aui">
    <!-- Basic info -->
    <div class="editor-section">
      <label class="form-label">名称</label>
      <input
        class="form-input"
        :value="aui.name"
        placeholder="输入 AUI 名称"
        @input="onNameChange"
      />
    </div>

    <div class="editor-section">
      <label class="form-label">描述</label>
      <textarea
        class="form-input form-textarea"
        :value="aui.description"
        placeholder="描述此 AUI 的用途"
        rows="2"
        @input="onDescChange"
      />
    </div>

    <div class="editor-section">
      <label class="form-label">渲染器</label>
      <select class="form-input form-select" :value="aui.rendererType" @change="onRendererTypeChange">
        <option v-for="opt in rendererOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </div>

    <!-- Tabs -->
    <div class="editor-tabs">
      <button
        v-for="tab in [
          { key: 'fields' as const, label: '字段定义' },
          { key: 'schema' as const, label: 'JSON Schema' },
          { key: 'ai' as const, label: 'AI 生成' },
        ]"
        :key="tab.key"
        :class="['editor-tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Fields -->
    <div v-show="activeTab === 'fields'" class="editor-tab-content">
      <div class="fields-header">
        <span class="fields-count">{{ aui.fields.length }} 个字段</span>
        <button class="add-field-btn" @click="onAddField">+ 添加字段</button>
      </div>

      <div v-if="aui.fields.length === 0" class="fields-empty">
        点击「添加字段」定义数据结构
      </div>

      <div v-for="field in aui.fields" :key="field.id" class="field-row">
        <input
          class="form-input field-key"
          :value="field.key"
          placeholder="字段标识"
          @input="onUpdateField(field.id, 'key', ($event.target as HTMLInputElement).value)"
        />
        <input
          class="form-input field-title"
          :value="field.title"
          placeholder="显示标题"
          @input="onUpdateField(field.id, 'title', ($event.target as HTMLInputElement).value)"
        />
        <select
          class="form-input form-select field-type"
          :value="field.type"
          @change="onUpdateField(field.id, 'type', ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="opt in fieldTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <label class="field-required" title="必填">
          <input
            type="checkbox"
            :checked="field.required"
            @change="onUpdateField(field.id, 'required', ($event.target as HTMLInputElement).checked)"
          />
          <span>必填</span>
        </label>
        <button class="field-remove-btn" @click="onRemoveField(field.id)" title="删除">✕</button>
      </div>

      <!-- Sample data editor -->
      <div class="sample-data-section">
        <div class="sample-data-header">
          <span class="form-label">示例数据</span>
          <span v-if="sampleDataError" class="sample-data-error">JSON 格式错误</span>
        </div>
        <textarea
          class="form-input sample-data-textarea"
          :value="sampleDataStr"
          :class="{ 'has-error': sampleDataError }"
          @input="onSampleDataInput"
          spellcheck="false"
        />
      </div>
    </div>

    <!-- Tab: JSON Schema -->
    <div v-show="activeTab === 'schema'" class="editor-tab-content">
      <div class="schema-hint">由字段定义自动生成</div>
      <pre class="json-schema-view">{{ jsonSchemaStr }}</pre>
    </div>

    <!-- Tab: AI Chat -->
    <div v-show="activeTab === 'ai'" class="editor-tab-content ai-chat-content">
      <div class="ai-chat-messages">
        <div v-if="aiChatMessages.length === 0" class="ai-chat-empty">
          <p>描述你需要的 UI 数据结构，AI 将自动生成字段定义</p>
          <p class="ai-chat-hint">例如：「我需要一个展示用户列表的表格，包含姓名、邮箱、角色」</p>
        </div>
        <div
          v-for="(msg, idx) in aiChatMessages"
          :key="idx"
          :class="['ai-chat-msg', `ai-chat-msg-${msg.role}`]"
        >
          <div class="ai-chat-msg-role">{{ msg.role === 'user' ? '你' : 'AI' }}</div>
          <div class="ai-chat-msg-text">{{ msg.content }}</div>
        </div>
      </div>
      <div class="ai-chat-input-bar">
        <input
          class="form-input ai-chat-input"
          v-model="aiChatInput"
          placeholder="描述你需要的数据结构..."
          @keydown.enter="onAiChatSend"
        />
        <button class="btn-send" @click="onAiChatSend" :disabled="aiChatLoading">
          {{ aiChatLoading ? '...' : '发送' }}
        </button>
      </div>
    </div>

    <!-- Save button -->
    <div class="editor-actions">
      <button class="btn-save" @click="onSave" :disabled="isSaving">
        {{ isSaving ? '保存中...' : '保存' }}
      </button>
    </div>
  </div>

  <!-- No AUI selected -->
  <div v-else class="aui-editor-empty">
    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
    <p>选择或创建一个 AUI 实例</p>
  </div>
</template>

<style lang="scss" scoped>
.aui-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px;
  gap: 14px;
}

.aui-editor-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;
}

.editor-section {
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
  background-color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  transition: border-color 0.15s ease;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
}

.form-textarea {
  height: auto;
  min-height: 56px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.5;
}

.form-select {
  appearance: auto;
}

// ── Tabs ────────────────────────────────────────────────
.editor-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e5e5;
  margin-top: 4px;
}

.editor-tab {
  padding: 6px 14px;
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

.editor-tab-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-top: 12px;
}

// ── Fields ──────────────────────────────────────────────
.fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.fields-count {
  font-size: 12px;
  color: #9a9a9a;
}

.add-field-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }
}

.fields-empty {
  text-align: center;
  padding: 24px;
  color: #9ca3af;
  font-size: 13px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.field-key { width: 90px; }
.field-title { flex: 1; min-width: 60px; }
.field-type { width: 80px; }

.field-required {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  white-space: nowrap;

  input { margin: 0; }
}

.field-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9a9a9a;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #fef2f2; color: #ef4444; }
}

// ── Sample data ─────────────────────────────────────────
.sample-data-section {
  margin-top: 14px;
  border-top: 1px solid #e5e5e5;
  padding-top: 14px;
}

.sample-data-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.sample-data-error {
  font-size: 12px;
  color: #ef4444;
}

.sample-data-textarea {
  font-family: "JetBrainsMono", "Menlo", monospace;
  font-size: 12px;
  min-height: 120px;
  resize: vertical;
  line-height: 1.5;
  height: auto;
  padding: 8px 10px;

  &.has-error { border-color: #ef4444; }
}

// ── JSON Schema ─────────────────────────────────────────
.schema-hint {
  font-size: 12px;
  color: #9a9a9a;
  margin-bottom: 8px;
}

.json-schema-view {
  background: #f9fafb;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  padding: 12px;
  font-family: "JetBrainsMono", "Menlo", monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  color: #374151;
  margin: 0;
}

// ── AI Chat ─────────────────────────────────────────────
.ai-chat-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 120px;
}

.ai-chat-empty {
  text-align: center;
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 13px;

  p { margin: 4px 0; }
}

.ai-chat-hint {
  font-size: 12px;
  color: #d1d5db;
}

.ai-chat-msg {
  margin-bottom: 10px;
  max-width: 90%;
}

.ai-chat-msg-user {
  margin-left: auto;

  .ai-chat-msg-role { color: #1f1f1f; }
  .ai-chat-msg-text { background: #f0f0f0; }
}

.ai-chat-msg-ai {
  .ai-chat-msg-role { color: #10b981; }
  .ai-chat-msg-text { background: #f0fdf4; }
}

.ai-chat-msg-role {
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 2px;
}

.ai-chat-msg-text {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #1f1f1f;
}

.ai-chat-input-bar {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #e5e5e5;
}

.ai-chat-input {
  flex: 1;
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

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// ── Save ───────────────────────────────────────────────
.editor-actions {
  padding-top: 14px;
  border-top: 1px solid #e5e5e5;
}

.btn-save {
  width: 100%;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
</style>