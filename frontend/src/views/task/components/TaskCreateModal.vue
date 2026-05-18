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
        <textarea
          ref="nameInputRef"
          v-model="name"
          class="name-input"
          rows="2"
          :placeholder="t('taskboard.task-name-placeholder')"
          @input="autoResize"
          @keydown="(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleConfirm(); }"
          @keyup.escape="emit('close')"
        />
        <div class="name-hint">
          <span v-if="name.trim()">任务将命名为「<strong>{{ name.trim().slice(0, 8) }}</strong>」</span>
          <span class="shortcut-hint">Ctrl+Enter 创建</span>
        </div>
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
        <!-- 定时任务 -->
        <div class="schedule-section">
          <div class="schedule-header" @click="scheduleEnabled = !scheduleEnabled">
            <span class="schedule-label">{{ t("taskboard.schedule") }}</span>
            <button type="button" class="toggle-switch" :class="{ on: scheduleEnabled }"
              @click.stop="scheduleEnabled = !scheduleEnabled">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div v-if="scheduleEnabled" class="schedule-body">
            <div class="schedule-mode-tabs">
              <button type="button" class="mode-tab" :class="{ active: scheduleMode === 'interval' }"
                @click="scheduleMode = 'interval'">{{ t("taskboard.schedule-interval") }}</button>
              <button type="button" class="mode-tab" :class="{ active: scheduleMode === 'daily' }"
                @click="scheduleMode = 'daily'">{{ t("taskboard.schedule-daily") }}</button>
            </div>
            <div class="schedule-row">
              <template v-if="scheduleMode === 'interval'">
                <span class="schedule-prefix">{{ t("taskboard.schedule-every") }}</span>
                <input v-model.number="intervalValue" class="schedule-number" type="number" min="1" />
                <div class="schedule-unit-select">
                  <button type="button" class="unit-btn" :class="{ active: intervalUnit === 'seconds' }"
                    @click="intervalUnit = 'seconds'">{{ t("taskboard.schedule-seconds") }}</button>
                  <button type="button" class="unit-btn" :class="{ active: intervalUnit === 'minutes' }"
                    @click="intervalUnit = 'minutes'">{{ t("taskboard.schedule-minutes") }}</button>
                  <button type="button" class="unit-btn" :class="{ active: intervalUnit === 'hours' }"
                    @click="intervalUnit = 'hours'">{{ t("taskboard.schedule-hours") }}</button>
                </div>
              </template>
              <template v-else>
                <span class="schedule-prefix">{{ t("taskboard.schedule-at") }}</span>
                <input v-model="dailyTime" class="schedule-time" type="time" />
                <div class="daily-dropdown" :class="{ open: dailyDropdownOpen }"
                  v-click-outside="() => { dailyDropdownOpen = false }">
                  <button type="button" class="daily-dropdown-toggle" @click="dailyDropdownOpen = !dailyDropdownOpen"
                    title="选择时间">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div v-if="dailyDropdownOpen" class="daily-dropdown-popup">
                    <button
                      v-for="opt in dailyTimeOptions"
                      :key="opt"
                      type="button"
                      class="daily-time-opt"
                      :class="{ active: dailyTime === opt }"
                      @click="selectDailyTime(opt)"
                    >{{ opt }}</button>
                  </div>
                </div>
              </template>
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

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { useWorkflowStore } from "@/stores/workflow";

defineProps<{
  parentName?: string;
}>();

export interface ScheduleConfig {
  enabled: boolean;
  mode: "interval" | "daily";
  intervalValue: number;
  intervalUnit: "seconds" | "minutes" | "hours";
  dailyTime: string;
}

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", name: string, workflowId?: string, workflowName?: string, schedule?: ScheduleConfig): void;
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

// Schedule
const scheduleEnabled = ref(false);
const scheduleMode = ref<"interval" | "daily">("interval");
const intervalValue = ref(30);
const intervalUnit = ref<"seconds" | "minutes" | "hours">("minutes");
const dailyTime = ref("09:00");
const dailyDropdownOpen = ref(false);

// 00:00 to 23:30, every 30 minutes
const dailyTimeOptions = computed(() => {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, "0");
    opts.push(`${hh}:00`);
    opts.push(`${hh}:30`);
  }
  return opts;
});

