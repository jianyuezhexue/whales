<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { EventsOn, EventsOff } from '../../../wailsjs/runtime/runtime';

const props = defineProps<{
  taskId: string;
}>();

const emit = defineEmits<{
  (e: 'exited'): void;
}>();

const terminalContainer = ref<HTMLDivElement>();
let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  await nextTick();

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: '"JetBrainsMono", "Cascadia Code", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
    allowProposedApi: true,
  });

  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  if (terminalContainer.value) {
    terminal.open(terminalContainer.value);
    fitAddon.fit();

    // Resize observer for responsive terminal
    resizeObserver = new ResizeObserver(() => {
      if (fitAddon && terminal) {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          try {
            const win = window as any;
            if (win.go?.main?.App?.PtyResize) {
              win.go.main.App.PtyResize(props.taskId, dims.cols, dims.rows);
            }
          } catch {
            // Wails not available (dev mode)
          }
        }
      }
    });
    resizeObserver.observe(terminalContainer.value);
  }

  // Listen for PTY output from Go backend
  EventsOn('pty-output', (taskId: string, data: string) => {
    if (taskId === props.taskId && terminal) {
      terminal.write(data);
    }
  });

  // Listen for PTY exit
  EventsOn('pty-exit', (taskId: string) => {
    if (taskId === props.taskId) {
      if (terminal) {
        terminal.writeln('');
        terminal.writeln('\x1b[33m══════════════════════════════════════\x1b[0m');
        terminal.writeln('\x1b[33m  进程已退出\x1b[0m');
        terminal.writeln('\x1b[33m══════════════════════════════════════\x1b[0m');
      }
      emit('exited');
    }
  });

  // Send keystrokes to Go backend
  terminal.onData((data: string) => {
    try {
      const win = window as any;
      if (win.go?.main?.App?.PtyWrite) {
        win.go.main.App.PtyWrite(props.taskId, data);
      }
    } catch {
      // Wails not available (dev mode)
    }
  });

  // Focus the terminal
  terminal.focus();
});

onBeforeUnmount(() => {
  EventsOff('pty-output');
  EventsOff('pty-exit');
  if (resizeObserver && terminalContainer.value) {
    resizeObserver.unobserve(terminalContainer.value);
    resizeObserver.disconnect();
  }
  terminal?.dispose();
});
</script>

<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<style lang="scss" scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  min-height: 0;

  :deep(.xterm) {
    height: 100%;
    padding: 4px;
  }

  :deep(.xterm-viewport) {
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: #424242;
      border-radius: 3px;
    }
  }
}
</style>
