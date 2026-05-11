<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onActivated, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { BrowserOpenURL } from '../../../wailsjs/runtime/runtime';
import { useTaskStore } from '@/stores/task';

const props = defineProps<{
  taskId: string;
  initialOutput?: string;
}>();

const emit = defineEmits<{
  (e: 'exited'): void;
}>();

const taskStore = useTaskStore();
const terminalContainer = ref<HTMLDivElement>();
let terminal: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let unsubscribe: (() => void) | null = null;

// Event-driven fit: parent components (TaskCard, TaskView) call this on
// concrete events (column change, maximize toggle, window resize). No
// ResizeObserver — that fired fit() repeatedly during layout transitions
// and made characters appear to shimmer across multiple terminals.
const doFit = () => {
  if (!fitAddon || !terminal || !terminalContainer.value) return;
  const el = terminalContainer.value;
  if (el.clientWidth <= 0 || el.clientHeight <= 0) return;
  fitAddon.fit();
  const dims = fitAddon.proposeDimensions();
  if (!dims || !dims.cols || !dims.rows) return;
  try {
    const win = window as any;
    if (win.go?.app?.App?.PtyResize) {
      win.go.app.App.PtyResize(props.taskId, dims.cols, dims.rows);
    }
  } catch {
    // Wails not available (dev mode)
  }
};

defineExpose({ fit: doFit });

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

  const webLinksAddon = new WebLinksAddon((_event, uri) => {
    try {
      BrowserOpenURL(uri);
    } catch {
      // Fallback for dev mode (no Wails runtime)
      window.open(uri, '_blank', 'noopener,noreferrer');
    }
  });
  terminal.loadAddon(webLinksAddon);

  if (terminalContainer.value) {
    terminal.open(terminalContainer.value);
    doFit();
  }

  // Replay accumulated output before subscribing to live events,
  // so switching back to a running task restores its scrollback.
  if (props.initialOutput) {
    terminal.write(props.initialOutput);
  }

  // Subscribe to PTY events via the store's event bus (not raw Wails EventsOn).
  // The store registers Wails listeners once; individual terminals sub/unsub
  // safely through the bus without cross-contamination.
  unsubscribe = taskStore.subscribe(
    props.taskId,
    (data: string) => {
      terminal?.write(data);
    },
    () => {
      if (terminal) {
        terminal.writeln('');
        terminal.writeln('\x1b[33m══════════════════════════════════════\x1b[0m');
        terminal.writeln('\x1b[33m  进程已退出\x1b[0m');
        terminal.writeln('\x1b[33m══════════════════════════════════════\x1b[0m');
      }
      emit('exited');
    },
  );

  // Send keystrokes to Go backend
  terminal.onData((data: string) => {
    try {
      const win = window as any;
      if (win.go?.app?.App?.PtyWrite) {
        win.go.app.App.PtyWrite(props.taskId, data);
      }
    } catch {
      // Wails not available (dev mode)
    }
  });

  // Focus the terminal
  terminal.focus();
});

// keep-alive: re-fit when DOM is reattached so the terminal matches the
// (possibly new) container size. fit() never fires on its own anymore.
onActivated(() => {
  nextTick(doFit);
});

onBeforeUnmount(() => {
  unsubscribe?.();
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
  min-width: 0;
  min-height: 0;
  overflow: hidden;

  :deep(.xterm) {
    height: 100%;
    padding: 4px;
  }

  :deep(.xterm-viewport) {
    overflow-x: hidden;

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
