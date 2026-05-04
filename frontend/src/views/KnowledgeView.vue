<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="knowledge-page page-layout">
    <div class="page-header">
      <h1 class="page-title">{{ t("knowledgepage.title") }}</h1>
    </div>
  </div>
</template>