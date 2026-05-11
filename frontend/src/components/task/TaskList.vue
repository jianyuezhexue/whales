<script setup lang="ts">
export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  workflowId?: string;
  workflowName?: string;
  agentName?: string;
}

defineProps<{
  tasks: Task[];
  selectedTaskId: string | null;
}>();

const emit = defineEmits<{
  (e: "select-task", taskId: string): void;
  (e: "delete-task", taskId: string): void;
}>();

const statusLabels: Record<string, string> = {
  pending: "待执行",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

const statusColors: Record<string, string> = {
  pending: "#9a9a9a",
  running: "#1f1f1f",
  completed: "#27ae60",
  failed: "#e74c3c",
};
</script>

<template>
  <div class="task-list-panel">
    <div class="task-items">
      <div v-if="tasks.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0"
          stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <div class="empty-text">暂无任务</div>
        <div class="empty-sub">点击右上角按钮创建新任务</div>
      </div>

      <div v-for="task in tasks" :key="task.id" class="task-item"
        :class="{ active: selectedTaskId === task.id }" @click="emit('select-task', task.id)">
        <div class="task-status" :style="{ backgroundColor: statusColors[task.status] }"></div>
        <div class="task-info">
          <div class="task-name">{{ task.name }}</div>
          <div class="task-meta">
            <span class="task-status-text" :style="{ color: statusColors[task.status] }">
              {{ statusLabels[task.status] }}
            </span>
            <span v-if="task.agentName" class="task-agent">{{ task.agentName }}</span>
            <span v-if="task.workflowName" class="task-workflow">{{ task.workflowName }}</span>
          </div>
        </div>
        <button class="task-delete-btn" title="删除任务"
          @click.stop="emit('delete-task', task.id)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.task-list-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid #e5e5e5;
  background-color: #fafafa;
  height: 100%;
}

.task-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 16px;

    .empty-text {
      margin-top: 12px;
      font-size: 13px;
      color: #6b6b6b;
    }

    .empty-sub {
      margin-top: 4px;
      font-size: 12px;
      color: #c0c0c0;
    }
  }
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: #f0f0f0;
  }

  &.active {
    background-color: #ececec;
  }

  .task-status {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .task-info {
    flex: 1;
    min-width: 0;

    .task-name {
      font-size: 13px;
      color: #1f1f1f;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .task-meta {
      display: flex;
      align-items: center;
      margin-top: 2px;
    }

    .task-status-text {
      font-size: 11px;
    }

    .task-agent {
      font-size: 11px;
      color: #6b6b6b;

      &::before {
        content: "|";
        margin: 0 6px;
        color: #c0c0c0;
      }
    }

    .task-workflow {
      font-size: 11px;
      color: #6b6b6b;

      &::before {
        content: "|";
        margin: 0 6px;
        color: #c0c0c0;
      }
    }
  }

  .task-delete-btn {
    display: none;
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

    &:hover {
      background-color: #e8e8e8;
      color: #e74c3c;
    }
  }
}

.task-item:hover .task-delete-btn {
  display: inline-flex;
}
</style>
