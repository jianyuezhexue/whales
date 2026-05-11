<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  data: any
}>()

interface TodoItem {
  id?: string
  title: string
  done: boolean
  [key: string]: any
}

const todos = computed<TodoItem[]>(() => {
  if (Array.isArray(props.data)) {
    return props.data.map((item: any, idx: number) => ({
      id: item.id ?? String(idx),
      title: item.title ?? `任务 ${idx + 1}`,
      done: !!item.done,
      ...item,
    }))
  }
  return []
})

const doneCount = computed(() => todos.value.filter((t) => t.done).length)
const totalCount = computed(() => todos.value.length)
const progressPercent = computed(() =>
  totalCount.value === 0 ? 0 : Math.round((doneCount.value / totalCount.value) * 100),
)
</script>

<template>
  <div class="todo-renderer">
    <div v-if="todos.length === 0" class="todo-empty">暂无代办事项</div>
    <template v-else>
      <div class="todo-progress">
        <div class="todo-progress-bar">
          <div class="todo-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="todo-progress-text">{{ doneCount }}/{{ totalCount }} 完成</span>
      </div>
      <ul class="todo-list">
        <li
          v-for="item in todos"
          :key="item.id"
          class="todo-item"
          :class="{ 'todo-done': item.done }"
        >
          <span class="todo-checkbox" :class="{ checked: item.done }">
            <svg v-if="item.done" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <span class="todo-title">{{ item.title }}</span>
        </li>
      </ul>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.todo-renderer {
  padding: 8px 0;
}

.todo-empty {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 14px;
}

.todo-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 0 4px;
}

.todo-progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.todo-progress-fill {
  height: 100%;
  background: #10b981;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.todo-progress-text {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #f9fafb; }
  &.todo-done .todo-title {
    text-decoration: line-through;
    color: #9ca3af;
  }
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  &.checked {
    background: #10b981;
    border-color: #10b981;
  }
}

.todo-title {
  font-size: 13px;
  color: #1f1f1f;
  flex: 1;
}
</style>