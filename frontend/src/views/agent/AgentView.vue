<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import ConfirmModal from "@/components/ConfirmModal.vue";

const { t } = useI18n();

interface Skill {
  id: string;
  name: string;
  color: string;
}

interface McpItem {
  id: string;
  name: string;
  color: string;
}

interface Agent {
  id: string;
  name: string;
  avatar: string;
  description: string;
  workContent: string;
  skills: Skill[];
  mcps: McpItem[];
  createdAt: number;
}

// Mock skills
const allSkills = ref<Skill[]>([
  { id: "s1", name: "代码生成", color: "#6366f1" },
  { id: "s2", name: "代码审查", color: "#8b5cf6" },
  { id: "s3", name: "文档编写", color: "#0ea5e9" },
  { id: "s4", name: "测试生成", color: "#14b8a6" },
  { id: "s5", name: "需求分析", color: "#f59e0b" },
  { id: "s6", name: "架构设计", color: "#ef4444" },
  { id: "s7", name: "性能优化", color: "#f97316" },
  { id: "s8", name: "安全审计", color: "#ec4899" },
  { id: "s9", name: "部署运维", color: "#22c55e" },
  { id: "s10", name: "数据分析", color: "#06b6d4" },
]);

// Mock MCPs
const allMcps = ref<McpItem[]>([
  { id: "m1", name: "GitHub", color: "#1f1f1f" },
  { id: "m2", name: "Slack", color: "#4a154b" },
  { id: "m3", name: "PostgreSQL", color: "#336791" },
  { id: "m4", name: "Docker", color: "#2496ed" },
  { id: "m5", name: "Kubernetes", color: "#326ce5" },
  { id: "m6", name: "Redis", color: "#dc382d" },
  { id: "m7", name: "AWS S3", color: "#ff9900" },
  { id: "m8", name: "Jira", color: "#0052cc" },
]);

const getAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;

const agents = ref<Agent[]>([
  {
    id: "1",
    name: "CodePilot",
    avatar: getAvatarUrl("CodePilot"),
    description: "智能代码助手，擅长代码生成和审查",
    workContent: "负责项目的代码编写、审查和重构工作，确保代码质量和一致性",
    skills: [allSkills.value[0], allSkills.value[1]],
    mcps: [allMcps.value[0]],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "2",
    name: "TestGuard",
    avatar: getAvatarUrl("TestGuard"),
    description: "自动化测试专家",
    workContent: "编写和维护自动化测试用例，保障产品质量和稳定性",
    skills: [allSkills.value[3], allSkills.value[6]],
    mcps: [allMcps.value[0], allMcps.value[3]],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "3",
    name: "DocSmith",
    avatar: getAvatarUrl("DocSmith"),
    description: "技术文档撰写专家",
    workContent: "负责项目技术文档的撰写、更新和维护，确保文档的准确性和完整性",
    skills: [allSkills.value[2], allSkills.value[4]],
    mcps: [allMcps.value[7]],
    createdAt: Date.now() - 86400000,
  },
  {
    id: "4",
    name: "ArchMaster",
    avatar: getAvatarUrl("ArchMaster"),
    description: "系统架构设计专家",
    workContent: "负责系统架构设计和性能优化，制定技术方案和演进路线",
    skills: [allSkills.value[5], allSkills.value[6]],
    mcps: [allMcps.value[2], allMcps.value[4], allMcps.value[5]],
    createdAt: Date.now(),
  },
]);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingAgent = ref<Agent | null>(null);

const newAgent = ref({
  name: "",
  description: "",
  workContent: "",
  skillIds: [] as string[],
  mcpIds: [] as string[],
});

const editForm = ref({
  name: "",
  description: "",
  workContent: "",
  skillIds: [] as string[],
  mcpIds: [] as string[],
});

const skillDropdownOpen = ref(false);
const mcpDropdownOpen = ref(false);
const editSkillDropdownOpen = ref(false);
const editMcpDropdownOpen = ref(false);

