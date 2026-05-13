<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, onActivated, nextTick } from 'vue';
import { Terminal, type ILinkProvider } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { BrowserOpenURL } from '../../../../wailsjs/runtime/runtime';
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
let cleanupMouse: (() => void) | null = null;

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

const openUrl = (uri: string) => {
  try { BrowserOpenURL(uri); }
  catch { window.open(uri, '_blank', 'noopener,noreferrer'); }
};

const urlRegex = /https?:\/\/[^\s"'!*(){}|\\\^<>`]*[^\s"':,.!?{}|\\\^~\[\]`()<>]/gi;

// Track which URL the mouse is hovering over, set by xterm's linkifier
// via hover/leave callbacks. xterm handles all pixel→character mapping.
let hoveredUrl: string | null = null;

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

  // Link provider: scan buffer lines for URLs when xterm's linkifier asks.
  // lineNumber is 1-based absolute (coords[1] + ydisp) but getLine expects
  // 0-based index. Range coordinates must be 1-based to match xterm's
  // internal position tracking in _linkAtPosition.
  const linkProvider: ILinkProvider = {
    provideLinks(lineNumber: number, callback: (links: any[]) => void) {
      const line = terminal!.buffer.active.getLine(lineNumber - 1);
      if (!line) { callback([]); return; }
      const text = line.translateToString(true);
      const links: any[] = [];
      let match: RegExpExecArray | null;
      urlRegex.lastIndex = 0;
      while ((match = urlRegex.exec(text)) !== null) {
        const uri = match[0];
        const start = match.index + 1; // 0-based match.index → 1-based column
        const end = start + uri.length - 1; // inclusive end column
        links.push({
          range: { start: { x: start, y: lineNumber }, end: { x: end, y: lineNumber } },
          text: uri,
          activate: () => openUrl(uri),
          hover: () => { hoveredUrl = uri; },
          leave: () => { hoveredUrl = null; },
        });
      }
      callback(links);
    },
  };
  terminal.registerLinkProvider(linkProvider);

  // On mouseup, if the linkifier has us hovering over a URL, open it.
  // This covers cases where xterm's built-in click handler doesn't fire
  // (e.g., stale _currentLink state due to rapid scrolling).
  const onMouseUp = () => {
    if (hoveredUrl) {
      openUrl(hoveredUrl);
    }
  };
  terminalContainer.value?.addEventListener('mouseup', onMouseUp);
  cleanupMouse = () => {
    terminalContainer.value?.removeEventListener('mouseup', onMouseUp);
  };

  if (terminalContainer.value) {
    terminal.open(terminalContainer.value);
    doFit();
  }

  if (props.initialOutput) {
    terminal.write(props.initialOutput);
  }

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

  terminal.focus();
});

onActivated(() => {
  nextTick(doFit);
});

onBeforeUnmount(() => {
  cleanupMouse?.();
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
