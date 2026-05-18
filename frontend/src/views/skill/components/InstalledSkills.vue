<template>
  <div class="installed-skills">
    <div v-if="filteredSkills.length === 0" class="skills-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#d0d0d0" stroke-width="1.2"
        stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
      <span>{{ t('skillpage.installed-empty') }}</span>
    </div>

    <div v-else class="skills-grid">
      <div v-for="skill in filteredSkills" :key="skill.id" class="skill-card">
        <div class="skill-card-header">
          <span class="skill-color-dot" :style="{ backgroundColor: skill.color }"></span>
          <span class="skill-name">{{ skill.name }}</span>
        </div>
        <div class="skill-card-body">
          <p class="skill-desc">{{ skill.description || '—' }}</p>
        </div>
        <div class="skill-card-footer">
          <button class="skill-action-btn skill-detail-btn" type="button" @click="openDetail(skill)">
            {{ t('skillpage.detail') }}
          </button>
          <button class="skill-action-btn skill-uninstall-btn" type="button" @click="$emit('uninstall', skill.id)">
            {{ t('skillpage.uninstall') }}
          </button>
        </div>
      </div>
    </div>

    <SkillDetailModal
      :visible="showDetail"
      :data="detailData"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { ALL_SKILLS } from "@/stores/workflow"
import type { WorkflowNodeSkill } from "@/stores/workflow"
import SkillDetailModal from "./SkillDetailModal.vue"
import type { SkillDetailData } from "./SkillDetailModal.vue"

const { t } = useI18n()

interface InstalledSkill {
  id: string
  name: string
  description: string
  color: string
  type: string
  _raw?: any
}

const props = defineProps<{
  installedIds: string[]
  installedMarketSkills: Map<string, any>
  searchQuery: string
}>()

defineEmits<{
  uninstall: [id: string]
}>()

const allInstalledSkills = computed<InstalledSkill[]>(() => {
  const result: InstalledSkill[] = []
  const seen = new Set<string>()
  for (const s of ALL_SKILLS) {
    if (props.installedIds.includes(s.id)) {
      seen.add(s.id)
      result.push({ id: s.id, name: s.name, description: "Built-in skill", color: s.color, type: "BuiltIn" })
    }
  }
  for (const [id, skill] of props.installedMarketSkills) {
    if (!seen.has(id)) {
      seen.add(id)
      result.push({
        id: skill.id,
        name: skill.name,
        description: skill.description || "",
        color: skill.color,
        type: skill.type || "Skill",
        _raw: skill._raw,
      })
    }
  }
  return result
})

const filteredSkills = computed(() => {
  if (!props.searchQuery) return allInstalledSkills.value
  const q = props.searchQuery.toLowerCase()
  return allInstalledSkills.value.filter((s) => s.name.toLowerCase().includes(q))
})

// ── Detail modal ──
const showDetail = ref(false)
const detailData = ref<SkillDetailData>(emptyDetailData())

function emptyDetailData(): SkillDetailData {
  return { id: "", name: "", description: "", type: "BuiltIn", owner: "", path: "", downloads: 0, visits: 0, tags: [] }
}

function openDetail(skill: InstalledSkill) {
  const raw = skill._raw
  const s = raw?.Skill ?? raw?.Collection ?? {}
  detailData.value = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    type: skill.type as "Skill" | "Collection" | "BuiltIn",
    owner: s.Owner ?? "",
    path: s.Path ?? "",
    sourceUrl: s.SourceURL ?? "",
    sourceDeveloper: s.SourceDeveloper ?? "",
    downloads: s.DownloadCount ?? 0,
    visits: s.Visits ?? 0,
    tags: s.Tags ?? [],
    rawPath: raw ? (s.Path ?? "") : "",
    rawName: raw ? (s.Name ?? "") : "",
    collectionFid: s.Path ?? s.Fid ?? "",
  }
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}
</script>

<style lang="scss" scoped>
.installed-skills {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skills-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: #9a9a9a;
  font-size: 14px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.skill-card {
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

.skill-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.skill-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skill-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1f1f1f;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-card-body {
  flex: 1;
  margin-bottom: 12px;
}

.skill-desc {
  font-size: 12px;
  color: #6b6b6b;
  line-height: 1.5;
  margin: 0;
}

.skill-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.skill-action-btn {
  height: 28px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s;
}

.skill-detail-btn {
  border: 1px solid #e5e5e5;
  background: #ffffff;
  color: #6b6b6b;

  &:hover {
    border-color: #1f1f1f;
    color: #1f1f1f;
  }
}

.skill-uninstall-btn {
  border: none;
  background: #1f1f1f;
  color: #ffffff;

  &:hover { opacity: 0.85; }
}
</style>
