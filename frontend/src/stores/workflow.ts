import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { AuiInstance } from "@/types/aui";
import type { AuiPluginMeta } from "@/stores/auiPlugin";

// ============ Interfaces ============
export interface WorkflowNodeSkill {
  id: string;
  name: string;
  color: string;
}

export interface WorkflowNodeAgent {
  id: string;
  name: string;
  color: string;
}

export interface WorkflowNodeAui {
  id: string;
  name: string;
  color: string;
}

export interface WorkflowExecutionMode {
  id: string;
  name: string;
}

export interface WorkflowNode {
  id: string;
  order: number;
  name: string;
  desc: string;
  content: string;
  skills: string[];
  agents: string[];
  aui?: string;
  requireAudit?: boolean;
  executionMode?: string;
}

export interface Workflow {
  id: string;
  name: string;
  desc: string;
  nodes: WorkflowNode[];
  createdAt: number;
}

export interface WorkflowGroup {
  id: string;
  name: string;
  description: string;
  scenarios: string;
  workflows: Workflow[];
  createdAt: number;
}

// AUI reference types — used to categorize what an aui ID points to
// Format: "builtin:table" | "instance:<uuid>" | "plugin:<id>"
export const AUI_REF_PREFIX = {
  BUILTIN: "builtin:",
  INSTANCE: "instance:",
  PLUGIN: "plugin:",
} as const;

// Built-in renderers that can be selected as node output
export const BUILTIN_AUI_OPTIONS: WorkflowNodeAui[] = [
  { id: "builtin:table", name: "数据表格", color: "#6366f1" },
  { id: "builtin:browser-preview", name: "浏览器预览", color: "#0ea5e9" },
  { id: "builtin:todo", name: "任务代办", color: "#14b8a6" },
];

// ============ Constants ============
export const ALL_SKILLS: WorkflowNodeSkill[] = [
  { id: "s1", name: "代码生成", color: "#6366f1" },
  { id: "s2", name: "代码审查", color: "#8b5cf6" },
  { id: "s3", name: "文档编写", color: "#0ea5e9" },
  { id: "s4", name: "测试生成", color: "#14b8a6" },
  { id: "s5", name: "需求分析", color: "#f59e0b" },
  { id: "s6", name: "架构设计", color: "#ef4444" },
  { id: "s7", name: "安全审计", color: "#ec4899" },
  { id: "s8", name: "数据分析", color: "#06b6d4" },
];

export const ALL_AGENTS: WorkflowNodeAgent[] = [
  { id: "a1", name: "CodePilot", color: "#6366f1" },
  { id: "a2", name: "TestGuard", color: "#14b8a6" },
  { id: "a3", name: "DocSmith", color: "#0ea5e9" },
  { id: "a4", name: "ArchMaster", color: "#ef4444" },
];

/** @deprecated Use getAllAuiOptions() instead for real AUI data */
export const ALL_AUIS: WorkflowNodeAui[] = BUILTIN_AUI_OPTIONS;

export const ALL_EXECUTION_MODES: WorkflowExecutionMode[] = [
  { id: "sequential", name: "顺序" },
  { id: "loop", name: "循环" },
  { id: "default", name: "默认顺序" },
];

// ============ AUI Resolution Helpers ============

export interface AuiOption {
  id: string;       // "builtin:table" | "instance:<uuid>" | "plugin:<id>"
  name: string;
  group: "builtin" | "instance" | "plugin";
}

/** Build combined AUI options list from real AUI instances and installed plugins. */
export function getAllAuiOptions(
  auiInstances: AuiInstance[],
  installedPlugins: AuiPluginMeta[],
): AuiOption[] {
  const builtins: AuiOption[] = BUILTIN_AUI_OPTIONS.map((a) => ({
    id: a.id,
    name: a.name,
    group: "builtin" as const,
  }));
  const instances: AuiOption[] = auiInstances
    .filter((a) => a.name)
    .map((a) => ({
      id: `${AUI_REF_PREFIX.INSTANCE}${a.id}`,
      name: a.name,
      group: "instance" as const,
    }));
  const plugins: AuiOption[] = installedPlugins.map((p) => ({
    id: `${AUI_REF_PREFIX.PLUGIN}${p.id}`,
    name: p.name,
    group: "plugin" as const,
  }));
  return [...builtins, ...instances, ...plugins];
}

