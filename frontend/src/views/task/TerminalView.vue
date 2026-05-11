<script lang="ts">
export default { name: 'TerminalView' };
</script>
<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import TaskCard from "@/components/task/TaskCard.vue";
import { useWorkflowStore } from "@/stores/workflow";
import { useProjectStore } from "@/stores/project";
import { useTaskStore } from "@/stores/task";

const { t } = useI18n();
const taskStore = useTaskStore();
const { tasks, inputText } = storeToRefs(taskStore);

const workflowStore = useWorkflowStore();
const allWorkflows = computed(() => {
  const list: { id: string; name: string }[] = [];
  for (const group of workflowStore.workflowGroups) {
    for (const wf of group.workflows) {
      list.push({ id: wf.id, name: wf.name });
    }
  }
  return list;
});

const agentOptions = [
  { value: "claude-code", label: "claude code", command: "claude" },
  { value: "codex", label: "codex", command: "codex" },
  { value: "openclaw", label: "openclaw", command: "openclaw onboard" },
  { value: "hermes", label: "Hermes Agent", command: "hermes" },
  { value: "qodercli", label: "qodercli", command: "qodercli" },
];
const selectedAgent = ref("claude-code");
const selectedAgentLabel = computed(() => {
  const opt = agentOptions.find((a) => a.value === selectedAgent.value);
  return opt ? opt.label : "";
});
const selectedAgentCommand = computed(() => {
  const opt = agentOptions.find((a) => a.value === selectedAgent.value);
  return opt ? opt.command : "";
});

const selectedWorkflowId = ref("");
const selectedWorkflowName = computed(() => {
  if (!selectedWorkflowId.value) return "";
  const wf = allWorkflows.value.find((w) => w.id === selectedWorkflowId.value);
  return wf ? wf.name : "";
});

const columnMode = ref("2");
const columnOptions = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
];
const gridColumns = computed(() => {
  const n = parseInt(columnMode.value);
  return `repeat(${n}, 1fr)`;
});

const cardRefs = new Map<string, InstanceType<typeof TaskCard>>();
const setCardRef = (taskId: string, el: any) => {
  if (el) cardRefs.set(taskId, el);
  else cardRefs.delete(taskId);
};
const fitAllTerminals = () => {
  cardRefs.forEach((card) => card?.fit?.());
};

watch(columnMode, () => {
  nextTick(fitAllTerminals);
});

let winResizeTimer: number | null = null;
const onWindowResize = () => {
  if (winResizeTimer !== null) clearTimeout(winResizeTimer);
  winResizeTimer = window.setTimeout(() => {
    winResizeTimer = null;
    fitAllTerminals();
  }, 120);
};

onMounted(() => {
  window.addEventListener("resize", onWindowResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onWindowResize);
  if (winResizeTimer !== null) clearTimeout(winResizeTimer);
});

const projectStore = useProjectStore();
const projectPath = computed(() => projectStore.currentProject?.path || "");

const startTaskAgent = (taskId: string, message?: string) => {
  const task = tasks.value.find((t) => t.id === taskId);
  if (!task) return;
  try {
    const win = window as any;
    if (win.go?.app?.App?.PtyStart) {
      const cmd = selectedAgentCommand.value || "claude";
      win.go.app.App.PtyStart(taskId, cmd, message || "", projectPath.value);
    }
    task.status = "running";
  } catch (e) {
    task.status = "failed";
    console.error("Failed to start agent:", e);
  }
};

const handleSend = () => {
  const text = inputText.value.trim();
  if (!text) return;

  const wf = allWorkflows.value.find((w) => w.id === selectedWorkflowId.value);
  const task = taskStore.addTask({
    name: text,
    status: "pending",
    workflowId: selectedWorkflowId.value || undefined,
    workflowName: wf?.name,
    agentName: selectedAgentLabel.value || undefined,
  });
  inputText.value = "";
  startTaskAgent(task.id, text);
};

const handleCloseCard = (taskId: string) => {
  try {
    const win = window as any;
    if (win.go?.app?.App?.PtyStop) {
      win.go.app.App.PtyStop(taskId);
    }
  } catch {
    // Wails not available
  }
  taskStore.removeTask(taskId);
};

const handleRenameTask = (taskId: string, newName: string) => {
  taskStore.updateTask(taskId, { name: newName });
};

const handlePreview = (taskId: string) => {
  console.log("预览任务结果:", taskId);
};

const agentDropdownOpen = ref(false);
const toggleAgentDropdown = () => {
  agentDropdownOpen.value = !agentDropdownOpen.value;
};
const selectAgentOption = (value: string) => {
  selectedAgent.value = value;
  agentDropdownOpen.value = false;
};
const clearAgent = (e: Event) => {
  e.stopPropagation();
  selectedAgent.value = "";
};

