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

const demoImages = computed<string[]>(() => {
  if (!props.data) return []
  return props.data.demoImages || props.data.images || []
})

const imageUrls = ref<string[]>([])
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

const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp"])

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || ""
  return imageExtensions.has(ext)
}

async function loadImages() {
  if (!folderPath.value) return
  loading.value = true
  errorMsg.value = ""
  imageUrls.value = []

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
        const imageFiles = files.filter(f => isImageFile(f.name))
        for (const f of imageFiles) {
          const result = await app.ReadAuiOutputFile(projectPath, f.path)
          const content = result.content || result
          if (content) {
            const mimeType = result.mimeType || `image/${f.name.split(".").pop()}`
            imageUrls.value.push(`data:${mimeType};base64,${content}`)
          }
        }
      }
    } catch (e: any) {
      errorMsg.value = e?.message || "读取图片失败"
    }
  } else {
    imageUrls.value = demoImages.value.length ? demoImages.value : []
    if (!imageUrls.value.length) {
      errorMsg.value = "启动 Wails 应用以加载本地图片文件夹"
    }
  }
  loading.value = false
}

watch(folderPath, () => {
  if (folderPath.value) loadImages()
}, { immediate: true })

watch(demoImages, () => {
  if (!folderPath.value && demoImages.value.length) {
    imageUrls.value = demoImages.value
  }
}, { immediate: true })

function openPreview(index: number) {
  selectedIndex.value = index
}

function closePreview() {
  selectedIndex.value = -1
}

function prevImage() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function nextImage() {
  if (selectedIndex.value < imageUrls.value.length - 1) {
    selectedIndex.value++
  }
}

function onKeydown(e: KeyboardEvent) {
  if (selectedIndex.value < 0) return
  if (e.key === "ArrowLeft") prevImage()
  else if (e.key === "ArrowRight") nextImage()
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
  <div class="image-viewer">
    <div v-if="loading" class="viewer-loading">加载图片中...</div>
    <div v-else-if="errorMsg" class="viewer-error">{{ errorMsg }}</div>
    <div v-else-if="imageUrls.length === 0 && !folderPath" class="viewer-empty">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <p>未设置图片文件夹路径</p>
    </div>
    <div v-else-if="imageUrls.length === 0" class="viewer-empty">
      <p>文件夹中无图片</p>
    </div>
    <div v-else class="image-grid">
      <div
        v-for="(url, idx) in imageUrls"
        :key="idx"
        class="image-grid-item"
        @click="openPreview(idx)"
      >
        <img :src="url" class="image-grid-img" loading="lazy" />
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="selectedIndex >= 0" class="lightbox-overlay" @click.self="closePreview">
      <button class="lightbox-close" @click="closePreview">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <button v-if="selectedIndex > 0" class="lightbox-nav lightbox-prev" @click.stop="prevImage">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button v-if="selectedIndex < imageUrls.length - 1" class="lightbox-nav lightbox-next" @click.stop="nextImage">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div class="lightbox-counter">{{ selectedIndex + 1 }} / {{ imageUrls.length }}</div>
      <img :src="imageUrls[selectedIndex]" class="lightbox-img" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.image-viewer {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  padding: 4px;
}

.image-grid-item {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  cursor: pointer;
  transition: all 0.15s;
  background: #f5f5f5;

  &:hover {
    border-color: #1f1f1f;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.image-grid-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lightbox-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 6px;
  color: #fff;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.25); }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.15);
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
  &:hover { background: rgba(255,255,255,0.3); }
}

.lightbox-prev {
  left: 16px;
}

.lightbox-next {
  right: 16px;
}

.lightbox-counter {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 12px;
  font-family: "JetBrainsMono", sans-serif;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
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
</style>
