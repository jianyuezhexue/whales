<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";
import type { TaskNodeResult } from "@/stores/task";
import { EventsOn } from "../../../../wailsjs/runtime/runtime";
import TaskTerminal from "./TaskTerminal.vue";
import TaskNodeResultModal from "./TaskNodeResultModal.vue";

const { t } = useI18n();
const taskStore = useTaskStore();

const viewMode = ref<"process" | "result">("process");
const terminalRef = ref<InstanceType<typeof TaskTerminal>>();
const showNodeResultModal = ref(false);
const activeNodeResult = ref<TaskNodeResult | null>(null);
const activeNodeName = ref("");

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

const isWorkflowTask = computed(() =>
  selectedTask.value?.nodeResults && selectedTask.value.nodeResults.length > 0,
);

const hasNodeResults = computed(() => isWorkflowTask.value);

const nodeCounts = computed(() => {
  const results = selectedTask.value?.nodeResults;
  if (!results) return { total: 0, completed: 0, failed: 0, running: 0, pending: 0 };
  return {
    total: results.length,
    completed: results.filter((n) => n.status === "completed").length,
    failed: results.filter((n) => n.status === "failed").length,
    running: results.filter((n) => n.status === "running").length,
    pending: results.filter((n) => n.status === "pending").length,
  };
});

