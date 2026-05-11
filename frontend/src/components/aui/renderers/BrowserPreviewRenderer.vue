<script setup lang="ts">
import { computed, ref } from "vue"

const props = defineProps<{
  data: any
}>()

const url = computed(() => {
  if (!props.data) return ""
  if (typeof props.data === "string") return props.data
  return props.data.url || ""
})

const title = computed(() => {
  if (!props.data || typeof props.data === "string") return ""
  return props.data.title || ""
})

const iframeError = ref(false)

function handleIframeError() {
  iframeError.value = true
}

function retry() {
  iframeError.value = false
}
</script>

<template>
  <div class="browser-preview-renderer">
    <div v-if="!url" class="browser-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d1d5db" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      </svg>
      <p>请输入 URL 地址进行预览</p>
    </div>
    <template v-else>
      <div class="browser-toolbar">
        <div class="browser-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <div class="browser-url-bar">
          <span class="browser-lock">🔒</span>
          <span class="browser-url-text">{{ url }}</span>
        </div>
      </div>
      <div class="browser-body">
        <div v-if="iframeError" class="browser-error">
          <p>无法加载此页面</p>
          <p class="browser-error-hint">部分网站可能禁止在 iframe 中嵌入显示</p>
          <button class="browser-retry-btn" @click="retry">重试</button>
          <a :href="url" target="_blank" rel="noopener" class="browser-open-btn">在新窗口中打开</a>
        </div>
        <iframe
          v-else
          :src="url"
          :title="title || 'Browser Preview'"
          class="browser-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          @error="handleIframeError"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.browser-preview-renderer {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  background: #fff;
}

.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
}

.browser-dots {
  display: flex;
  gap: 5px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: #ef4444; }
.dot-yellow { background: #f59e0b; }
.dot-green { background: #10b981; }

.browser-url-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  overflow: hidden;
}

.browser-lock { font-size: 10px; }

.browser-url-text {
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-body {
  flex: 1;
  position: relative;
}

.browser-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.browser-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
  gap: 8px;
}

.browser-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  font-size: 14px;
  gap: 6px;
}

.browser-error-hint {
  font-size: 12px;
  color: #9ca3af;
}

.browser-retry-btn {
  margin-top: 8px;
  padding: 6px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  &:hover { background: #f3f4f6; }
}

.browser-open-btn {
  margin-top: 4px;
  color: #2563eb;
  font-size: 12px;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
</style>