/** Get the display name for an AUI ref. */
export function resolveAuiName(
  auiRef: string | undefined,
  auiInstances: AuiInstance[],
  installedPlugins: AuiPluginMeta[],
): string | undefined {
  if (!auiRef) return undefined;
  if (auiRef.startsWith(AUI_REF_PREFIX.BUILTIN)) {
    return BUILTIN_AUI_OPTIONS.find((a) => a.id === auiRef)?.name;
  }
  if (auiRef.startsWith(AUI_REF_PREFIX.INSTANCE)) {
    const id = auiRef.slice(AUI_REF_PREFIX.INSTANCE.length);
    return auiInstances.find((a) => a.id === id)?.name;
  }
  if (auiRef.startsWith(AUI_REF_PREFIX.PLUGIN)) {
    const id = auiRef.slice(AUI_REF_PREFIX.PLUGIN.length);
    return installedPlugins.find((p) => p.id === id)?.name;
  }
  // Legacy hardcoded IDs — fallback
  return ALL_AUIS.find((a) => a.id === auiRef)?.name;
}

/** Resolve the AUI definition (schema + sample data) for a given AUI ref. */
export function resolveAuiDefinition(
  auiRef: string | undefined,
  auiInstances: AuiInstance[],
  installedPlugins: AuiPluginMeta[],
): { jsonSchema: Record<string, any>; sampleData: any; rendererType: string } | null {
  if (!auiRef) return null;
  if (auiRef.startsWith(AUI_REF_PREFIX.BUILTIN)) {
    const type = auiRef.slice(AUI_REF_PREFIX.BUILTIN.length);
    return { jsonSchema: {}, sampleData: undefined, rendererType: type };
  }
  if (auiRef.startsWith(AUI_REF_PREFIX.INSTANCE)) {
    const id = auiRef.slice(AUI_REF_PREFIX.INSTANCE.length);
    const aui = auiInstances.find((a) => a.id === id);
    if (!aui) return null;
    return {
      jsonSchema: aui.jsonSchema,
      sampleData: aui.sampleData,
      rendererType: aui.rendererType,
    };
  }
  if (auiRef.startsWith(AUI_REF_PREFIX.PLUGIN)) {
    const id = auiRef.slice(AUI_REF_PREFIX.PLUGIN.length);
    const plugin = installedPlugins.find((p) => p.id === id);
    if (!plugin) return null;
    return {
      jsonSchema: plugin.dataSchema,
      sampleData: plugin.sampleData,
      rendererType: plugin.id,
    };
  }
  return null;
}

