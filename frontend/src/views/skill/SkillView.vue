<template>
  <div class="skill-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t('skillpage.title') }}</h1>
    </div>

    <!-- Tabs + Search -->
    <div class="skill-tabs">
      <div class="skill-tabs-left">
        <button
          :class="['skill-tab', { active: activeTab === 'installed' }]"
          @click="activeTab = 'installed'"
        >
          {{ t('skillpage.installed-tab') }}
        </button>
        <button
          :class="['skill-tab', { active: activeTab === 'market' }]"
          @click="activeTab = 'market'"
        >
          {{ t('skillpage.market-tab') }}
        </button>
      </div>
      <div class="skill-tabs-search">
        <svg class="skill-search-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="searchQuery"
          class="skill-search-input"
          type="text"
          :placeholder="t('skillpage.search-placeholder')"
        />
        <button v-if="searchQuery" class="skill-search-clear" type="button" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>

    <div class="skill-content">
      <InstalledSkills
        v-if="activeTab === 'installed'"
        :installed-ids="installedIds"
        :installed-market-skills="installedMarketSkills"
        :search-query="searchQuery"
        @uninstall="onUninstall"
      />
      <SkillMarket
        v-else
        :installed-ids="installedIds"
        :search-query="searchQuery"
        @install="onInstallSkill"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { FetchLocalSkills, FetchSkillsMarket } from "../../../wailsjs/go/app/App"
import { useProjectStore } from "@/stores/project"

import InstalledSkills from "./components/InstalledSkills.vue"
import SkillMarket from "./components/SkillMarket.vue"

const { t } = useI18n()
const projectStore = useProjectStore()

const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#a855f7"]
function hashColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

const activeTab = ref<"installed" | "market">("installed")
const installedIds = ref<string[]>([])
const installedMarketSkills = ref<Map<string, any>>(new Map())
const searchQuery = ref("")

function parseMarketItem(item: any) {
  const isTopCollection = item.Skill != null || item.Collection != null
  if (isTopCollection) {
    const isSkill = !!item.Skill
    const s = item.Skill ?? item.Collection ?? {}
    const id = isSkill
      ? (s.Path && s.Name ? `${s.Path}/${s.Name}` : (s.Name || s.Fid || ""))
      : (s.Fid ?? "")
    const name = isSkill
      ? (s.DisplayName || s.Name || `Skill-${id}`)
      : (s.Name || `Collection-${id}`)
    return { id, name, description: s.Description ?? "", color: hashColor(id), type: isSkill ? "Skill" : "Collection", _raw: item }
  } else {
    const id = item.Path && item.Name ? `${item.Path}/${item.Name}` : (item.Name || "")
    const name = item.DisplayName || item.Name || id
    return { id, name, description: item.Description ?? "", color: hashColor(id), type: "Skill", _raw: { Skill: item } }
  }
}

onMounted(async () => {
  const projectPath = projectStore.currentProject?.path
  if (!projectPath) return
  try {
    const localSkills = await FetchLocalSkills(projectPath)
    for (const skill of localSkills) {
      try {
        const jsonStr = await FetchSkillsMarket(5, 1, skill.name)
        const json = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr
        const data = json?.Data ?? {}
        const items = data.SkillList ?? data.SkillCollection ?? []
        const match = items.find((item: any) => {
          const s = item.Skill ?? item
          return s.Name === skill.id || s.DisplayName === skill.name
        })
        if (match) {
          const parsed = parseMarketItem(match)
          if (!installedIds.value.includes(parsed.id)) {
            installedIds.value.push(parsed.id)
            installedMarketSkills.value.set(parsed.id, parsed)
          }
          continue
        }
      } catch {
        // Market lookup failed, fall through to local data
      }
      // Fallback: use local data with market-compatible structure
      if (!installedIds.value.includes(skill.id)) {
        installedIds.value.push(skill.id)
        installedMarketSkills.value.set(skill.id, {
          id: skill.id,
          name: skill.name,
          description: skill.description || "",
          color: hashColor(skill.id),
          type: "Skill",
          _raw: {
            Skill: {
              Name: skill.id,
              DisplayName: skill.name,
              Description: skill.description,
              Owner: "local",
              Path: skill.path,
              Tags: [],
              SourceURL: "",
              SourceDeveloper: "",
              DownloadCount: 0,
              Visits: 0,
            },
          },
        })
      }
    }
  } catch (e) {
    console.error("Failed to fetch local skills:", e)
  }
})

function onUninstall(id: string) {
  installedIds.value = installedIds.value.filter(i => i !== id)
  installedMarketSkills.value.delete(id)
}

function onInstallSkill(skill: any) {
  if (!installedIds.value.includes(skill.id)) {
    installedIds.value.push(skill.id)
    installedMarketSkills.value.set(skill.id, skill)
  }
}
</script>

<style lang="scss" scoped>
.skill-page {
  display: flex;
  flex-direction: column;
  height: 100%;

  .page-header {
    margin-bottom: 0;
    padding-bottom: 16px;
  }
}

// ── Tabs + Search ──────────────────────────────────────
.skill-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 16px;
}

.skill-tabs-left {
  display: flex;
}

.skill-tab {
  padding: 8px 16px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  border: none;
  background: none;
  color: #6b6b6b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;

  &:hover { color: #1f1f1f; }
  &.active {
    color: #1f1f1f;
    border-bottom-color: #1f1f1f;
    font-weight: 600;
  }
}

.skill-tabs-search {
  position: relative;
  display: flex;
  align-items: center;
}

.skill-search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #9a9a9a;
  pointer-events: none;
}

.skill-search-input {
  width: 180px;
  height: 28px;
  padding: 0 24px 0 28px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus { border-color: #b0b0b0; }
  &::placeholder { color: #c0c0c0; }
}

.skill-search-clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  color: #9a9a9a;
  cursor: pointer;
  padding: 0;
  border-radius: 50%;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: #1f1f1f;
    background-color: #f0f0f0;
  }
}

.skill-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
