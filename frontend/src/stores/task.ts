import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { EventsOn } from "../../wailsjs/runtime/runtime";

export interface TaskNodeResult {
  nodeId: string;
  nodeName: string;
  auiId?: string;           // AUI ref (e.g. "builtin:table" | "instance:<uuid>" | "plugin:<id>")
  auiData?: any;            // Parsed structured data for AUI rendering
  rawOutput?: string;       // Raw agent output text
  outputFilePath?: string;  // Path to result data file
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;      // Execution duration in milliseconds
}

export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  workflowId?: string;
  workflowName?: string;
  agentName?: string;
  parentId?: string;
  createdAt?: string;
  result?: string;
  resultSummary?: string;
  source?: "user" | "ai";
  executionLog?: string;
  schedule?: {
    enabled: boolean;
    mode: "interval" | "daily";
    intervalValue: number;
    intervalUnit: "seconds" | "minutes" | "hours";
    dailyTime: string;
  };
  // Workflow execution state
  nodeResults?: TaskNodeResult[];
  currentNodeIndex?: number;
}

export const useTaskStore = defineStore("task", () => {
  const tasks = ref<Task[]>([]);
  const inputText = ref("");
  let nextId = 1;

  // ── Board state ──
  const boardTasks = ref<Task[]>([]);
  const selectedTaskId = ref<string | null>(null);
  const viewMode = ref<"terminal" | "board">("board");
  let boardNextId = 1;

  const rootTasks = computed(() =>
    boardTasks.value.filter((t) => !t.parentId),
  );

  function childrenOf(parentId: string): Task[] {
    return boardTasks.value.filter((t) => t.parentId === parentId);
  }

  // ── Board CRUD ──
  // Board IDs use "b" prefix to avoid collision with terminal task IDs
  function addBoardTask(task: Omit<Task, "id" | "createdAt">) {
    const id = `b${boardNextId++}`;
    const newTask: Task = {
      ...task,
      id,
      createdAt: new Date().toLocaleString(),
    };
    boardTasks.value.push(newTask);
    return newTask;
  }

  function removeBoardTask(taskId: string) {
    // Stop PTY if running
    try {
      const win = window as any;
      if (win.go?.app?.App?.PtyStop) {
        win.go.app.App.PtyStop(taskId);
      }
    } catch {
      // Wails not available
    }
    // Clean up subscription
    unsubscribeBoard(taskId);
    // Also clean up children's subscriptions
    boardTasks.value
      .filter((t) => t.parentId === taskId)
      .forEach((child) => unsubscribeBoard(child.id));

    const idx = boardTasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      boardTasks.value.splice(idx, 1);
    }
    // Also remove children
    boardTasks.value = boardTasks.value.filter((t) => t.parentId !== taskId);
    if (selectedTaskId.value === taskId) {
      selectedTaskId.value = null;
    }
  }

  function updateBoardTask(taskId: string, updates: Partial<Task>) {
    const task = boardTasks.value.find((t) => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
    }
  }

  function addSubTask(parentId: string, name: string, source: "user" | "ai" = "user") {
    const parent = boardTasks.value.find((t) => t.id === parentId);
    if (!parent) return;
    const id = `b${boardNextId++}`;
    const subTask: Task = {
      id,
      name,
      status: "pending",
      parentId,
      source,
      createdAt: new Date().toLocaleString(),
    };
    boardTasks.value.push(subTask);
    return subTask;
  }

  function toggleSubTaskDone(taskId: string) {
    const task = boardTasks.value.find((t) => t.id === taskId);
    if (!task || !task.parentId) return;
    task.status = task.status === "completed" ? "pending" : "completed";
  }

  // ── Node result helpers ──
  function initNodeResults(taskId: string, nodes: { id: string; name: string; aui?: string }[]) {
    const task = boardTasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.nodeResults = nodes.map((n) => ({
      nodeId: n.id,
      nodeName: n.name,
      auiId: n.aui,
      status: "pending" as const,
    }));
    task.currentNodeIndex = 0;
  }

  function updateNodeResult(taskId: string, nodeId: string, updates: Partial<TaskNodeResult>) {
    const task = boardTasks.value.find((t) => t.id === taskId);
    if (!task || !task.nodeResults) return;
    const nr = task.nodeResults.find((n) => n.nodeId === nodeId);
    if (nr) Object.assign(nr, updates);
  }

  function getNodeResult(taskId: string, nodeId: string): TaskNodeResult | undefined {
    const task = boardTasks.value.find((t) => t.id === taskId);
    return task?.nodeResults?.find((n) => n.nodeId === nodeId);
  }

  // Board-specific PTY subscription helpers
  let boardSubscriptions = new Map<string, () => void>();

  function subscribeBoard(
    taskId: string,
    onData: (data: string) => void,
    onExit: () => void,
  ) {
    // Clean up any existing subscription for this task
    const existing = boardSubscriptions.get(taskId);
    if (existing) existing();

    const unsub = subscribe(taskId, onData, onExit);
    boardSubscriptions.set(taskId, unsub);
  }

  function unsubscribeBoard(taskId: string) {
    const unsub = boardSubscriptions.get(taskId);
    if (unsub) {
      unsub();
      boardSubscriptions.delete(taskId);
    }
  }

  // ── PTY event bus ──
  const dataListeners = new Map<string, Set<(data: string) => void>>();
  const exitListeners = new Map<string, Set<() => void>>();
  let wailsRegistered = false;

  function ensureWailsListeners() {
    if (wailsRegistered) return;
    wailsRegistered = true;

    EventsOn("pty-output", (taskId: string, data: string) => {
      dataListeners.get(taskId)?.forEach((fn) => fn(data));
    });

    EventsOn("pty-exit", (taskId: string) => {
      exitListeners.get(taskId)?.forEach((fn) => fn());
    });
  }

  function subscribe(
    taskId: string,
    onData: (data: string) => void,
    onExit: () => void,
  ) {
    ensureWailsListeners();

    if (!dataListeners.has(taskId)) dataListeners.set(taskId, new Set());
    dataListeners.get(taskId)!.add(onData);

    if (!exitListeners.has(taskId)) exitListeners.set(taskId, new Set());
    exitListeners.get(taskId)!.add(onExit);

    return () => {
      dataListeners.get(taskId)?.delete(onData);
      exitListeners.get(taskId)?.delete(onExit);
    };
  }

  function addTask(task: Omit<Task, "id">) {
    const id = String(nextId++);
    const newTask: Task = { id, ...task };
    tasks.value.push(newTask);
    return newTask;
  }

  function removeTask(taskId: string) {
    const idx = tasks.value.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      tasks.value.splice(idx, 1);
    }
    dataListeners.delete(taskId);
    exitListeners.delete(taskId);
  }

  function updateTask(taskId: string, updates: Partial<Task>) {
    const task = tasks.value.find((t) => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
    }
  }

  return {
    tasks,
    inputText,
    subscribe,
    addTask,
    removeTask,
    updateTask,
    // Board
    boardTasks,
    selectedTaskId,
    viewMode,
    rootTasks,
    childrenOf,
    addBoardTask,
    removeBoardTask,
    updateBoardTask,
    addSubTask,
    toggleSubTaskDone,
    initNodeResults,
    updateNodeResult,
    getNodeResult,
    subscribeBoard,
    unsubscribeBoard,
  };
});
