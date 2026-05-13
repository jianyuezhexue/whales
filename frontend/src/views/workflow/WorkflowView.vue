<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useWorkflowStore, ALL_SKILLS, ALL_AGENTS, ALL_EXECUTION_MODES, BUILTIN_AUI_OPTIONS, getAllAuiOptions, resolveAuiName } from "@/stores/workflow";
import type { WorkflowNode } from "@/stores/workflow";
import { useAuiStore } from "@/stores/aui";
import { useAuiPluginStore } from "@/stores/auiPlugin";
import ConfirmModal from "@/components/ConfirmModal.vue";
import AuiRenderer from "@/components/aui/AuiRenderer.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useWorkflowStore();
const auiStore = useAuiStore();
const pluginStore = useAuiPluginStore();

// Computed AUI options combining built-in + instances + plugins
const auiOptions = computed(() => getAllAuiOptions(auiStore.auiList, pluginStore.installedPlugins));

// --- Load group from route ---
onMounted(() => {
  const groupId = route.params.groupId as string;
  if (groupId) {
    store.setCurrentGroup(groupId);
  }
});

// --- Node selection ---
const selectedNodeId = ref<string | null>(null);

// --- Search ---
const searchQuery = ref("");

// --- Modals: Workflow ---
const showNewWorkflowModal = ref(false);
const newWorkflowName = ref("");
const newWorkflowDesc = ref("");
const newWorkflowNodeIds = ref<string[]>([]);
const newWorkflowNodeDropdownOpen = ref(false);

// --- Modals: Add Node ---
const showAddNodeModal = ref(false);
const addNodeTab = ref<"create" | "import">("import");

// Create tab
const newNodeName = ref("");
const newNodeDesc = ref("");
const newNodeContent = ref("");
const newNodeSkills = ref<string[]>([]);
const newNodeAgents = ref<string[]>([]);
const newNodeAuiId = ref("");
const newNodeRequireAudit = ref(false);
const newNodeExecutionMode = ref("default");
const newNodeAfter = ref("last");
const skillDropdownOpen = ref(false);
const agentDropdownOpen = ref(false);

// Import tab
const importSearchQuery = ref("");
const selectedImportNodeId = ref("");

const filteredImportNodes = computed(() => {
  if (!importSearchQuery.value) return store.nodeLibrary;
  const q = importSearchQuery.value.toLowerCase();
  return store.nodeLibrary.filter(
    (n) =>
      n.name.toLowerCase().includes(q) ||
      n.desc.toLowerCase().includes(q)
  );
});

// --- Node editor (double-click modal) ---
const showNodeEditorModal = ref(false);
const editingNode = ref<WorkflowNode | null>(null);
const editedName = ref("");
const editedDesc = ref("");
const editedContent = ref("");
const editedSkills = ref<string[]>([]);
const editedAgents = ref<string[]>([]);
const editedAuiId = ref("");
const editedRequireAudit = ref(false);
const editedExecutionMode = ref("default");
const editorSkillDropdownOpen = ref(false);
const editorAgentDropdownOpen = ref(false);

// --- Delete ---
const showDeleteNodeModal = ref(false);
const deletingNode = ref<WorkflowNode | null>(null);

const showDeleteWorkflowModal = ref(false);
const deletingWorkflowName = ref("");

// --- Drag state ---
const dragNodeId = ref<string | null>(null);

// --- Gantt Test Modal ---
const showGanttTestModal = ref(false);
const ganttTestViewMode = ref<"rendered" | "json">("rendered");

// Hardcoded Gantt plugin data so the test button always works
const GANTT_DATA_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    required: ["title", "startDate", "endDate"],
    properties: {
      title: { type: "string", title: "任务名称" },
      startDate: { type: "string", format: "date", title: "开始日期" },
      endDate: { type: "string", format: "date", title: "结束日期" },
      progress: { type: "number", title: "进度(%)" },
      color: { type: "string", title: "颜色" },
    },
  },
};

const GANTT_SAMPLE_DATA = [
  { title: "需求分析", startDate: "2025-01-01", endDate: "2025-01-15", progress: 100, color: "#6366f1" },
  { title: "技术方案", startDate: "2025-01-10", endDate: "2025-01-25", progress: 60, color: "#8b5cf6" },
  { title: "开发实现", startDate: "2025-01-20", endDate: "2025-02-15", progress: 30, color: "#0ea5e9" },
  { title: "测试验收", startDate: "2025-02-10", endDate: "2025-02-28", progress: 0, color: "#14b8a6" },
];

const ganttTestAui = {
  id: "gantt",
  name: "甘特图",
  description: "项目进度甘特图渲染器",
  rendererType: "gantt",
  fields: [],
  jsonSchema: GANTT_DATA_SCHEMA,
  sampleData: GANTT_SAMPLE_DATA,
  aiPrompt: "",
  createdAt: "",
  updatedAt: "",
};