const createModalRef = ref<HTMLElement | null>(null);
const editModalRef = ref<HTMLElement | null>(null);

const skillDropup = ref(false);
const mcpDropup = ref(false);
const editSkillDropup = ref(false);
const editMcpDropup = ref(false);

const checkDropDirection = (triggerEl: HTMLElement, modalEl: HTMLElement | null) => {
  if (!modalEl) return false;
  const triggerRect = triggerEl.getBoundingClientRect();
  const modalRect = modalEl.getBoundingClientRect();
  const spaceBelow = modalRect.bottom - triggerRect.bottom;
  return spaceBelow < 200;
};

const newSelectedSkills = computed(() =>
  newAgent.value.skillIds
    .map((id) => allSkills.value.find((s) => s.id === id))
    .filter(Boolean) as Skill[]
);

const newSelectedMcps = computed(() =>
  newAgent.value.mcpIds
    .map((id) => allMcps.value.find((m) => m.id === id))
    .filter(Boolean) as McpItem[]
);

const editSelectedSkills = computed(() =>
  editForm.value.skillIds
    .map((id) => allSkills.value.find((s) => s.id === id))
    .filter(Boolean) as Skill[]
);

const editSelectedMcps = computed(() =>
  editForm.value.mcpIds
    .map((id) => allMcps.value.find((m) => m.id === id))
    .filter(Boolean) as McpItem[]
);

const toggleNewSkill = (id: string) => {
  const idx = newAgent.value.skillIds.indexOf(id);
  if (idx >= 0) newAgent.value.skillIds.splice(idx, 1);
  else newAgent.value.skillIds.push(id);
};

const toggleNewMcp = (id: string) => {
  const idx = newAgent.value.mcpIds.indexOf(id);
  if (idx >= 0) newAgent.value.mcpIds.splice(idx, 1);
  else newAgent.value.mcpIds.push(id);
};

const toggleEditSkill = (id: string) => {
  const idx = editForm.value.skillIds.indexOf(id);
  if (idx >= 0) editForm.value.skillIds.splice(idx, 1);
  else editForm.value.skillIds.push(id);
};

const toggleEditMcp = (id: string) => {
  const idx = editForm.value.mcpIds.indexOf(id);
  if (idx >= 0) editForm.value.mcpIds.splice(idx, 1);
  else editForm.value.mcpIds.push(id);
};

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const openCreateModal = () => {
  newAgent.value = { name: "", description: "", workContent: "", skillIds: [], mcpIds: [] };
  showCreateModal.value = true;
};

const createAgent = () => {
  if (!newAgent.value.name.trim()) return;
  agents.value.push({
    id: String(Date.now()),
    name: newAgent.value.name.trim(),
    avatar: getAvatarUrl(newAgent.value.name.trim()),
    description: newAgent.value.description.trim(),
    workContent: newAgent.value.workContent.trim(),
    skills: newAgent.value.skillIds
      .map((id) => allSkills.value.find((s) => s.id === id))
      .filter(Boolean) as Skill[],
    mcps: newAgent.value.mcpIds
      .map((id) => allMcps.value.find((m) => m.id === id))
      .filter(Boolean) as McpItem[],
    createdAt: Date.now(),
  });
  showCreateModal.value = false;
};

const deleteAgent = (id: string) => {
  agents.value = agents.value.filter((a) => a.id !== id);
};

const showDeleteModal = ref(false);
const deletingAgent = ref<Agent | null>(null);

const confirmDelete = (agent: Agent) => {
  deletingAgent.value = agent;
  showDeleteModal.value = true;
};

const onDeleteConfirm = () => {
  if (!deletingAgent.value) return;
  deleteAgent(deletingAgent.value.id);
  showDeleteModal.value = false;
  deletingAgent.value = null;
};