// ============ Helpers ============
let _idCounter = Date.now();
function generateId(): string {
  return `${++_idCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

// ============ Store ============
export const useWorkflowStore = defineStore("workflow", () => {
  // ============ Workflow Groups ============
  const workflowGroups = ref<WorkflowGroup[]>([
    {
      id: "g0",
      name: "测试甘特图",
      description: "用于测试 AUI 甘特图渲染器的工作流组，包含示例甘特图节点",
      scenarios: "快速体验甘特图功能：进入组 → 打开工作流 → 点击运行 → 查看甘特图结果",
      createdAt: Date.now(),
      workflows: [
        {
          id: "w0",
          name: "测试甘特图",
          desc: "运行甘特图测试节点，生成项目进度甘特图数据",
          createdAt: Date.now(),
          nodes: [
            { id: "n0", order: 1, name: "甘特图测试", desc: "生成项目进度甘特图数据，用于测试AUI甘特图渲染器", content: "分析当前项目的任务和里程碑，生成甘特图数据。输出数据需包含：任务名称(title)、开始日期(startDate)、结束日期(endDate)、进度百分比(progress)、颜色标识(color)。至少包含4个任务阶段。", skills: ["s8"], agents: ["a4"], aui: "plugin:gantt" },
          ],
        },
      ],
    },
    {
      id: "g1",
      name: "代码质量管理",
      description: "覆盖代码审查、测试、安全扫描全流程的质量保障体系",
      scenarios: "适用于团队日常代码提交、PR Review、CI/CD 流水线上的质量自动化保障",
      createdAt: Date.now() - 86400000 * 7,
      workflows: [
        {
          id: "w1",
          name: "代码审查流水线",
          desc: "自动化的代码审查流程，从拉取代码到生成审查报告",
          createdAt: Date.now() - 86400000 * 5,
          nodes: [
            { id: "n1", order: 1, name: "代码获取", desc: "从Git仓库拉取待审查的最新代码", content: "连接Git仓库，检出目标分支的最新代码，准备进行审查", skills: ["s1"], agents: ["a1"] },
            { id: "n2", order: 2, name: "静态分析", desc: "对代码进行静态分析，检查代码风格和潜在问题", content: "运行ESLint、Prettier等工具进行代码风格检查，标记所有违规项", skills: ["s2"], agents: ["a1"] },
            { id: "n3", order: 3, name: "安全审计", desc: "执行安全漏洞扫描，检测常见安全问题", content: "运行安全扫描工具，检查SQL注入、XSS、CSRF等常见安全漏洞", skills: ["s7"], agents: ["a4"] },
            { id: "n4", order: 4, name: "生成报告", desc: "汇总审查结果，生成审查报告", content: "汇总所有检查结果，生成HTML格式的审查报告，通知相关人员", skills: ["s3"], agents: ["a3"] },
          ],
        },
        {
          id: "w2",
          name: "文档生成工作流",
          desc: "自动从代码仓库生成技术文档",
          createdAt: Date.now() - 86400000 * 3,
          nodes: [
            { id: "n5", order: 1, name: "源码分析", desc: "分析源代码结构和注释", content: "扫描项目源代码，提取API定义、类型声明和注释信息", skills: ["s8", "s5"], agents: ["a1"] },
            { id: "n6", order: 2, name: "文档编写", desc: "根据分析结果生成文档", content: "将分析结果整理为结构化的技术文档，包括API文档、使用指南等", skills: ["s3"], agents: ["a3"] },
            { id: "n7", order: 3, name: "文档发布", desc: "发布文档到指定平台", content: "将生成的文档发布到Wiki、GitHub Pages等平台", skills: ["s3"], agents: ["a3"] },
          ],
        },
      ],
    },
    {
      id: "g2",
      name: "DevOps自动化",
      description: "从代码提交到生产部署的端到端自动化流水线组",
      scenarios: "适用于需要快速迭代的敏捷团队，覆盖 CI/CD、部署、监控等环节",
      createdAt: Date.now() - 86400000 * 4,
      workflows: [
        {
          id: "w3",
          name: "测试自动化流程",
          desc: "自动化测试执行与报告生成",
          createdAt: Date.now() - 86400000,
          nodes: [],
        },
      ],
    },
    {
      id: "g3",
      name: "需求与设计",
      description: "从需求分析到架构设计的前期工程化流程",
      scenarios: "适用于项目前期规划阶段，需求拆解、架构评审、技术方案评估",
      createdAt: Date.now() - 86400000 * 2,
      workflows: [],
    },
  ]);

  const currentGroupId = ref<string>("g0");
  const currentWorkflowId = ref<string>("w0");

  // ============ Computed ============
  const currentGroup = computed(() =>
    workflowGroups.value.find((g) => g.id === currentGroupId.value)
  );

  const groupWorkflows = computed(() => {
    if (!currentGroup.value) return [];
    return [...currentGroup.value.workflows].sort(
      (a, b) => b.createdAt - a.createdAt
    );
  });

  const currentWorkflow = computed(() => {
    const group = currentGroup.value;
    if (!group) return undefined;
    return group.workflows.find((w) => w.id === currentWorkflowId.value);
  });

  const sortedNodes = computed(() => {
    if (!currentWorkflow.value) return [];
    return [...currentWorkflow.value.nodes].sort((a, b) => a.order - b.order);
  });

  // ============ Group Actions ============
  function setCurrentGroup(id: string) {
    currentGroupId.value = id;
    // Auto-select first workflow if any
    const group = workflowGroups.value.find((g) => g.id === id);
    if (group && group.workflows.length > 0) {
      currentWorkflowId.value = group.workflows[0].id;
    } else {
      currentWorkflowId.value = "";
    }
  }

  function addWorkflowGroup(name: string, description: string, scenarios: string, workflows?: Workflow[]) {
    // For imported workflows, assign new IDs to avoid collisions
    const importedWorkflows = workflows
      ? workflows.map((wf) => ({
          ...wf,
          id: generateId(),
          nodes: (wf.nodes || []).map((n) => ({ ...n, id: generateId() })),
        }))
      : [];
    const group: WorkflowGroup = {
      id: generateId(),
      name,
      description,
      scenarios,
      workflows: importedWorkflows,
      createdAt: Date.now(),
    };
    workflowGroups.value.push(group);
    setCurrentGroup(group.id);
  }

  function updateWorkflowGroup(
    id: string,
    data: Partial<Pick<WorkflowGroup, "name" | "description" | "scenarios">>
  ) {
    const group = workflowGroups.value.find((g) => g.id === id);
    if (!group) return;
    if (data.name !== undefined) group.name = data.name;
    if (data.description !== undefined) group.description = data.description;
    if (data.scenarios !== undefined) group.scenarios = data.scenarios;
  }

  function deleteWorkflowGroup(id: string) {
    const idx = workflowGroups.value.findIndex((g) => g.id === id);
    if (idx === -1) return;
    workflowGroups.value.splice(idx, 1);
    if (currentGroupId.value === id) {
      const next = workflowGroups.value[0];
      if (next) {
        setCurrentGroup(next.id);
      } else {
        currentGroupId.value = "";
        currentWorkflowId.value = "";
      }
    }
  }

  // ============ Workflow Actions ============
  function setCurrentWorkflow(id: string) {
    currentWorkflowId.value = id;
  }

  function addWorkflow(name: string, desc: string, libraryNodeIds?: string[]) {
    const group = currentGroup.value;
    if (!group) return;
    const nodes: WorkflowNode[] = [];
    if (libraryNodeIds && libraryNodeIds.length > 0) {
      libraryNodeIds.forEach((libId, index) => {
        const libNode = nodeLibrary.value.find((n) => n.id === libId);
        if (libNode) {
          nodes.push({
            id: generateId(),
            order: index,
            name: libNode.name,
            desc: libNode.desc,
            content: libNode.content,
            skills: [...libNode.skills],
            agents: [...libNode.agents],
            aui: libNode.aui,
            requireAudit: libNode.requireAudit,
            executionMode: libNode.executionMode,
          });
        }
      });
    }
    const wf: Workflow = {
      id: generateId(),
      name,
      desc,
      nodes,
      createdAt: Date.now(),
    };
    group.workflows.push(wf);
    currentWorkflowId.value = wf.id;
  }

  function deleteWorkflow(id: string) {
    const group = currentGroup.value;
    if (!group) return;
    const idx = group.workflows.findIndex((w) => w.id === id);
    if (idx === -1) return;
    group.workflows.splice(idx, 1);
    if (currentWorkflowId.value === id) {
      currentWorkflowId.value = group.workflows[0]?.id ?? "";
    }
  }

  // ============ Workflow Nodes ============
  function addNode(
    name: string,
    desc: string,
    content: string,
    skills: string[],
    agents: string[],
    afterId: string,
    aui?: string,
    requireAudit?: boolean,
    executionMode?: string
  ) {
    const wf = currentWorkflow.value;
    if (!wf) return;

    let newOrder: number;
    if (afterId === "last" || !wf.nodes.length) {
      newOrder = wf.nodes.length > 0 ? Math.max(...wf.nodes.map((n) => n.order)) + 1 : 1;
    } else {
      const refNode = wf.nodes.find((n) => n.id === afterId);
      if (refNode) {
        newOrder = refNode.order + 1;
        wf.nodes.forEach((n) => {
          if (n.order >= newOrder) n.order++;
        });
      } else {
        newOrder = wf.nodes.length + 1;
      }
    }

    wf.nodes.push({
      id: generateId(),
      order: newOrder,
      name: name.trim(),
      desc: desc.trim(),
      content: content.trim(),
      skills: [...skills],
      agents: [...agents],
      aui,
      requireAudit,
      executionMode,
    });
  }

  function importNodeFromLibrary(libraryNodeId: string, afterId: string) {
    const wf = currentWorkflow.value;
    if (!wf) return;
    const libNode = nodeLibrary.value.find((n) => n.id === libraryNodeId);
    if (!libNode) return;

    let newOrder: number;
    if (afterId === "last" || !wf.nodes.length) {
      newOrder = wf.nodes.length > 0 ? Math.max(...wf.nodes.map((n) => n.order)) + 1 : 1;
    } else {
      const refNode = wf.nodes.find((n) => n.id === afterId);
      if (refNode) {
        newOrder = refNode.order + 1;
        wf.nodes.forEach((n) => {
          if (n.order >= newOrder) n.order++;
        });
      } else {
        newOrder = wf.nodes.length + 1;
      }
    }

    wf.nodes.push({
      id: generateId(),
      order: newOrder,
      name: libNode.name,
      desc: libNode.desc,
      content: libNode.content,
      skills: [...libNode.skills],
      agents: [...libNode.agents],
      aui: libNode.aui,
      requireAudit: libNode.requireAudit,
      executionMode: libNode.executionMode,
    });
  }

  function updateNode(
    nodeId: string,
    data: Partial<Pick<WorkflowNode, "name" | "desc" | "content" | "skills" | "agents" | "aui" | "requireAudit" | "executionMode">>
  ) {
    const wf = currentWorkflow.value;
    if (!wf) return;
    const node = wf.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (data.name !== undefined) node.name = data.name;
    if (data.desc !== undefined) node.desc = data.desc;
    if (data.content !== undefined) node.content = data.content;
    if (data.skills !== undefined) node.skills = [...data.skills];
    if (data.agents !== undefined) node.agents = [...data.agents];
    if (data.aui !== undefined) node.aui = data.aui;
    if (data.requireAudit !== undefined) node.requireAudit = data.requireAudit;
    if (data.executionMode !== undefined) node.executionMode = data.executionMode;
  }

  function deleteNode(nodeId: string) {
    const wf = currentWorkflow.value;
    if (!wf) return;
    const idx = wf.nodes.findIndex((n) => n.id === nodeId);
    if (idx === -1) return;
    const deletedOrder = wf.nodes[idx].order;
    wf.nodes.splice(idx, 1);
    wf.nodes.forEach((n) => {
      if (n.order > deletedOrder) n.order--;
    });
  }

  function reorderNode(nodeId: string, newOrder: number) {
    const wf = currentWorkflow.value;
    if (!wf) return;
    const node = wf.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const oldOrder = node.order;
    if (oldOrder === newOrder) return;

    wf.nodes.forEach((n) => {
      if (n.id === nodeId) {
        n.order = newOrder;
      } else if (oldOrder < newOrder) {
        if (n.order > oldOrder && n.order <= newOrder) {
          n.order--;
        }
      } else {
        if (n.order >= newOrder && n.order < oldOrder) {
          n.order++;
        }
      }
    });
  }

  // ============ Node Library ============
  const nodeLibrary = ref<WorkflowNode[]>([
    { id: "lib1", order: 0, name: "代码拉取", desc: "从版本控制系统拉取最新代码", content: "连接Git仓库，检出目标分支的代码", skills: ["s1"], agents: ["a1"] },
    { id: "lib2", order: 0, name: "代码编译", desc: "编译项目源代码", content: "运行构建命令，编译项目源代码，检查编译错误", skills: ["s1"], agents: ["a1"] },
    { id: "lib3", order: 0, name: "单元测试", desc: "运行单元测试用例", content: "执行所有单元测试，收集测试结果和覆盖率报告", skills: ["s4"], agents: ["a2"] },
    { id: "lib4", order: 0, name: "集成测试", desc: "执行集成测试验证模块交互", content: "运行集成测试用例，验证各模块之间的交互是否正确", skills: ["s4"], agents: ["a2"] },
    { id: "lib5", order: 0, name: "API文档生成", desc: "从代码注释生成API文档", content: "扫描代码中的JSDoc/注释，自动生成API参考文档", skills: ["s3"], agents: ["a3"] },
    { id: "lib6", order: 0, name: "性能分析", desc: "分析代码性能瓶颈", content: "运行性能分析工具，识别慢查询和性能瓶颈", skills: ["s8"], agents: ["a4"] },
    { id: "lib7", order: 0, name: "需求拆解", desc: "将需求文档拆分为开发任务", content: "分析需求文档，提取功能点，拆分为可执行的开发任务", skills: ["s5"], agents: ["a4"] },
    { id: "lib8", order: 0, name: "架构评审", desc: "评审系统架构设计", content: "审查架构设计方案，评估技术选型和系统设计是否合理", skills: ["s6"], agents: ["a4"] },
    { id: "lib9", order: 0, name: "甘特图测试", desc: "生成项目进度甘特图数据，用于测试AUI甘特图渲染器", content: "分析当前项目的任务和里程碑，生成甘特图数据。输出数据需包含：任务名称(title)、开始日期(startDate)、结束日期(endDate)、进度百分比(progress)、颜色标识(color)。至少包含4个任务阶段。", skills: ["s8"], agents: ["a4"], aui: "plugin:gantt" },
  ]);

  function addToLibrary(name: string, desc: string, content: string, skills: string[], agents: string[], aui?: string, requireAudit?: boolean, executionMode?: string) {
    nodeLibrary.value.push({
      id: generateId(),
      order: 0,
      name: name.trim(),
      desc: desc.trim(),
      content: content.trim(),
      skills: [...skills],
      agents: [...agents],
      aui,
      requireAudit,
      executionMode,
    });
  }

  function updateLibraryNode(
    nodeId: string,
    data: Partial<Pick<WorkflowNode, "name" | "desc" | "content" | "skills" | "agents" | "aui" | "requireAudit" | "executionMode">>
  ) {
    const node = nodeLibrary.value.find((n) => n.id === nodeId);
    if (!node) return;
    if (data.name !== undefined) node.name = data.name;
    if (data.desc !== undefined) node.desc = data.desc;
    if (data.content !== undefined) node.content = data.content;
    if (data.skills !== undefined) node.skills = [...data.skills];
    if (data.agents !== undefined) node.agents = [...data.agents];
    if (data.aui !== undefined) node.aui = data.aui;
    if (data.requireAudit !== undefined) node.requireAudit = data.requireAudit;
    if (data.executionMode !== undefined) node.executionMode = data.executionMode;
  }

  function deleteFromLibrary(nodeId: string) {
    const idx = nodeLibrary.value.findIndex((n) => n.id === nodeId);
    if (idx === -1) return;
    nodeLibrary.value.splice(idx, 1);
  }

  function getSkillById(id: string): WorkflowNodeSkill | undefined {
    return ALL_SKILLS.find((s) => s.id === id);
  }

  function getAgentById(id: string): WorkflowNodeAgent | undefined {
    return ALL_AGENTS.find((a) => a.id === id);
  }

  function getAuiById(
    id: string,
    auiInstances?: AuiInstance[],
    installedPlugins?: AuiPluginMeta[],
  ): WorkflowNodeAui | undefined {
    // First try BUILDIN_AUI_OPTIONS
    const builtin = BUILTIN_AUI_OPTIONS.find((a) => a.id === id);
    if (builtin) return builtin;
    // Try legacy ALL_AUIS IDs for backward compatibility
    const legacy = ALL_AUIS.find((a) => a.id === id);
    if (legacy) return legacy;
    // Try AUI instances
    if (auiInstances) {
      const prefix = AUI_REF_PREFIX.INSTANCE;
      if (id.startsWith(prefix)) {
        const auiId = id.slice(prefix.length);
        const aui = auiInstances.find((a) => a.id === auiId);
        if (aui) return { id, name: aui.name, color: "#6366f1" };
      }
    }
    // Try plugins
    if (installedPlugins) {
      const prefix = AUI_REF_PREFIX.PLUGIN;
      if (id.startsWith(prefix)) {
        const pId = id.slice(prefix.length);
        const p = installedPlugins.find((pl) => pl.id === pId);
        if (p) return { id, name: p.name, color: "#0ea5e9" };
      }
    }
    return undefined;
  }

  function getExecutionModeById(id: string): WorkflowExecutionMode | undefined {
    return ALL_EXECUTION_MODES.find((m) => m.id === id);
  }

  /** Find a workflow by ID across all groups. */
  function findWorkflowById(workflowId: string): Workflow | undefined {
    for (const group of workflowGroups.value) {
      const wf = group.workflows.find((w) => w.id === workflowId);
      if (wf) return wf;
    }
    return undefined;
  }

  return {
    // Groups
    workflowGroups,
    currentGroupId,
    currentGroup,
    // Workflows
    groupWorkflows,
    currentWorkflowId,
    currentWorkflow,
    sortedNodes,
    // Node library
    nodeLibrary,
    // Group methods
    setCurrentGroup,
    addWorkflowGroup,
    updateWorkflowGroup,
    deleteWorkflowGroup,
    // Workflow methods
    setCurrentWorkflow,
    addWorkflow,
    deleteWorkflow,
    // Node methods
    addNode,
    importNodeFromLibrary,
    updateNode,
    deleteNode,
    reorderNode,
    // Library methods
    addToLibrary,
    updateLibraryNode,
    deleteFromLibrary,
    // Helpers
    getSkillById,
    getAgentById,
    getAuiById,
    getExecutionModeById,
    findWorkflowById,
  };
});