function openGanttTestModal() {
  // Ensure the gantt plugin JS is injected into the DOM
  pluginStore.injectPlugin("gantt");
  ganttTestViewMode.value = "rendered";
  showGanttTestModal.value = true;
}

// --- Computed ---
const filteredWorkflows = computed(() => {
  if (!searchQuery.value) return store.groupWorkflows;
  const q = searchQuery.value.toLowerCase();
  return store.groupWorkflows.filter(
    (w) => w.name.toLowerCase().includes(q) || w.desc.toLowerCase().includes(q)
  );
});

const sortedNodes = computed(() => {
  if (!store.currentWorkflow) return [];
  return [...store.currentWorkflow.nodes].sort((a, b) => a.order - b.order);
});

const importableNodes = computed(() => store.nodeLibrary);

const selectedImportNode = computed(() => {
  if (!selectedImportNodeId.value) return null;
  return store.nodeLibrary.find((n) => n.id === selectedImportNodeId.value) ?? null;
});

// --- Navigation ---
function goBack() {
  router.push("/workflow");
}

// --- Workflow actions ---
function selectWorkflow(id: string) {
  store.setCurrentWorkflow(id);
  selectedNodeId.value = null;
}

function openNewWorkflowModal() {
  newWorkflowName.value = "";
  newWorkflowDesc.value = "";
  newWorkflowNodeIds.value = [];
  newWorkflowNodeDropdownOpen.value = false;
  showNewWorkflowModal.value = true;
}

function createWorkflow() {
  const name = newWorkflowName.value.trim();
  if (!name) return;
  store.addWorkflow(name, newWorkflowDesc.value.trim(), newWorkflowNodeIds.value);
  showNewWorkflowModal.value = false;
}

function confirmDeleteWorkflow() {
  deletingWorkflowName.value = store.currentWorkflow?.name ?? "";
  showDeleteWorkflowModal.value = true;
}

function onDeleteWorkflowConfirm() {
  store.deleteWorkflow(store.currentWorkflowId);
  selectedNodeId.value = null;
  showDeleteWorkflowModal.value = false;
}

// --- Node actions ---
function selectNode(id: string) {
  selectedNodeId.value = id;
}

function openNodeEditor(node: WorkflowNode) {
  editingNode.value = node;
  editedName.value = node.name;
  editedDesc.value = node.desc;
  editedContent.value = node.content;
  editedSkills.value = [...node.skills];
  editedAgents.value = [...node.agents];
  editedAuiId.value = node.aui ?? "";
  editedRequireAudit.value = node.requireAudit ?? false;
  editedExecutionMode.value = node.executionMode ?? "default";
  showNodeEditorModal.value = true;
}

function saveNodeEditor() {
  if (!editingNode.value) return;
  store.updateNode(editingNode.value.id, {
    name: editedName.value.trim() || editingNode.value.name,
    desc: editedDesc.value.trim(),
    content: editedContent.value.trim(),
    skills: editedSkills.value,
    agents: editedAgents.value,
    aui: editedAuiId.value || undefined,
    requireAudit: editedRequireAudit.value || undefined,
    executionMode: editedExecutionMode.value || undefined,
  });
  showNodeEditorModal.value = false;
  editingNode.value = null;
}

function cancelNodeEditor() {
  showNodeEditorModal.value = false;
  editingNode.value = null;
}

// --- Add / Import Node ---
function openAddNodeModal(tab?: "create" | "import") {
  addNodeTab.value = tab ?? "import";
  newNodeName.value = "";
  newNodeDesc.value = "";
  newNodeContent.value = "";
  newNodeSkills.value = [];
  newNodeAgents.value = [];
  newNodeAuiId.value = "";
  newNodeRequireAudit.value = false;
  newNodeExecutionMode.value = "default";
  newNodeAfter.value = "last";
  selectedImportNodeId.value = "";
  importSearchQuery.value = "";
  skillDropdownOpen.value = false;
  agentDropdownOpen.value = false;
  showAddNodeModal.value = true;
}

function addNewNode() {
  const name = newNodeName.value.trim();
  if (!name || !store.currentWorkflow) return;
  store.addNode(
    name,
    newNodeDesc.value.trim(),
    newNodeContent.value.trim(),
    newNodeSkills.value,
    newNodeAgents.value,
    newNodeAfter.value,
    newNodeAuiId.value || undefined,
    newNodeRequireAudit.value || undefined,
    newNodeExecutionMode.value || undefined
  );
  showAddNodeModal.value = false;
}

function importNode() {
  if (!selectedImportNodeId.value || !store.currentWorkflow) return;
  store.importNodeFromLibrary(selectedImportNodeId.value, newNodeAfter.value);
  showAddNodeModal.value = false;
}

function quickImport(nodeId: string) {
  selectedImportNodeId.value = nodeId;
  importNode();
}

