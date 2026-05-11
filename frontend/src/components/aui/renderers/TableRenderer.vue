<script setup lang="ts">
import { computed } from "vue"
import type { AuiField } from "@/types/aui"

const props = defineProps<{
  fields: AuiField[]
  data: any
}>()

const rows = computed(() => {
  if (Array.isArray(props.data)) return props.data
  return []
})

const columns = computed(() => props.fields)

function formatCell(row: any, field: AuiField) {
  const val = row[field.key]
  if (val === undefined || val === null) return ""
  if (field.type === "boolean") return val ? "✓" : "—"
  if (field.type === "date" && typeof val === "string") return val.slice(0, 10)
  if (field.type === "tag" && Array.isArray(val)) return val.join(", ")
  return String(val)
}
</script>

<template>
  <div class="table-renderer">
    <div v-if="rows.length === 0" class="table-empty">暂无数据</div>
    <table v-else class="aui-table">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key">{{ col.title || col.key }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in rows" :key="ri">
          <td v-for="col in columns" :key="col.key">
            <a v-if="col.type === 'link' && row[col.key]" :href="row[col.key]" target="_blank" rel="noopener" class="cell-link">{{ row[col.key] }}</a>
            <img v-else-if="col.type === 'image' && row[col.key]" :src="row[col.key]" class="cell-image" />
            <span v-else-if="col.type === 'tag' && Array.isArray(row[col.key])" class="cell-tags">
              <span v-for="(tag, ti) in row[col.key]" :key="ti" class="cell-tag">{{ tag }}</span>
            </span>
            <span v-else-if="col.type === 'boolean'" class="cell-boolean" :class="{ done: row[col.key] }">
              {{ row[col.key] ? "✓" : "—" }}
            </span>
            <span v-else>{{ formatCell(row, col) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.table-renderer {
  width: 100%;
  overflow: auto;
}

.table-empty {
  text-align: center;
  padding: 32px;
  color: #999;
  font-size: 14px;
}

.aui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th, td {
    padding: 8px 12px;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    white-space: nowrap;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
    position: sticky;
    top: 0;
  }

  tbody tr:hover {
    background: #f3f4f6;
  }
}

.cell-link {
  color: #2563eb;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.cell-image {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.cell-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cell-tag {
  background: #ede9fe;
  color: #6d28d9;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.cell-boolean {
  font-weight: 600;
  &.done { color: #10b981; }
}
</style>