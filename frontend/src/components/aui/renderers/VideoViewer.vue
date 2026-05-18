<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue"
import { useProjectStore } from "@/stores/project"

const props = defineProps<{
  data?: any
}>()

const projectStore = useProjectStore()

const folderPath = computed(() => {
  if (!props.data) return ""
  if (typeof props.data === "string") return props.data
  return props.data.path || ""
})

const demoVideos = computed<string[]>(() => {
  if (!props.data) return []
  return props.data.demoVideos || props.data.videos || []
})

const videoItems = ref<{ url: string; name: string }[]>([])
const loading = ref(false)
const errorMsg = ref("")
const selectedIndex = ref(-1)

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

const videoExtensions = new Set(["mp4", "webm", "ogg", "mov", "avi", "mkv"])

function isVideoFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  return videoExtensions.has(ext)
}

async function loadVideos() {
  if (!folderPath.value) return
  loading.value = true
  errorMsg.value = ""
  videoItems.value = []

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
        const files: { name: string; path: string }[] = await app.ListAuiOutputDir(projectPath, folderPath.value)
        const videoFiles = files.filter(f => isVideoFile(f.name))
        for (const f of videoFiles) {
          const result = await app.ReadAuiOutputFile(projectPath, f.path)
          const content = result.content || result
          if (content) {
            const mimeType = result.mimeType || `video/${f.name.split(".").pop() === "ogg" ? "ogg" : f.name.split(".").pop() === "webm" ? "webm" : "mp4"}`
            const binary = Uint8Array.from(atob(content), c => c.charCodeAt(0))
            const blob = new Blob([binary], { type: mimeType })
            videoItems.value.push({ url: URL.createObjectURL(blob), name: f.name })
          }
        }
      }
    } catch (e: any) {
      errorMsg.value = e?.message || "读取视频失败"
    }
  } else {
    videoItems.value = demoVideos.value.map((url, i) => ({ url, name: `视频 ${i + 1}` }))
    if (!videoItems.value.length) {
      errorMsg.value = "启动 Wails 应用以加载本地视频文件夹"
    }
  }
  loading.value = false
}

watch(folderPath, () => {
  if (folderPath.value) loadVideos()
}, { immediate: true })

watch(demoVideos, () => {
  if (!folderPath.value && demoVideos.value.length) {
    videoItems.value = demoVideos.value.map((url, i) => ({ url, name: `视频 ${i + 1}` }))
  }
}, { immediate: true })

// Revoke blob URLs on cleanup
onUnmounted(() => {
  if (isWailsAvailable()) {
    videoItems.value.forEach(v => {
      if (v.url.startsWith("blob:")) URL.revokeObjectURL(v.url)
    })
  }
})

function selectVideo(index: number) {
  selectedIndex.value = index
}

function closePreview() {
  selectedIndex.value = -1
}

function prevVideo() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function nextVideo() {
  if (selectedIndex.value < videoItems.value.length - 1) {
    selectedIndex.value++
  }
}

function onKeydown(e: KeyboardEvent) {
  if (selectedIndex.value < 0) return
  if (e.key === "ArrowLeft") prevVideo()
  else if (e.key === "ArrowRight") nextVideo()
  else if (e.key === "Escape") closePreview()
}

watch(selectedIndex, (val) => {
  if (val >= 0) {
    document.addEventListener("keydown", onKeydown)
  } else {
    document.removeEventListener("keydown", onKeydown)
  }
}, { immediate: true })

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown)
})
</script>

<template>
  <div class="video-viewer">
    <div v-if="loading" class="viewer-loading">加载视频中...</div>
    <div v-else-if="errorMsg" class="viewer-error">{{ errorMsg }}</div>
    <div v-else-if="videoItems.length === 0 && !folderPath" class="video-demo">
      <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.1)" />
      </svg>
      <p class="video-demo-title">视频播放器</p>
      <p class="video-demo-hint">任务执行后将在此处播放交付的视频文件</p>
    </div>
    <div v-else-if="videoItems.length === 0" class="viewer-empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      <p>文件夹中无视频</p>
    </div>
    <div v-else class="video-grid">
      <div
        v-for="(item, idx) in videoItems"
        :key="idx"
        class="video-grid-item"
        @click="selectVideo(idx)"
      >
        <video :src="item.url" class="video-grid-thumb" muted preload="auto" />
        <div class="video-grid-overlay">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white" fill-opacity="0.9">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <div class="video-grid-name">{{ item.name }}</div>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="selectedIndex >= 0" class="lightbox-overlay" @click.self="closePreview">
      <button class="lightbox-close" @click="closePreview">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <button v-if="selectedIndex > 0" class="lightbox-nav lightbox-prev" @click.stop="prevVideo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button v-if="selectedIndex < videoItems.length - 1" class="lightbox-nav lightbox-next" @click.stop="nextVideo">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div class="lightbox-info">
        <span class="lightbox-counter">{{ selectedIndex + 1 }} / {{ videoItems.length }}</span>
        <span class="lightbox-name">{{ videoItems[selectedIndex]?.name }}</span>
      </div>
      <video :key="selectedIndex" :src="videoItems[selectedIndex]?.url" class="lightbox-video" controls autoplay />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.video-viewer {
  width: 100%;
  height: 100%;
  min-height: 200px;
  background: #1a1a1a;
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding: 4px;
}

.video-grid-item {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #333;
  cursor: pointer;
  transition: all 0.15s;
  background: #000;

  &:hover {
    border-color: #888;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  }
}

.video-grid-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-grid-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  transition: opacity 0.15s;
}

.video-grid-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lightbox-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 6px;
  color: #fff;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 201;
  &:hover { background: rgba(255, 255, 255, 0.25); }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 6px;
  color: #fff;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 201;
  &:hover { background: rgba(255, 255, 255, 0.3); }
}

.lightbox-prev {
  left: 16px;
}

.lightbox-next {
  right: 16px;
}

.lightbox-info {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 16px;
  border-radius: 12px;
}

.lightbox-counter {
  color: #fff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
}

.lightbox-name {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lightbox-video {
  max-width: 90vw;
  max-height: 85vh;
  border-radius: 4px;
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