function confirmDeleteNode(node: WorkflowNode) {
  deletingNode.value = node;
  showDeleteNodeModal.value = true;
}

function onDeleteNodeConfirm() {
  if (!deletingNode.value) return;
  store.deleteNode(deletingNode.value.id);
  if (selectedNodeId.value === deletingNode.value.id) {
    selectedNodeId.value = null;
  }
  showDeleteNodeModal.value = false;
  deletingNode.value = null;
}

function handleRun() {
  if (!store.currentWorkflow || store.currentWorkflow.nodes.length === 0) return;
}

// --- Drag and Drop ---
function onDragStart(e: DragEvent, nodeId: string) {
  dragNodeId.value = nodeId;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", nodeId);
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";
  }
}

function onDrop(e: DragEvent, targetNodeId: string) {
  e.preventDefault();
  if (!dragNodeId.value) return;
  const draggedNode = store.currentWorkflow?.nodes.find((n) => n.id === dragNodeId.value);
  const targetNode = store.currentWorkflow?.nodes.find((n) => n.id === targetNodeId);
  if (!draggedNode || !targetNode) return;
  store.reorderNode(dragNodeId.value, targetNode.order);
  dragNodeId.value = null;
}

function onDragEnd() {
  dragNodeId.value = null;
}

// --- Helpers ---
function skillTag(id: string) {
  return ALL_SKILLS.find((s) => s.id === id);
}

function agentName(id: string) {
  return ALL_AGENTS.find((a) => a.id === id);
}

function auiName(id: string) {
  return resolveAuiName(id, auiStore.auiList, pluginStore.installedPlugins);
}

function executionModeName(id: string) {
  return ALL_EXECUTION_MODES.find((m) => m.id === id);
}

function nodeLibName(id: string) {
  return store.nodeLibrary.find((n) => n.id === id)?.name ?? id;
}

