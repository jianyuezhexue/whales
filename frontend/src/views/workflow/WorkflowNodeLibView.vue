<template>
  <div class="lib-view page-layout">
    <!-- Header -->
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
          <span class="bc-current">{{ t("workflowpage.mode-nodes") }}</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="add-btn" type="button" @click="openNewModal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{{ t("workflowpage.new-node") }}</span>
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="lib-toolbar">
      <div class="lib-search-box">
        <svg class="lib-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input v-model="searchQuery" class="lib-search-input" type="text" :placeholder="t('workflowpage.search-nodes')" />
      </div>
    </div>

    <!-- Empty -->
    <div v-if="filteredNodes.length === 0" class="lib-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
      <div class="lib-empty-title">{{ t("workflowpage.empty-lib-title") }}</div>
      <div class="lib-empty-subtitle">{{ t("workflowpage.empty-lib-subtitle") }}</div>
    </div>

    <!-- Grid -->
    <div v-else class="lib-grid">
      <div v-for="node in filteredNodes" :key="node.id" class="lib-card">
        <div class="lib-card-header">
          <div class="lib-card-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div class="lib-card-name">{{ node.name }}</div>
          <div class="lib-card-actions">
            <button class="lib-card-btn" type="button" :title="t('workflowpage.edit-node')"
              @click="openEditModal(node)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="lib-card-btn lib-card-btn-danger" type="button" :title="t('workflowpage.delete')"
              @click="confirmDelete(node)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
        <div class="lib-card-desc">{{ node.desc }}</div>
        <div v-if="node.skills.length" class="lib-card-tags">
          <span v-for="sk in node.skills" :key="sk" class="lib-card-tag" :style="{ '--tag-color': skillTag(sk)?.color }">
            {{ skillTag(sk)?.name }}
          </span>
        </div>
        <div v-if="node.agents.length" class="lib-card-agents">
          <span class="lib-card-agent-label">{{ t("workflowpage.call") }}:</span>
          <span v-for="ag in node.agents" :key="ag" class="lib-card-agent-dot"
            :style="{ backgroundColor: agentName(ag)?.color }"></span>
          <span class="lib-card-agent-names">{{ node.agents.map((a) => agentName(a)?.name).join("、") }}</span>
        </div>
      </div>
    </div>

    <!-- Editor Modal -->
    <div v-if="showEditorModal" class="modal-overlay" @click.self="cancelEditor">
      <div class="modal-panel modal-panel-editor">
        <div class="modal-title">{{ editingNode ? t("workflowpage.edit-node") : t("workflowpage.new-node") }}</div>
        <div class="editor-modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-name") }}</label>
            <input v-model="editName" class="form-input" type="text"
              :placeholder="t('workflowpage.node-name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-desc") }}</label>
            <textarea v-model="editDesc" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-desc-placeholder')" rows="2"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.node-content") }}</label>
            <textarea v-model="editContent" class="form-input form-textarea"
              :placeholder="t('workflowpage.node-content-placeholder')" rows="3"></textarea>
          </div>
          <!-- Skills -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.skills") }}</label>
            <div class="multi-select" v-click-outside="() => { skillDropdownOpen = false }">
              <div class="multi-select-trigger" @click="skillDropdownOpen = !skillDropdownOpen">
                <div class="multi-select-tags">
                  <template v-if="editSkills.length">
                    <span v-for="sk in editSkills" :key="sk" class="tag" :style="{ '--tag-color': skillTag(sk)?.color }">
                      {{ skillTag(sk)?.name }}
                      <span class="tag-remove" @click.stop="toggleSkill(sk, editSkills)">&times;</span>
                    </span>
                  </template>
                  <span v-else class="multi-select-placeholder">{{ t('workflowpage.skills-placeholder') }}</span>
                </div>
                <svg class="multi-select-arrow" :class="{ open: skillDropdownOpen }" viewBox="0 0 24 24" width="14"
                  height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                  stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <div v-if="skillDropdownOpen" class="multi-select-dropdown">
                <div v-for="sk in ALL_SKILLS" :key="sk.id"
                  :class="['multi-select-option', { selected: editSkills.includes(sk.id) }]"
                  @click="toggleSkill(sk.id, editSkills)">
                  <span class="option-check">
                    <svg v-if="editSkills.includes(sk.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: sk.color }"></span>
                  {{ sk.name }}
                </div>
              </div>
            </div>
          </div>
          <!-- Agents -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.agents") }}</label>
            <div class="form-agents-row">
              <div class="multi-select" v-click-outside="() => { agentDropdownOpen = false }" style="flex: 7; width: 0;">
              <div class="multi-select-trigger" @click="agentDropdownOpen = !agentDropdownOpen">
                <div class="multi-select-tags">
                  <template v-if="editAgents.length">
                    <span v-for="ag in editAgents" :key="ag" class="tag"
                      :style="{ '--tag-color': agentName(ag)?.color }">
                      {{ agentName(ag)?.name }}
                      <span class="tag-remove" @click.stop="toggleSkill(ag, editAgents)">&times;</span>
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
                  :class="['multi-select-option', { selected: editAgents.includes(ag.id) }]"
                  @click="toggleSkill(ag.id, editAgents)">
                  <span class="option-check">
                    <svg v-if="editAgents.includes(ag.id)" viewBox="0 0 24 24" width="12" height="12" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span class="option-dot" :style="{ backgroundColor: ag.color }"></span>
                  {{ ag.name }}
                </div>
              </div>
            </div>
            <select v-if="editAgents.length >= 2" v-model="editExecutionMode" class="form-input form-select" style="flex: 3; width: 0;">
              <option v-for="m in ALL_EXECUTION_MODES" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
            </div>
          </div>
          <!-- AUI display -->
          <div class="form-field">
            <label class="form-label">{{ t("workflowpage.result-display") }}</label>
            <select v-model="editAuiId" class="form-input form-select">
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
              <input v-model="editRequireAudit" type="checkbox" class="toggle-input" />
              <span class="toggle-track">
                <span class="toggle-thumb"></span>
              </span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="cancelEditor">{{ t("workflowpage.cancel") }}</button>
          <button class="btn btn-confirm" type="button" @click="saveNode">{{ t("workflowpage.confirm") }}</button>
        </div>
      </div>
    </div>

    <!-- Delete -->
    <ConfirmModal v-if="showDeleteModal" :title="t('workflowpage.delete-lib-title')"
      :message="t('workflowpage.delete-lib-msg', { name: deletingNode?.name })" :confirm-text="t('workflowpage.delete')"
      :danger="true" @confirm="onDeleteConfirm" @cancel="showDeleteModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useWorkflowStore, ALL_SKILLS, ALL_AGENTS, ALL_EXECUTION_MODES, getAllAuiOptions, resolveAuiName } from "@/stores/workflow";
