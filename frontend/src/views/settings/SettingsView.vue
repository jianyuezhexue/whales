<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale, availableLocales } = useI18n();

const langOpen = ref(false);
const toggleLang = () => {
  langOpen.value = !langOpen.value;
};
const selectLanguage = (lang: string) => {
  locale.value = lang;
  langOpen.value = false;
};

const languageLabels: Record<string, string> = {
  "zh-Hans": "简体中文",
  en: "English",
  fr: "Français",
};
</script>

<template>
  <div class="settings-view page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t("settingspage.title") }}</h1>
    </div>

    <div class="settings-row">
      <span class="settings-label">{{ t("settingspage.language") }}</span>
      <div class="lang-dropdown" :class="{ open: langOpen }">
        <button class="lang-trigger" type="button" @click="toggleLang">
          <span>{{ languageLabels[locale] || locale }}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <ul v-if="langOpen" class="lang-list">
          <li v-for="lang in availableLocales" :key="lang" :class="{ active: locale === lang }"
            @click="selectLanguage(lang)">
            {{ languageLabels[lang] || lang }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-view {
  max-width: 640px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;

  .settings-label {
    font-size: 13px;
    color: #1f1f1f;
    font-weight: 500;
  }
}

.lang-dropdown {
  position: relative;

  .lang-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid #e0e0e0;
    background-color: #ffffff;
    color: #1f1f1f;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      background-color: #f5f5f5;
    }

    svg {
      transition: transform 0.15s ease;
    }
  }

  &.open .lang-trigger svg {
    transform: rotate(180deg);
  }

  .lang-list {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 140px;
    margin: 0;
    padding: 4px;
    list-style: none;
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    z-index: 10;

    li {
      padding: 6px 10px;
      font-size: 13px;
      color: #1f1f1f;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: #f0f0f0;
      }

      &.active {
        background-color: #ececec;
        font-weight: 600;
      }
    }
  }
}
</style>