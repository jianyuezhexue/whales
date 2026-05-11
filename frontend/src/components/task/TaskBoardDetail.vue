<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";
import TaskTerminal from "./TaskTerminal.vue";

const { t } = useI18n();
const taskStore = useTaskStore();

const viewMode = ref<"process" | "result">("process");
const terminalRef = ref<InstanceType<typeof TaskTerminal>>();

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

const selectedTask = computed(() => {
  if (!taskStore.selectedTaskId) return null;
  return taskStore.boardTasks.find(
    (t) => t.id === taskStore.selectedTaskId,
  ) ?? null;
});

// Subscribe to PTY output to capture execution log
watch(() => taskStore.selectedTaskId, (newId, oldId) => {
  // Unsubscribe from old task
  if (oldId) {
    taskStore.unsubscribeBoard(oldId);
  }

  viewMode.value = "process";

  // Subscribe to new task
  if (newId) {
    taskStore.subscribeBoard(newId, (data) => {
      const task = taskStore.boardTasks.find((t) => t.id === newId);
      if (task) {
        task.executionLog = (task.executionLog || "") + data;
      }
    }, () => {
      const task = taskStore.boardTasks.find((t) => t.id === newId);
      if (task && task.status === "running") {
        task.status = "completed";
      }
    });
  }
}, { immediate: true });

// Fit terminal when switching tasks or view modes
watch([() => taskStore.selectedTaskId, viewMode], () => {
  nextTick(() => {
    terminalRef.value?.fit();
  });
});

// Clean up subscription on unmount
onBeforeUnmount(() => {
  if (taskStore.selectedTaskId) {
    taskStore.unsubscribeBoard(taskStore.selectedTaskId);
  }
});

const switchToResult = () => {
  viewMode.value = "result";
};

const switchToProcess = () => {
  viewMode.value = "process";
  nextTick(() => terminalRef.value?.fit());
};
</script>

<template>
  <div class="board-detail">
    <template v-if="selectedTask">
      <!-- Detail header -->
      <div class="detail-header">
        <button v-if="viewMode === 'result'" class="back-btn" @click="switchToProcess" title="返回执行过程">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div class="detail-title-row">
          <h3 class="detail-name">{{ selectedTask.name }}</h3>
          <span
            class="status-badge"
            :style="{ backgroundColor: statusColors[selectedTask.status], color: '#ffffff' }"
          >
            {{ t(statusLabels[selectedTask.status]) }}
          </span>
          <span v-if="selectedTask.source" class="detail-source" :class="'source-' + selectedTask.source">
            {{ selectedTask.source === 'ai' ? t('taskboard.ai-generated') : t('taskboard.user-created') }}
          </span>
        </div>
        <div class="header-spacer"></div>
        <button
          v-if="viewMode === 'process'"
          class="result-toggle-btn"
          :title="t('taskboard.execution-result')"
          @click="switchToResult"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </button>
      </div>

      <!-- Content area -->
      <div class="detail-content">
        <!-- 执行过程: real terminal for running tasks, log for completed -->
        <div v-show="viewMode === 'process'" class="content-panel">
          <div v-if="selectedTask.status === 'running'" class="terminal-area">
            <TaskTerminal
              ref="terminalRef"
              :key="selectedTask.id"
              :task-id="selectedTask.id"
              :initial-output="selectedTask.executionLog || ''"
              @exited="() => {}"
            />
          </div>
          <div v-else-if="selectedTask.executionLog" class="log-block">
            {{ selectedTask.executionLog }}
          </div>
          <div v-else class="empty-block">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#d0d0d0"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>{{ t("taskboard.no-process") }}</span>
          </div>
        </div>

        <!-- 执行结果 -->
        <div v-show="viewMode === 'result'" class="content-panel">
          <div v-if="selectedTask.result" class="log-block">
            {{ selectedTask.result }}
          </div>
          <div v-else class="empty-block">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#d0d0d0"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>{{ t("taskboard.result-empty") }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 空态 -->
    <div v-else class="detail-empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d0d0c0"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
      <div class="empty-title">{{ t("taskboard.no-task-selected") }}</div>
      <div class="empty-desc">{{ t("taskboard.no-task-hint") }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.board-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background-color: #ffffff;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #6b6b6b;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.detail-name {
  margin: 0;
  font-size: 14px;
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

.detail-source {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 4px;
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

.header-spacer {
  flex: 1;
}

.result-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #e5e5e5;
  background: transparent;
  color: #6b6b6b;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
    border-color: #1f1f1f;
  }
}

.detail-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  position: relative;
}

.content-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.terminal-area {
  flex: 1;
  min-height: 0;
  background-color: #1e1e1e;
  border-radius: 0 0 0 0;
  overflow: hidden;
}

.log-block {
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background-color: #fafafa;
  padding: 16px;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  gap: 8px;
  font-size: 13px;
  color: #9a9a9a;
  padding: 40px 16px;
}

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;

  .empty-title {
    margin-top: 16px;
    font-size: 14px;
    color: #6b6b6b;
    font-weight: 500;
  }

  .empty-desc {
    margin-top: 6px;
    font-size: 12px;
    color: #9a9a9a;
  }
}
</style>