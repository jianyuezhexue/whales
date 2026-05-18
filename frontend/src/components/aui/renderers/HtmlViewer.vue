<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useProjectStore } from "@/stores/project"

const props = defineProps<{
  data?: any
}>()

const projectStore = useProjectStore()

const filePath = computed(() => {
  if (!props.data) return ""
  if (typeof props.data === "string") return props.data
  return props.data.path || ""
})

const inlineHtml = computed(() => {
  if (!props.data) return ""
  return props.data.inlineHtml || ""
})

const htmlContent = ref("")
const loading = ref(false)
const errorMsg = ref("")

let wailsApp: any = null
async function getWailsApp() {
  if (wailsApp) return wailsApp
  try {
    wailsApp = await import("../../../../wailsjs/go/app/App")
    return wailsApp
  } catch {
    return null
  }
}

function isWailsAvailable() {
  return typeof window !== "undefined" && (window as any).go?.main?.App !== undefined
}

async function loadHtml() {
  if (!filePath.value) return
  loading.value = true
  errorMsg.value = ""

  const projectPath = projectStore.currentProject?.path
  if (!projectPath) {
    errorMsg.value = "未打开项目"
    loading.value = false
    return
  }

  if (isWailsAvailable()) {
    try {
      const app = await getWailsApp()
      if (app) {
        const result = await app.ReadAuiOutputFile(projectPath, filePath.value)
        const content = result.content || result
        if (content) {
          const binary = Uint8Array.from(atob(content), c => c.charCodeAt(0))
          const decoder = new TextDecoder("utf-8")
          htmlContent.value = decoder.decode(binary)
        }
      }
    } catch (e: any) {
      errorMsg.value = e?.message || "读取文件失败"
    }
  } else {
    htmlContent.value = inlineHtml.value || `<html><body style="font-family:sans-serif;padding:40px;color:#666;text-align:center"><h2>HTML 预览</h2><p>文件路径: ${filePath.value}</p><p style="color:#999">启动 Wails 应用以加载本地文件</p></body></html>`
    errorMsg.value = ""
  }
  loading.value = false
}

const blobUrl = ref("")
watch([htmlContent, inlineHtml], () => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value)
  const content = htmlContent.value || inlineHtml.value
  if (content) {
    const blob = new Blob([content], { type: "text/html" })
    blobUrl.value = URL.createObjectURL(blob)
  } else {
    blobUrl.value = ""
  }
})

watch(filePath, () => {
  if (filePath.value) loadHtml()
}, { immediate: true })
</script>

<template>
  <div class="html-viewer">
    <div v-if="loading" class="viewer-loading">加载中...</div>
    <div v-else-if="errorMsg" class="viewer-error">{{ errorMsg }}</div>
    <div v-else-if="!blobUrl && !inlineHtml" class="viewer-empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p>未设置文件路径</p>
    </div>
    <iframe
      v-else-if="blobUrl"
      :src="blobUrl"
      class="html-iframe"
      sandbox="allow-scripts allow-same-origin"
      title="HTML Preview"
    />
  </div>
</template>

<style lang="scss" scoped>
.html-viewer {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.html-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.viewer-loading,
.viewer-error,
.viewer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;
}

.viewer-error {
  color: #ef4444;
}
</style>
