<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
}>();

const emit = defineEmits<{
  (e: "confirm"): void;
  (e: "cancel"): void;
}>();
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-panel confirm-panel">
      <div class="modal-title">{{ title }}</div>
      <div class="confirm-body">{{ message }}</div>
      <div class="modal-footer">
        <button class="btn btn-cancel" type="button" @click="emit('cancel')">
          <slot name="cancel-text">取消</slot>
        </button>
        <button :class="['btn', danger ? 'btn-danger' : 'btn-confirm']" type="button" @click="emit('confirm')">
          {{ confirmText || '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.confirm-panel {
  width: 400px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    padding: 20px 24px 0;
  }

  .confirm-body {
    padding: 12px 24px 4px;
    font-size: 13px;
    color: #4a4a4a;
    line-height: 1.6;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
  }
}

.btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;

  &.btn-cancel {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #4a4a4a;

    &:hover {
      background-color: #f5f5f5;
    }
  }

  &.btn-confirm {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover {
      opacity: 0.85;
    }
  }

  &.btn-danger {
    border: none;
    background-color: #e74c3c;
    color: #ffffff;

    &:hover {
      opacity: 0.85;
    }
  }
}
</style>