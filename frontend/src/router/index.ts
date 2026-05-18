import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "project",
      component: () => import("../views/project/ProjectView.vue"),
    },
    {
      path: "/workflow",
      name: "workflow",
      component: () => import("../views/workflow/WorkflowGroupView.vue"),
    },
    {
      path: "/workflow/:groupId",
      name: "workflow-detail",
      component: () => import("../views/workflow/WorkflowView.vue"),
    },
    {
      path: "/agent",
      name: "agent",
      component: () => import("../views/agent/AgentView.vue"),
    },
    {
      path: "/task",
      name: "task",
      component: () => import("../views/task/TaskView.vue"),
    },
    {
      path: "/evolution",
      name: "evolution",
      component: () => import("../views/evolution/EvolutionView.vue"),
    },
    {
      path: "/aui",
      name: "aui",
      component: () => import("../views/aui/AuiView.vue"),
    },
    {
      path: "/skill",
      name: "skill",
      component: () => import("../views/skill/SkillView.vue"),
    },
    {
      path: "/mcp",
      name: "mcp",
      component: () => import("../views/mcp/McpView.vue"),
    },
    {
      path: "/knowledge",
      name: "knowledge",
      component: () => import("../views/knowledge/KnowledgeView.vue"),
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("../views/settings/SettingsView.vue"),
    },
  ],
});

export default router;
