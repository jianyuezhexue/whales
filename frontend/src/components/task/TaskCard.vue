<script setup lang="ts">
import { ref, nextTick } from "vue";
import type { Task } from "./TaskList.vue";
import TaskTerminal from "./TaskTerminal.vue";

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (e: "close", taskId: string): void;
  (e: "preview", taskId: string): void;
  (e: "rename", taskId: string, newName: string): void;
}>();

const maximized = ref(false);
const menuOpen = ref(false);
const renaming = ref(false);
const renameInput = ref("");
const renameInputRef = ref<HTMLInputElement>();

const toggleMaximize = () => {
  maximized.value = !maximized.value;
};

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

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

const handleDelete = () => {
  menuOpen.value = false;
  emit("close", props.task.id);
};
</script>

<template>
  <div class="task-card" :class="{ maximized }">
    <div class="card-header">
      <template v-if="renaming">
        <input
          ref="renameInputRef"
          v-model="renameInput"
          class="rename-input"
          type="text"
          @keyup.enter="confirmRename"
          @keyup.escape="cancelRename"
          @blur="confirmRename"
        />
      </template>
      <template v-else>
        <div class="card-title" :title="task.name">{{ task.name }}</div>
      </template>
      <div class="card-actions">
        <button class="card-btn" title="预览工作结果" @click="emit('preview', task.id)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
        <button class="card-btn" :title="maximized ? '还原' : '全屏'"
          @click="toggleMaximize">
          <svg v-if="!maximized" viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
        <div class="menu-wrapper" v-click-outside="() => { menuOpen = false }">
          <button class="card-btn" title="更多操作" @click="toggleMenu">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"
              stroke="none">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          <div v-if="menuOpen" class="card-menu">
            <div class="menu-item" @click="startRename">重命名</div>
            <div class="menu-item menu-item-danger" @click="handleDelete">删除</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body">
      <TaskTerminal :task-id="task.id" @exited="emit('close', task.id)" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.task-card {
  display: flex;
  flex-direction: column;
  height: 340px;
  background-color: #1e1e1e;
  border: 1px solid #333333;
  border-radius: 8px;
  overflow: visible;
  transition: all 0.2s ease;

  &.maximized {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 10;
    height: auto;
    border-color: #525252;
    overflow: hidden;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #333333;
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
}

.card-title {
  font-size: 12px;
  font-weight: 500;
  color: #cccccc;
  font-family: "JetBrainsMono", monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.rename-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 0 6px;
  border: 1px solid #525252;
  border-radius: 4px;
  background-color: #1e1e1e;
  color: #cccccc;
  font-size: 12px;
  font-family: "JetBrainsMono", monospace;
  outline: none;

  &:focus {
    border-color: #888888;
  }
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: #888888;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background-color: #444444;
    color: #cccccc;
  }
}

// ── 操作菜单 ──
.menu-wrapper {
  position: relative;

  .card-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 100px;
    background-color: #333333;
    border: 1px solid #444444;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 20;
    padding: 4px;
  }

  .menu-item {
    padding: 5px 10px;
    font-size: 12px;
    color: #cccccc;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    font-family: "JetBrainsMono", monospace;

    &:hover {
      background-color: #444444;
    }
  }

  .menu-item-danger {
    color: #e74c3c;

    &:hover {
      background-color: #4a2020;
    }
  }
}

.card-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 0 0 8px 8px;
}
</style>