const selectDailyTime = (time: string) => {
  dailyTime.value = time;
  dailyDropdownOpen.value = false;
};

const buildSchedule = (): ScheduleConfig => ({
  enabled: scheduleEnabled.value,
  mode: scheduleMode.value,
  intervalValue: intervalValue.value,
  intervalUnit: intervalUnit.value,
  dailyTime: dailyTime.value,
});

const name = ref("");
const nameInputRef = ref<HTMLTextAreaElement>();

const autoResize = () => {
  const el = nameInputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 168) + 'px'; // max ~6 lines
};
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
  emit("confirm", trimmed, selectedWorkflowId.value || undefined, wf?.name, buildSchedule());
  name.value = "";
  selectedWorkflowId.value = "";
  scheduleEnabled.value = false;
};

const onOpened = () => {
  nextTick(() => nameInputRef.value?.focus());
};

defineExpose({ onOpened });
</script>

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
  min-height: 60px;
  padding: 8px 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  outline: none;
  box-sizing: border-box;
  resize: none;
  overflow: hidden;
  transition: border-color 0.15s ease;
  line-height: 1.6;

  &::placeholder {
    color: #c0c0c0;
  }

  &:focus {
    border-color: #1f1f1f;
  }
}

.name-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: #9a9a9a;

  strong {
    color: #1f1f1f;
  }
}

.shortcut-hint {
  color: #c0c0c0;
  font-size: 11px;
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

// ── 定时任务 ──
.schedule-section {
  margin-top: 14px;
}

.schedule-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.schedule-label {
  font-size: 13px;
  font-weight: 500;
  color: #1f1f1f;
}

// ── Toggle switch ──
.toggle-switch {
  position: relative;
  width: 36px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 10px;
  background-color: #d0d0d0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  flex-shrink: 0;

  &.on {
    background-color: #1f1f1f;
  }

  .toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s ease;
  }

  &.on .toggle-knob {
    transform: translateX(16px);
  }
}

.schedule-body {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #fafafa;
}

.schedule-mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 10px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  overflow: hidden;
  background-color: #ffffff;

  .mode-tab {
    flex: 1;
    height: 26px;
    padding: 0;
    border: none;
    border-right: 1px solid #e5e5e5;
    background-color: #ffffff;
    font-size: 12px;
    font-family: inherit;
    color: #6b6b6b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}

.schedule-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.schedule-prefix {
  font-size: 12px;
  color: #6b6b6b;
  flex-shrink: 0;
}

.schedule-number {
  width: 52px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  text-align: center;
  outline: none;
  background-color: #ffffff;
  box-sizing: border-box;

  &:focus {
    border-color: #1f1f1f;
  }

  // Remove spinner buttons
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  -moz-appearance: textfield;
}

.schedule-unit-select {
  display: flex;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  overflow: hidden;
  background-color: #ffffff;

  .unit-btn {
    height: 28px;
    padding: 0 8px;
    border: none;
    border-right: 1px solid #e5e5e5;
    background-color: #ffffff;
    font-size: 12px;
    font-family: inherit;
    color: #6b6b6b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}

.schedule-time {
  width: 100px;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  font-size: 13px;
  font-family: "JetBrainsMono", monospace;
  color: #1f1f1f;
  outline: none;
  background-color: #ffffff;
  box-sizing: border-box;

  &:focus {
    border-color: #1f1f1f;
  }
}

.daily-dropdown {
  position: relative;
  flex-shrink: 0;

  .daily-dropdown-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 28px;
    padding: 0;
    border: 1px solid #e5e5e5;
    border-radius: 5px;
    background-color: #ffffff;
    color: #9a9a9a;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #1f1f1f;
      color: #1f1f1f;
    }
  }

  &.open .daily-dropdown-toggle svg {
    transform: rotate(180deg);
  }

  .daily-dropdown-popup {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    width: 230px;
    max-height: 180px;
    overflow-y: auto;
    background-color: #ffffff;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;
    padding: 4px;
  }

  .daily-time-opt {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 4px;
    border: none;
    border-radius: 3px;
    background: transparent;
    font-size: 11px;
    font-family: "JetBrainsMono", monospace;
    color: #6b6b6b;
    cursor: pointer;
    transition: all 0.1s ease;

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
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
