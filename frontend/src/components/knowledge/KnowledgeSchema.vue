<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Schema, SchemaField, SchemaFieldType } from "@/types/knowledge"

const { t } = useI18n()

const props = defineProps<{
  schemas: Schema[]
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: "save-schema", schema: Schema): void
  (e: "delete-schema", id: string): void
}>()

// Side drawer state
const drawerOpen = ref(false)
const editingSchema = ref<Schema | null>(null)
const isNewSchema = ref(false)

const fieldTypeOptions: { value: SchemaFieldType; label: string }[] = [
  { value: "string", label: t("knowledgepage.type-string") },
  { value: "number", label: t("knowledgepage.type-number") },
  { value: "date", label: t("knowledgepage.type-date") },
  { value: "select", label: t("knowledgepage.type-select") },
  { value: "boolean", label: t("knowledgepage.type-boolean") },
]

function getFieldTypeLabel(type: SchemaFieldType): string {
  const opt = fieldTypeOptions.find((o) => o.value === type)
  return opt ? opt.label : type
}

function openNewSchema() {
  isNewSchema.value = true
  editingSchema.value = { id: "", name: "", fields: [] }
  drawerOpen.value = true
}

function openEditSchema(schema: Schema) {
  isNewSchema.value = false
  editingSchema.value = JSON.parse(JSON.stringify(schema))
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
  editingSchema.value = null
}

function addField() {
  if (!editingSchema.value) return
  editingSchema.value = {
    ...editingSchema.value,
    fields: [
      ...editingSchema.value.fields,
      { id: crypto.randomUUID(), name: "", type: "string" as SchemaFieldType, required: false },
    ],
  }
}

function updateField(field: SchemaField) {
  if (!editingSchema.value) return
  editingSchema.value = {
    ...editingSchema.value,
    fields: editingSchema.value.fields.map((f) => (f.id === field.id ? field : f)),
  }
}

function removeField(id: string) {
  if (!editingSchema.value) return
  editingSchema.value = {
    ...editingSchema.value,
    fields: editingSchema.value.fields.filter((f) => f.id !== id),
  }
}

function saveDrawer() {
  if (!editingSchema.value) return
  const schema: Schema = {
    ...editingSchema.value,
    id: editingSchema.value.id || crypto.randomUUID(),
  }
  emit("save-schema", schema)
  closeDrawer()
}

function onOptionKeyup(fieldId: string, event: KeyboardEvent) {
  if (event.key === "Enter") {
    const input = event.target as HTMLInputElement
    const value = input.value.trim()
    if (value && editingSchema.value) {
      const field = editingSchema.value.fields.find((f) => f.id === fieldId)
      if (field) {
        const options = field.options || []
        if (!options.includes(value)) {
          updateField({ ...field, options: [...options, value] })
        }
      }
    }
    input.value = ""
  }
}

function removeOption(fieldId: string, option: string) {
  if (!editingSchema.value) return
    const field = editingSchema.value.fields.find((f) => f.id === fieldId)
    if (field) {
      updateField({ ...field, options: (field.options || []).filter((o) => o !== option) })
    }
  }
</script>

<template>
  <div class="kb-schema-panel">
    <div class="panel-header">
      <span>{{ t("knowledgepage.schema") }}</span>
      <button class="add-schema-btn" type="button" @click="openNewSchema">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {{ t("knowledgepage.schema-new") }}
      </button>
    </div>

    <!-- Schema list -->
    <div class="schema-list">
      <div v-if="schemas.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#c0c0c0" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span class="empty-text">{{ t("knowledgepage.schema-empty") }}</span>
      </div>

      <div
        v-for="schema in schemas"
        :key="schema.id"
        class="schema-card"
        @click="openEditSchema(schema)"
      >
        <div class="schema-card-header">
          <span class="schema-card-name">{{ schema.name || t("knowledgepage.schema-default-name") }}</span>
          <button
            class="schema-card-delete"
            type="button"
            :title="t('knowledgepage.delete')"
            @click.stop="emit('delete-schema', schema.id)"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
        <div class="schema-card-fields">
          <span v-for="field in schema.fields.slice(0, 4)" :key="field.id" class="field-tag">
            {{ field.name || "?" }}
            <span class="field-type-tag">{{ getFieldTypeLabel(field.type) }}</span>
          </span>
          <span v-if="schema.fields.length > 4" class="field-more">+{{ schema.fields.length - 4 }}</span>
          <span v-if="schema.fields.length === 0" class="field-none">{{ t("knowledgepage.no-fields") }}</span>
        </div>
      </div>
    </div>

    <!-- Side drawer -->
    <Transition name="drawer">
      <div v-if="drawerOpen" class="drawer-overlay" @click.self="closeDrawer">
        <div class="drawer-panel">
          <div class="drawer-header">
            <span class="drawer-title">
              {{ isNewSchema ? t("knowledgepage.schema-new") : t("knowledgepage.schema") }}
            </span>
            <button class="drawer-close" type="button" @click="closeDrawer">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="drawer-body" v-if="editingSchema">
            <div class="form-field">
              <label class="form-label">{{ t("knowledgepage.schema-name") }}</label>
              <input
                class="form-input"
                type="text"
                :value="editingSchema.name"
                :placeholder="t('knowledgepage.schema-name-placeholder')"
                @input="editingSchema = { ...editingSchema, name: ($event.target as HTMLInputElement).value }"
              />
            </div>

            <div class="fields-section">
              <div class="fields-section-header">
                <span class="form-label">{{ t("knowledgepage.add-field") }}</span>
              </div>

              <div v-for="field in editingSchema.fields" :key="field.id" class="schema-field-card">
                <div class="field-row">
                  <input
                    class="field-name-input"
                    type="text"
                    :value="field.name"
                    :placeholder="t('knowledgepage.field-name')"
                    @input="updateField({ ...field, name: ($event.target as HTMLInputElement).value })"
                  />
                  <select
                    class="field-type-select"
                    :value="field.type"
                    @change="updateField({ ...field, type: ($event.target as HTMLSelectElement).value as SchemaFieldType })"
                  >
                    <option v-for="opt in fieldTypeOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>

                <div v-if="field.type === 'select'" class="field-options-area">
                  <div class="field-options-label">{{ t("knowledgepage.field-options") }}</div>
                  <div class="field-options-tags">
                    <span v-for="option in field.options || []" :key="option" class="option-tag">
                      {{ option }}
                      <span class="option-tag-remove" @click="removeOption(field.id, option)">&times;</span>
                    </span>
                    <input
                      class="option-add-input"
                      type="text"
                      :placeholder="t('knowledgepage.field-option-placeholder')"
                      @keyup="onOptionKeyup(field.id, $event)"
                    />
                  </div>
                </div>

                <div class="field-meta">
                  <label class="field-required-label">
                    <input
                      type="checkbox"
                      class="field-checkbox"
                      :checked="field.required"
                      @change="updateField({ ...field, required: ($event.target as HTMLInputElement).checked })"
                    />
                    {{ t("knowledgepage.field-required") }}
                  </label>
                  <button class="field-remove-btn" type="button" @click="removeField(field.id)">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <button class="add-field-btn" type="button" @click="addField">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {{ t("knowledgepage.add-field") }}
              </button>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="btn btn-cancel" type="button" @click="closeDrawer">
              {{ t("knowledgepage.cancel-edit") }}
            </button>
            <button class="btn btn-confirm" type="button" :disabled="isSaving" @click="saveDrawer">
              {{ isSaving ? `${t("knowledgepage.save-schema")}...` : t("knowledgepage.save-schema") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.kb-schema-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 36px;
  font-size: 13px;
  font-weight: 600;
  color: #4a4a4a;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

.add-schema-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b6b6b;
  font-size: 11px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.schema-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;

  .empty-text {
    font-size: 13px;
    color: #c0c0c0;
  }
}

.schema-card {
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #d0d0d0;
    background-color: #fafafa;
  }
}