function computeDuration(nr: TaskNodeResult): string | null {
  if (nr.durationMs !== undefined && nr.durationMs >= 0) {
    const ms = nr.durationMs;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
  if (!nr.startedAt || !nr.completedAt) return null;
  try {
    const start = new Date(nr.startedAt).getTime();
    const end = new Date(nr.completedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  } catch {
    return null;
  }
}

function openNodeResult(nodeResult: TaskNodeResult) {
  activeNodeResult.value = nodeResult;
  activeNodeName.value = nodeResult.nodeName;
  showNodeResultModal.value = true;
}

function closeNodeResultModal() {
  showNodeResultModal.value = false;
  activeNodeResult.value = null;
}

// Track sub-node PTY subscriptions for cleanup
const nodePtyUnsubs = new Map<string, () => void>();

function subscribeNodePtyOutput(taskId: string, nodeId: string) {
  const ptyTaskId = `${taskId}-${nodeId}`;
  const unsubOutput = EventsOn("pty-output", (evtTaskId: string, data: string) => {
    if (evtTaskId !== ptyTaskId) return;
    const task = taskStore.boardTasks.find((t) => t.id === taskId);
    if (task) {
      task.executionLog = (task.executionLog || "") + data;
    }
  });
  nodePtyUnsubs.set(`${taskId}-${nodeId}-output`, unsubOutput);
}

function clearNodePtySubs() {
  for (const unsub of nodePtyUnsubs.values()) {
    unsub();
  }
  nodePtyUnsubs.clear();
}

// Subscribe to PTY output to capture execution log
watch(() => taskStore.selectedTaskId, (newId, oldId) => {
  if (oldId) {
    taskStore.unsubscribeBoard(oldId);
    clearNodePtySubs();
  }

  viewMode.value = "process";

  if (newId) {
    const task = taskStore.boardTasks.find((t) => t.id === newId);

    // For workflow tasks: subscribe to each node's PTY output
    if (task?.nodeResults && task.nodeResults.length > 0) {
      for (const nr of task.nodeResults) {
        subscribeNodePtyOutput(newId, nr.nodeId);
      }
    }

    // Also subscribe to parent task's PTY (for non-workflow tasks)
    taskStore.subscribeBoard(newId, (data) => {
      const t = taskStore.boardTasks.find((x) => x.id === newId);
      if (t) {
        t.executionLog = (t.executionLog || "") + data;
      }
    }, () => {
      const t = taskStore.boardTasks.find((x) => x.id === newId);
      if (t && t.status === "running") {
        t.status = "completed";
      }
    });
  }
}, { immediate: true });

// When nodeResults get initialized (workflow execution starts), subscribe to their PTY output
watch(() => selectedTask.value?.nodeResults, (results) => {
  const taskId = taskStore.selectedTaskId;
  if (!taskId || !results || results.length === 0) return;
  for (const nr of results) {
    const key = `${taskId}-${nr.nodeId}-output`;
    if (!nodePtyUnsubs.has(key)) {
      subscribeNodePtyOutput(taskId, nr.nodeId);
    }
  }
}, { deep: true });

// Auto-switch to result view when task completes or fails
watch(() => selectedTask.value?.status, (newStatus, oldStatus) => {
  if (
    (newStatus === "completed" || newStatus === "failed") &&
    oldStatus === "running"
  ) {
    viewMode.value = "result";
  }
});

// Fit terminal when switching tasks or view modes
watch([() => taskStore.selectedTaskId, viewMode], () => {
  nextTick(() => {
    terminalRef.value?.fit();
  });
});

onBeforeUnmount(() => {
  if (taskStore.selectedTaskId) {
    taskStore.unsubscribeBoard(taskStore.selectedTaskId);
  }
  clearNodePtySubs();
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
        <button v-if="viewMode === 'result'" class="back-btn" @click="switchToProcess" :title="t('taskboard.back-to-process')">
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

        <!-- Node progress indicator -->
        <div v-if="viewMode === 'result' && hasNodeResults" class="node-progress">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{{ nodeCounts.completed }}/{{ nodeCounts.total }}</span>
        </div>

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
          <span v-if="hasNodeResults && nodeCounts.completed > 0" class="result-badge">{{ nodeCounts.completed }}</span>
        </button>
      </div>

      <!-- Content area -->
      <div class="detail-content">
        <!-- 执行过程: workflow progress or terminal or log -->
        <div v-show="viewMode === 'process'" class="content-panel">
          <!-- Workflow task: show node execution progress -->
          <div v-if="isWorkflowTask && hasNodeResults" class="workflow-progress">
            <div class="wf-progress-header">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>{{ t("taskboard.workflow-progress") }}</span>
              <span class="wf-progress-count">{{ nodeCounts.completed }}/{{ nodeCounts.total }}</span>
            </div>
            <div class="wf-node-list">
              <div
                v-for="(nr, idx) in selectedTask!.nodeResults"
                :key="nr.nodeId"
                class="wf-node-row"
                :class="'wf-row-' + nr.status"
              >
                <span class="wf-node-index">{{ idx + 1 }}</span>
                <span class="wf-node-status-icon">
                  <svg v-if="nr.status === 'completed'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#27ae60" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg v-else-if="nr.status === 'running'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#1f1f1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  <svg v-else-if="nr.status === 'failed'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#c0c0c0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5" />
                  </svg>
                </span>
                <span class="wf-node-name">{{ nr.nodeName }}</span>
                <span class="wf-node-dur" v-if="computeDuration(nr)">{{ computeDuration(nr) }}</span>
                <span v-else-if="nr.status === 'running'" class="wf-node-running-label">{{ t("taskboard.status-running") }}...</span>
                <span v-else-if="nr.status === 'pending'" class="wf-node-pending-label">{{ t("taskboard.status-pending") }}...</span>
              </div>
            </div>
          </div>
          <!-- Non-workflow running task: show terminal -->
          <div v-else-if="selectedTask.status === 'running'" class="terminal-area">
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
          <!-- Workflow execution summary -->
          <div v-if="hasNodeResults" class="result-summary">
            <div class="summary-row">
              <div class="summary-item" :class="nodeCounts.completed === nodeCounts.total ? 'all-done' : ''">
                <span class="summary-count">{{ nodeCounts.completed }}</span>
                <span class="summary-label">{{ t("taskboard.status-completed") }}</span>
              </div>
              <div v-if="nodeCounts.failed > 0" class="summary-item has-failed">
                <span class="summary-count">{{ nodeCounts.failed }}</span>
                <span class="summary-label">{{ t("taskboard.status-failed") }}</span>
              </div>
              <div v-if="nodeCounts.running > 0" class="summary-item is-running">
                <span class="summary-count">{{ nodeCounts.running }}</span>
                <span class="summary-label">{{ t("taskboard.status-running") }}</span>
              </div>
            </div>
          </div>

          <!-- Node results with AUI rendering -->
          <div v-if="hasNodeResults" class="node-results-list">
            <div
              v-for="(nr, idx) in selectedTask!.nodeResults"
              :key="nr.nodeId"
              class="node-result-row"
            >
              <div class="node-result-left">
                <span class="node-result-index">{{ idx + 1 }}</span>
                <span
                  class="node-result-status"
                  :class="'nr-status-' + nr.status"
                >
                  <svg v-if="nr.status === 'completed'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <svg v-else-if="nr.status === 'running'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  <svg v-else-if="nr.status === 'failed'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </span>
                <div class="node-result-info">
                  <span class="node-result-name">{{ nr.nodeName }}</span>
                  <span v-if="computeDuration(nr)" class="node-result-duration">{{ computeDuration(nr) }}</span>
                </div>
              </div>
              <div class="node-result-right">
                <button
                  v-if="nr.status === 'completed' && nr.auiId && nr.auiData"
                  class="node-result-view-btn"
                  @click="openNodeResult(nr)"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  {{ t("taskboard.view-rendered") }}
                </button>
                <span v-else-if="nr.status === 'completed' && nr.auiId" class="node-result-hint">
                  {{ t("taskboard.result-empty") }}
                </span>
                <span v-else-if="nr.status === 'running'" class="node-result-hint">...</span>
                <span v-else-if="nr.status === 'pending'" class="node-result-hint">{{ t("taskboard.status-pending") }}</span>
                <span v-else-if="nr.status === 'failed'" class="node-result-hint node-failed-hint" :title="nr.rawOutput">
                  {{ nr.rawOutput ? nr.rawOutput.slice(0, 60) + (nr.rawOutput.length > 60 ? '...' : '') : t("taskboard.status-failed") }}
                </span>
                <span v-else class="node-result-hint">{{ t("taskboard.result-empty") }}</span>
              </div>
            </div>
          </div>

          <!-- Legacy: raw text result -->
          <div v-else-if="selectedTask!.result" class="log-block">
            {{ selectedTask!.result }}
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

    <!-- Node result AUI modal -->
    <TaskNodeResultModal
      v-if="showNodeResultModal && activeNodeResult"
      :node-result="activeNodeResult"
      :node-name="activeNodeName"
      @close="closeNodeResultModal"
    />

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

.node-progress {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b6b6b;
  flex-shrink: 0;
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 10px;
}

.result-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e5e5e5;
  background: transparent;
  color: #6b6b6b;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  position: relative;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
    border-color: #1f1f1f;
  }
}

.result-badge {
  font-size: 9px;
  font-weight: 600;
  background: #27ae60;
  color: #fff;
  border-radius: 8px;
  padding: 0 5px;
  line-height: 16px;
  min-width: 16px;
  text-align: center;
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

// ── Workflow progress (process view) ──

.workflow-progress {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.wf-progress-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b6b6b;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.wf-progress-count {
  margin-left: auto;
  font-weight: 600;
  font-size: 13px;
  color: #1f1f1f;
}

.wf-node-list {
  display: flex;
  flex-direction: column;
}

.wf-node-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 6px;
  transition: background-color 0.1s;

  &:hover {
    background-color: #fafafa;
  }

  &.wf-row-running {
    background-color: #fafafa;
  }
}

.wf-node-index {
  font-size: 11px;
  font-weight: 600;
  color: #c0c0c0;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.wf-node-status-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.wf-node-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f1f1f;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wf-node-dur {
  font-size: 11px;
  color: #9a9a9a;
  font-family: "JetBrainsMono", monospace;
  flex-shrink: 0;
}

.wf-node-running-label {
  font-size: 11px;
  color: #1f1f1f;
  flex-shrink: 0;
}

.wf-node-pending-label {
  font-size: 11px;
  color: #9a9a9a;
  flex-shrink: 0;
}

// ── Result view ──

.result-summary {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.summary-row {
  display: flex;
  gap: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 5px;

  .summary-count {
    font-size: 18px;
    font-weight: 700;
    color: #6b6b6b;
  }

  .summary-label {
    font-size: 11px;
    color: #9a9a9a;
  }

  &.all-done .summary-count {
    color: #27ae60;
  }

  &.has-failed .summary-count {
    color: #e74c3c;
  }

  &.is-running .summary-count {
    color: #1f1f1f;
  }
}

.node-results-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

.node-result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: background-color 0.1s;

  &:hover {
    background-color: #fafafa;
  }

  & + & {
    border-top: 1px solid #f5f5f5;
  }
}

.node-result-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.node-result-index {
  font-size: 11px;
  font-weight: 600;
  color: #c0c0c0;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.node-result-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;

  &.nr-status-completed { color: #27ae60; }
  &.nr-status-running { color: #1f1f1f; }
  &.nr-status-failed { color: #e74c3c; }
  &.nr-status-pending { color: #c0c0c0; }
}

.node-result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.node-result-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-result-duration {
  font-size: 11px;
  color: #9a9a9a;
  font-family: "JetBrainsMono", monospace;
}

.node-result-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.node-result-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  font-size: 11px;
  color: #6b6b6b;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background-color: #fafafa;
  }
}

.node-result-hint {
  font-size: 11px;
  color: #9a9a9a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;

  &.node-failed-hint {
    color: #e74c3c;
  }
}

.spinner {
  animation: spin 2s linear infinite;
  transform-origin: center;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
