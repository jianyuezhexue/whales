<template>
  <div class="skill-market">
    <!-- Loading -->
    <div v-if="loading" class="market-status">
      <span>{{ t('skillpage.loading') }}</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="market-status market-error">
      <span>{{ t('skillpage.market-error') }}</span>
      <button class="market-retry-btn" type="button" @click="fetchSkills">{{ t('skillpage.install') }}</button>
    </div>

    <!-- Empty -->
    <div v-else-if="skills.length === 0" class="market-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.2"
        stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <span>{{ t('skillpage.market-empty') }}</span>
    </div>

    <!-- Grid -->
    <template v-else>
      <div class="market-grid">
        <div v-for="skill in skills" :key="skill.id" class="market-card">
          <div class="market-card-header">
            <span class="market-color-dot" :style="{ backgroundColor: skill.color }"></span>
            <span class="market-name">{{ skill.name }}</span>
            <span v-if="skill.type === 'Collection'" class="market-type-badge">Collection</span>
            <span v-if="isInstalled(skill.id)" class="market-installed-badge">{{ t('skillpage.installed') }}</span>
          </div>
          <div class="market-card-body">
            <p class="market-desc">{{ skill.description }}</p>
          </div>
          <div class="market-card-footer">
            <button class="market-action-btn market-detail-btn" type="button" @click="openDetail(skill)">
              {{ t('skillpage.detail') }}
            </button>
            <button v-if="!isInstalled(skill.id)" class="market-action-btn market-install-btn" type="button" @click="$emit('install', skill)">
              {{ t('skillpage.install') }}
            </button>
            <button v-else class="market-action-btn market-installed-btn" type="button" disabled>
              {{ t('skillpage.installed') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="market-pagination">
        <button
          class="market-page-btn"
          :disabled="pageNumber <= 1"
          @click="goPage(pageNumber - 1)"
        >{{ t('skillpage.page-prev') }}</button>
        <span class="market-page-info">{{ t('skillpage.page-info', { current: pageNumber, total: totalPages, count: totalCount }) }}</span>
        <button
          class="market-page-btn"
          :disabled="pageNumber >= totalPages"
          @click="goPage(pageNumber + 1)"
        >{{ t('skillpage.page-next') }}</button>
      </div>
    </template>

    <SkillDetailModal
      :visible="showDetail"
      :data="detailData"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import { FetchSkillsMarket } from "../../../../wailsjs/go/app/App"
import SkillDetailModal from "./SkillDetailModal.vue"
import type { SkillDetailData } from "./SkillDetailModal.vue"

const { t } = useI18n()

const props = defineProps<{
  installedIds: string[]
  searchQuery: string
}>()

defineEmits<{
  install: [skill: MarketSkill]
}>()

interface MarketSkill {
  id: string
  name: string
  description: string
  color: string
  type: string
  _raw: any
}

const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#a855f7"]

const skills = ref<MarketSkill[]>([])
const loading = ref(false)
const error = ref(false)
const pageNumber = ref(1)
const pageSize = 24
const totalCount = ref(0)

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / pageSize)))

// ── Detail modal state ──
const showDetail = ref(false)
const detailData = ref<SkillDetailData>(emptyDetailData())

function emptyDetailData(): SkillDetailData {
  return { id: "", name: "", description: "", type: "BuiltIn", owner: "", path: "", downloads: 0, visits: 0, tags: [] }
}

function getColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

function isInstalled(id: string): boolean {
  return props.installedIds.includes(id)
}

function openDetail(skill: MarketSkill) {
  const raw = skill._raw
  const s = raw?.Skill ?? raw?.Collection ?? {}

  detailData.value = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type as "Skill" | "Collection",
    owner: s.Owner ?? "",
    path: s.Path ?? "",
    sourceUrl: s.SourceURL ?? "",
    sourceDeveloper: s.SourceDeveloper ?? "",
    downloads: s.DownloadCount ?? 0,
    visits: s.Visits ?? 0,
    tags: s.Tags ?? [],
    rawPath: s.Path ?? "",
    rawName: s.Name ?? "",
    collectionFid: s.Path ?? s.Fid ?? "",
  }
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

async function fetchSkills() {
  loading.value = true
  error.value = false
  try {
    const jsonStr = await FetchSkillsMarket(pageSize, pageNumber.value, props.searchQuery)
    const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
    const data = json?.Data ?? {}
    // API returns different keys depending on WithTopCollection:
    //   WithTopCollection=true  → SkillCollection: [{IsTop, Skill/Collection, Type}]
    //   WithTopCollection=false → SkillList: [{Name, DisplayName, Description, ...}]
    const isTopCollection = data.SkillCollection != null
    const items = isTopCollection
      ? (data.SkillCollection ?? [])
      : (data.SkillList ?? [])
    totalCount.value = data.TotalCount ?? 0
    skills.value = items.map((item: any) => {
      if (isTopCollection) {
        const isSkill = !!item.Skill
        const s = item.Skill ?? item.Collection ?? {}
        const id = isSkill
          ? (s.Path && s.Name ? `${s.Path}/${s.Name}` : (s.Name || s.Fid || ""))
          : (s.Fid ?? "")
        const name = isSkill
          ? (s.DisplayName || s.Name || `Skill-${id}`)
          : (s.Name || `Collection-${id}`)
        const desc = s.Description ?? ""
        return { id, name, description: desc, color: getColor(id), type: isSkill ? "Skill" : "Collection", _raw: item }
      } else {
        const id = item.Path && item.Name ? `${item.Path}/${item.Name}` : (item.Name || "")
        const name = item.DisplayName || item.Name || id
        const desc = item.Description ?? ""
        return { id, name, description: desc, color: getColor(id), type: "Skill", _raw: { Skill: item } }
      }
    })
  } catch (e) {
    console.error("SkillMarket fetch failed:", e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function goPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  pageNumber.value = page
  fetchSkills()
}

onMounted(() => {
  fetchSkills()
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => props.searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    pageNumber.value = 1
    fetchSkills()
  }, 300)
})
</script>

<style lang="scss" scoped>
.skill-market {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.market-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #9a9a9a;
  font-size: 14px;
}

.market-error {
  color: #e74c3c;
}

.market-retry-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  color: #1f1f1f;
  transition: all 0.15s;

  &:hover { background: #f5f5f5; }
}

.market-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #9a9a9a;
  font-size: 14px;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.market-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.market-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.market-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.market-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.market-type-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  flex-shrink: 0;
}

.market-installed-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  color: #16a34a;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  flex-shrink: 0;
}

.market-card-body {
  flex: 1;
  margin-bottom: 12px;
}

.market-desc {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.market-card-footer {
  display: flex;
  justify-content: flex-end;
}

.market-action-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;
}

.market-install-btn {
  border: none;
  background: #1f1f1f;
  color: #ffffff;

  &:hover { opacity: 0.85; }
}

.market-installed-btn {
  border: 1px solid #e5e5e5;
  background: #fafafa;
  color: #9a9a9a;
  cursor: not-allowed;
}

.market-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
}

.market-page-btn {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #e5e5e5;
  border-radius: 5px;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) { background: #f5f5f5; }
  &:disabled {
    color: #c0c0c0;
    cursor: not-allowed;
  }
}

.market-page-info {
  font-size: 12px;
  color: #6b6b6b;
  font-family: "JetBrainsMono", sans-serif;
}

// ── Detail button ──
.market-detail-btn {
  border: 1px solid #e5e5e5;
  background: #ffffff;
  color: #6b6b6b;
  margin-right: auto;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
  }
}

</style>
