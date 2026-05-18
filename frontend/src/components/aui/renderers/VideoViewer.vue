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

const demoPoster = computed(() => {
  if (!props.data) return ""
  return props.data.poster || ""
})

const demoDesc = computed(() => {
  if (!props.data) return ""
  return props.data.description || ""
})

const blobUrl = ref("")
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

async function loadVideo() {
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
        const mimeType = result.mimeType || "video/mp4"
        if (content) {
          const binary = Uint8Array.from(atob(content), c => c.charCodeAt(0))
          const blob = new Blob([binary], { type: mimeType })
          blobUrl.value = URL.createObjectURL(blob)
        }
      }
    } catch (e: any) {
      errorMsg.value = e?.message || "读取视频文件失败"
    }
  }
  loading.value = false
}

watch(filePath, () => {
  if (filePath.value) loadVideo()
}, { immediate: true })
</script>

<template>
  <div class="video-viewer">
    <div v-if="loading" class="viewer-loading">加载视频中...</div>
    <div v-else-if="errorMsg" class="viewer-error">{{ errorMsg }}</div>
    <div v-else-if="blobUrl">
      <video :src="blobUrl" class="video-player" controls />
    </div>
    <div v-else-if="!filePath" class="video-demo">
      <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.1)" />
      </svg>
      <p class="video-demo-title">视频播放器</p>
      <p v-if="demoDesc" class="video-demo-desc">{{ demoDesc }}</p>
      <p class="video-demo-hint">任务执行后将在此处播放交付的视频文件</p>
    </div>
    <div v-else class="viewer-empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <p>未设置视频文件路径</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.video-viewer {
  width: 100%;
  height: 100%;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.video-player {
  max-width: 100%;
  max-height: 100%;
}

.video-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
}

.video-demo-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

.video-demo-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

.video-demo-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
  margin: 8px 0 0 0;
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

.viewer-error { color: #ef4444; }
.viewer-empty { background: #1a1a1a; }
</style>