const workflowDropdownOpen = ref(false);
const toggleWorkflowDropdown = () => {
  workflowDropdownOpen.value = !workflowDropdownOpen.value;
};
const selectWorkflow = (id: string) => {
  selectedWorkflowId.value = id;
  workflowDropdownOpen.value = false;
};
const clearWorkflow = (e: Event) => {
  e.stopPropagation();
  selectedWorkflowId.value = "";
};
</script>

<template>
  <div class="terminal-view">
    <!-- 列数选择器 -->
    <div class="column-toolbar">
      <div class="column-tabs">
        <button
          v-for="opt in columnOptions"
          :key="opt.value"
          :class="['tab-btn', { active: columnMode === opt.value }]"
          type="button"
          @click="columnMode = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 卡片网格 -->
    <div class="task-grid" :style="{ gridTemplateColumns: gridColumns }">
      <TaskCard v-for="task in tasks" :key="task.id" :task="task"
        :ref="(el: any) => setCardRef(task.id, el)"
        @close="handleCloseCard" @preview="handlePreview" @rename="handleRenameTask" />
      <div v-if="tasks.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#c0c0c0"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 2L11 13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        <div class="empty-text">在下方输入消息开始新任务</div>
      </div>
    </div>

    <!-- 底部输入栏 -->
    <div class="input-bar">
      <div class="input-controls">
        <div class="input-dropdown" :class="{ open: agentDropdownOpen }"
          v-click-outside="() => { agentDropdownOpen = false }">
          <div class="dropdown-toggle" @click="toggleAgentDropdown">
            <span :class="{ placeholder: !selectedAgentLabel }">
              {{ selectedAgentLabel || "Agent" }}
            </span>
            <button v-if="selectedAgentLabel" class="dropdown-clear" type="button"
              @click="clearAgent" title="清除选择">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div v-if="agentDropdownOpen" class="dropdown-popup">
            <div v-for="opt in agentOptions" :key="opt.value" class="dropdown-item"
              :class="{ active: selectedAgent === opt.value }"
              @click="selectAgentOption(opt.value)">
              {{ opt.label }}
            </div>
          </div>
        </div>

        <div class="input-dropdown" :class="{ open: workflowDropdownOpen }"
          v-click-outside="() => { workflowDropdownOpen = false }">
          <div class="dropdown-toggle" @click="toggleWorkflowDropdown">
            <span :class="{ placeholder: !selectedWorkflowName }">
              {{ selectedWorkflowName || "工作流" }}
            </span>
            <button v-if="selectedWorkflowName" class="dropdown-clear" type="button"
              @click="clearWorkflow" title="清除选择">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div v-if="workflowDropdownOpen" class="dropdown-popup">
            <div class="dropdown-item" :class="{ active: !selectedWorkflowId }"
              @click="selectWorkflow('')">
              不选择
            </div>
            <div v-for="wf in allWorkflows" :key="wf.id" class="dropdown-item"
              :class="{ active: selectedWorkflowId === wf.id }"
              @click="selectWorkflow(wf.id)">
              {{ wf.name }}
            </div>
          </div>
        </div>

        <input v-model="inputText" class="task-input" type="text"
          :placeholder="t('taskpage.input-placeholder')"
          @keyup.enter="handleSend" />

        <button class="send-btn" @click="handleSend" :disabled="!inputText.trim()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.terminal-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.column-toolbar {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  flex-shrink: 0;
}

// ── 列数选择器 ──
.column-tabs {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;

  .tab-btn {
    height: 26px;
    padding: 0 10px;
    border: none;
    background-color: #ffffff;
    color: #6b6b6b;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
    border-right: 1px solid #e5e5e5;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}

// ── 卡片网格 ──
.task-grid {
  flex: 1;
  min-height: 0;
  min-width: 0;
  position: relative;
  display: grid;
  gap: 12px;
  padding: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  align-content: start;

  .empty-state {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 16px;
    gap: 12px;

    .empty-text {
      font-size: 13px;
      color: #9a9a9a;
    }
  }
}

// ── 底部输入栏 ──
.input-bar {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  border-top: 1px solid #e5e5e5;
  background-color: #ffffff;
}

.input-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  min-width: 0;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: #c0c0c0;
  }

  &:focus {
    border-color: #1f1f1f;
  }
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background-color: #f0f0f0;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// ── 底部下拉组件 ──
.input-dropdown {
  position: relative;
  flex-shrink: 0;

  .dropdown-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: #1f1f1f;
    }

    .placeholder {
      color: #9a9a9a;
    }

    > svg:last-child {
      flex-shrink: 0;
      color: #9a9a9a;
      transition: transform 0.15s ease;
    }
  }

  &.open .dropdown-toggle > svg:last-child {
    transform: rotate(180deg);
  }

  .dropdown-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    color: #9a9a9a;
    border-radius: 3px;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }
  }

  .dropdown-popup {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    min-width: 140px;
    max-height: 200px;
    overflow-y: auto;
    background-color: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;
    padding: 4px;
  }

  .dropdown-item {
    padding: 5px 8px;
    font-size: 12px;
    color: #1f1f1f;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #ececec;
      font-weight: 600;
    }
  }
}
</style>
