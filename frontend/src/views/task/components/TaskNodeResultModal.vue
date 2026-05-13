<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useAuiStore } from "@/stores/aui";
import { useAuiPluginStore } from "@/stores/auiPlugin";
import type { TaskNodeResult } from "@/stores/task";
import type { AuiInstance } from "@/types/aui";
import { AUI_REF_PREFIX } from "@/stores/workflow";
import AuiRenderer from "@/components/aui/AuiRenderer.vue";

const { t } = useI18n();
const auiStore = useAuiStore();
const pluginStore = useAuiPluginStore();

const props = defineProps<{
  nodeResult: TaskNodeResult;
  nodeName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void
}>();

const viewMode = ref<"rendered" | "json">("rendered");
const isPluginLoading = ref(false);
const pluginLoadError = ref<string | null>(null);

// Reconstruct a virtual AuiInstance for the renderer
const virtualAui = computed<AuiInstance | null>(() => {
  const ref = props.nodeResult.auiId;
  if (!ref) return null;

  // Built-in renderer
  if (ref.startsWith(AUI_REF_PREFIX.BUILTIN)) {
    const type = ref.slice(AUI_REF_PREFIX.BUILTIN.length);
    return {
      id: "",
      name: type,
      description: "",
      rendererType: type,
      fields: [],
      jsonSchema: {},
      sampleData: props.nodeResult.auiData,
      aiPrompt: "",
      createdAt: "",
      updatedAt: "",
    };
  }

  // Custom AUI instance
  if (ref.startsWith(AUI_REF_PREFIX.INSTANCE)) {
    const id = ref.slice(AUI_REF_PREFIX.INSTANCE.length);
    const aui = auiStore.auiList.find((a) => a.id === id);
    if (!aui) return null;
    return {
      ...aui,
      sampleData: props.nodeResult.auiData ?? aui.sampleData,
    };
  }

  // Plugin
  if (ref.startsWith(AUI_REF_PREFIX.PLUGIN)) {
    const id = ref.slice(AUI_REF_PREFIX.PLUGIN.length);
    const plugin = pluginStore.installedPlugins.find((p) => p.id === id);
    if (!plugin) return null;
    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      rendererType: plugin.id,
      fields: [],
      jsonSchema: plugin.dataSchema,
      sampleData: props.nodeResult.auiData ?? plugin.sampleData,
      aiPrompt: "",
      createdAt: "",
      updatedAt: "",
    };
  }

  return null;
});

const isPlugin = computed(() =>
  props.nodeResult.auiId?.startsWith(AUI_REF_PREFIX.PLUGIN) ?? false,
);

const duration = computed(() => {
  if (props.nodeResult.durationMs !== undefined && props.nodeResult.durationMs >= 0) {
    const ms = props.nodeResult.durationMs;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
  return null;
});

const jsonPreview = computed(() =>
  JSON.stringify(props.nodeResult.auiData, null, 2),
);

const hasRenderedView = computed(() => !!virtualAui.value);
const hasDataView = computed(() => !!props.nodeResult.auiData);

onMounted(async () => {
  // Pre-inject plugin assets if this is a plugin renderer
  if (isPlugin.value && props.nodeResult.auiId) {
    const pluginId = props.nodeResult.auiId.slice(AUI_REF_PREFIX.PLUGIN.length);
    isPluginLoading.value = true;
    pluginLoadError.value = null;
    try {
      await pluginStore.injectPlugin(pluginId);
      // Wait for custom element registration
      const tag = `aui-${pluginId}`;
      await waitForCustomElement(tag);
    } catch (err: any) {
      pluginLoadError.value = err?.message || "Failed to load plugin";
    } finally {
      isPluginLoading.value = false;
    }
  }
});

async function waitForCustomElement(tag: string, timeoutMs = 5000): Promise<void> {
  if (customElements.get(tag)) return;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
    if (customElements.get(tag)) return;
  }
  // If still not registered, don't block — the renderer will handle fallback
}

