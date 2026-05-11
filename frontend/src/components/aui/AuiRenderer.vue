<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue"
import type { AuiInstance } from "@/types/aui"
import { useAuiPluginStore } from "@/stores/auiPlugin"
import TableRenderer from "./renderers/TableRenderer.vue"
import BrowserPreviewRenderer from "./renderers/BrowserPreviewRenderer.vue"
import TodoRenderer from "./renderers/TodoRenderer.vue"

const props = defineProps<{
  aui: AuiInstance
  data?: any
}>()

const pluginStore = useAuiPluginStore()
const containerRef = ref<HTMLElement | null>(null)
const renderData = computed(() => props.data ?? props.aui.sampleData)

const BUILTIN_RENDERERS = new Set(["table", "browser-preview", "todo"])

const isPluginRenderer = computed(() => !BUILTIN_RENDERERS.has(props.aui.rendererType))

const rendererComponent = computed(() => {
  switch (props.aui.rendererType) {
    case "table":
      return TableRenderer
    case "browser-preview":
      return BrowserPreviewRenderer
    case "todo":
      return TodoRenderer
    default:
      return null
  }
})

let pluginElement: HTMLElement | null = null

async function mountPluginRenderer() {
  if (!isPluginRenderer.value || !containerRef.value) return

  const tag = `aui-${props.aui.rendererType}`

  // Ensure plugin JS/CSS is injected
  await pluginStore.injectPlugin(props.aui.rendererType)

  // Check if the custom element is registered
  if (!customElements.get(tag)) return

  // Remove previous element
  if (pluginElement && pluginElement.parentNode) {
    pluginElement.parentNode.removeChild(pluginElement)
  }

  pluginElement = document.createElement(tag)
  containerRef.value.innerHTML = ""
  containerRef.value.appendChild(pluginElement)
  ;(pluginElement as any).data = renderData.value
}

function updatePluginData() {
  if (pluginElement && "data" in pluginElement) {
    ;(pluginElement as any).data = renderData.value
  }
}

onMounted(() => {
  if (isPluginRenderer.value) {
    mountPluginRenderer()
  }
})

watch(() => props.aui.rendererType, () => {
  if (isPluginRenderer.value) {
    nextTick(mountPluginRenderer)
  }
})

watch(renderData, () => {
  if (isPluginRenderer.value) {
    updatePluginData()
  }
}, { deep: true })

onBeforeUnmount(() => {
  pluginElement = null
})
</script>

<template>
  <div class="aui-renderer">
    <component
      v-if="rendererComponent"
      :is="rendererComponent"
      :fields="aui.fields"
      :data="renderData"
    />
    <div v-else-if="isPluginRenderer" ref="containerRef" class="aui-plugin-container"></div>
    <div v-else class="aui-renderer-empty">
      未知渲染器类型: {{ aui.rendererType }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
.aui-renderer {
  width: 100%;
  height: 100%;
}

.aui-plugin-container {
  width: 100%;
  height: 100%;
}

.aui-renderer-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}
</style>