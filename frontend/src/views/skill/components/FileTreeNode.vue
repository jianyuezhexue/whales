<template>
  <div class="ftn-root">
    <div
      class="ftn-row"
      :class="{ 'ftn-row--file': node.type === 'blob', 'ftn-row--dir': node.type === 'tree' }"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      @click="node.type === 'tree' ? toggle() : $emit('selectFile', node.path)"
    >
      <span class="ftn-icon">{{ node.type === 'tree' ? (expanded ? '📂' : '📁') : '📄' }}</span>
      <span class="ftn-name">{{ node.name }}</span>
    </div>
    <template v-if="node.type === 'tree' && expanded">
      <div v-if="node._loading" class="ftn-loading" :style="{ paddingLeft: (depth + 1) * 16 + 8 + 'px' }">Loading...</div>
      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        @select-file="$emit('selectFile', $event)"
        @toggle-dir="$emit('toggleDir', $event)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

interface FileNode {
  name: string
  path: string
  type: string
  size: number
  sha256?: string
  children?: FileNode[]
  _loading?: boolean
}

const props = defineProps<{
  node: FileNode
  depth: number
}>()

const emit = defineEmits<{
  (e: 'selectFile', path: string): void
  (e: 'toggleDir', payload: { path: string; expanded: boolean }): void
}>()

const expanded = ref(false)

function toggle() {
  expanded.value = !expanded.value
  if (expanded.value) {
    emit('toggleDir', { path: props.node.path, expanded: true })
  }
}
</script>

<style lang="scss" scoped>
.ftn-root {
  user-select: none;
}

.ftn-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #1f1f1f;
  white-space: nowrap;

  &:hover { background: #f5f5f5; }
}

.ftn-icon {
  flex-shrink: 0;
  font-size: 12px;
  width: 18px;
  text-align: center;
}

.ftn-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ftn-loading {
  font-size: 11px;
  color: #9a9a9a;
  padding: 4px 8px;
}
</style>
