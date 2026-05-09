import { defineStore } from "pinia";
import { ref, computed } from "vue";

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

export const ALL_AUIS: WorkflowNodeAui[] = [
  { id: "aui1", name: "表格展示", color: "#6366f1" },
  { id: "aui2", name: "图表展示", color: "#8b5cf6" },
  { id: "aui3", name: "卡片展示", color: "#0ea5e9" },
  { id: "aui4", name: "JSON 展示", color: "#14b8a6" },
  { id: "aui5", name: "文本展示", color: "#f59e0b" },
  { id: "aui6", name: "对话展示", color: "#ef4444" },
];

export const ALL_EXECUTION_MODES: WorkflowExecutionMode[] = [
  { id: "sequential", name: "顺序" },
  { id: "loop", name: "循环" },
  { id: "default", name: "默认顺序" },
];

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

  const currentGroupId = ref<string>("g1");
  const currentWorkflowId = ref<string>("w1");

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

  function getAuiById(id: string): WorkflowNodeAui | undefined {
    return ALL_AUIS.find((a) => a.id === id);
  }

  function getExecutionModeById(id: string): WorkflowExecutionMode | undefined {
    return ALL_EXECUTION_MODES.find((m) => m.id === id);
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
  };
});
