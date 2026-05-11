<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useProjectStore } from "@/stores/project";
import type { Project } from "@/stores/project";
import { useWorkflowStore } from "@/stores/workflow";
import { SelectDirectory } from "../../../wailsjs/go/app/App";
import ConfirmModal from "@/components/ConfirmModal.vue";

const { t } = useI18n();
const projectStore = useProjectStore();
const workflowStore = useWorkflowStore();

const viewMode = ref<"grid" | "list">("grid");
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingProject = ref<Project | null>(null);
const editForm = ref({ name: "", description: "", path: "", workflowGroupId: "" });
const newProject = ref({ name: "", description: "", path: "", workflowGroupId: "" });
const selectDirLoading = ref(false);
const editDirLoading = ref(false);

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const openCreateModal = () => {
  newProject.value = { name: "", description: "", path: "", workflowGroupId: workflowStore.currentGroupId || workflowStore.workflowGroups[0]?.id || "" };
  showCreateModal.value = true;
};

const selectDirectory = async () => {
  selectDirLoading.value = true;
  try {
    const dir = await SelectDirectory();
    if (dir) {
      newProject.value.path = dir;
    }
  } catch {
    // user cancelled or error — ignore
  } finally {
    selectDirLoading.value = false;
  }
};

const selectEditDirectory = async () => {
  editDirLoading.value = true;
  try {
    const dir = await SelectDirectory();
    if (dir) {
      editForm.value.path = dir;
    }
  } catch {
    // user cancelled or error — ignore
  } finally {
    editDirLoading.value = false;
  }
};

const createProject = () => {
  if (!newProject.value.name.trim()) return;
  projectStore.addProject({
    name: newProject.value.name.trim(),
    description: newProject.value.description.trim(),
    path: newProject.value.path.trim(),
    workflowGroupId: newProject.value.workflowGroupId,
  });
  showCreateModal.value = false;
};

const showDeleteModal = ref(false);
const deletingProject = ref<Project | null>(null);

const confirmDelete = (project: Project) => {
  deletingProject.value = project;
  showDeleteModal.value = true;
};

const onDeleteConfirm = () => {
  if (!deletingProject.value) return;
  projectStore.deleteProject(deletingProject.value.id);
  showDeleteModal.value = false;
  deletingProject.value = null;
};

const onDeleteCancel = () => {
  showDeleteModal.value = false;
  deletingProject.value = null;
};

const openEditModal = (project: Project) => {
  editingProject.value = project;
  editForm.value = { name: project.name, description: project.description, path: project.path, workflowGroupId: project.workflowGroupId || "" };
  showEditModal.value = true;
};

const updateProject = () => {
  if (!editingProject.value || !editForm.value.name.trim()) return;
  projectStore.updateProject(editingProject.value.id, {
    name: editForm.value.name.trim(),
    description: editForm.value.description.trim(),
    path: editForm.value.path.trim(),
    workflowGroupId: editForm.value.workflowGroupId,
  });
  showEditModal.value = false;
};

const enterProject = (project: Project) => {
  projectStore.setCurrentProject(project.id);
};
</script>

