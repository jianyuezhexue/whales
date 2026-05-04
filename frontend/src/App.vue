<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import logoPng from "@/assets/logo.png";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useProjectStore } from "@/stores/project";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

// Sidebar collapse state
const collapsed = ref(false);
const toggleSidebar = () => {
  collapsed.value = !collapsed.value;
};

// Menu items
const menuItems = computed(() => [
  // { key: "dashboard", icon: "dashboard", route: "" },
  { key: "project", icon: "project", route: "/" },
  { key: "agent", icon: "agent", route: "/agent" },
  { key: "workflow", icon: "workflow", route: "/workflow" },
  { key: "task", icon: "task", route: "/task" },
  { key: "evolution", icon: "evolution", route: "/evolution" },
  { key: "aui", icon: "aui", route: "/aui" },
  { key: "skill", icon: "skill", route: "/skill" },
  { key: "mcp", icon: "mcp", route: "/mcp" },
  { key: "knowledge", icon: "knowledge", route: "/knowledge" },
]);

const activeMenu = computed(() => {
  const item = menuItems.value.find((m) => m.route === route.path);
  return item ? item.key : "";
});

const selectMenu = (key: string) => {
  const item = menuItems.value.find((m) => m.key === key);
  if (item && item.route) {
    router.push(item.route);
  }
};

const openSettings = () => {
  router.push("/settings");
};

// Project dropdown
const projectOpen = ref(false);
const projectRef = ref<HTMLElement | null>(null);
const toggleProject = () => {
  projectOpen.value = !projectOpen.value;
};
const selectProject = (id: string) => {
  projectStore.setCurrentProject(id);
  projectOpen.value = false;
};
const onDocumentClick = (e: MouseEvent) => {
  if (!projectRef.value) return;
  if (!projectRef.value.contains(e.target as Node)) {
    projectOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
  <div class="app-shell" :class="{ 'is-collapsed': collapsed }">
    <!-- Left sidebar (extends from top to bottom) -->
    <aside class="sidebar">
      <div class="sidebar-top"></div>

      <div class="workspace">
        <div class="workspace-icon">
          <img :src="logoPng" alt="logo" width="22" height="18" class="workspace-logo" />
        </div>
        <div v-if="!collapsed" class="workspace-info">
          <div class="workspace-title">{{ t("homepage.workspace-title") }}</div>
          <div class="workspace-subtitle">{{ t("homepage.workspace-subtitle") }}</div>
        </div>
      </div>

      <nav class="menu-list">
        <div v-for="item in menuItems" :key="item.key" class="menu-item"
          :class="{ active: activeMenu === item.key }" @click="selectMenu(item.key)">
          <!-- 项目管理: folder -->
          <svg v-if="item.icon === 'project'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <!-- Agent管理: bot/cpu -->
          <svg v-else-if="item.icon === 'agent'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <path d="M9 1v3" /><path d="M15 1v3" /><path d="M9 20v3" /><path d="M15 20v3" />
            <path d="M20 9h3" /><path d="M20 14h3" /><path d="M1 9h3" /><path d="M1 14h3" />
          </svg>
          <!-- 工作流管理: git-branch -->
          <svg v-else-if="item.icon === 'workflow'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="3" x2="6" y2="15" />
            <circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
            <path d="M18 9a9 9 0 0 1-9 9" />
          </svg>
          <!-- 任务管理: list-checks -->
          <svg v-else-if="item.icon === 'task'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <!-- 自进化管理: refresh-cw / cycles -->
          <svg v-else-if="item.icon === 'evolution'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M21 21v-5h-5" />
          </svg>
          <!-- AUI管理: layout/dashboard -->
          <svg v-else-if="item.icon === 'aui'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <!-- 技能管理: zap -->
          <svg v-else-if="item.icon === 'skill'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <!-- MCP管理: plug -->
          <svg v-else-if="item.icon === 'mcp'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" />
            <path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8" />
          </svg>
          <!-- 控制面板: layout-dashboard -->
          <svg v-else-if="item.icon === 'dashboard'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <!-- 知识管理: book-open -->
          <svg v-else-if="item.icon === 'knowledge'" class="menu-icon" viewBox="0 0 24 24" width="16" height="16"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span v-if="!collapsed" class="menu-name">{{ t("menu." + item.key) }}</span>
        </div>
      </nav>

      <!-- 设置 -->
      <div class="sidebar-footer">
        <button class="settings-btn" type="button" @click="openSettings">
          <svg class="settings-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span v-if="!collapsed" class="settings-name">{{ t("homepage.settings") }}</span>
        </button>
      </div>
    </aside>

    <!-- Main pane -->
    <main class="main">
      <header class="main-header">
        <button class="toggle-btn" type="button" @click="toggleSidebar" :title="t('homepage.toggle-sidebar')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
        </button>
        <div class="header-right" ref="projectRef">
          <div class="project-dropdown" :class="{ open: projectOpen }">
            <button class="project-trigger" type="button" @click="toggleProject">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{{ projectStore.currentProject?.name || t("homepage.workspace-title") }}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <ul v-if="projectOpen" class="project-list">
              <li v-for="project in projectStore.projects" :key="project.id"
                :class="{ active: project.id === projectStore.currentProjectId }"
                @click="selectProject(project.id)">
                {{ project.name }}
              </li>
            </ul>
          </div>
        </div>
      </header>
      <div class="main-body">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style lang="scss">
@import url("./assets/css/reset.css");
@import url("./assets/css/font.css");
@import url("./assets/css/page.css");

html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
}

body {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: "JetBrainsMono";
  background-color: transparent;
  overflow: hidden;
  overscroll-behavior: none;
}

#app {
  position: relative;
  height: 100%;
  background-color: #ffffff;
  overflow: hidden;
}