import type { WorkflowNode } from "@/stores/workflow";
import { useAuiStore } from "@/stores/aui";
import { useAuiPluginStore } from "@/stores/auiPlugin";
import ConfirmModal from "@/components/ConfirmModal.vue";

const { t } = useI18n();
const router = useRouter();
const store = useWorkflowStore();
const auiStore = useAuiStore();
const pluginStore = useAuiPluginStore();

const auiOptions = computed(() => getAllAuiOptions(auiStore.auiList, pluginStore.installedPlugins));

// Search
const searchQuery = ref("");

// Modals
const showEditorModal = ref(false);
const editingNode = ref<WorkflowNode | null>(null);
const editName = ref("");
const editDesc = ref("");
const editContent = ref("");
const editSkills = ref<string[]>([]);
const editAgents = ref<string[]>([]);
const editAuiId = ref("");
const editRequireAudit = ref(false);
const editExecutionMode = ref("default");
const skillDropdownOpen = ref(false);
const agentDropdownOpen = ref(false);

const showDeleteModal = ref(false);
const deletingNode = ref<WorkflowNode | null>(null);

// Computed
const filteredNodes = computed(() => {
  if (!searchQuery.value) return store.nodeLibrary;
  const q = searchQuery.value.toLowerCase();
  return store.nodeLibrary.filter(
    (n) => n.name.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q)
  );
});

