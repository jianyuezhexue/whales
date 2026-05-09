import { ref } from "vue";
import { defineStore } from "pinia";
import type { Task } from "@/components/task/TaskList.vue";
import { EventsOn } from "../../wailsjs/runtime/runtime";

export const useTaskStore = defineStore("task", () => {
  const tasks = ref<Task[]>([]);
  const inputText = ref("");
  let nextId = 1;

  // PTY event bus: Wails EventsOn is registered once here (singleton store),
  // terminals subscribe/unsubscribe through this bus to avoid the Wails
  // EventsOff pitfall — EventsOff(eventName) removes ALL listeners for that
  // event, not just the one from the calling component.
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
  };
});