.schema-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.schema-card-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f1f1f;
}

.schema-card-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9a9a9a;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s;

  &:hover {
    color: #e74c3c;
    background-color: #fef2f2;
  }
}

.schema-card:hover .schema-card-delete {
  opacity: 1;
}

.schema-card-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.field-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #4a4a4a;
  background-color: #f5f5f5;
  border: 1px solid #e5e5e5;
}

.field-type-tag {
  font-size: 10px;
  color: #9a9a9a;
}

.field-more {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  color: #9a9a9a;
}

.field-none {
  font-size: 11px;
  color: #c0c0c0;
}

// Side drawer
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.35);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 420px;
  height: 100%;
  background: #ffffff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: 48px;
  padding: 0 20px;
  border-bottom: 1px solid #e5e5e5;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f1f1f;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #6b6b6b;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #f0f0f0;
    color: #1f1f1f;
  }
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
}

// Drawer transition
.drawer-enter-active {
  transition: all 0.25s ease;

  .drawer-panel {
    transition: transform 0.25s ease;
  }
}

.drawer-leave-active {
  transition: all 0.2s ease;

  .drawer-panel {
    transition: transform 0.2s ease;
  }
}

.drawer-enter-from {
  opacity: 0;

  .drawer-panel {
    transform: translateX(100%);
  }
}

.drawer-leave-to {
  opacity: 0;

  .drawer-panel {
    transform: translateX(100%);
  }
}

.drawer-enter-to, .drawer-leave-from {
  opacity: 1;

  .drawer-panel {
    transform: translateX(0);
  }
}

// Form styles
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

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
  background: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
}

.fields-section { margin-top: 8px; }
.fields-section-header { margin-bottom: 8px; }

.schema-field-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #ffffff;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-name-input {
  flex: 1;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: #1f1f1f; }
  &::placeholder { color: #c0c0c0; }
}

.field-type-select {
  width: 80px;
  height: 28px;
  padding: 0 4px;
  border: 1px solid #e5e5e5;
  border-radius: 4px;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  cursor: pointer;
  flex-shrink: 0;

  &:focus { border-color: #1f1f1f; }
}

.field-options-area {
  padding: 6px 0 0;
  border-top: 1px solid #f0f0f0;
}

.field-options-label {
  font-size: 11px;
  color: #9a9a9a;
  margin-bottom: 4px;
}

.field-options-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.option-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  color: #4a4a4a;
  background-color: #f0f0f0;
  border: 1px solid #e5e5e5;

  .option-tag-remove {
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    opacity: 0.5;
    &:hover { opacity: 1; }
  }
}

.option-add-input {
  height: 20px;
  min-width: 80px;
  flex: 1;
  padding: 0 4px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;

  &::placeholder { color: #c0c0c0; }
}

.field-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.field-required-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b6b6b;
  cursor: pointer;
}

.field-checkbox {
  width: 14px;
  height: 14px;
  accent-color: #1f1f1f;
  cursor: pointer;
}

.field-remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9a9a9a;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: #e74c3c;
    background-color: #fef2f2;
  }
}

.add-field-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px dashed #d0d0d0;
  border-radius: 6px;
  background: transparent;
  color: #6b6b6b;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background-color: #fafafa;
  }
}

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
    background: #ffffff;
    color: #4a4a4a;

    &:hover { background-color: #f5f5f5; }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover { opacity: 0.85; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}
</style>