// Helpers
function skillTag(id: string) {
  return ALL_SKILLS.find((s) => s.id === id);
}
function agentName(id: string) {
  return ALL_AGENTS.find((a) => a.id === id);
}
function auiName(id: string) {
  const name = resolveAuiName(id, auiStore.auiList, pluginStore.installedPlugins);
  return name ? { id, name } : undefined;
}
function executionModeName(id: string) {
  return ALL_EXECUTION_MODES.find((m) => m.id === id);
}
function toggleSkill(skillId: string, list: string[]) {
  const idx = list.indexOf(skillId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(skillId);
}

// Actions
function goBack() {
  router.push("/workflow");
}

function openNewModal() {
  editingNode.value = null;
  editName.value = "";
  editDesc.value = "";
  editContent.value = "";
  editSkills.value = [];
  editAgents.value = [];
  editAuiId.value = "";
  editRequireAudit.value = false;
  editExecutionMode.value = "default";
  showEditorModal.value = true;
}

function openEditModal(node: WorkflowNode) {
  editingNode.value = node;
  editName.value = node.name;
  editDesc.value = node.desc;
  editContent.value = node.content;
  editSkills.value = [...node.skills];
  editAgents.value = [...node.agents];
  editAuiId.value = node.aui ?? "";
  editRequireAudit.value = node.requireAudit ?? false;
  editExecutionMode.value = node.executionMode ?? "default";
  showEditorModal.value = true;
}

function saveNode() {
  const name = editName.value.trim();
  if (!name) return;
  if (editingNode.value) {
    store.updateLibraryNode(editingNode.value.id, {
      name,
      desc: editDesc.value.trim(),
      content: editContent.value.trim(),
      skills: editSkills.value,
      agents: editAgents.value,
      aui: editAuiId.value || undefined,
      requireAudit: editRequireAudit.value || undefined,
      executionMode: editExecutionMode.value || undefined,
    });
  } else {
    store.addToLibrary(
      name,
      editDesc.value.trim(),
      editContent.value.trim(),
      editSkills.value,
      editAgents.value,
      editAuiId.value || undefined,
      editRequireAudit.value || undefined,
      editExecutionMode.value || undefined
    );
  }
  showEditorModal.value = false;
  editingNode.value = null;
}

function cancelEditor() {
  showEditorModal.value = false;
  editingNode.value = null;
}

function confirmDelete(node: WorkflowNode) {
  deletingNode.value = node;
  showDeleteModal.value = true;
}

function onDeleteConfirm() {
  if (!deletingNode.value) return;
  store.deleteFromLibrary(deletingNode.value.id);
  showDeleteModal.value = false;
  deletingNode.value = null;
}
</script>

<style lang="scss" scoped>
.lib-view {
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
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

// Toolbar
.lib-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.lib-search-box {
  position: relative;
  width: 280px;

  .lib-search-icon {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: #9a9a9a;
    pointer-events: none;
  }

  .lib-search-input {
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

// Empty
.lib-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .lib-empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 10px;
  }

  .lib-empty-subtitle {
    font-size: 12px;
    color: #9a9a9a;
  }
}

// Grid
.lib-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  flex: 1;
  align-content: start;
  overflow-y: auto;
}

.lib-card {
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

.lib-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.lib-card-icon {
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

.lib-card-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #1f1f1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lib-card-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.lib-card:hover .lib-card-actions {
  opacity: 1;
}

.lib-card-btn {
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

  &.lib-card-btn-danger:hover {
    color: #e74c3c;
  }
}

.lib-card-desc {
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

.lib-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.lib-card-tag {
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

.lib-card-agents {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b6b6b;
}

.lib-card-agent-label {
  color: #9a9a9a;
}

.lib-card-agent-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.lib-card-agent-names {
  color: #4a4a4a;
}

// Modal
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