const onDeleteCancel = () => {
  showDeleteModal.value = false;
  deletingAgent.value = null;
};

const openEditModal = (agent: Agent) => {
  editingAgent.value = agent;
  editForm.value = {
    name: agent.name,
    description: agent.description,
    workContent: agent.workContent,
    skillIds: agent.skills.map((s) => s.id),
    mcpIds: agent.mcps.map((m) => m.id),
  };
  showEditModal.value = true;
};

const updateAgent = () => {
  if (!editingAgent.value || !editForm.value.name.trim()) return;
  const idx = agents.value.findIndex((a) => a.id === editingAgent.value!.id);
  if (idx !== -1) {
    agents.value[idx] = {
      ...agents.value[idx],
      name: editForm.value.name.trim(),
      avatar: getAvatarUrl(editForm.value.name.trim()),
      description: editForm.value.description.trim(),
      workContent: editForm.value.workContent.trim(),
      skills: editForm.value.skillIds
        .map((id) => allSkills.value.find((s) => s.id === id))
        .filter(Boolean) as Skill[],
      mcps: editForm.value.mcpIds
        .map((id) => allMcps.value.find((m) => m.id === id))
        .filter(Boolean) as McpItem[],
    };
  }
  showEditModal.value = false;
};

const closeSkillDropdown = () => {
  skillDropdownOpen.value = false;
};
const closeMcpDropdown = () => {
  mcpDropdownOpen.value = false;
};
const closeEditSkillDropdown = () => {
  editSkillDropdownOpen.value = false;
};
const closeEditMcpDropdown = () => {
  editMcpDropdownOpen.value = false;
};

const openSkillDropdown = (e: MouseEvent) => {
  skillDropdownOpen.value = !skillDropdownOpen.value;
  if (skillDropdownOpen.value) {
    nextTick(() => {
      skillDropup.value = checkDropDirection(e.currentTarget as HTMLElement, createModalRef.value);
    });
  }
};
const openMcpDropdown = (e: MouseEvent) => {
  mcpDropdownOpen.value = !mcpDropdownOpen.value;
  if (mcpDropdownOpen.value) {
    nextTick(() => {
      mcpDropup.value = checkDropDirection(e.currentTarget as HTMLElement, createModalRef.value);
    });
  }
};
const openEditSkillDropdown = (e: MouseEvent) => {
  editSkillDropdownOpen.value = !editSkillDropdownOpen.value;
  if (editSkillDropdownOpen.value) {
    nextTick(() => {
      editSkillDropup.value = checkDropDirection(e.currentTarget as HTMLElement, editModalRef.value);
    });
  }
};
const openEditMcpDropdown = (e: MouseEvent) => {
  editMcpDropdownOpen.value = !editMcpDropdownOpen.value;
  if (editMcpDropdownOpen.value) {
    nextTick(() => {
      editMcpDropup.value = checkDropDirection(e.currentTarget as HTMLElement, editModalRef.value);
    });
  }
};
</script>

