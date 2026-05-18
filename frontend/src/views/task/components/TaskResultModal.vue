<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-panel">
      <div class="modal-header">
        <div class="modal-title-row">
          <h3 class="modal-title">{{ task.name }}</h3>
          <span
            class="status-badge"
            :style="{ backgroundColor: statusColors[task.status], color: '#ffffff' }"
          >
            {{ t(statusLabels[task.status]) }}
          </span>
          <span v-if="task.source" class="source-tag" :class="'source-' + task.source">
            {{ task.source === 'ai' ? t('taskboard.ai-generated') : t('taskboard.user-created') }}
          </span>
        </div>
        <button class="modal-close-btn" @click="emit('close')" :title="t('taskboard.close')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="modal-body">
        <!-- 执行过程 -->
        <div v-show="activeTab === 'process'" class="tab-content">
          <div v-if="task.executionLog" class="log-content">{{ task.executionLog }}</div>
          <div v-else class="empty-content">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>{{ t("taskboard.no-process") }}</span>
          </div>
        </div>

        <!-- 执行结果 -->
        <div v-show="activeTab === 'result'" class="tab-content">
          <div v-if="task.result" class="log-content">{{ task.result }}</div>
          <div v-else class="empty-content">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{{ t("taskboard.result-empty") }}</span>
          </div>
        </div>

        <!-- 协同过程 -->
        <div v-show="activeTab === 'collaboration'" class="tab-content">
          <div v-if="hasChildren" class="collab-list">
            <div class="collab-parent">
              <span class="collab-label">{{ t("taskboard.subtask-progress") }}</span>
              <span class="collab-count">{{ children.length }}</span>
            </div>
            <div v-for="child in children" :key="child.id" class="collab-item">
              <span class="collab-dot" :style="{ backgroundColor: statusColors[child.status] }"></span>
              <span class="collab-name">{{ child.name }}</span>
              <span v-if="child.source" class="collab-source" :class="'source-' + child.source">
                {{ child.source === 'ai' ? 'AI' : '手动' }}
              </span>
              <span class="collab-status" :style="{ color: statusColors[child.status] }">
                {{ t(statusLabels[child.status]) }}
              </span>
            </div>
          </div>
          <div v-else class="empty-content">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{{ t("taskboard.no-collaboration") }}</span>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-close" @click="emit('close')">{{ t("taskboard.close") }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Task } from "@/stores/task";
import { useTaskStore } from "@/stores/task";

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { t } = useI18n();
const taskStore = useTaskStore();

const activeTab = ref<"process" | "result" | "collaboration">("process");

const statusLabels: Record<string, string> = {
  pending: "taskboard.status-pending",
  running: "taskboard.status-running",
  completed: "taskboard.status-completed",
  failed: "taskboard.status-failed",
};

const statusColors: Record<string, string> = {
  pending: "#9a9a9a",
  running: "#1f1f1f",
  completed: "#27ae60",
  failed: "#e74c3c",
};

const children = computed(() => {
  if (!props.task.parentId && props.task.id) {
    return taskStore.childrenOf(props.task.id);
  }
  return [];
});

const hasChildren = computed(() => children.value.length > 0);

type TabKey = "process" | "result" | "collaboration";

const tabs = computed<{ key: TabKey; label: string }[]>(() => {
  const list: { key: TabKey; label: string }[] = [
    { key: "process", label: t("taskboard.execution-process") },
    { key: "result", label: t("taskboard.execution-result") },
  ];
  if (hasChildren.value) {
    list.push({ key: "collaboration", label: t("taskboard.collaboration") });
  }
  return list;
});
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-panel {
  width: 600px;
  max-height: 75vh;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px 0;
  flex-shrink: 0;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.source-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  font-weight: 500;
  flex-shrink: 0;

  &.source-ai {
    color: #7c5ce7;
    background-color: #f3f0ff;
  }

  &.source-user {
    color: #6b6b6b;
    background-color: #f0f0f0;
  }
}

.modal-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9a9a9a;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

// ── Tabs ──
.tab-bar {
  display: flex;
  border-bottom: 1px solid #e5e5e5;
  padding: 0 20px;
  margin-top: 12px;
  flex-shrink: 0;
}

.tab-btn {
  position: relative;
  padding: 8px 14px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-family: inherit;
  color: #6b6b6b;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #1f1f1f;
  }

  &.active {
    color: #1f1f1f;
    font-weight: 600;

    &::after {
      content: "";
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background-color: #1f1f1f;
      border-radius: 1px 1px 0 0;
    }
  }
}

// ── Body ──
.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.tab-content {
  position: absolute;
  inset: 0;
  padding: 16px 20px;
  overflow-y: auto;
}

.log-content {
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  gap: 8px;
  font-size: 13px;
  color: #9a9a9a;
}

// ── Collaboration ──
.collab-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.collab-parent {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.collab-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.collab-count {
  font-size: 11px;
  color: #9a9a9a;
  background-color: #f0f0f0;
  padding: 0 5px;
  border-radius: 8px;
}

.collab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background-color: #fafafa;
  border-radius: 6px;
}

.collab-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.collab-name {
  flex: 1;
  font-size: 13px;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collab-source {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;

  &.source-ai {
    color: #7c5ce7;
    background-color: #f3f0ff;
  }

  &.source-user {
    color: #6b6b6b;
    background-color: #f0f0f0;
  }
}

.collab-status {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 20px 16px;
  flex-shrink: 0;
}

.btn-close {
  padding: 7px 20px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  color: #1f1f1f;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f0f0f0;
  }
}
</style>