function toggleSkill(skillId: string, list: string[]) {
  const idx = list.indexOf(skillId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(skillId);
}

function toggleEditorSkill(skillId: string) {
  toggleSkill(skillId, editedSkills.value);
}

function toggleEditorAgent(agentId: string) {
  toggleSkill(agentId, editedAgents.value);
}

function toggleNewSkill(skillId: string) {
  toggleSkill(skillId, newNodeSkills.value);
}

function toggleNewAgent(agentId: string) {
  toggleSkill(agentId, newNodeAgents.value);
}
</script>

<template>
  <div class="workflow-page page-layout">
    <!-- HEADER -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" type="button" @click="goBack" :title="t('workflowpage.back-to-groups')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div class="breadcrumb">
          <span class="bc-link" @click="goBack">{{ t("workflowpage.breadcrumb-groups") }}</span>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="bc-current">{{ store.currentGroup?.name || "—" }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="add-btn" type="button" @click="openNewWorkflowModal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{{ t("workflowpage.new") }}</span>
        </button>
      </div>
    </div>

    <!-- Two-column body -->
    <div class="wf-body">
      <!-- LEFT: Workflow List -->
      <div class="wf-list-panel">
        <div class="wf-search-box">
          <svg class="wf-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="searchQuery" class="wf-search-input" type="text" :placeholder="t('workflowpage.search')" />
        </div>
        <div class="wf-list-items">
          <div v-for="wf in filteredWorkflows" :key="wf.id"
            :class="['wf-list-item', { active: wf.id === store.currentWorkflowId }]"
            @click="selectWorkflow(wf.id)">
            <div class="wf-list-item-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
            </div>
            <div class="wf-list-item-info">
              <div class="wf-list-item-name">{{ wf.name }}</div>
              <div class="wf-list-item-meta">{{ wf.nodes.length }} {{ t("workflowpage.nodes-count") }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTER: Canvas -->
      <div class="wf-canvas-panel">
        <div class="wf-canvas-header">
          <div class="wf-canvas-title-row">
            <span class="wf-canvas-title">{{ store.currentWorkflow?.name || t('workflowpage.select-hint') }}</span>
            <div v-if="store.currentWorkflow" class="wf-canvas-dot-actions">
              <button class="wf-canvas-icon-btn" type="button" :title="t('workflowpage.delete')"
                @click="confirmDeleteWorkflow">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div class="wf-canvas-actions">
            <button class="wf-canvas-btn" type="button" :disabled="!store.currentWorkflow" @click="openAddNodeModal()">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {{ t("workflowpage.add-node") }}
            </button>
            <button class="wf-canvas-btn wf-canvas-btn-primary" type="button"
              :disabled="!store.currentWorkflow || store.currentWorkflow.nodes.length === 0"
              @click="handleRun">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {{ t("workflowpage.run") }}
            </button>
            <button class="wf-canvas-btn wf-canvas-btn-gantt" type="button"
              @click="openGanttTestModal">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="9" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="2" height="7" rx="1" />
              </svg>
              {{ t("workflowpage.test-gantt") }}
            </button>
          </div>
        </div>
        <div class="wf-canvas-area">
          <!-- Empty: no workflow selected -->
          <div v-if="!store.currentWorkflow" class="wf-empty-canvas">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <div class="wf-empty-title">{{ t("workflowpage.empty-select-title") }}</div>
            <div class="wf-empty-subtitle">{{ t("workflowpage.empty-select-subtitle") }}</div>
          </div>
          <!-- Empty: no nodes -->
          <div v-else-if="sortedNodes.length === 0" class="wf-empty-canvas">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <div class="wf-empty-title">{{ t("workflowpage.empty-nodes-title") }}</div>
            <div class="wf-empty-subtitle">{{ t("workflowpage.empty-nodes-subtitle") }}</div>
          </div>
          <!-- Nodes pipeline with drag & drop -->
          <div v-else class="wf-nodes-column">
            <template v-for="(node, idx) in sortedNodes" :key="node.id">
              <div :class="['wf-node', { selected: selectedNodeId === node.id, 'wf-node-dragging': dragNodeId === node.id }]"
                :draggable="true"
                @click="selectNode(node.id)"
                @dblclick="openNodeEditor(node)"
                @dragstart="onDragStart($event, node.id)"
                @dragover="onDragOver"
                @drop="onDrop($event, node.id)"
                @dragend="onDragEnd">
                <div class="wf-node-header">
                  <div class="wf-node-drag-handle">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <circle cx="10" cy="5" r="1.5" /><circle cx="16" cy="5" r="1.5" />
                      <circle cx="10" cy="12" r="1.5" /><circle cx="16" cy="12" r="1.5" />
                      <circle cx="10" cy="19" r="1.5" /><circle cx="16" cy="19" r="1.5" />
                    </svg>
                  </div>
                  <div class="wf-node-order">{{ node.order }}</div>
                  <div class="wf-node-name">{{ node.name }}</div>
                  <div class="wf-node-actions">
                    <button class="wf-node-action-btn" type="button" :title="t('workflowpage.delete-node')"
                      @click.stop="confirmDeleteNode(node)">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="wf-node-body">
                  <div class="wf-node-desc">{{ node.desc }}</div>
                  <div v-if="node.skills.length" class="wf-node-tags">
                    <span v-for="sk in node.skills" :key="sk" class="wf-node-tag"
                      :style="{ '--tag-color': skillTag(sk)?.color }">
                      {{ skillTag(sk)?.name }}
                    </span>
                  </div>
                  <div v-if="node.agents.length" class="wf-node-agents">
                    <span class="wf-node-agent-label">{{ t("workflowpage.call") }}:</span>
                    <span v-for="ag in node.agents" :key="ag" class="wf-node-agent-dot"
                      :style="{ backgroundColor: agentName(ag)?.color }"></span>
                    <span class="wf-node-agent-names">{{ node.agents.map((a) => agentName(a)?.name).join("、") }}</span>
                  </div>
                </div>
              </div>
              <div v-if="idx < sortedNodes.length - 1" class="wf-connector">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="2" x2="12" y2="22" /><polyline points="8 18 12 22 16 18" />
                </svg>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ MODALS ============ -->

    <!-- New Workflow -->
    <div v-if="showNewWorkflowModal" class="modal-overlay" @click.self="showNewWorkflowModal = false">
      <div class="modal-panel">
        <div class="modal-title">{{ t("workflowpage.new") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.name") }}</label>
            <input v-model="newWorkflowName" class="form-input" type="text"
              :placeholder="t('workflowpage.name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.wf-desc") }}</label>
            <textarea v-model="newWorkflowDesc" class="form-input form-textarea"
              :placeholder="t('workflowpage.wf-desc-placeholder')" rows="3"></textarea>
          </div>
          <!-- Pre-select nodes from library -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.select-nodes") }}</label>
            <div class="multi-select" v-click-outside="() => { newWorkflowNodeDropdownOpen = false }">
              <div class="multi-select-trigger" @click="newWorkflowNodeDropdownOpen = !newWorkflowNodeDropdownOpen">
                <div class="multi-select-tags">
                  <template v-if="newWorkflowNodeIds.length">
                    <span v-for="nid in newWorkflowNodeIds" :key="nid" class="tag">
                      {{ nodeLibName(nid) }}
                      <span class="tag-remove" @click.stop="newWorkflowNodeIds = newWorkflowNodeIds.filter((id) => id !== nid)">&times;</span>
                    </span>
                  </template>
                  <span v-else class="multi-select-placeholder">{{ t('workflowpage.select-nodes-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: newWorkflowNodeDropdownOpen }" viewBox="0 0 24 24" width="14" height="14"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="newWorkflowNodeDropdownOpen" class="multi-select-dropdown">
                <div v-for="n in store.nodeLibrary" :key="n.id"
                  :class="['multi-select-option', { selected: newWorkflowNodeIds.includes(n.id) }]"
                  @click="newWorkflowNodeIds.includes(n.id) ? newWorkflowNodeIds = newWorkflowNodeIds.filter((id) => id !== n.id) : newWorkflowNodeIds.push(n.id)">
                  <span class="option-check">
                    <svg v-if="newWorkflowNodeIds.includes(n.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  {{ n.name }}
                </div>
                <div v-if="store.nodeLibrary.length === 0" class="multi-select-option" style="cursor: default;">
                  {{ t("workflowpage.empty-lib-title") }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showNewWorkflowModal = false">
            {{ t("workflowpage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button" @click="createWorkflow">
            {{ t("workflowpage.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add / Import Node -->
    <div v-if="showAddNodeModal" class="modal-overlay" @click.self="showAddNodeModal = false">
      <div class="modal-panel modal-panel-wide">
        <div class="modal-title">{{ t("workflowpage.add-node") }}</div>
        <!-- Tab switch -->
        <div class="add-node-tabs">
          <button :class="['add-node-tab', { active: addNodeTab === 'import' }]" type="button"
            @click="addNodeTab = 'import'">
            {{ t("workflowpage.import-node") }}
          </button>
          <button :class="['add-node-tab', { active: addNodeTab === 'create' }]" type="button"
            @click="addNodeTab = 'create'">
            {{ t("workflowpage.create-node") }}
          </button>
        </div>
        <div class="modal-body">
          <!-- CREATE TAB -->
          <template v-if="addNodeTab === 'create'">
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.node-name") }}</label>
              <input v-model="newNodeName" class="form-input" type="text"
                :placeholder="t('workflowpage.node-name-placeholder')" />
            </div>
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.node-desc") }}</label>
              <textarea v-model="newNodeDesc" class="form-input form-textarea"
                :placeholder="t('workflowpage.node-desc-placeholder')" rows="2"></textarea>
            </div>
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.node-content") }}</label>
              <textarea v-model="newNodeContent" class="form-input form-textarea"
                :placeholder="t('workflowpage.node-content-placeholder')" rows="3"></textarea>
            </div>
            <!-- Agents multi-select -->
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.agents") }}</label>
              <div class="form-agents-row">
                <div class="multi-select" v-click-outside="() => { agentDropdownOpen = false }" style="flex: 7; width: 0;">
                  <div class="multi-select-trigger" @click="agentDropdownOpen = !agentDropdownOpen">
                    <div class="multi-select-tags">
                      <template v-if="newNodeAgents.length">
                        <span v-for="ag in newNodeAgents" :key="ag" class="tag"
                          :style="{ '--tag-color': agentName(ag)?.color }">
                          {{ agentName(ag)?.name }}
                          <span class="tag-remove" @click.stop="toggleNewAgent(ag)">&times;</span>
                        </span>
                      </template>
                      <span v-else class="multi-select-placeholder">{{ t('workflowpage.agents-placeholder') }}</span>
                    </div>
                    <svg class="multi-select-arrow" :class="{ open: agentDropdownOpen }" viewBox="0 0 24 24" width="14" height="14"
                      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                  <div v-if="agentDropdownOpen" class="multi-select-dropdown">
                    <div v-for="ag in ALL_AGENTS" :key="ag.id"
                      :class="['multi-select-option', { selected: newNodeAgents.includes(ag.id) }]"
                      @click="toggleNewAgent(ag.id)">
                      <span class="option-check">
                        <svg v-if="newNodeAgents.includes(ag.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                          stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span class="option-dot" :style="{ backgroundColor: ag.color }"></span>
                      {{ ag.name }}
                    </div>
                  </div>
                </div>
                <select v-if="newNodeAgents.length >= 2" v-model="newNodeExecutionMode" class="form-input form-select" style="flex: 3; width: 0;">
                  <option v-for="m in ALL_EXECUTION_MODES" :key="m.id" :value="m.id">
                    {{ m.name }}
                  </option>
                </select>
              </div>
            </div>
            <!-- AUI display -->
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.result-display") }}</label>
              <select v-model="newNodeAuiId" class="form-input form-select">
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
                <input v-model="newNodeRequireAudit" type="checkbox" class="toggle-input" />
                <span class="toggle-track">
                  <span class="toggle-thumb"></span>
                </span>
              </label>
            </div>
            <!-- After node -->
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.insert-after") }}</label>
              <select v-model="newNodeAfter" class="form-input form-select">
                <option value="last">{{ t("workflowpage.insert-last") }}</option>
                <option v-for="n in sortedNodes" :key="n.id" :value="n.id">
                  {{ t("workflowpage.after") }} "{{ n.name }}"
                </option>
              </select>
            </div>
          </template>

          <!-- IMPORT TAB -->
          <template v-if="addNodeTab === 'import'">
            <div class="import-search">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input v-model="importSearchQuery" type="text" class="import-search-input"
                :placeholder="t('workflowpage.search-nodes')" />
            </div>
            <div class="import-grid">
              <div v-for="n in filteredImportNodes" :key="n.id"
                :class="['import-card', { selected: selectedImportNodeId === n.id }]"
                @click="selectedImportNodeId = n.id"
                @dblclick="quickImport(n.id)">
                <div class="import-card-header">
                  <svg class="import-card-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                  <span class="import-card-name">{{ n.name }}</span>
                </div>
                <div class="import-card-desc">{{ n.desc }}</div>
                <div v-if="n.agents.length" class="import-card-agents">
                  <span class="import-card-agent-label">{{ t("workflowpage.call") }}:</span>
                  <span v-for="ag in n.agents" :key="ag" class="import-card-agent-dot"
                    :style="{ backgroundColor: agentName(ag)?.color }"></span>
                  <span class="import-card-agent-names">{{ n.agents.map((a) => agentName(a)?.name).join("、") }}</span>
                </div>
              </div>
              <div v-if="filteredImportNodes.length === 0" class="import-empty">
                {{ t("workflowpage.search-nodes") }}
              </div>
            </div>
            <!-- After node -->
            <div class="form-field">
              <label class="form-label">{{ t("workflowpage.insert-after") }}</label>
              <select v-model="newNodeAfter" class="form-input form-select">
                <option value="last">{{ t("workflowpage.insert-last") }}</option>
                <option v-for="n in sortedNodes" :key="n.id" :value="n.id">
                  {{ t("workflowpage.after") }} "{{ n.name }}"
                </option>
              </select>
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showAddNodeModal = false">
            {{ t("workflowpage.cancel") }}
          </button>
          <button v-if="addNodeTab === 'create'" class="btn btn-confirm" type="button" @click="addNewNode">
            {{ t("workflowpage.add") }}
          </button>
          <button v-else class="btn btn-confirm" type="button" :disabled="!selectedImportNodeId" @click="importNode">
            {{ t("workflowpage.import") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Node Editor Modal -->
    <div v-if="showNodeEditorModal" class="modal-overlay" @click.self="cancelNodeEditor">
      <div class="modal-panel modal-panel-editor">
        <div class="modal-title">{{ t("workflowpage.editor-title") }}</div>
        <div class="editor-modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-name") }}</label>
            <input v-model="editedName" class="form-input" type="text"
              :placeholder="t('workflowpage.node-name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-desc") }}</label>
            <textarea v-model="editedDesc" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-desc-placeholder')" rows="2"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-content") }}</label>
            <textarea v-model="editedContent" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-content-placeholder')" rows="3"></textarea>
          </div>
          <!-- Agents -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.agents") }}</label>
            <div class="form-agents-row">
              <div class="multi-select" v-click-outside="() => { editorAgentDropdownOpen = false }" style="flex: 7; width: 0;">
              <div class="multi-select-trigger" @click="editorAgentDropdownOpen = !editorAgentDropdownOpen">
                <div class="multi-select-tags">
                  <template v-if="editedAgents.length">
                    <span v-for="ag in editedAgents" :key="ag" class="tag"
                      :style="{ '--tag-color': agentName(ag)?.color }">
                      {{ agentName(ag)?.name }}
                      <span class="tag-remove" @click.stop="toggleEditorAgent(ag)">&times;</span>
                    </span>
                  </template>
                  <span v-else class="multi-select-placeholder">{{ t('workflowpage.agents-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: editorAgentDropdownOpen }" viewBox="0 0 24 24" width="14" height="14"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="editorAgentDropdownOpen" class="multi-select-dropdown">
                <div v-for="ag in ALL_AGENTS" :key="ag.id"
                  :class="['multi-select-option', { selected: editedAgents.includes(ag.id) }]"
                  @click="toggleEditorAgent(ag.id)">
                  <span class="option-check">
                    <svg v-if="editedAgents.includes(ag.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: ag.color }"></span>
                  {{ ag.name }}
                </div>
              </div>
            </div>
            <select v-if="editedAgents.length >= 2" v-model="editedExecutionMode" class="form-input form-select" style="flex: 3; width: 0;">
              <option v-for="m in ALL_EXECUTION_MODES" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
            </div>
          </div>
          <!-- AUI display -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.result-display") }}</label>
            <select v-model="editedAuiId" class="form-input form-select">
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
              <input v-model="editedRequireAudit" type="checkbox" class="toggle-input" />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="cancelNodeEditor">
            {{ t("workflowpage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button" @click="saveNodeEditor">
            {{ t("workflowpage.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Gantt Test Modal -->
    <div v-if="showGanttTestModal" class="modal-overlay" @click.self="showGanttTestModal = false">
      <div class="modal-panel gantt-test-modal">
        <div class="modal-header">
          <div class="modal-title-row">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="9" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="2" height="7" rx="1" />
            </svg>
            <span class="modal-node-name">{{ t("workflowpage.test-gantt") }}</span>
          </div>
          <div class="modal-actions">
            <button
              :class="['view-toggle-btn', { active: ganttTestViewMode === 'rendered' }]"
              @click="ganttTestViewMode = 'rendered'"
            >
              {{ t("taskboard.view-rendered") }}
            </button>
            <button
              :class="['view-toggle-btn', { active: ganttTestViewMode === 'json' }]"
              @click="ganttTestViewMode = 'json'"
            >
              JSON
            </button>
            <button class="close-btn" @click="showGanttTestModal = false">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div class="modal-body">
          <div v-if="ganttTestViewMode === 'rendered'" class="render-area">
            <AuiRenderer :aui="ganttTestAui" :data="GANTT_SAMPLE_DATA" />
          </div>
          <div v-else-if="ganttTestViewMode === 'json'" class="json-area">
            <pre class="json-block">{{ JSON.stringify(GANTT_SAMPLE_DATA, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Node -->
    <ConfirmModal v-if="showDeleteNodeModal" :title="t('workflowpage.delete-node-title')"
      :message="t('workflowpage.delete-node-msg', { name: deletingNode?.name })"
      :confirm-text="t('workflowpage.delete-node')" :danger="true"
      @confirm="onDeleteNodeConfirm" @cancel="showDeleteNodeModal = false" />

    <!-- Delete Workflow -->
    <ConfirmModal v-if="showDeleteWorkflowModal" :title="t('workflowpage.delete-wf-title')"
      :message="t('workflowpage.delete-wf-msg', { name: deletingWorkflowName })"
      :confirm-text="t('workflowpage.delete-wf')" :danger="true"
      @confirm="onDeleteWorkflowConfirm" @cancel="showDeleteWorkflowModal = false" />
  </div>
</template>

<style lang="scss" scoped>
.workflow-page {
  display: flex;
  flex-direction: column;
  height: 100%;

  .page-header {
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

// Breadcrumb
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #4a4a4a;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #9a9a9a;

  .bc-link {
    color: #4a4a4a;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: #1f1f1f;
    }
  }

  .bc-current {
    color: #1f1f1f;
    font-weight: 500;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// Add button
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

// ============ Two-column body ============
.wf-body {
  display: flex;
  flex: 1;
  min-height: 0;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
}

// ============ Left List Panel ============
.wf-list-panel {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  background-color: #fafafa;
}

.wf-search-box {
  position: relative;
  margin: 12px 10px 8px;

  .wf-search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: #9a9a9a;
    pointer-events: none;
  }

  .wf-search-input {
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

.wf-list-items {
  flex: 1;
  overflow-y: auto;
  padding: 0 6px 8px;
}

.wf-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s;
  margin-bottom: 1px;

  &:hover {
    background-color: #f0f0f0;
  }

  &.active {
    background-color: #ececec;

    .wf-list-item-icon {
      background-color: #1f1f1f;
      color: #ffffff;
    }

    .wf-list-item-name {
      font-weight: 600;
    }
  }
}

.wf-list-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #f0f0f0;
  color: #6b6b6b;
  transition: all 0.12s;
}

.wf-list-item-info {
  flex: 1;
  min-width: 0;
}

.wf-list-item-name {
  font-size: 13px;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wf-list-item-meta {
  font-size: 11px;
  color: #9a9a9a;
  margin-top: 1px;
}

// ============ Center Canvas ============
.wf-canvas-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.wf-canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.wf-canvas-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.wf-canvas-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wf-canvas-dot-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.wf-canvas-icon-btn {
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
    color: #e74c3c;
  }
}

.wf-canvas-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.wf-canvas-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

  &:hover:not(:disabled) {
    background-color: #f5f5f5;
    color: #1f1f1f;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.wf-canvas-btn-primary {
    background-color: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
  }
}

.wf-canvas-area {
  flex: 1;
  overflow-y: auto;
  padding: 32px 24px;
  background-color: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wf-empty-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .wf-empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 10px;
  }

  .wf-empty-subtitle {
    font-size: 12px;
    color: #9a9a9a;
  }
}

// ============ Nodes Pipeline ============
.wf-nodes-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 440px;
}

.wf-node {
  width: 100%;
  background-color: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  user-select: none;

  &:hover {
    border-color: #d0d0d0;
  }

  &.selected {
    border-color: #1f1f1f;
    box-shadow: 0 0 0 2px rgba(31, 31, 31, 0.08);
  }

  &.wf-node-dragging {
    opacity: 0.5;
    border-style: dashed;
  }

  .wf-node-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #e5e5e5;
  }

  .wf-node-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 24px;
    cursor: grab;
    color: #c0c0c0;
    flex-shrink: 0;
    transition: color 0.12s;

    &:hover {
      color: #6b6b6b;
    }

    &:active {
      cursor: grabbing;
    }
  }

  .wf-node-order {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background-color: #1f1f1f;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .wf-node-name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: #1f1f1f;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wf-node-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover .wf-node-actions {
    opacity: 1;
  }

  .wf-node-action-btn {
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
      color: #e74c3c;
    }
  }

  .wf-node-body {
    padding: 10px 12px;
  }

  .wf-node-desc {
    font-size: 12px;
    color: #4a4a4a;
    line-height: 1.5;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .wf-node-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 6px;
  }

  .wf-node-tag {
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

  .wf-node-agents {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #6b6b6b;
  }

  .wf-node-agent-label {
    color: #9a9a9a;
  }

  .wf-node-agent-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .wf-node-agent-names {
    color: #4a4a4a;
  }
}

.wf-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  color: #9a9a9a;
  flex-shrink: 0;
}

// ============ Add Node Tabs ============
.add-node-tabs {
  display: flex;
  padding: 12px 24px 0;
  gap: 0;
  flex-shrink: 0;
}

.add-node-tab {
  flex: 1;
  height: 32px;
  border: 1px solid #e5e5e5;
  background-color: #ffffff;
  color: #6b6b6b;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:first-child {
    border-radius: 6px 0 0 6px;
  }

  &:last-child {
    border-radius: 0 6px 6px 0;
    margin-left: -1px;
  }

  &:hover {
    background-color: #f5f5f5;
  }

  &.active {
    background-color: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
    z-index: 1;
  }
}

.import-preview {
  margin-top: 4px;

  .import-preview-title {
    font-size: 13px;
    font-weight: 500;
    color: #4a4a4a;
    margin-bottom: 8px;
  }

  .import-preview-card {
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background-color: #fafafa;
  }

  .import-preview-name {
    font-size: 13px;
    font-weight: 600;
    color: #1f1f1f;
    margin-bottom: 4px;
  }

  .import-preview-desc {
    font-size: 12px;
    color: #6b6b6b;
    line-height: 1.5;
    margin-bottom: 8px;
  }
}

// ============ Import Grid ============
.import-search {
  position: relative;
  margin-bottom: 10px;

  svg {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #9a9a9a;
    pointer-events: none;
  }
}

.import-search-input {
  width: 100%;
  height: 30px;
  padding: 0 10px 0 28px;
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

.import-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 2px;
}

.import-card {
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    border-color: #c0c0c0;
    background-color: #fafafa;
  }

  &.selected {
    border-color: #1f1f1f;
    background-color: #fafafa;
    box-shadow: 0 0 0 1px rgba(31, 31, 31, 0.08);
  }
}

.import-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.import-card-icon {
  color: #9a9a9a;
  flex-shrink: 0;
}

.import-card-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-card-desc {
  font-size: 11px;
  color: #9a9a9a;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 6px;
}

.import-card-agents {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #6b6b6b;
  overflow: hidden;
}

.import-card-agent-label {
  flex-shrink: 0;
}

.import-card-agent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.import-card-agent-names {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  font-size: 13px;
  color: #9a9a9a;
}

// ============ Modal Styles ============
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

  &.modal-panel-wide {
    width: 520px;
  }

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
    max-height: 60vh;
    overflow-y: auto;
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
    min-height: 56px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.5;
  }

  .form-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    padding-right: 28px;
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

// Buttons
.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.btn-cancel {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #4a4a4a;

    &:hover:not(:disabled) {
      background-color: #f5f5f5;
    }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover:not(:disabled) {
      opacity: 0.85;
    }
  }
}

// Inline form field (for toggle)
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

// Gantt test modal
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

.gantt-test-modal {
  width: 800px;
  max-height: 80vh;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-panel {
  &.gantt-test-modal {
    // specificity handled above
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #6b6b6b;
}

.modal-node-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.view-toggle-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  font-size: 11px;
  font-family: "JetBrainsMono", sans-serif;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #1f1f1f;
    color: #1f1f1f;
  }

  &.active {
    background-color: #1f1f1f;
    color: #ffffff;
    border-color: #1f1f1f;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #9a9a9a;
  cursor: pointer;
  margin-left: 4px;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.render-area {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: 16px;
}

.json-area {
  padding: 16px;
  background-color: #fafafa;
  min-height: 300px;
}

.json-block {
  font-size: 12px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  line-height: 1.6;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 8px;
  color: #9a9a9a;
  font-size: 13px;
}

// Gantt button style
.wf-canvas-btn-gantt {
  // inherits wf-canvas-btn, distinct color hint
  &:hover:not(:disabled) {
    border-color: #6366f1;
    color: #6366f1;
  }
}
</style>
