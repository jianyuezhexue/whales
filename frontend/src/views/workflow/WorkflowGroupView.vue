<template>
  <div class="group-view page-layout">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t("grouppage.title") }}</h1>
      <div class="header-actions">
        <!-- Groups tab actions -->
        <template v-if="activeTab === 'groups'">
          <div class="header-search">
            <svg class="search-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input v-model="groupSearchQuery" class="search-input" type="text" :placeholder="t('grouppage.search')" />
          </div>
          <button class="outline-btn" type="button" :disabled="importing" @click="importGroup">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            <span>{{ importing ? "..." : t("grouppage.import") }}</span>
          </button>
          <button class="add-btn" type="button" @click="openCreateModal">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{{ t("grouppage.new") }}</span>
          </button>
        </template>

        <!-- Nodes tab actions -->
        <template v-if="activeTab === 'nodes'">
          <button class="add-btn" type="button" @click="openNewNodeModal">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{{ t("workflowpage.new-node") }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar">
      <button
        :class="['tab', { active: activeTab === 'groups' }]"
        @click="activeTab = 'groups'"
      >{{ t("grouppage.tab-groups") }}</button>
      <button
        :class="['tab', { active: activeTab === 'nodes' }]"
        @click="activeTab = 'nodes'"
      >{{ t("grouppage.tab-nodes") }}</button>
    </div>

    <!-- ==================== Groups Tab ==================== -->
    <template v-if="activeTab === 'groups'">
      <!-- Empty -->
      <div v-if="filteredGroups.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
        <div class="empty-title">{{ t("grouppage.empty-title") }}</div>
        <div class="empty-subtitle">{{ t("grouppage.empty-subtitle") }}</div>
      </div>

      <!-- Grid -->
      <div v-else class="group-grid">
        <div v-for="group in filteredGroups" :key="group.id"
          :class="['group-card', { active: group.id === store.currentGroupId }]" @click="enterGroup(group)">
          <div class="card-top">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
            </div>
            <div class="card-name">{{ group.name }}</div>
          </div>
          <div class="card-desc">{{ group.description }}</div>
          <div class="card-scenarios" :title="group.scenarios">
            <span>{{ group.scenarios || t("grouppage.no-workflows") }}</span>
          </div>
          <div class="card-footer">
            <div class="card-meta">
              <span class="card-date">{{ formatDate(group.createdAt) }}</span>
              <span class="card-count">{{ group.workflows.length }} {{ t("grouppage.workflow-count") }}</span>
            </div>
            <div class="card-actions">
              <button class="card-btn" type="button" :title="t('grouppage.edit')" @click.stop="openEditModal(group)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="card-btn" type="button" :title="t('grouppage.export')" @click.stop="openPreview(group)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button class="card-btn card-delete" type="button" :title="t('grouppage.delete')" @click.stop="confirmDelete(group)">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Nodes Tab ==================== -->
    <template v-if="activeTab === 'nodes'">
      <!-- Search -->
      <div class="node-toolbar">
        <div class="node-search-box">
          <svg class="node-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="nodeSearchQuery" class="node-search-input" type="text" :placeholder="t('workflowpage.search-nodes')" />
        </div>
      </div>

      <!-- Empty -->
      <div v-if="filteredNodes.length === 0" class="node-empty">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <div class="node-empty-title">{{ t("workflowpage.empty-lib-title") }}</div>
        <div class="node-empty-subtitle">{{ t("workflowpage.empty-lib-subtitle") }}</div>
      </div>

      <!-- Grid -->
      <div v-else class="node-grid">
        <div v-for="node in filteredNodes" :key="node.id" class="node-card">
          <div class="node-card-header">
            <div class="node-card-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div class="node-card-name">{{ node.name }}</div>
            <div class="node-card-actions">
              <button class="node-card-btn" type="button" :title="t('workflowpage.edit-node')"
                @click="openEditNodeModal(node)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button class="node-card-btn node-card-btn-danger" type="button" :title="t('workflowpage.delete')"
                @click="confirmNodeDelete(node)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div class="node-card-desc">{{ node.desc }}</div>
          <div v-if="node.skills.length" class="node-card-tags">
            <span v-for="sk in node.skills" :key="sk" class="node-card-tag" :style="{ '--tag-color': skillTag(sk)?.color }">
              {{ skillTag(sk)?.name }}
            </span>
          </div>
          <div v-if="node.agents.length" class="node-card-agents">
            <span class="node-card-agent-label">{{ t("workflowpage.call") }}:</span>
            <span v-for="ag in node.agents" :key="ag" class="node-card-agent-dot"
              :style="{ backgroundColor: agentName(ag)?.color }"></span>
            <span class="node-card-agent-names">{{ node.agents.map((a) => agentName(a)?.name).join("、") }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== Group Modals ==================== -->

    <!-- Create/Edit Group Modal -->
    <div v-if="showCreateModal || showEditModal" class="modal-overlay"
      @click.self="showCreateModal = false; showEditModal = false">
      <div class="modal-panel">
        <div class="modal-title">
          {{ showCreateModal ? t("grouppage.new") : t("grouppage.edit") }}
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("grouppage.name") }}</label>
            <input v-model="formName" class="form-input" type="text" :placeholder="t('grouppage.name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("grouppage.desc") }}</label>
            <textarea v-model="formDesc" class="form-input form-textarea" :placeholder="t('grouppage.desc-placeholder')"
              rows="3"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("grouppage.scenarios") }}</label>
            <textarea v-model="formScenarios" class="form-input form-textarea"
              :placeholder="t('grouppage.scenarios-placeholder')" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button"
            @click="showCreateModal = false; showEditModal = false; editingGroup = null">
            {{ t("grouppage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button"
            @click="showCreateModal ? createGroup() : updateGroup()">
            {{ t("grouppage.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="modal-overlay" @click.self="showPreviewModal = false">
      <div class="modal-panel modal-preview">
        <div class="modal-title">{{ t("grouppage.preview-title") }}</div>
        <div class="modal-body">
          <pre class="preview-json">{{ previewContent }}</pre>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showPreviewModal = false">
            {{ t("grouppage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button" :disabled="saving" @click="doExport">
            {{ saving ? "..." : t("grouppage.export-json") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Group -->
    <ConfirmModal v-if="showDeleteModal" :title="t('grouppage.delete-title')"
      :message="t('grouppage.delete-msg', { name: deletingGroup?.name })" :confirm-text="t('grouppage.delete')"
      :danger="true" @confirm="onDeleteConfirm" @cancel="showDeleteModal = false" />

    <!-- ==================== Node Modals ==================== -->

    <!-- Node Editor Modal -->
    <div v-if="showNodeEditorModal" class="modal-overlay" @click.self="cancelNodeEditor">
      <div class="modal-panel modal-panel-editor">
        <div class="modal-title">{{ editingNode ? t("workflowpage.edit-node") : t("workflowpage.new-node") }}</div>
        <div class="editor-modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-name") }}</label>
            <input v-model="editNodeName" class="form-input" type="text"
              :placeholder="t('workflowpage.node-name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-desc") }}</label>
            <textarea v-model="editNodeDesc" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-desc-placeholder')" rows="2"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-content") }}</label>
            <textarea v-model="editNodeContent" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-content-placeholder')" rows="3"></textarea>
          </div>
          <!-- Agents -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.agents") }}</label>
            <div class="form-agents-row">
              <div class="multi-select" v-click-outside="() => { agentDropdownOpen = false }" style="flex: 7; width: 0;">
              <div class="multi-select-trigger" @click="agentDropdownOpen = !agentDropdownOpen">
                <div class="multi-select-tags">
                  <template v-if="editNodeAgents.length">
                    <span v-for="ag in editNodeAgents" :key="ag" class="tag"
                      :style="{ '--tag-color': agentName(ag)?.color }">
                      {{ agentName(ag)?.name }}
                      <span class="tag-remove" @click.stop="toggleSkill(ag, editNodeAgents)">&times;</span>
                    </span>
                  </template>
                  <span v-else class="multi-select-placeholder">{{ t('workflowpage.agents-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: agentDropdownOpen }" viewBox="0 0 24 24" width="14"
                  height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="agentDropdownOpen" class="multi-select-dropdown">
                <div v-for="ag in ALL_AGENTS" :key="ag.id"
                  :class="['multi-select-option', { selected: editNodeAgents.includes(ag.id) }]"
                  @click="toggleSkill(ag.id, editNodeAgents)">
                  <span class="option-check">
                    <svg v-if="editNodeAgents.includes(ag.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: ag.color }"></span>
                  {{ ag.name }}
                </div>
              </div>
            </div>
            <select v-if="editNodeAgents.length >= 2" v-model="editNodeExecutionMode" class="form-input form-select" style="flex: 3; width: 0;">
              <option v-for="m in ALL_EXECUTION_MODES" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
            </div>
          </div>
          <!-- AUI display -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.result-display") }}</label>
            <select v-model="editNodeAuiId" class="form-input form-select">
              <option value="">{{ t("workflowpage.result-display-placeholder") }}</option>
              <optgroup v-for="grp in ['builtin', 'instance', 'plugin']" :key="grp" :label="grp === 'builtin' ? t('aui.builtin') : grp === 'instance' ? t('aui.custom') : t('aui.plugin')">
                <option v-for="opt in auiOptions.filter(o => o.group === grp)" :key="opt.id" :value="opt.id">
                  {{ opt.name }}
                </option>
              </optgroup>
            </select>
          </div>
          <!-- Require Audit -->
          <div class="form-field form-field-inline">
            <label class="form-label">{{ t("workflowpage.require-audit") }}</label>
            <label class="toggle-switch">
              <input v-model="editNodeRequireAudit" type="checkbox" class="toggle-input" />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="cancelNodeEditor">{{ t("workflowpage.cancel") }}</button>
          <button class="btn btn-confirm" type="button" @click="saveNode">{{ t("workflowpage.confirm") }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Node -->
    <ConfirmModal v-if="showNodeDeleteModal" :title="t('workflowpage.delete-lib-title')"
      :message="t('workflowpage.delete-lib-msg', { name: deletingNode?.name })" :confirm-text="t('workflowpage.delete')"
      :danger="true" @confirm="onNodeDeleteConfirm" @cancel="showNodeDeleteModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useWorkflowStore, ALL_SKILLS, ALL_AGENTS, ALL_EXECUTION_MODES, getAllAuiOptions } from "@/stores/workflow";
import type { WorkflowGroup, WorkflowNode } from "@/stores/workflow";
import { useAuiStore } from "@/stores/aui";
import { useAuiPluginStore } from "@/stores/auiPlugin";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { ExportFile, ImportFile } from "../../../wailsjs/go/app/App";

const { t } = useI18n();
const router = useRouter();
const store = useWorkflowStore();
const auiStore = useAuiStore();
const pluginStore = useAuiPluginStore();

const auiOptions = computed(() => getAllAuiOptions(auiStore.auiList, pluginStore.installedPlugins));

// Tabs
const activeTab = ref<"groups" | "nodes">("groups");

// ============ Group state ============
const groupSearchQuery = ref("");
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingGroup = ref<WorkflowGroup | null>(null);
const formName = ref("");
const formDesc = ref("");
const formScenarios = ref("");
const showDeleteModal = ref(false);
const deletingGroup = ref<WorkflowGroup | null>(null);
const importing = ref(false);
const showPreviewModal = ref(false);
const previewContent = ref("");
const previewFilename = ref("");
const saving = ref(false);

// ============ Node state ============
const nodeSearchQuery = ref("");
const showNodeEditorModal = ref(false);
const editingNode = ref<WorkflowNode | null>(null);
const editNodeName = ref("");
const editNodeDesc = ref("");
const editNodeContent = ref("");
const editNodeSkills = ref<string[]>([]);
const editNodeAgents = ref<string[]>([]);
const editNodeAuiId = ref("");
const editNodeRequireAudit = ref(false);
const editNodeExecutionMode = ref("default");
const agentDropdownOpen = ref(false);
const showNodeDeleteModal = ref(false);
const deletingNode = ref<WorkflowNode | null>(null);

// ============ Group computed ============
const filteredGroups = computed(() => {
  if (!groupSearchQuery.value) return store.workflowGroups;
  const q = groupSearchQuery.value.toLowerCase();
  return store.workflowGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.scenarios.toLowerCase().includes(q)
  );
});

const formatDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ============ Node computed ============
const filteredNodes = computed(() => {
  if (!nodeSearchQuery.value) return store.nodeLibrary;
  const q = nodeSearchQuery.value.toLowerCase();
  return store.nodeLibrary.filter(
    (n) => n.name.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)
  );
});

// ============ Helpers ============
function skillTag(id: string) {
  return ALL_SKILLS.find((s) => s.id === id);
}
function agentName(id: string) {
  return ALL_AGENTS.find((a) => a.id === id);
}
function toggleSkill(skillId: string, list: string[]) {
  const idx = list.indexOf(skillId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(skillId);
}

// ============ Group actions ============
function enterGroup(group: WorkflowGroup) {
  store.setCurrentGroup(group.id);
  router.push(`/workflow/${group.id}`);
}

function openCreateModal() {
  formName.value = "";
  formDesc.value = "";
  formScenarios.value = "";
  showCreateModal.value = true;
}

function createGroup() {
  const name = formName.value.trim();
  if (!name) return;
  store.addWorkflowGroup(name, formDesc.value.trim(), formScenarios.value.trim());
  showCreateModal.value = false;
}

function openEditModal(group: WorkflowGroup) {
  editingGroup.value = group;
  formName.value = group.name;
  formDesc.value = group.description;
  formScenarios.value = group.scenarios;
  showEditModal.value = true;
}

function updateGroup() {
  if (!editingGroup.value || !formName.value.trim()) return;
  store.updateWorkflowGroup(editingGroup.value.id, {
    name: formName.value.trim(),
    description: formDesc.value.trim(),
    scenarios: formScenarios.value.trim(),
  });
  showEditModal.value = false;
  editingGroup.value = null;
}

function confirmDelete(group: WorkflowGroup) {
  deletingGroup.value = group;
  showDeleteModal.value = true;
}

function onDeleteConfirm() {
  if (!deletingGroup.value) return;
  store.deleteWorkflowGroup(deletingGroup.value.id);
  showDeleteModal.value = false;
  deletingGroup.value = null;
}

function openPreview(group: WorkflowGroup) {
  const exportData = {
    name: group.name,
    description: group.description,
    scenarios: group.scenarios,
    workflows: group.workflows,
  };
  previewContent.value = JSON.stringify(exportData, null, 2);
  previewFilename.value = `${group.name.replace(/[\\/:*?"<>|]/g, "_")}.json`;
  showPreviewModal.value = true;
}

async function doExport() {
  saving.value = true;
  try {
    await ExportFile(previewFilename.value, previewContent.value);
    showPreviewModal.value = false;
  } finally {
    saving.value = false;
  }
}

async function importGroup() {
  importing.value = true;
  try {
    const content = await ImportFile();
    if (!content) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(content);
    } catch {
      alert(t("grouppage.import-error-parse"));
      return;
    }

    if (typeof data !== "object" || data === null) {
      alert(t("grouppage.import-error-format"));
      return;
    }

    const name = typeof data.name === "string" ? data.name.trim() : "";
    const description = typeof data.description === "string" ? data.description.trim() : "";
    const scenarios = typeof data.scenarios === "string" ? data.scenarios.trim() : "";
    const workflows = Array.isArray(data.workflows) ? data.workflows : [];

    if (!name) {
      alert(t("grouppage.import-error-name"));
      return;
    }

    store.addWorkflowGroup(name, description, scenarios, workflows);
  } finally {
    importing.value = false;
  }
}

// ============ Node actions ============
function openNewNodeModal() {
  editingNode.value = null;
  editNodeName.value = "";
  editNodeDesc.value = "";
  editNodeContent.value = "";
  editNodeSkills.value = [];
  editNodeAgents.value = [];
  editNodeAuiId.value = "";
  editNodeRequireAudit.value = false;
  editNodeExecutionMode.value = "default";
  showNodeEditorModal.value = true;
}

function openEditNodeModal(node: WorkflowNode) {
  editingNode.value = node;
  editNodeName.value = node.name;
  editNodeDesc.value = node.desc;
  editNodeContent.value = node.content;
  editNodeSkills.value = [...node.skills];
  editNodeAgents.value = [...node.agents];
  editNodeAuiId.value = node.aui ?? "";
  editNodeRequireAudit.value = node.requireAudit ?? false;
  editNodeExecutionMode.value = node.executionMode ?? "default";
  showNodeEditorModal.value = true;
}

function saveNode() {
  const name = editNodeName.value.trim();
  if (!name) return;
  if (editingNode.value) {
    store.updateLibraryNode(editingNode.value.id, {
      name,
      desc: editNodeDesc.value.trim(),
      content: editNodeContent.value.trim(),
      skills: editNodeSkills.value,
      agents: editNodeAgents.value,
      aui: editNodeAuiId.value || undefined,
      requireAudit: editNodeRequireAudit.value || undefined,
      executionMode: editNodeExecutionMode.value || undefined,
    });
  } else {
    store.addToLibrary(
      name,
      editNodeDesc.value.trim(),
      editNodeContent.value.trim(),
      editNodeSkills.value,
      editNodeAgents.value,
      editNodeAuiId.value || undefined,
      editNodeRequireAudit.value || undefined,
      editNodeExecutionMode.value || undefined
    );
  }
  showNodeEditorModal.value = false;
  editingNode.value = null;
}

function cancelNodeEditor() {
  showNodeEditorModal.value = false;
  editingNode.value = null;
}

function confirmNodeDelete(node: WorkflowNode) {
  deletingNode.value = node;
  showNodeDeleteModal.value = true;
}

function onNodeDeleteConfirm() {
  if (!deletingNode.value) return;
  store.deleteFromLibrary(deletingNode.value.id);
  showNodeDeleteModal.value = false;
  deletingNode.value = null;
}
</script>

<style lang="scss" scoped>
.group-view {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// ============ Tab Bar ============
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.tab {
  position: relative;
  height: 32px;
  padding: 0 16px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6b6b6b;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;

  &:hover {
    color: #1f1f1f;
  }

  &.active {
    color: #1f1f1f;
    font-weight: 600;
    border-bottom-color: #1f1f1f;
  }
}

// ============ Shared ============
.outline-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  color: #4a4a4a;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: #f5f5f5;
    color: #1f1f1f;
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

// ============ Group Search ============
.header-search {
  position: relative;
  width: 160px;
  flex-shrink: 0;

  .search-icon {
    position: absolute;
    left: 7px;
    top: 50%;
    transform: translateY(-50%);
    color: #9a9a9a;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    height: 28px;
    padding: 0 8px 0 26px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }
}

// ============ Group Empty ============
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

// ============ Group Grid ============
.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.group-card {
  display: flex;
  flex-direction: column;
  padding: 18px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &.active {
    border-color: #1f1f1f;
    box-shadow: 0 0 0 2px rgba(31, 31, 31, 0.06);
  }
}

.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.card-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background-color: #f0f0f0;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  .group-card.active & {
    background-color: #1f1f1f;
    color: #ffffff;
  }
}

.card-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-desc {
  font-size: 13px;
  color: #6b6b6b;
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-scenarios {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #9a9a9a;
  line-height: 1.4;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;

  .card-date {
    font-size: 12px;
    color: #9a9a9a;
  }

  .card-count {
    font-size: 12px;
    font-weight: 500;
    color: #1f1f1f;
    background-color: #f0f0f0;
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.card-actions {
  display: flex;
  gap: 2px;
}

.card-btn {
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
  transition: all 0.15s;

  &:hover {
    background-color: #ececec;
    color: #1f1f1f;
  }

  &.card-delete:hover {
    background-color: #f0f0f0;
    color: #e74c3c;
  }
}

// ============ Node Toolbar ============
.node-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.node-search-box {
  position: relative;
  width: 280px;

  .node-search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: #9a9a9a;
    pointer-events: none;
  }

  .node-search-input {
    width: 100%;
    height: 30px;
    padding: 0 10px 0 30px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }
}

// ============ Node Empty ============
.node-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .node-empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 10px;
  }

  .node-empty-subtitle {
    font-size: 12px;
    color: #9a9a9a;
  }
}

// ============ Node Grid ============
.node-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  flex: 1;
  align-content: start;
  overflow-y: auto;
}

.node-card {
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.node-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.node-card-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: #f0f0f0;
  color: #6b6b6b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-card-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.node-card:hover .node-card-actions {
  opacity: 1;
}

.node-card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9a9a9a;
  cursor: pointer;
  transition: all 0.12s;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }

  &.node-card-btn-danger:hover {
    color: #e74c3c;
  }
}

.node-card-desc {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.node-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.node-card-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: var(--tag-color, #6366f1);
  background-color: color-mix(in srgb, var(--tag-color, #6366f1) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tag-color, #6366f1) 20%, transparent);
  white-space: nowrap;
}

.node-card-agents {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b6b6b;
}

.node-card-agent-label {
  color: #9a9a9a;
}

.node-card-agent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.node-card-agent-names {
  color: #4a4a4a;
}

// ============ Modals ============
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
  width: 440px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  &.modal-panel-editor {
    width: 560px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

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
  }

  .editor-modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    flex: 1;
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
    transition: border-color 0.15s;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }

  .form-textarea {
    height: auto;
    min-height: 64px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.5;
  }
}

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

// Preview modal
.modal-preview {
  width: 560px;

  .preview-json {
    margin: 0;
    padding: 16px;
    background-color: #1a1a1a;
    color: #e0e0e0;
    border-radius: 6px;
    font-size: 12px;
    font-family: "JetBrainsMono", monospace;
    line-height: 1.6;
    max-height: 420px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

// ============ Multi-select ============
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
  transition: border-color 0.15s;

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
  transition: transform 0.15s;

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
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }
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
  transition: background-color 0.1s;

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

// Form select
.form-select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

// Inline form field
.form-field-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

// Agents + ExecutionMode row
.form-agents-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

// Toggle switch
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.toggle-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background-color: #d0d0d0;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  padding: 2px;

  .toggle-input:checked + & {
    background-color: #1f1f1f;
  }
}

.toggle-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;

  .toggle-input:checked + .toggle-track & {
    transform: translateX(16px);
  }
}
</style>
