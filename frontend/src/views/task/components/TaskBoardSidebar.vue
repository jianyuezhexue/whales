<script setup lang="ts">
import { ref, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";

const vFocus = {
  mounted(el: HTMLInputElement) {
    el.focus();
    el.select();
  },
};

const emit = defineEmits<{
  (e: "new-task"): void;
  (e: "select", taskId: string): void;
}>();

const { t } = useI18n();
const taskStore = useTaskStore();

const statusColors: Record<string, string> = {
  pending: "#9a9a9a",
  running: "#1f1f1f",
  completed: "#27ae60",
  failed: "#e74c3c",
};

const statusLabels: Record<string, string> = {
  pending: "taskboard.status-pending",
  running: "taskboard.status-running",
  completed: "taskboard.status-completed",
  failed: "taskboard.status-failed",
};

const addingParentId = ref<string | null>(null);
const subtaskInput = ref("");

// Rename state
const renamingId = ref<string | null>(null);
const renameInput = ref("");

// Action dropdown: fixed-position to avoid overflow clipping
const openMenuId = ref<string | null>(null);
const confirmDeleteId = ref<string | null>(null);
const childConfirmDeleteId = ref<string | null>(null);
const menuStyle = ref<Record<string, string>>({});

const toggleMenu = (taskId: string, event: MouseEvent) => {
  if (openMenuId.value === taskId) {
    openMenuId.value = null;
    confirmDeleteId.value = null;
    return;
  }
  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  menuStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.right - 152}px`,
  };
  openMenuId.value = taskId;
};

const startAddSubtask = (parentId: string) => {
  addingParentId.value = parentId;
  subtaskInput.value = "";
  openMenuId.value = null;
};

const startRename = (taskId: string) => {
  const task = taskStore.boardTasks.find((t) => t.id === taskId);
  if (!task) return;
  renamingId.value = taskId;
  renameInput.value = task.name;
  openMenuId.value = null;
};

const confirmRename = () => {
  const name = renameInput.value.trim();
  if (name && renamingId.value) {
    taskStore.updateBoardTask(renamingId.value, { name });
  }
  renamingId.value = null;
  renameInput.value = "";
};

const cancelRename = () => {
  renamingId.value = null;
  renameInput.value = "";
};

const handleDelete = (taskId: string) => {
  confirmDeleteId.value = taskId;
};

const cancelDelete = () => {
  confirmDeleteId.value = null;
  openMenuId.value = null;
};

const confirmDeleteAction = () => {
  if (confirmDeleteId.value) {
    taskStore.removeBoardTask(confirmDeleteId.value);
  }
  confirmDeleteId.value = null;
  openMenuId.value = null;
};

const handleChildDelete = (taskId: string) => {
  childConfirmDeleteId.value = taskId;
};

const confirmChildDelete = () => {
  if (childConfirmDeleteId.value) {
    taskStore.removeBoardTask(childConfirmDeleteId.value);
  }
  childConfirmDeleteId.value = null;
};

const cancelChildDelete = () => {
  childConfirmDeleteId.value = null;
};

const handleBlur = () => {
  setTimeout(() => {
    if (addingParentId.value) {
      const name = subtaskInput.value.trim();
      if (name) {
        taskStore.addSubTask(addingParentId.value, name, "user");
      }
      addingParentId.value = null;
      subtaskInput.value = "";
    }
  }, 100);
};

const handleEnter = () => {
  const name = subtaskInput.value.trim();
  if (name && addingParentId.value) {
    taskStore.addSubTask(addingParentId.value, name, "user");
  }
  addingParentId.value = null;
  subtaskInput.value = "";
};

const handleEscape = () => {
  addingParentId.value = null;
  subtaskInput.value = "";
};

const scheduleLabel = (task: { schedule?: { enabled: boolean; mode: string; intervalValue: number; intervalUnit: string; dailyTime: string } }) => {
  if (!task.schedule?.enabled) return "";
  if (task.schedule.mode === "interval") {
    const unit = task.schedule.intervalUnit === "seconds" ? t("taskboard.schedule-seconds")
      : task.schedule.intervalUnit === "minutes" ? t("taskboard.schedule-minutes")
      : t("taskboard.schedule-hours");
    return `${t("taskboard.schedule-every")}${task.schedule.intervalValue}${unit}`;
  }
  return `${t("taskboard.schedule-at")}${task.schedule.dailyTime}`;
};

const stepLabel = (task: { id: string }) => {
  const children = taskStore.childrenOf(task.id);
  if (children.length === 0) return "";
  const completed = children.filter((c) => c.status === "completed").length;
  return `${completed}/${children.length}`;
};

// Close dropdown on outside click
const onDocClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".action-menu") && !target.closest(".action-btn")) {
    openMenuId.value = null;
    confirmDeleteId.value = null;
  }
};
document.addEventListener("click", onDocClick);
onBeforeUnmount(() => document.removeEventListener("click", onDocClick));
</script>

<template>
  <div class="board-sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">{{ t("taskpage.title") }}</span>
      <button class="new-task-btn" @click="emit('new-task')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {{ t("taskboard.new-task") }}
      </button>
    </div>

    <div class="task-tree">
      <div v-if="taskStore.rootTasks.length === 0" class="sidebar-empty">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <div class="empty-text">暂无任务</div>
        <div class="empty-sub">点击「新建任务」开始</div>
      </div>

      <template v-for="task in taskStore.rootTasks" :key="task.id">
        <!-- Parent task — two-line card -->
        <div
          class="parent-item"
          :class="{ active: taskStore.selectedTaskId === task.id }"
          @click="renamingId !== task.id && emit('select', task.id)"
        >
          <div class="parent-row-1">
            <span class="item-status" :style="{ backgroundColor: statusColors[task.status] }"></span>
            <template v-if="renamingId === task.id">
              <input
                v-focus
                v-model="renameInput"
                class="rename-input"
                @keyup.enter="confirmRename"
                @keyup.escape="cancelRename"
                @blur="confirmRename"
                @click.stop
              />
            </template>
            <template v-else>
              <span class="item-name">{{ task.name }}</span>
            </template>
            <button class="action-btn" @click.stop="toggleMenu(task.id, $event)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
          </div>
          <div class="parent-row-2">
            <span class="status-label" :style="{ color: statusColors[task.status] }">
              {{ t(statusLabels[task.status]) }}
            </span>
            <span v-if="scheduleLabel(task)" class="schedule-badge">{{ scheduleLabel(task) }}</span>
            <span v-if="stepLabel(task)" class="step-label">{{ stepLabel(task) }}</span>
          </div>
        </div>

        <!-- Inline subtask input -->
        <div v-if="addingParentId === task.id" class="subtask-input-row">
          <span class="tree-line"></span>
          <input
            v-focus
            v-model="subtaskInput"
            class="subtask-inline-input"
            type="text"
            :placeholder="t('taskboard.subtask-placeholder')"
            @keyup.enter="handleEnter"
            @keyup.escape="handleEscape"
            @blur="handleBlur"
          />
        </div>

        <!-- Children -->
        <div
          v-for="child in taskStore.childrenOf(task.id)"
          :key="child.id"
          class="child-item"
          :class="{
            active: taskStore.selectedTaskId === child.id,
            'is-ai': child.source === 'ai',
          }"
          @click="renamingId !== child.id && emit('select', child.id)"
        >
          <span class="tree-line"></span>
          <button
            class="complete-check"
            :class="{ checked: child.status === 'completed' }"
            @click.stop="taskStore.toggleSubTaskDone(child.id)"
            :title="child.status === 'completed' ? '标记未完成' : '标记完成'"
          >
            <svg v-if="child.status === 'completed'" viewBox="0 0 24 24" width="10" height="10"
              fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"
              stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <template v-if="renamingId === child.id">
            <input
              v-focus
              v-model="renameInput"
              class="rename-input rename-input--child"
              @keyup.enter="confirmRename"
              @keyup.escape="cancelRename"
              @blur="confirmRename"
              @click.stop
            />
          </template>
          <template v-else>
            <span
              class="item-name child-name"
              :class="{ 'name-done': child.status === 'completed' }"
            >{{ child.name }}</span>
          </template>
          <span v-if="child.source && renamingId !== child.id" class="source-tag" :class="'source-' + child.source">
            {{ child.source === 'ai' ? t('taskboard.ai-generated') : t('taskboard.user-created') }}
          </span>
          <template v-if="childConfirmDeleteId === child.id">
            <span class="child-confirm-text">删除?</span>
            <button class="child-confirm-yes" @click.stop="confirmChildDelete">✓</button>
            <button class="child-confirm-no" @click.stop="cancelChildDelete">✗</button>
          </template>
          <button v-else class="child-delete-btn" @click.stop="handleChildDelete(child.id)">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </template>
    </div>

    <!-- Fixed-position dropdown -->
    <Teleport to="body">
      <div v-if="openMenuId" class="action-menu" :style="menuStyle" @click.stop>
        <template v-if="confirmDeleteId === openMenuId">
          <div class="menu-confirm-text">{{ t("taskboard.delete-confirm") }}</div>
          <div class="menu-confirm-actions">
            <button class="menu-confirm-btn confirm-yes" @click="confirmDeleteAction">
              {{ t("taskboard.delete") }}
            </button>
            <button class="menu-confirm-btn confirm-no" @click="cancelDelete">
              {{ t("taskboard.cancel") }}
            </button>
          </div>
        </template>
        <template v-else>
          <button class="menu-item" @click="startRename(openMenuId!)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {{ t("taskboard.rename") }}
          </button>
          <button class="menu-item" @click="startAddSubtask(openMenuId!)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t("taskboard.add-subtask") }}
          </button>
          <button class="menu-item danger" @click="handleDelete(openMenuId!)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {{ t("taskboard.delete") }}
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
.board-sidebar {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  background-color: #fafafa;
  height: 100%;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
}

.new-task-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #d0d0d0;
  border-radius: 5px;
  background-color: #ffffff;
  font-size: 11px;
  font-family: inherit;
  color: #1f1f1f;
  cursor: pointer;
  transition: all 0.15s ease;

  svg { flex-shrink: 0; }

  &:hover {
    background-color: #f0f0f0;
    border-color: #1f1f1f;
  }
}

.task-tree {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 8px;

  .sidebar-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 12px;

    .empty-text { margin-top: 10px; font-size: 13px; color: #6b6b6b; }
    .empty-sub { margin-top: 4px; font-size: 11px; color: #c0c0c0; }
  }
}

/* ── Parent task card ── */
.parent-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding: 10px 10px;
  min-height: 56px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover { background-color: #f0f0f0; }
  &.active { background-color: #ececec; }
}

.parent-row-1 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.parent-row-2 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 13px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9a9a9a;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s ease;

  &:hover { background-color: #e0e0e0; color: #1f1f1f; }
}

.parent-item:hover .action-btn,
.parent-item.active .action-btn {
  opacity: 1;
}

.rename-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 6px;
  border: 1px solid #1f1f1f;
  border-radius: 4px;
  font-size: 13px;
  font-family: inherit;
  color: #1f1f1f;
  background-color: #ffffff;
  outline: none;

  &--child {
    height: 20px;
    font-size: 12px;
  }
}

.schedule-badge {
  font-size: 10px;
  font-family: "JetBrainsMono", monospace;
  color: #7c5ce7;
  background-color: #f3f0ff;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.step-label {
  font-size: 11px;
  font-family: "JetBrainsMono", monospace;
  color: #6b6b6b;
  background-color: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
}

/* ── Child task row ── */
.child-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 7px 10px 7px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease;

  &:hover { background-color: #f0f0f0; }
  &.active { background-color: #ececec; }

  &:hover .child-delete-btn { color: #c0c0c0; }
}

.child-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: transparent;
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover { background-color: #fef0f0; color: #e74c3c; }
}

.child-confirm-text {
  font-size: 10px;
  color: #e74c3c;
  flex-shrink: 0;
}

.child-confirm-yes,
.child-confirm-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  transition: background-color 0.1s ease;
}

.child-confirm-yes {
  background-color: #e74c3c;
  color: #ffffff;

  &:hover { background-color: #c0392b; }
}

.child-confirm-no {
  background-color: #e0e0e0;
  color: #6b6b6b;

  &:hover { background-color: #d0d0d0; }
}

/* ── Inline subtask input ── */
.subtask-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 20px;
}

.subtask-inline-input {
  flex: 1;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #1f1f1f;
  border-radius: 4px;
  font-size: 12px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  background-color: #ffffff;
  outline: none;

  &::placeholder { color: #c0c0c0; }
}

/* ── Shared elements ── */
.tree-line {
  width: 8px;
  height: 2px;
  background-color: #d0d0d0;
  flex-shrink: 0;
  border-radius: 1px;
}

.item-status {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.name-done {
    color: #9a9a9a;
    text-decoration: line-through;
  }
}

.status-label {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.complete-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1.5px solid #c0c0c0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover { border-color: #27ae60; }
  &.checked { background-color: #27ae60; border-color: #27ae60; }
}

.source-tag {
  font-size: 10px;
  padding: 0 4px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 500;

  &.source-ai { color: #7c5ce7; background-color: #f3f0ff; }
  &.source-user { color: #6b6b6b; background-color: #f0f0f0; }
}
</style>

<!-- Dropdown menu uses Teleport to body — scoped styles won't reach it -->
<style lang="scss">
.action-menu {
  position: fixed;
  min-width: 152px;
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  padding: 4px 0;

  .menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 14px;
    border: none;
    background: transparent;
    color: #1f1f1f;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover { background-color: #f0f0f0; }
    &.danger { color: #e74c3c; }
    &.danger:hover { background-color: #fef0f0; }
  }

  .menu-confirm-text {
    padding: 6px 14px 4px;
    font-size: 11px;
    color: #e74c3c;
    text-align: center;
  }

  .menu-confirm-actions {
    display: flex;
    gap: 6px;
    padding: 4px 14px 6px;
  }

  .menu-confirm-btn {
    flex: 1;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    transition: background-color 0.1s ease;

    &.confirm-yes {
      background-color: #e74c3c;
      color: #ffffff;

      &:hover { background-color: #c0392b; }
    }

    &.confirm-no {
      background-color: #e0e0e0;
      color: #6b6b6b;

      &:hover { background-color: #d0d0d0; }
    }
  }
}
</style>