onBeforeUnmount(() => {
  if (isPlugin.value && props.nodeResult.auiId) {
    const id = props.nodeResult.auiId.slice(AUI_REF_PREFIX.PLUGIN.length);
    pluginStore.ejectPlugin(id);
  }
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-panel result-modal">
      <div class="modal-header">
        <div class="modal-title-row">
          <svg
            class="modal-node-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span class="modal-node-name">{{ nodeName }}</span>
          <span
            class="node-status-badge"
            :class="'status-' + nodeResult.status"
          >
            {{ nodeResult.status }}
          </span>
        </div>
        <div class="modal-header-meta">
          <span v-if="duration" class="meta-duration">{{ duration }}</span>
          <span v-if="nodeResult.auiId" class="meta-renderer">
            {{ isPlugin ? 'plugin' : 'builtin' }}:{{ nodeResult.auiId.split(':')[1] }}
          </span>
        </div>
        <div class="modal-actions">
          <button
            :class="['view-toggle-btn', { active: viewMode === 'rendered' }]"
            :disabled="!hasRenderedView"
            @click="viewMode = 'rendered'"
          >
            {{ t("taskboard.view-rendered") }}
          </button>
          <button
            :class="['view-toggle-btn', { active: viewMode === 'json' }]"
            :disabled="!hasDataView"
            @click="viewMode = 'json'"
          >
            JSON
          </button>
          <button class="close-btn" @click="emit('close')">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-body">
        <!-- Plugin loading -->
        <div v-if="isPluginLoading" class="loading-state">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
          <span>Loading renderer...</span>
        </div>

        <!-- Plugin load error -->
        <div v-else-if="pluginLoadError && viewMode === 'rendered'" class="error-state">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <span>{{ pluginLoadError }}</span>
          <button class="fallback-json-btn" @click="viewMode = 'json'">
            {{ t("taskboard.view-json") }}
          </button>
        </div>

        <!-- Rendered view -->
        <div v-else-if="viewMode === 'rendered' && virtualAui" class="render-area">
          <AuiRenderer :aui="virtualAui" :data="nodeResult.auiData" />
        </div>

        <!-- JSON view -->
        <div v-else-if="viewMode === 'json' && nodeResult.auiData" class="json-area">
          <pre class="json-block">{{ jsonPreview }}</pre>
        </div>

        <!-- No data -->
        <div v-else class="no-data">
          <svg
            viewBox="0 0 24 24"
            width="32"
            height="32"
            fill="none"
            stroke="#d0d0d0"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span>{{ t("taskboard.result-empty") }}</span>
          <button
            v-if="hasDataView && viewMode === 'rendered'"
            class="fallback-json-btn"
            @click="viewMode = 'json'"
          >
            {{ t("taskboard.view-json") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.result-modal {
  width: 720px;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.modal-node-icon {
  color: #9a9a9a;
  flex-shrink: 0;
}

.modal-node-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-status-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
  text-transform: uppercase;
  flex-shrink: 0;

  &.status-completed {
    background-color: #e6f7ed;
    color: #27ae60;
  }
  &.status-running {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
  &.status-failed {
    background-color: #fde8e8;
    color: #e74c3c;
  }
  &.status-pending {
    background-color: #f5f5f5;
    color: #9a9a9a;
  }
}

.modal-header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #9a9a9a;

  .meta-duration {
    font-family: "JetBrainsMono", monospace;
  }

  .meta-renderer {
    background: #f5f5f5;
    padding: 1px 6px;
    border-radius: 3px;
  }
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.view-toggle-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  font-size: 11px;
  font-family: "JetBrainsMono", sans-serif;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #1f1f1f;
    color: #1f1f1f;
  }

  &.active {
    background-color: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9a9a9a;
  cursor: pointer;
  margin-left: 4px;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.render-area {
  width: 100%;
  height: 100%;
  min-height: 300px;
}

.json-area {
  padding: 16px;
  background-color: #fafafa;
  min-height: 300px;
}

.json-block {
  font-size: 12px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.6;
}

.loading-state,
.error-state,
.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 12px;
  color: #9a9a9a;
  font-size: 13px;
}

.error-state {
  color: #e74c3c;
}

.fallback-json-btn {
  padding: 4px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #fff;
  font-size: 11px;
  color: #6b6b6b;
  cursor: pointer;
  margin-top: 4px;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
  }
}

.spinner {
  animation: spin 2s linear infinite;
  transform-origin: center;
  color: #9a9a9a;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
