import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { useProjectStore } from "./project"
import { listAuis, saveAui, deleteAui } from "@/composables/useAuiApi"
import {
  generateJsonSchema,
  generateSampleData,
} from "@/types/aui"
import type { AuiInstance, AuiField, AuiRendererType } from "@/types/aui"

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const useAuiStore = defineStore("aui", () => {
  const projectStore = useProjectStore()

  const auiList = ref<AuiInstance[]>([])
  const selectedId = ref<string | null>(null)
  const isLoading = ref(false)

  const selectedAui = computed(() =>
    auiList.value.find((a) => a.id === selectedId.value) ?? null,
  )

  // ── CRUD ──────────────────────────────────────────────────

  async function load() {
    const path = projectStore.currentProject?.path
    if (!path) return
    isLoading.value = true
    try {
      auiList.value = await listAuis(path)
    } catch {
      auiList.value = []
    } finally {
      isLoading.value = false
    }
  }

  function select(id: string | null) {
    selectedId.value = id
  }

  function create(rendererType: AuiRendererType = "table"): AuiInstance {
    const now = new Date().toISOString()
    const aui: AuiInstance = {
      id: genId(),
      name: "",
      description: "",
      rendererType,
      fields: [],
      jsonSchema: {},
      sampleData: rendererType === "table" ? [] : rendererType === "browser-preview" ? { url: "", title: "" } : [],
      aiPrompt: "",
      createdAt: now,
      updatedAt: now,
    }
    auiList.value.unshift(aui)
    selectedId.value = aui.id
    return aui
  }

  function addField(auiId: string): AuiField | null {
    const aui = auiList.value.find((a) => a.id === auiId)
    if (!aui) return null
    const field: AuiField = {
      id: genId(),
      key: `field_${aui.fields.length + 1}`,
      title: "",
      type: "text",
      required: false,
      description: "",
    }
    aui.fields.push(field)
    syncSchema(aui)
    return field
  }

  function updateField(auiId: string, fieldId: string, updates: Partial<AuiField>) {
    const aui = auiList.value.find((a) => a.id === auiId)
    if (!aui) return
    const field = aui.fields.find((f) => f.id === fieldId)
    if (!field) return
    Object.assign(field, updates)
    syncSchema(aui)
  }

  function removeField(auiId: string, fieldId: string) {
    const aui = auiList.value.find((a) => a.id === auiId)
    if (!aui) return
    aui.fields = aui.fields.filter((f) => f.id !== fieldId)
    syncSchema(aui)
  }

  function syncSchema(aui: AuiInstance) {
    aui.jsonSchema = generateJsonSchema(aui.fields, aui.rendererType)
    aui.sampleData = generateSampleData(aui.fields, aui.rendererType)
    aui.updatedAt = new Date().toISOString()
  }

  function updateAui(auiId: string, updates: Partial<Pick<AuiInstance, "name" | "description" | "rendererType" | "sampleData" | "aiPrompt">>) {
    const aui = auiList.value.find((a) => a.id === auiId)
    if (!aui) return
    const rendererChanged = updates.rendererType && updates.rendererType !== aui.rendererType
    Object.assign(aui, updates)
    if (rendererChanged) {
      syncSchema(aui)
    }
    aui.updatedAt = new Date().toISOString()
  }

  async function save(auiId: string) {
    const aui = auiList.value.find((a) => a.id === auiId)
    if (!aui) return
    const path = projectStore.currentProject?.path
    if (!path) return
    await saveAui(path, aui)
  }

  async function remove(auiId: string) {
    const path = projectStore.currentProject?.path
    if (!path) return
    try {
      await deleteAui(path, auiId)
    } catch {
      // ignore file-not-found
    }
    auiList.value = auiList.value.filter((a) => a.id !== auiId)
    if (selectedId.value === auiId) {
      selectedId.value = auiList.value.length > 0 ? auiList.value[0].id : null
    }
  }

  return {
    auiList,
    selectedId,
    selectedAui,
    isLoading,
    load,
    select,
    create,
    addField,
    updateField,
    removeField,
    updateAui,
    syncSchema,
    save,
    remove,
  }
})