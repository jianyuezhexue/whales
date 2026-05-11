<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import type { Task } from "@/stores/task";
import { useTaskStore } from "@/stores/task";

const props = defineProps<{
  task: Task;
  depth?: number;
  childCount?: number;
}>();

const emit = defineEmits<{
  (e: "view-detail", task: Task): void;
  (e: "delete", taskId: string): void;
  (e: "rename", taskId: string, newName: string): void;
  (e: "select", taskId: string): void;
  (e: "toggle-complete", taskId: string): void;
}>();

const { t } = useI18n();
const taskStore = useTaskStore();

const menuOpen = ref(false);
const renaming = ref(false);
const renameInput = ref("");
const renameInputRef = ref<HTMLInputElement>();

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

const isSubtask = computed(() => !!props.task.parentId);

const showResult = computed(
  () => props.task.status === "completed" || props.task.status === "failed",
);

const childCountText = computed(() => {
  const count = props.childCount ?? taskStore.childrenOf(props.task.id).length;
  if (count === 0) return "";
  return t("taskboard.child-count", { count });
});

const sourceLabel = computed(() => {
  if (!isSubtask.value || !props.task.source) return "";
  return props.task.source === "ai"
    ? t("taskboard.ai-generated")
    : t("taskboard.user-created");
});

const sourceClass = computed(() => {
  if (!props.task.source) return "";
  return props.task.source === "ai" ? "source-ai" : "source-user";
});

const startRename = () => {
  menuOpen.value = false;
  renameInput.value = props.task.name;
  renaming.value = true;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
};

const confirmRename = () => {
  const name = renameInput.value.trim();
  if (name && name !== props.task.name) {
    emit("rename", props.task.id, name);
  }
  renaming.value = false;
};

const cancelRename = () => {
  renaming.value = false;
};

const handleCheckbox = (e: Event) => {
  e.stopPropagation();
  emit("toggle-complete", props.task.id);
};
</script>

<template>
  <div
    class="board-card"
    :class="{ 'is-child': depth && depth > 0, 'is-completed': task.status === 'completed' }"
    :style="depth ? { marginLeft: `${depth * 20}px` } : {}"
    @click="emit('select', task.id)"
  >
    <div class="card-left">
      <!-- Completion checkbox for subtasks -->
      <button
        v-if="isSubtask"
        class="complete-check"
        :class="{ checked: task.status === 'completed' }"
        @click="handleCheckbox"
        :title="task.status === 'completed' ? '标记未完成' : '标记完成'"
      >
        <svg v-if="task.status === 'completed'" viewBox="0 0 24 24" width="12" height="12"
          fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"
          stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
      <!-- Status dot for non-subtasks -->
      <span v-else class="status-dot" :style="{ backgroundColor: statusColors[task.status] }"></span>

      <template v-if="renaming">
        <input
          ref="renameInputRef"
          v-model="renameInput"
          class="rename-input"
          type="text"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          @blur="confirmRename"
          @click.stop
        />
      </template>
      <template v-else>
        <span class="card-name" :class="{ 'name-done': isSubtask && task.status === 'completed' }">
          {{ task.name }}
        </span>
        <span v-if="sourceLabel" class="source-badge" :class="sourceClass">{{ sourceLabel }}</span>
        <span v-if="childCountText" class="child-badge">{{ childCountText }}</span>
      </template>
    </div>
    <div class="card-right">
      <span class="card-time">{{ task.createdAt || "" }}</span>
      <span class="status-text" :style="{ color: statusColors[task.status] }">
        {{ t(statusLabels[task.status]) }}
      </span>
      <!-- View detail icon: always visible -->
      <button
        class="card-btn view-btn"
        :title="t('taskboard.view-process')"
        @click.stop="emit('view-detail', task)"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <div class="menu-wrapper" v-click-outside="() => { menuOpen = false }">
        <button class="card-btn menu-trigger" @click.stop="menuOpen = !menuOpen">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" stroke="none">
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
        <div v-if="menuOpen" class="card-menu">
          <div class="menu-item" @click.stop="startRename">{{ t("taskboard.rename") }}</div>
          <div class="menu-item menu-item-danger" @click.stop="emit('delete', task.id)">
            {{ t("taskboard.delete") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.board-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 6px;
  transition: background-color 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;

  &:hover {
    background-color: #f8f8f8;
  }

  &.is-child {
    background-color: #fafafa;
    border-left: 2px solid #e5e5e5;
    border-radius: 0 6px 6px 0;

    &:hover {
      background-color: #f3f3f3;
    }
  }

  &.is-completed.is-child {
    border-left-color: #27ae60;
  }
}

.card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

// Completion checkbox
.complete-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 2px solid #c0c0c0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover {
    border-color: #27ae60;
  }

  &.checked {
    background-color: #27ae60;
    border-color: #27ae60;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-name {
  font-size: 13px;
  color: #1f1f1f;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.name-done {
    color: #9a9a9a;
    text-decoration: line-through;
  }
}

.child-badge {
  font-size: 11px;
  color: #6b6b6b;
  background-color: #f0f0f0;
  padding: 1px 6px;
  border-radius: 8px;
  flex-shrink: 0;
}

// Source badges
.source-badge {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 6px;
  flex-shrink: 0;
  font-weight: 500;

  &.source-ai {
    color: #7c5ce7;
    background-color: #f3f0ff;
  }

  &.source-user {
    color: #6b6b6b;
    background-color: #f0f0f0;
  }
}

.rename-input {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border: 1px solid #c0c0c0;
  border-radius: 4px;
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  outline: none;

  &:focus {
    border-color: #1f1f1f;
  }
}

.card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.card-time {
  font-size: 11px;
  color: #9a9a9a;
  font-family: "JetBrainsMono", monospace;
}

.status-text {
  font-size: 11px;
  font-weight: 500;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;

  &.view-btn {
    color: #6b6b6b;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }
  }

  &.result-btn {
    width: auto;
    padding: 0 10px;
    font-size: 11px;
    font-family: inherit;
    color: #1f1f1f;
    border: 1px solid #e5e5e5;

    &:hover {
      background-color: #f0f0f0;
      border-color: #1f1f1f;
    }
  }

  &.menu-trigger {
    color: #9a9a9a;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }
  }
}

.menu-wrapper {
  position: relative;

  .card-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 90px;
    background-color: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 20;
    padding: 4px;
  }

  .menu-item {
    padding: 5px 10px;
    font-size: 12px;
    color: #1f1f1f;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    font-family: "JetBrainsMono", monospace;

    &:hover {
      background-color: #f0f0f0;
    }
  }

  .menu-item-danger {
    color: #e74c3c;

    &:hover {
      background-color: #fef0f0;
    }
  }
}
</style>
