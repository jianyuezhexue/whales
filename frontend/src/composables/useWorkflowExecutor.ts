import { useTaskStore } from "@/stores/task";
import { useWorkflowStore, resolveAuiDefinition } from "@/stores/workflow";
import { useAuiStore } from "@/stores/aui";
import { useAuiPluginStore } from "@/stores/auiPlugin";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import type { Workflow, WorkflowNode } from "@/stores/workflow";

/** Build the prompt for a single node, including AUI schema instructions. */
function buildNodePrompt(
  node: WorkflowNode,
  index: number,
  total: number,
): string {
  const auiStore = useAuiStore();
  const pluginStore = useAuiPluginStore();

  const parts: string[] = [];

  // Node header
  parts.push(`## 任务节点 ${index + 1}/${total}: ${node.name}`);
  if (node.desc) parts.push(`> ${node.desc}`);
  parts.push("");

  // Node content (the actual instruction)
  parts.push(node.content);
  parts.push("");

  // AUI data output instructions
  const auiDef = resolveAuiDefinition(
    node.aui,
    auiStore.auiList,
    pluginStore.installedPlugins,
  );
  if (auiDef) {
    parts.push("## 数据输出要求");
    parts.push(
      `任务完成后，请将结果数据写入文件: \`.whales/task-results/${node.id}.json\``,
    );
    parts.push("");
    parts.push("数据必须符合以下 JSON Schema:");
    parts.push(
      "```json\n" +
        JSON.stringify(auiDef.jsonSchema, null, 2) +
        "\n```",
    );
    parts.push("");
    if (auiDef.sampleData !== undefined) {
      parts.push("示例数据格式:");
      parts.push(
        "```json\n" +
          JSON.stringify(auiDef.sampleData, null, 2) +
          "\n```",
      );
      parts.push("");
    }
    parts.push("输出格式为有效 JSON，请严格遵守 Schema 定义。");
    parts.push("");
  }

  return parts.join("\n");
}

/** Check if a node should be executed based on its execution mode. */
function shouldExecuteNode(
  node: WorkflowNode,
  _index: number,
): boolean {
  // For now we always execute — loop/conditional modes could be added later
  if (node.executionMode === "loop") {
    // TODO: implement loop execution
    return true;
  }
  return true;
}

export function useWorkflowExecutor() {
  const taskStore = useTaskStore();
  const workflowStore = useWorkflowStore();

  /** Execute all nodes in a workflow sequentially. */
  async function executeWorkflow(
    taskId: string,
    workflow: Workflow,
    projectPath: string,
  ): Promise<void> {
    const nodes = [...workflow.nodes].sort((a, b) => a.order - b.order);
    if (nodes.length === 0) return;

    // Initialize node results
    taskStore.initNodeResults(
      taskId,
      nodes.map((n) => ({ id: n.id, name: n.name, aui: n.aui })),
    );

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (!shouldExecuteNode(node, i)) {
        taskStore.updateNodeResult(taskId, node.id, { status: "completed" });
        taskStore.updateBoardTask(taskId, { currentNodeIndex: i + 1 });
        continue;
      }

      // Mark node as running
      const nodeStartTime = Date.now();
      taskStore.updateNodeResult(taskId, node.id, {
        status: "running",
        startedAt: new Date().toLocaleString(),
      });
      taskStore.updateBoardTask(taskId, { currentNodeIndex: i });

      try {
        const prompt = buildNodePrompt(node, i, nodes.length);
        await executeSingleNode(taskId, node, prompt, projectPath);

        // Try to read result file
        const resultData = await readNodeResultFile(node.id, projectPath);
        const nodeDuration = Date.now() - nodeStartTime;
        taskStore.updateNodeResult(taskId, node.id, {
          status: "completed",
          completedAt: new Date().toLocaleString(),
          durationMs: nodeDuration,
          auiData: resultData,
          outputFilePath: resultData
            ? `.whales/task-results/${node.id}.json`
            : undefined,
        });
      } catch (err: any) {
        const nodeDuration = Date.now() - nodeStartTime;
        const errorMsg = err?.message ?? String(err);
        taskStore.updateNodeResult(taskId, node.id, {
          status: "failed",
          completedAt: new Date().toLocaleString(),
          durationMs: nodeDuration,
          rawOutput: errorMsg || "Unknown error",
        });
      }

      taskStore.updateBoardTask(taskId, { currentNodeIndex: i + 1 });
    }

    // Mark the overall task as completed if all nodes are done
    const results = taskStore.getNodeResult(taskId, nodes[nodes.length - 1].id);
    if (results?.status === "failed") {
      taskStore.updateBoardTask(taskId, { status: "failed" });
    } else {
      taskStore.updateBoardTask(taskId, { status: "completed" });
    }
  }

  return { executeWorkflow };
}

/** Execute a single node via PTY. Returns a promise that resolves on PTY exit. */
function executeSingleNode(
  taskId: string,
  _node: WorkflowNode,
  prompt: string,
  projectPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const win = window as any;
      if (!win.go?.app?.App?.PtyStart) {
        reject(new Error("PTY not available"));
        return;
      }

      const ptyTaskId = `${taskId}-${_node.id}`;

      win.go.app.App.PtyStart(ptyTaskId, "claude", prompt, projectPath);

      const winAny = window as any;

      let settled = false;
      const cleanup = () => {
        clearTimeout(timeout);
        cancelExitListener();
      };

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        if (winAny.go?.app?.App?.PtyStop) {
          try { winAny.go.app.App.PtyStop(ptyTaskId); } catch { /* ok */ }
        }
        resolve();
      }, 30 * 60 * 1000);

      const cancelExitListener = EventsOn("pty-exit", (exitedTaskId: string) => {
        if (settled) return;
        if (exitedTaskId !== ptyTaskId) return;
        settled = true;
        cleanup();
        if (winAny.go?.app?.App?.PtyStop) {
          try { winAny.go.app.App.PtyStop(ptyTaskId); } catch { /* ok */ }
        }
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
}

/** Read the result file written by the agent. */
async function readNodeResultFile(
  nodeId: string,
  projectPath: string,
): Promise<any | null> {
  try {
    const win = window as any;
    if (!win.go?.app?.App?.ReadKnowledgeFile) return null;

    const content = await win.go.app.App.ReadKnowledgeFile(
      projectPath,
      `task-results/${nodeId}.json`,
    );
    if (content) {
      return JSON.parse(content);
    }
    return null;
  } catch {
    return null;
  }
}
