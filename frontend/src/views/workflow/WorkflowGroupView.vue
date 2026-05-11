<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowGroup } from "@/stores/workflow";
import ConfirmModal from "@/components/ConfirmModal.vue";
import { ExportFile, ImportFile } from "../../../wailsjs/go/app/App";

const { t } = useI18n();
const router = useRouter();
const store = useWorkflowStore();

// Search
const searchQuery = ref("");

// Modals
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingGroup = ref<WorkflowGroup | null>(null);
const formName = ref("");
const formDesc = ref("");
const formScenarios = ref("");

const showDeleteModal = ref(false);
const deletingGroup = ref<WorkflowGroup | null>(null);

// Import/Export
const importing = ref(false);

// Preview modal
const showPreviewModal = ref(false);
const previewContent = ref("");
const previewFilename = ref("");
const saving = ref(false);

// Open preview modal with serialized group data
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

// Actually save the JSON file
async function doExport() {
  saving.value = true;
  try {
    await ExportFile(previewFilename.value, previewContent.value);
    showPreviewModal.value = false;
  } finally {
    saving.value = false;
  }
}

// Computed
const filteredGroups = computed(() => {
  if (!searchQuery.value) return store.workflowGroups;
  const q = searchQuery.value.toLowerCase();
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

// Actions
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

function goToNodes() {
  router.push("/workflow/nodes");
}

// Import a workflow group from file
async function importGroup() {
  importing.value = true;
  try {
    const content = await ImportFile();
    if (!content) return; // user cancelled

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
</script>

<template>
  <div class="group-view page-layout">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t("grouppage.title") }}</h1>
      <div class="header-actions">
        <div class="header-search">
          <svg class="search-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input v-model="searchQuery" class="search-input" type="text" :placeholder="t('grouppage.search')" />
        </div>
        <button class="outline-btn" type="button" :disabled="importing" @click="importGroup">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>{{ importing ? "..." : t("grouppage.import") }}</span>
        </button>
        <button class="outline-btn" type="button" @click="goToNodes">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
          <span>{{ t("grouppage.nodes") }}</span>
        </button>
        <button class="add-btn" type="button" @click="openCreateModal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{{ t("grouppage.new") }}</span>
        </button>
      </div>
    </div>

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

    <!-- Create/Edit Modal -->
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

    <!-- Delete -->
    <ConfirmModal v-if="showDeleteModal" :title="t('grouppage.delete-title')"
      :message="t('grouppage.delete-msg', { name: deletingGroup?.name })" :confirm-text="t('grouppage.delete')"
      :danger="true" @confirm="onDeleteConfirm" @cancel="showDeleteModal = false" />
  </div>
</template>

<style lang="scss" scoped>
.group-view {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

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

// Search
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

// Empty
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

// Grid
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

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    padding: 20px 24px 0;
  }

  .modal-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
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
</style>