<template>
  <div class="agent-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t("agentpage.title") }}</h1>
      <div class="header-actions">
        <button class="add-btn" type="button" @click="openCreateModal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{{ t("agentpage.add") }}</span>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="agents.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M9 1v3" /><path d="M15 1v3" /><path d="M9 20v3" /><path d="M15 20v3" />
        <path d="M20 9h3" /><path d="M20 14h3" /><path d="M1 9h3" /><path d="M1 14h3" />
      </svg>
      <div class="empty-title">{{ t("agentpage.empty-title") }}</div>
      <div class="empty-subtitle">{{ t("agentpage.empty-subtitle") }}</div>
    </div>

    <!-- Agent grid -->
    <div v-else class="agent-grid">
      <div v-for="agent in agents" :key="agent.id" class="agent-card">
        <div class="card-header">
          <div class="card-avatar">
            <img :src="agent.avatar" :alt="agent.name" />
          </div>
          <div class="card-name">{{ agent.name }}</div>
          <div class="card-actions">
            <button class="card-action-btn" type="button" :title="t('agentpage.edit')" @click="openEditModal(agent)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="card-action-btn card-delete" type="button" :title="t('agentpage.delete')" @click="confirmDelete(agent)">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
        <div class="card-desc">{{ agent.description }}</div>
        <div class="card-work">{{ agent.workContent }}</div>
        <div class="card-tags">
          <div v-if="agent.skills.length" class="tag-group">
            <span v-for="skill in agent.skills" :key="skill.id" class="tag" :style="{ '--tag-color': skill.color }">
              {{ skill.name }}
            </span>
          </div>
          <div v-if="agent.mcps.length" class="tag-group">
            <span v-for="mcp in agent.mcps" :key="mcp.id" class="tag tag-mcp" :style="{ '--tag-color': mcp.color }">
              {{ mcp.name }}
            </span>
          </div>
        </div>
        <div class="card-footer">
          <span class="card-date">{{ formatDate(agent.createdAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-panel" ref="createModalRef">
        <div class="modal-title">{{ t("agentpage.add") }}</div>
        <div class="modal-body">
          <!-- Avatar + Name on same row -->
          <div class="form-row">
            <div class="avatar-field-compact">
              <div class="avatar-preview">
                <img
                  v-if="newAgent.name.trim()"
                  :src="getAvatarUrl(newAgent.name.trim())"
                  alt="avatar preview"
                />
                <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#d0d0d0" stroke-width="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </div>
            </div>
            <div class="form-field form-field-flex">
              <!-- <label class="form-label">{{ t("agentpage.name") }}</label> -->
              <input v-model="newAgent.name" class="form-input" type="text" :placeholder="t('agentpage.name-placeholder')" />
            </div>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.description") }}</label>
            <textarea v-model="newAgent.description" class="form-input form-textarea" :placeholder="t('agentpage.desc-placeholder')" rows="2"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.work-content") }}</label>
            <textarea v-model="newAgent.workContent" class="form-input form-textarea" :placeholder="t('agentpage.work-placeholder')" rows="3"></textarea>
          </div>

          <!-- Skills multi-select -->
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.skills") }}</label>
            <div class="multi-select" v-click-outside="closeSkillDropdown">
              <div class="multi-select-trigger" @click="openSkillDropdown">
                <div class="multi-select-tags">
                  <span v-for="skill in newSelectedSkills" :key="skill.id" class="tag" :style="{ '--tag-color': skill.color }">
                    {{ skill.name }}
                    <span class="tag-remove" @click.stop="toggleNewSkill(skill.id)">&times;</span>
                  </span>
                  <span v-if="newSelectedSkills.length === 0" class="multi-select-placeholder">{{ t('agentpage.skills-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: skillDropdownOpen }" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="skillDropdownOpen" class="multi-select-dropdown" :class="{ dropup: skillDropup }">
                <div v-for="skill in allSkills" :key="skill.id" class="multi-select-option" :class="{ selected: newAgent.skillIds.includes(skill.id) }" @click="toggleNewSkill(skill.id)">
                  <span class="option-check">
                    <svg v-if="newAgent.skillIds.includes(skill.id)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: skill.color }"></span>
                  {{ skill.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- MCP multi-select -->
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.mcp") }}</label>
            <div class="multi-select" v-click-outside="closeMcpDropdown">
              <div class="multi-select-trigger" @click="openMcpDropdown">
                <div class="multi-select-tags">
                  <span v-for="mcp in newSelectedMcps" :key="mcp.id" class="tag tag-mcp" :style="{ '--tag-color': mcp.color }">
                    {{ mcp.name }}
                    <span class="tag-remove" @click.stop="toggleNewMcp(mcp.id)">&times;</span>
                  </span>
                  <span v-if="newSelectedMcps.length === 0" class="multi-select-placeholder">{{ t('agentpage.mcp-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: mcpDropdownOpen }" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="mcpDropdownOpen" class="multi-select-dropdown" :class="{ dropup: mcpDropup }">
                <div v-for="mcp in allMcps" :key="mcp.id" class="multi-select-option" :class="{ selected: newAgent.mcpIds.includes(mcp.id) }" @click="toggleNewMcp(mcp.id)">
                  <span class="option-check">
                    <svg v-if="newAgent.mcpIds.includes(mcp.id)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: mcp.color }"></span>
                  {{ mcp.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showCreateModal = false">{{ t("agentpage.cancel") }}</button>
          <button class="btn btn-confirm" type="button" @click="createAgent">{{ t("agentpage.confirm") }}</button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-panel" ref="editModalRef">
        <div class="modal-title">{{ t("agentpage.edit") }}</div>
        <div class="modal-body">
          <!-- Avatar + Name on same row -->
          <div class="form-row">
            <div class="avatar-field-compact">
              <div class="avatar-preview">
                <img v-if="editForm.name.trim()" :src="getAvatarUrl(editForm.name.trim())" alt="avatar preview" />
                <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#d0d0d0" stroke-width="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                </svg>
              </div>
            </div>
            <div class="form-field form-field-flex">
              <!-- <label class="form-label">{{ t("agentpage.name") }}</label> -->
              <input v-model="editForm.name" class="form-input" type="text" :placeholder="t('agentpage.name-placeholder')" />
            </div>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.description") }}</label>
            <textarea v-model="editForm.description" class="form-input form-textarea" :placeholder="t('agentpage.desc-placeholder')" rows="2"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.work-content") }}</label>
            <textarea v-model="editForm.workContent" class="form-input form-textarea" :placeholder="t('agentpage.work-placeholder')" rows="3"></textarea>
          </div>

          <!-- Skills multi-select -->
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.skills") }}</label>
            <div class="multi-select" v-click-outside="closeEditSkillDropdown">
              <div class="multi-select-trigger" @click="openEditSkillDropdown">
                <div class="multi-select-tags">
                  <span v-for="skill in editSelectedSkills" :key="skill.id" class="tag" :style="{ '--tag-color': skill.color }">
                    {{ skill.name }}
                    <span class="tag-remove" @click.stop="toggleEditSkill(skill.id)">&times;</span>
                  </span>
                  <span v-if="editSelectedSkills.length === 0" class="multi-select-placeholder">{{ t('agentpage.skills-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: editSkillDropdownOpen }" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="editSkillDropdownOpen" class="multi-select-dropdown" :class="{ dropup: editSkillDropup }">
                <div v-for="skill in allSkills" :key="skill.id" class="multi-select-option" :class="{ selected: editForm.skillIds.includes(skill.id) }" @click="toggleEditSkill(skill.id)">
                  <span class="option-check">
                    <svg v-if="editForm.skillIds.includes(skill.id)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: skill.color }"></span>
                  {{ skill.name }}
                </div>
              </div>
            </div>
          </div>

          <!-- MCP multi-select -->
          <div class="form-field">
            <label class="form-label">{{ t("agentpage.mcp") }}</label>
            <div class="multi-select" v-click-outside="closeEditMcpDropdown">
              <div class="multi-select-trigger" @click="openEditMcpDropdown">
                <div class="multi-select-tags">
                  <span v-for="mcp in editSelectedMcps" :key="mcp.id" class="tag tag-mcp" :style="{ '--tag-color': mcp.color }">
                    {{ mcp.name }}
                    <span class="tag-remove" @click.stop="toggleEditMcp(mcp.id)">&times;</span>
                  </span>
                  <span v-if="editSelectedMcps.length === 0" class="multi-select-placeholder">{{ t('agentpage.mcp-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: editMcpDropdownOpen }" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="editMcpDropdownOpen" class="multi-select-dropdown" :class="{ dropup: editMcpDropup }">
                <div v-for="mcp in allMcps" :key="mcp.id" class="multi-select-option" :class="{ selected: editForm.mcpIds.includes(mcp.id) }" @click="toggleEditMcp(mcp.id)">
                  <span class="option-check">
                    <svg v-if="editForm.mcpIds.includes(mcp.id)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: mcp.color }"></span>
                  {{ mcp.name }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showEditModal = false">{{ t("agentpage.cancel") }}</button>
          <button class="btn btn-confirm" type="button" @click="updateAgent">{{ t("agentpage.confirm") }}</button>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-if="showDeleteModal"
      :title="t('agentpage.delete-confirm-title')"
      :message="t('agentpage.delete-confirm-msg', { name: deletingAgent?.name })"
      :confirm-text="t('agentpage.delete')"
      :danger="true"
      @confirm="onDeleteConfirm"
      @cancel="onDeleteCancel"
    />
  </div>
</template>

<style lang="scss" scoped>
.agent-page {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.85;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 12px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: #9a9a9a;
  }
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.agent-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background-color: #ffffff;
  transition: all 0.15s ease;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .card-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .card-name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f1f1f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-desc {
    font-size: 12px;
    color: #6b6b6b;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
  }

  .card-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  &:hover .card-actions {
    opacity: 1;
  }

  .card-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #9a9a9a;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: #ececec;
      color: #1f1f1f;
    }

    &.card-delete:hover {
      background-color: #f0f0f0;
      color: #e74c3c;
    }
  }

  .card-work {
    font-size: 12px;
    color: #4a4a4a;
    line-height: 1.5;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .tag-group {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--tag-color);
    background-color: color-mix(in srgb, var(--tag-color) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color) 20%, transparent);
    white-space: nowrap;
  }

  .tag-mcp {
    font-style: italic;
  }

  .card-footer {
    margin-top: auto;

    .card-date {
      font-size: 11px;
      color: #9a9a9a;
    }
  }
}

// Modal styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-panel {
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    padding: 20px 24px 0;
    flex-shrink: 0;
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
}

// Avatar + Name same row
.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-field-compact {
  flex-shrink: 0;
}

.avatar-preview {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e5e5;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.form-field-flex {
  flex: 1;
  min-width: 0;
}

// Form fields
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .form-label {
    font-size: 13px;
    font-weight: 500;
    color: #4a4a4a;
  }

  .form-input {
    height: 32px;
    padding: 0 10px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    transition: border-color 0.15s ease;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }

  .form-textarea {
    height: auto;
    min-height: 56px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.5;
  }
}

// Multi-select
.multi-select {
  position: relative;
}

.multi-select-trigger {
  display: flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: #d0d0d0;
  }
}

.multi-select-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 24px;
  align-items: center;
}

.multi-select-placeholder {
  font-size: 13px;
  color: #c0c0c0;
}

.multi-select-arrow {
  flex-shrink: 0;
  margin-left: 4px;
  color: #9a9a9a;
  transition: transform 0.15s ease;

  &.open {
    transform: rotate(180deg);
  }
}

.tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--tag-color);
  background-color: color-mix(in srgb, var(--tag-color) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tag-color) 20%, transparent);
  white-space: nowrap;
  gap: 4px;

  .tag-remove {
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 1;
    }
  }
}

.tag-mcp {
  font-style: italic;
}

.multi-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  z-index: 50;

  &.dropup {
    top: auto;
    bottom: calc(100% + 4px);
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
  }
}

.multi-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 8px;
  font-size: 13px;
  color: #1f1f1f;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.1s ease;

  &:hover {
    background-color: #f5f5f5;
  }

  &.selected {
    background-color: #f0f0f0;
  }
}

.option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #1f1f1f;
}

.option-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

// Buttons
.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;

  &.btn-cancel {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #4a4a4a;

    &:hover {
      background-color: #f5f5f5;
    }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>