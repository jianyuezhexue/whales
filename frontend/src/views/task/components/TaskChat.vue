<template>
  <div class="chat-panel">
    <div class="chat-input-area">
      <input v-model="inputText" class="chat-input" type="text"
        placeholder="输入消息..." @keyup.enter="handleSend" />
      <button class="send-btn" @click="handleSend" :disabled="!inputText.trim()">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const emit = defineEmits<{
  (e: "send", message: string): void;
}>();

const inputText = ref("");

const handleSend = () => {
  const text = inputText.value.trim();
  if (!text) return;
  emit("send", text);
  inputText.value = "";
};
</script>

<style lang="scss" scoped>
.chat-panel {
  flex-shrink: 0;
  background-color: #ffffff;
  padding: 12px 16px 16px;
}

.chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  color: #1f1f1f;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;

  &::placeholder {
    color: #c0c0c0;
  }

  &:focus {
    border-color: #1f1f1f;
  }
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  background-color: #ffffff;
  color: #6b6b6b;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    border-color: #1f1f1f;
    color: #1f1f1f;
    background-color: #f0f0f0;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
