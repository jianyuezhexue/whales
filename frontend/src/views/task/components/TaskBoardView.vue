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

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useTaskStore } from "@/stores/task";
import { useWorkflowStore } from "@/stores/workflow";
import { useProjectStore } from "@/stores/project";
import { useWorkflowExecutor } from "@/composables/useWorkflowExecutor";
import TaskBoardSidebar from "./TaskBoardSidebar.vue";
import TaskBoardDetail from "./TaskBoardDetail.vue";
import TaskCreateModal, { type ScheduleConfig } from "./TaskCreateModal.vue";

const { t } = useI18n();
const taskStore = useTaskStore();
const workflowStore = useWorkflowStore();
const projectStore = useProjectStore();
const workflowExecutor = useWorkflowExecutor();

const showCreateModal = ref(false);
const createModalRef = ref<InstanceType<typeof TaskCreateModal>>();

const projectPath = computed(() => projectStore.currentProject?.path || "");

const handleNewTask = () => {
  showCreateModal.value = true;
  createModalRef.value?.onOpened();
};

const startBoardAgent = async (taskId: string, message: string) => {
  const task = taskStore.boardTasks.find((t) => t.id === taskId);
  if (!task) return;

  // If the task has a workflow with nodes, use the workflow executor
  if (task.workflowId) {
    const workflow = workflowStore.findWorkflowById(task.workflowId);
    if (workflow && workflow.nodes.length > 0) {
      taskStore.updateBoardTask(taskId, { status: "running" });
      try {
        await workflowExecutor.executeWorkflow(taskId, workflow, projectPath.value);
      } catch (e) {
        taskStore.updateBoardTask(taskId, { status: "failed" });
        console.error("Workflow execution failed:", e);
      }
      return;
    }
  }

  // Otherwise, run as a single-step PTY agent
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

const handleCreateConfirm = (name: string, workflowId?: string, workflowName?: string, schedule?: ScheduleConfig) => {
  const displayName = name.slice(0, 8);
  const task = taskStore.addBoardTask({
    name: displayName,
    status: "pending",
    workflowId,
    workflowName,
    agentName: "claude code",
    schedule: schedule?.enabled ? schedule : undefined,
  });
  taskStore.selectedTaskId = task.id;
  showCreateModal.value = false;
  startBoardAgent(task.id, name);
};

const handleSelectTask = (taskId: string) => {
  taskStore.selectedTaskId = taskId;
};
</script>

<style lang="scss" scoped>
.board-view {
  display: flex;
  flex: 1;
  min-height: 0;
  background-color: #ffffff;
  border-top: 1px solid #e5e5e5;
}
</style>
