<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";
import { useProjectStore } from "@/stores/project";
import TaskBoardSidebar from "./TaskBoardSidebar.vue";
import TaskBoardDetail from "./TaskBoardDetail.vue";
import TaskCreateModal from "./TaskCreateModal.vue";

const { t } = useI18n();
const taskStore = useTaskStore();
const projectStore = useProjectStore();

const showCreateModal = ref(false);
const createModalRef = ref<InstanceType<typeof TaskCreateModal>>();

const projectPath = computed(() => projectStore.currentProject?.path || "");

const handleNewTask = () => {
  showCreateModal.value = true;
  createModalRef.value?.onOpened();
};

const startBoardAgent = (taskId: string, message: string) => {
  try {
    const win = window as any;
    if (win.go?.app?.App?.PtyStart) {
      win.go.app.App.PtyStart(taskId, "claude", message, projectPath.value);
      taskStore.updateBoardTask(taskId, { status: "running" });
    }
  } catch (e) {
    taskStore.updateBoardTask(taskId, { status: "failed" });
    console.error("Failed to start agent:", e);
  }
};

const handleCreateConfirm = (name: string, workflowId?: string, workflowName?: string) => {
  const task = taskStore.addBoardTask({
    name,
    status: "pending",
    workflowId,
    workflowName,
    agentName: "claude code",
  });
  taskStore.selectedTaskId = task.id;
  showCreateModal.value = false;
  startBoardAgent(task.id, name);
};

const handleSelectTask = (taskId: string) => {
  taskStore.selectedTaskId = taskId;
};
</script>

<template>
  <div class="board-view">
    <TaskBoardSidebar
      @new-task="handleNewTask"
      @select="handleSelectTask"
    />
    <TaskBoardDetail />

    <TaskCreateModal
      v-if="showCreateModal"
      ref="createModalRef"
      @close="showCreateModal = false"
      @confirm="handleCreateConfirm"
    />
  </div>
</template>

<style lang="scss" scoped>
.board-view {
  display: flex;
  flex: 1;
  min-height: 0;
  background-color: #ffffff;
  border-top: 1px solid #e5e5e5;
}
</style>