<template>
  <div class="project-view page-layout">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t("projectpage.title") }}</h1>
      <div class="header-actions">
        <div class="view-toggle">
          <button :class="['toggle-btn', { active: viewMode === 'grid' }]" type="button"
            :title="t('projectpage.grid-view')" @click="viewMode = 'grid'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button :class="['toggle-btn', { active: viewMode === 'list' }]" type="button"
            :title="t('projectpage.list-view')" @click="viewMode = 'list'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
        <button class="add-btn" type="button" @click="openCreateModal">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{{ t("projectpage.add") }}</span>
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="projectStore.projects.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <div class="empty-title">{{ t("projectpage.empty-title") }}</div>
      <div class="empty-subtitle">{{ t("projectpage.empty-subtitle") }}</div>
    </div>

    <!-- Grid view -->
    <div v-else-if="viewMode === 'grid'" class="project-grid">
      <div v-for="project in projectStore.projects" :key="project.id"
        :class="['project-card', { active: projectStore.currentProjectId === project.id }]"
        @click="enterProject(project)">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span class="card-name">{{ project.name }}</span>
        </div>
        <div class="card-desc">{{ project.description }}</div>
        <div class="card-path" :title="project.path">{{ project.path }}</div>
        <div class="card-footer">
          <span class="card-date">{{ formatDate(project.createdAt) }}</span>
          <div class="card-actions">
            <button class="card-action-btn" type="button" @click.stop="enterProject(project)"
              :title="t('projectpage.enter')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <button class="card-action-btn" type="button" @click.stop="openEditModal(project)"
              :title="t('projectpage.edit')">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="card-action-btn card-delete" type="button" :title="t('projectpage.delete')"
              @click.stop="confirmDelete(project)">
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

    <!-- List view -->
    <div v-else class="project-list">
      <div class="list-header">
        <span class="col-name">{{ t("projectpage.name") }}</span>
        <span class="col-desc">{{ t("projectpage.description") }}</span>
        <span class="col-path">{{ t("projectpage.path") }}</span>
        <span class="col-action"></span>
      </div>
      <div v-for="project in projectStore.projects" :key="project.id"
        :class="['list-row', { active: projectStore.currentProjectId === project.id }]" @click="enterProject(project)">
        <span class="col-name">
          <svg class="row-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {{ project.name }}
        </span>
        <span class="col-desc">{{ project.description }}</span>
        <span class="col-path" :title="project.path">{{ project.path }}</span>
        <span class="col-action">
          <button class="row-action-btn" type="button" :title="t('projectpage.enter')"
            @click.stop="enterProject(project)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button class="row-action-btn" type="button" :title="t('projectpage.edit')"
            @click.stop="openEditModal(project)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button class="row-action-btn row-delete" type="button" :title="t('projectpage.delete')"
            @click.stop="confirmDelete(project)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </span>
      </div>
    </div>

    <!-- Create modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-panel">
        <div class="modal-title">{{ t("projectpage.add") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.name") }}</label>
            <input v-model="newProject.name" class="form-input" type="text"
              :placeholder="t('projectpage.name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.description") }}</label>
            <textarea v-model="newProject.description" class="form-input form-textarea"
              :placeholder="t('projectpage.desc-placeholder')" rows="3"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.workflow-group") }}</label>
            <select v-model="newProject.workflowGroupId" class="form-input form-select">
              <option value="">{{ t("projectpage.workflow-group-placeholder") }}</option>
              <option v-for="g in workflowStore.workflowGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.path") }}</label>
            <div class="path-input-row">
              <input v-model="newProject.path" class="form-input form-path" type="text"
                :placeholder="t('projectpage.path-placeholder')" />
              <button class="btn btn-browse" type="button" :disabled="selectDirLoading" @click="selectDirectory">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {{ t("projectpage.select-path") }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showCreateModal = false">
            {{ t("projectpage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button" @click="createProject">
            {{ t("projectpage.confirm") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal-panel">
        <div class="modal-title">{{ t("projectpage.edit") }}</div>
        <div class="modal-body">
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.name") }}</label>
            <input v-model="editForm.name" class="form-input" type="text"
              :placeholder="t('projectpage.name-placeholder')" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.description") }}</label>
            <textarea v-model="editForm.description" class="form-input form-textarea"
              :placeholder="t('projectpage.desc-placeholder')" rows="3"></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.workflow-group") }}</label>
            <select v-model="editForm.workflowGroupId" class="form-input form-select">
              <option value="">{{ t("projectpage.workflow-group-placeholder") }}</option>
              <option v-for="g in workflowStore.workflowGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("projectpage.path") }}</label>
            <div class="path-input-row">
              <input v-model="editForm.path" class="form-input form-path" type="text"
                :placeholder="t('projectpage.path-placeholder')" />
              <button class="btn btn-browse" type="button" :disabled="editDirLoading" @click="selectEditDirectory">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {{ t("projectpage.select-path") }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showEditModal = false">
            {{ t("projectpage.cancel") }}
          </button>
          <button class="btn btn-confirm" type="button" @click="updateProject">
            {{ t("projectpage.confirm") }}
          </button>
        </div>
      </div>
    </div>
    <ConfirmModal v-if="showDeleteModal" :title="t('projectpage.delete-confirm-title')"
      :message="t('projectpage.delete-confirm-msg', { name: deletingProject?.name })"
      :confirm-text="t('projectpage.delete')" :danger="true" @confirm="onDeleteConfirm" @cancel="onDeleteCancel" />
  </div>
</template>

<style lang="scss" scoped>
.page-header {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.view-toggle {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    border: none;
    background-color: #ffffff;
    color: #6b6b6b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:first-child {
      border-right: 1px solid #e5e5e5;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #ececec;
      color: #1f1f1f;
    }
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

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  overflow-y: auto;
}

.project-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: #fafafa;
  }

  &.active {
    border-color: #1f1f1f;
    background-color: #fafafa;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;

    .card-icon {
      flex-shrink: 0;
      color: #6b6b6b;
    }

    .card-name {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #1f1f1f;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .card-desc {
    font-size: 13px;
    color: #4a4a4a;
    line-height: 1.5;
    margin-bottom: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-path {
    font-size: 12px;
    color: #9a9a9a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 8px;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;

    .card-date {
      font-size: 12px;
      color: #9a9a9a;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 2px;
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
  }
}

.project-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;

  .list-header {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    color: #9a9a9a;
    border-bottom: 1px solid #e5e5e5;
  }

  .list-row {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: #fafafa;
    }

    &.active {
      background-color: #ececec;
    }

    .row-icon {
      flex-shrink: 0;
      color: #6b6b6b;
      margin-right: 8px;
    }
  }

  .col-name {
    flex: 2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    font-size: 13px;
    color: #1f1f1f;
    font-weight: 500;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-desc {
    flex: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: #4a4a4a;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-path {
    flex: 3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    color: #9a9a9a;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-action {
    flex: 0 0 84px;
    display: flex;
    align-items: center;
    gap: 2px;
    justify-content: flex-end;
  }

  .row-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: #9a9a9a;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }

    &.row-delete:hover {
      color: #e74c3c;
    }
  }
}

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
  border-radius: 6px;
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
    gap: 16px;
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
    min-height: 72px;
    padding: 8px 10px;
    resize: vertical;
    line-height: 1.5;
  }

  .path-input-row {
    display: flex;
    gap: 8px;

    .form-path {
      flex: 1;
    }
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

  &.btn-browse {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    color: #4a4a4a;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      background-color: #f5f5f5;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>