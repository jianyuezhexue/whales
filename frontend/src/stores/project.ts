import { ref, computed } from "vue";
import { defineStore } from "pinia";

export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  workflowGroupId: string;
  createdAt: number;
}

export const useProjectStore = defineStore("project", () => {
  const projects = ref<Project[]>([
    {
      id: "1",
      name: "Whales",
      description: "AI Agent 桌面客户端",
      path: "/Users/wang/code/whales",
      workflowGroupId: "g1",
      createdAt: Date.now() - 86400000,
    }
  ]);

  const currentProjectId = ref<string | null>("1");

  const currentProject = computed(() =>
    projects.value.find((p) => p.id === currentProjectId.value) ?? null
  );

  function setCurrentProject(id: string) {
    currentProjectId.value = id;
  }

  function addProject(project: Omit<Project, "id" | "createdAt">) {
    projects.value.push({
      id: String(Date.now()),
      ...project,
      createdAt: Date.now(),
    });
  }

  function updateProject(id: string, data: Partial<Pick<Project, "name" | "description" | "path" | "workflowGroupId">>) {
    const idx = projects.value.findIndex((p) => p.id === id);
    if (idx !== -1) {
      projects.value[idx] = { ...projects.value[idx], ...data };
    }
  }

  function deleteProject(id: string) {
    projects.value = projects.value.filter((p) => p.id !== id);
    if (currentProjectId.value === id) {
      currentProjectId.value = projects.value.length > 0 ? projects.value[0].id : null;
    }
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    setCurrentProject,
    addProject,
    updateProject,
    deleteProject,
  };
});