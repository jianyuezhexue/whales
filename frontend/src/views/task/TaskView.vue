<template>
  <div class="task-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t("taskpage.title") }}</h1>
      <div class="header-actions">
        <!-- View mode toggle -->
        <div class="view-toggle">
          <button
            :class="['toggle-btn', { active: taskStore.viewMode === 'board' }]"
            :title="t('taskboard.board-view')"
            @click="setViewMode('board')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="18" rx="1" />
              <rect x="14" y="3" width="7" height="10" rx="1" />
            </svg>
          </button>
          <button
            :class="['toggle-btn', { active: taskStore.viewMode === 'terminal' }]"
            :title="t('taskboard.terminal-view')"
            @click="setViewMode('terminal')"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <TerminalView v-show="taskStore.viewMode === 'terminal'" />
    <TaskBoardView v-show="taskStore.viewMode === 'board'" />
  </div>
</template>

<script lang="ts">
export default { name: 'TaskView' };
</script>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";
import TerminalView from "./components/TerminalView.vue";
import TaskBoardView from "./components/TaskBoardView.vue";

const { t } = useI18n();
const taskStore = useTaskStore();

const setViewMode = (mode: "terminal" | "board") => {
  taskStore.viewMode = mode;
};
</script>

<style lang="scss" scoped>
.task-page {
  .page-header {
    margin-bottom: 0;
    padding: 8px 0 12px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.view-toggle {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;

  .toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    padding: 0;
    border: none;
    background-color: #ffffff;
    color: #9a9a9a;
    cursor: pointer;
    transition: all 0.15s ease;

    &:first-child {
      border-right: 1px solid #e5e5e5;
    }

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}
</style>