.app-shell {
  --wails-draggable: drag;
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  color: #1f1f1f;
  font-family: "JetBrainsMono", sans-serif;

  .sidebar {
    --wails-draggable: drag;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: 200px;
    height: 100%;
    padding: 0 8px 12px;
    border-right: 1px solid #e5e5e5;
    background-color: #fafafa;
    box-sizing: border-box;
    transition: width 0.2s ease;
  }

  &.is-collapsed .sidebar {
    width: 80px;
  }

  &.is-collapsed .workspace {
    padding: 8px 16px;
  }

  // Reserve space for macOS traffic-light buttons
  .sidebar-top {
    height: 40px;
    flex-shrink: 0;
  }

  .workspace {
    --wails-draggable: no-drag;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 8px;
    margin-bottom: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: padding 0.2s ease;

    &:hover {
      background-color: #f0f0f0;
    }

    .workspace-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      background-color: #1f1f1f;
      color: #ffffff;
      border-radius: 6px;
      overflow: hidden;

      .workspace-logo {
        transform: scale(1.8);
      }
    }

    .workspace-info {
      flex: 1;
      min-width: 0;
      margin-left: 10px;

      .workspace-title {
        font-size: 14px;
        font-weight: 700;
        color: #1f1f1f;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace-subtitle {
        margin-top: 2px;
        font-size: 12px;
        color: #9a9a9a;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .workspace-switch {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      background: transparent;
      color: #6b6b6b;
      cursor: pointer;
      border-radius: 4px;
      flex-shrink: 0;

      &:hover {
        background-color: #ececec;
      }
    }
  }

  .menu-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 2px;

    .menu-item {
      --wails-draggable: no-drag;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      height: 36px;
      padding: 0 10px;
      margin-bottom: 2px;
      border-radius: 6px;
      color: #4a4a4a;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      transition: padding 0.2s ease;

      .menu-icon {
        color: #6b6b6b;
        flex-shrink: 0;
      }

      .menu-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &:hover {
        background-color: #f0f0f0;
      }

      &.active {
        background-color: #ececec;
        color: #1f1f1f;
        font-weight: 600;

        .menu-icon {
          color: #1f1f1f;
        }
      }
    }
  }

  &.is-collapsed .menu-item {
    padding: 0 22px;
  }

  .sidebar-footer {
    padding-top: 8px;

    .settings-btn {
      --wails-draggable: no-drag;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      width: 100%;
      height: 36px;
      padding: 0 10px;
      border: none;
      background-color: transparent;
      transition: padding 0.2s ease;
      color: #4a4a4a;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;

      .settings-icon {
        color: #6b6b6b;
        flex-shrink: 0;
      }

      .settings-name {
        flex: 1;
        text-align: left;
      }

      .settings-shortcut {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 22px;
        padding: 0 6px;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background-color: #ffffff;
        font-size: 11px;
        color: #6b6b6b;
      }

      &:hover {
        background-color: #f0f0f0;
      }
    }
  }

  &.is-collapsed .settings-btn {
    padding: 0 24px;
  }

  .main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    height: 100%;
    background-color: #ffffff;

    .main-header {
      --wails-draggable: drag;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 40px;
      padding: 0 12px;
      flex-shrink: 0;

      .toggle-btn {
        --wails-draggable: no-drag;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 0;
        border: none;
        background-color: transparent;
        color: #1f1f1f;
        border-radius: 6px;
        cursor: pointer;

        &:hover {
          background-color: #f0f0f0;
        }
      }

      .header-right {
        --wails-draggable: no-drag;
        padding-top: 10px;
        padding-right: 5px;
        display: flex;
        align-items: center;
      }
    }

    .main-body {
      --wails-draggable: no-drag;
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 20px;
    }
  }

  .project-dropdown {
    position: relative;

    .project-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid #e0e0e0;
      background-color: #ffffff;
      color: #1f1f1f;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;

      &:hover {
        background-color: #f5f5f5;
      }

      svg {
        transition: transform 0.15s ease;
      }
    }

    &.open .project-trigger svg:last-child {
      transform: rotate(180deg);
    }

    .project-list {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 160px;
      margin: 0;
      padding: 4px;
      list-style: none;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      z-index: 10;

      li {
        padding: 6px 10px;
        font-size: 13px;
        color: #1f1f1f;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background-color: #f0f0f0;
        }

        &.active {
          background-color: #ececec;
          font-weight: 600;
        }
      }
    }
  }
}
</style>
