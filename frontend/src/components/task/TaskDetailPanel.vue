<script setup lang="ts">
import { ref } from "vue";
import type { Task } from "./TaskList.vue";
import TaskTerminal from "./TaskTerminal.vue";

defineProps<{
  task: Task;
}>();

const activeTab = ref<"process" | "result">("process");
const terminalExited = ref(false);

const tabs = [
  { key: "process" as const, label: "执行过程" },
  { key: "result" as const, label: "执行结果" },
];

const onTerminalExited = () => {
  terminalExited.value = true;
};
</script>

<template>
  <div class="detail-panel">
    <div class="tab-header">
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn"
        :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
      </button>
    </div>
    <div class="tab-content">
      <div v-show="activeTab === 'process'" class="process-tab">
        <TaskTerminal
          v-if="task.status === 'running'"
          :task-id="task.id"
          @exited="onTerminalExited"
        />
        <div v-else class="placeholder-text">暂无执行过程记录</div>
      </div>
      <div v-show="activeTab === 'result'" class="result-tab">
        <div class="placeholder-text">功能开发中</div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background-color: #ffffff;
}

.tab-header {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid #e5e5e5;
  padding: 0 16px;
}

.tab-btn {
  position: relative;
  padding: 10px 16px;
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

.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
}

.process-tab {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
}

.result-tab {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  font-size: 13px;
  color: #9a9a9a;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
