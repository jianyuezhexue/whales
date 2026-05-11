<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useWorkflowStore } from "@/stores/workflow";

defineProps<{
  parentName?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", name: string, workflowId?: string, workflowName?: string): void;
}>();

const { t } = useI18n();
const workflowStore = useWorkflowStore();

const allWorkflows = computed(() => {
  const list: { id: string; name: string }[] = [];
  for (const group of workflowStore.workflowGroups) {
    for (const wf of group.workflows) {
      list.push({ id: wf.id, name: wf.name });
    }
  }
  return list;
});

const name = ref("");
const nameInputRef = ref<HTMLInputElement>();
const selectedWorkflowId = ref("");
const workflowDropdownOpen = ref(false);

const selectedWorkflowName = computed(() => {
  if (!selectedWorkflowId.value) return "";
  const wf = allWorkflows.value.find((w) => w.id === selectedWorkflowId.value);
  return wf ? wf.name : "";
});

const toggleWorkflowDropdown = () => {
  workflowDropdownOpen.value = !workflowDropdownOpen.value;
};

const selectWorkflow = (id: string) => {
  selectedWorkflowId.value = id;
  workflowDropdownOpen.value = false;
};

const clearWorkflow = (e: Event) => {
  e.stopPropagation();
  selectedWorkflowId.value = "";
};

const handleConfirm = () => {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  const wf = allWorkflows.value.find((w) => w.id === selectedWorkflowId.value);
  emit("confirm", trimmed, selectedWorkflowId.value || undefined, wf?.name);
  name.value = "";
  selectedWorkflowId.value = "";
};

const onOpened = () => {
  nextTick(() => nameInputRef.value?.focus());
};

defineExpose({ onOpened });
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-panel">
      <div class="modal-header">
        <h3 class="modal-title">
          {{ t("taskboard.new-task") }}
        </h3>
        <button class="modal-close-btn" @click="emit('close')" :title="t('taskboard.close')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <label class="field-label">{{ t("taskboard.task-name") }}</label>
        <input
          ref="nameInputRef"
          v-model="name"
          class="name-input"
          type="text"
          :placeholder="t('taskboard.task-name-placeholder')"
          @keyup.enter="handleConfirm"
          @keyup.escape="emit('close')"
        />
        <label class="field-label workflow-label">工作流</label>
        <div class="input-dropdown" :class="{ open: workflowDropdownOpen }"
          v-click-outside="() => { workflowDropdownOpen = false }">
          <div class="dropdown-toggle" @click="toggleWorkflowDropdown">
            <span :class="{ placeholder: !selectedWorkflowName }">
              {{ selectedWorkflowName || "不选择" }}
            </span>
            <button v-if="selectedWorkflowName" class="dropdown-clear" type="button"
              @click="clearWorkflow" title="清除选择">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <div v-if="workflowDropdownOpen" class="dropdown-popup">
            <div class="dropdown-item" :class="{ active: !selectedWorkflowId }"
              @click="selectWorkflow('')">
              不选择
            </div>
            <div v-for="wf in allWorkflows" :key="wf.id" class="dropdown-item"
              :class="{ active: selectedWorkflowId === wf.id }"
              @click="selectWorkflow(wf.id)">
              {{ wf.name }}
            </div>
          </div>
        </div>
        <div v-if="parentName" class="parent-hint">
          父任务：{{ parentName }}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="emit('close')">{{ t("taskboard.cancel") }}</button>
        <button class="btn-confirm" :disabled="!name.trim()" @click="handleConfirm">
          {{ t("taskboard.create") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-panel {
  width: 420px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
}

.modal-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9a9a9a;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.modal-body {
  padding: 20px 20px 8px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #1f1f1f;
  margin-bottom: 6px;
}

.name-input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: #c0c0c0;
  }

  &:focus {
    border-color: #1f1f1f;
  }
}

.workflow-label {
  margin-top: 14px;
}

.input-dropdown {
  position: relative;

  .dropdown-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 36px;
    padding: 0 10px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", monospace;
    color: #1f1f1f;
    cursor: pointer;
    transition: border-color 0.15s ease;

    &:hover {
      border-color: #1f1f1f;
    }

    .placeholder {
      color: #c0c0c0;
    }

    > svg:last-child {
      flex-shrink: 0;
      color: #9a9a9a;
      margin-left: auto;
      transition: transform 0.15s ease;
    }
  }

  &.open .dropdown-toggle > svg:last-child {
    transform: rotate(180deg);
  }

  .dropdown-clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    background: transparent;
    color: #9a9a9a;
    border-radius: 3px;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }
  }

  .dropdown-popup {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 180px;
    overflow-y: auto;
    background-color: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;
    padding: 4px;
  }

  .dropdown-item {
    padding: 6px 8px;
    font-size: 13px;
    color: #1f1f1f;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #ececec;
      font-weight: 600;
    }
  }
}

.parent-hint {
  margin-top: 10px;
  font-size: 12px;
  color: #6b6b6b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px 20px;
  flex-shrink: 0;
}

.btn-cancel {
  padding: 7px 16px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  color: #6b6b6b;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background-color: #f0f0f0;
  }
}

.btn-confirm {
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  font-size: 13px;
  font-family: inherit;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background-color: #333333;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
