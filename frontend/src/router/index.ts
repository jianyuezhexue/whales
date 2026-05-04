import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "project",
      component: () => import("../views/ProjectView.vue"),
    },
    {
      path: "/workflow",
      name: "workflow",
      component: () => import("../views/WorkflowView.vue"),
    },
    {
      path: "/agent",
      name: "agent",
      component: () => import("../views/AgentView.vue"),
    },
    {
      path: "/task",
      name: "task",
      component: () => import("../views/TaskView.vue"),
    },
    {
      path: "/evolution",
      name: "evolution",
      component: () => import("../views/EvolutionView.vue"),
    },
    {
      path: "/aui",
      name: "aui",
      component: () => import("../views/AuiView.vue"),
    },
    {
      path: "/skill",
      name: "skill",
      component: () => import("../views/SkillView.vue"),
    },
    {
      path: "/mcp",
      name: "mcp",
      component: () => import("../views/McpView.vue"),
    },
    {
      path: "/knowledge",
      name: "knowledge",
      component: () => import("../views/KnowledgeView.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/SettingsView.vue"),
    },
  ],
});

export default router;