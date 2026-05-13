<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import ConfirmModal from "@/components/ConfirmModal.vue";

const { t } = useI18n();

interface ChatMessage {
  role: "ai" | "user";
  content: string;
}

interface EvolutionItem {
  id: string;
  suggestion: string;
  problem: string;
  scenario: string;
  sourceTaskId: string;
  sourceTaskName: string;
  status: "pending" | "adopted";
  createdAt: number;
  chatMessages: ChatMessage[];
}

interface PainPoint {
  id: string;
  title: string;
  problem: string;
  scenario: string;
  createdAt: number;
}

const formatDate = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// --- Tab ---
type TabKey = "suggestions" | "painpoints";
const activeTab = ref<TabKey>("suggestions");

// --- Evolution (suggestions) ---
const items = ref<EvolutionItem[]>([
  {
    id: "1",
    suggestion: "代码审查节点中的静态分析步骤缺少对 TypeScript 严格模式的支持，建议在 pipeline 中增加 tsconfig strict 检查步骤",
    problem: "当前代码审查流程未能检测 TypeScript strict 模式相关的类型错误，导致部分代码合入后出现运行时异常",
    scenario: "在「商城后端」项目中，代码审查节点跳过了 strictNullChecks 相关错误，上线后出现 Cannot read property of undefined 崩溃",
    sourceTaskId: "task-001",
    sourceTaskName: "商城后端代码审查优化",
    status: "pending",
    createdAt: Date.now() - 86400000 * 5,
    chatMessages: [
      { role: "ai", content: "我在代码审查过程中发现，当前工作流的静态分析步骤没有覆盖 TypeScript strict 模式。建议在「代码审查」节点的编译步骤前增加 strict 类型检查。" },
      { role: "user", content: "具体应该怎么修改？" },
      { role: "ai", content: "建议在「代码审查」节点的「静态分析」子步骤中，添加执行 `tsc --noEmit --strict` 的命令，并将其执行结果的 exit code 作为节点通过条件之一。" },
    ],
  },
  {
    id: "2",
    suggestion: "对话超过 20 轮仍未达成任务目标时，应触发自动升级机制，将任务转交给更高级别的 Agent 处理",
    problem: "低级别 Agent 在多轮对话中陷入循环，反复生成相似内容却无法完成任务，浪费 token 且延误交付",
    scenario: "在「API 文档自动生成」任务中，Agent 连续 25 轮试图理解一个复杂的数据结构却反复出错，最终由人工介入才完成",
    sourceTaskId: "task-002",
    sourceTaskName: "API 文档自动生成",
    status: "pending",
    createdAt: Date.now() - 86400000 * 3,
    chatMessages: [
      { role: "ai", content: "我注意到在「API 文档自动生成」任务中，CodePilot 连续 25 轮对话未能完成任务。建议在工作流中增加一个「轮次上限」节点配置，超过阈值自动升级到 ArchMaster。" },
      { role: "user", content: "阈值设为多少比较合理？" },
      { role: "ai", content: "根据历史数据分析，建议默认设为 20 轮。简单任务平均 5-8 轮完成，复杂任务 15-20 轮。超过 20 轮说明当前 Agent 能力不足，应升级处理。" },
    ],
  },
  {
    id: "3",
    suggestion: "知识管理节点在读取大型 Markdown 文件时性能较差，建议增加分段读取和缓存机制",
    problem: "处理超过 500KB 的 Markdown 文件时，前端渲染卡顿且内存占用过高，影响整体任务执行效率",
    scenario: "在「技术规范文档同步」任务中，读取 800KB 的 API 设计文档时页面白屏约 5 秒，且 xterm 终端输出也出现延迟",
    sourceTaskId: "task-003",
    sourceTaskName: "技术规范文档同步",
    status: "pending",
    createdAt: Date.now() - 86400000 * 2,
    chatMessages: [
      { role: "ai", content: "知识管理节点在处理大文件时性能瓶颈在于一次性加载和渲染整个文件。建议采用分段读取，每次只渲染可视区域的内容。" },
      { role: "user", content: "用虚拟滚动还是分页？" },
      { role: "ai", content: "建议使用虚拟滚动方案，这样用户可以连续浏览而不需要翻页操作。同时增加文件级别的 LRU 缓存，避免重复解析。" },
      { role: "user", content: "具体改动涉及哪些文件和模块？" },
      { role: "ai", content: "主要涉及 KnowledgeContent.vue 的渲染逻辑、useKnowledgeApi.ts 的读取方法，以及 knowledge store 的缓存层。预计改动 3 个文件。" },
    ],
  },
  {
    id: "4",
    suggestion: "TaskView 中 Agent 选择器和 Workflow 选择器的下拉菜单应统一向上弹出，保持与 AgentView 一致",
    problem: "TaskView 的下拉菜单位置不统一，部分向下弹出导致超出可视区域，用户体验不一致",
    scenario: "在创建新任务时，选择 Agent 的下拉菜单在窗口较小时向下弹出并被截断，用户无法看到底部选项",
    sourceTaskId: "task-004",
    sourceTaskName: "安全漏洞扫描任务",
    status: "adopted",
    createdAt: Date.now() - 86400000 * 7,
    chatMessages: [
      { role: "ai", content: "发现 TaskView 中的下拉菜单未遵循项目统一的「向上弹出」规范。AgentView 使用的是 checkDropDirection 逻辑动态判断，建议 TaskView 也采用同样方案。" },
      { role: "user", content: "这个改动影响范围大吗？" },
      { role: "ai", content: "只涉及 TaskView.vue 一个文件，改动量约 30 行代码，主要是复用已有的 checkDropDirection 方法。" },
    ],
  },
  {
    id: "5",
    suggestion: "工作流节点执行失败后的重试策略过于简单（仅重试 1 次），应支持指数退避重试和自定义重试条件",
    problem: "某些临时性错误（如网络波动、资源竞争）在立即重试后依然失败，但延迟重试通常能成功，简单的重试策略导致任务失败率偏高",
    scenario: "在 DevOps 自动化工作流中，Docker 镜像拉取因 registry 限流失败，立即重试仍然被限，但 30 秒后重试成功。当前策略导致该步骤被标记为失败",
    sourceTaskId: "task-005",
    sourceTaskName: "DevOps 自动化部署",
    status: "pending",
    createdAt: Date.now() - 86400000,
    chatMessages: [
      { role: "ai", content: "建议将重试策略从「固定重试1次」改为「指数退避重试，最多3次，间隔 5s/25s/125s」。同时在节点配置中增加「可重试错误类型」选项。" },
    ],
  },
]);

const statusFilter = ref<"all" | "pending" | "adopted">("all");

const filteredItems = computed(() => {
  if (statusFilter.value === "all") return items.value;
  return items.value.filter((item) => item.status === statusFilter.value);
});

// Chat modal
const showChatModal = ref(false);
const chattingItem = ref<EvolutionItem | null>(null);
const chatInput = ref("");
const chatBodyRef = ref<HTMLElement | null>(null);

const openChatModal = (item: EvolutionItem) => {
  chattingItem.value = item;
  chatInput.value = "";
  showChatModal.value = true;
  nextTick(() => {
    scrollChatToBottom();
  });
};

const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatBodyRef.value) {
      chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight;
    }
  });
};

const sendChatMessage = () => {
  if (!chattingItem.value || !chatInput.value.trim()) return;
  chattingItem.value.chatMessages.push({ role: "user", content: chatInput.value.trim() });
  chatInput.value = "";
  scrollChatToBottom();
  setTimeout(() => {
    if (chattingItem.value) {
      chattingItem.value.chatMessages.push({
        role: "ai",
        content: "收到，我会根据我们讨论的方案来调整优化策略。如果确认无误，你可以点击「确定采纳」来应用这个优化。",
      });
      scrollChatToBottom();
    }
  }, 1000);
};

const handleChatKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
};

// Adopt confirm
const showAdoptModal = ref(false);
const adoptingItem = ref<EvolutionItem | null>(null);

const confirmAdopt = (item: EvolutionItem) => {
  adoptingItem.value = item;
  showAdoptModal.value = true;
};

const onAdoptConfirm = () => {
  if (adoptingItem.value) {
    adoptingItem.value.status = "adopted";
  }
  showAdoptModal.value = false;
  adoptingItem.value = null;
};

const onAdoptCancel = () => {
  showAdoptModal.value = false;
  adoptingItem.value = null;
};

const statusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return { text: "待采纳", class: "status-pending" };
    case "adopted":
      return { text: "已采纳", class: "status-adopted" };
    default:
      return { text: status, class: "" };
  }
};

// --- Pain points ---
const painPoints = ref<PainPoint[]>([]);

const showPainPointModal = ref(false);
const painPointForm = ref({ title: "", problem: "", scenario: "" });

const openPainPointModal = () => {
  painPointForm.value = { title: "", problem: "", scenario: "" };
  showPainPointModal.value = true;
};

const submitPainPoint = () => {
  if (!painPointForm.value.title.trim() || !painPointForm.value.problem.trim()) return;
  painPoints.value.unshift({
    id: `pp-${Date.now()}`,
    title: painPointForm.value.title.trim(),
    problem: painPointForm.value.problem.trim(),
    scenario: painPointForm.value.scenario.trim(),
    createdAt: Date.now(),
  });
  showPainPointModal.value = false;
};

const showPainPointDeleteModal = ref(false);
const deletingPainPointId = ref<string | null>(null);

const confirmDeletePainPoint = (id: string) => {
  deletingPainPointId.value = id;
  showPainPointDeleteModal.value = true;
};

const onPainPointDeleteConfirm = () => {
  if (deletingPainPointId.value) {
    painPoints.value = painPoints.value.filter((p) => p.id !== deletingPainPointId.value);
  }
  showPainPointDeleteModal.value = false;
  deletingPainPointId.value = null;
};
</script>

<template>
  <div class="evolution-page page-layout">
    <!-- Header -->
    <div class="page-header">
      <h1 class="page-title">{{ t("menu.evolution") }}</h1>
      <div class="header-actions">
        <div class="view-toggle">
          <button
            :class="['toggle-btn', { active: activeTab === 'suggestions' }]"
            :title="t('evolutionpage.tab-suggestions')"
            @click="activeTab = 'suggestions'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M21 21v-5h-5" />
            </svg>
          </button>
          <button
            :class="['toggle-btn', { active: activeTab === 'painpoints' }]"
            :title="t('evolutionpage.tab-painpoints')"
            @click="activeTab = 'painpoints'"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>
        <!-- Suggestions tab header actions -->
        <template v-if="activeTab === 'suggestions'">
          <div class="status-tabs">
            <button
              :class="['tab-btn', { active: statusFilter === 'all' }]"
              type="button"
              @click="statusFilter = 'all'"
            >
              全部
            </button>
            <button
              :class="['tab-btn', { active: statusFilter === 'pending' }]"
              type="button"
              @click="statusFilter = 'pending'"
            >
              待采纳
            </button>
            <button
              :class="['tab-btn', { active: statusFilter === 'adopted' }]"
              type="button"
              @click="statusFilter = 'adopted'"
            >
              已采纳
            </button>
          </div>
        </template>
        <!-- Painpoints tab header actions -->
        <template v-if="activeTab === 'painpoints'">
          <button class="pain-point-btn" type="button" @click="openPainPointModal">
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>{{ t("evolutionpage.btn-pain-point") }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- ==================== Suggestions tab ==================== -->
    <template v-if="activeTab === 'suggestions'">
      <!-- Empty state -->
      <div v-if="items.length === 0" class="empty-state">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="#d0d0d0"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        <div class="empty-title">{{ t("evolutionpage.empty-title") }}</div>
        <div class="empty-subtitle">{{ t("evolutionpage.empty-subtitle") }}</div>
      </div>

      <!-- List view -->
      <div v-else class="evolution-list">
        <div class="list-header">
          <span class="col-suggestion">{{ t("evolutionpage.col-suggestion") }}</span>
          <span class="col-problem">{{ t("evolutionpage.col-problem") }}</span>
          <span class="col-source">{{ t("evolutionpage.col-source") }}</span>
          <span class="col-status">{{ t("evolutionpage.col-status") }}</span>
          <span class="col-action">{{ t("evolutionpage.col-action") }}</span>
        </div>
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="list-row"
        >
          <span class="col-suggestion">
            <div class="suggestion-text">{{ item.suggestion }}</div>
          </span>
          <span class="col-problem">
            <div class="problem-text">{{ item.problem }}</div>
          </span>
          <span class="col-source">
            <div class="source-info">
              <span class="source-name">{{ item.sourceTaskName }}</span>
              <span class="source-date">{{ formatDate(item.createdAt) }}</span>
            </div>
          </span>
          <span class="col-status">
            <span :class="['status-tag', statusLabel(item.status).class]">
              {{ statusLabel(item.status).text }}
            </span>
          </span>
          <span class="col-action">
            <button
              v-if="item.status !== 'adopted'"
              class="action-btn action-chat"
              type="button"
              @click="openChatModal(item)"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{{ t("evolutionpage.btn-chat") }}</span>
            </button>
            <button
              v-if="item.status !== 'adopted'"
              class="action-btn action-adopt"
              type="button"
              @click="confirmAdopt(item)"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{{ t("evolutionpage.btn-adopt") }}</span>
            </button>
            <span v-else class="adopted-label">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ t("evolutionpage.btn-adopted") }}
            </span>
          </span>
        </div>
      </div>
    </template>

    <!-- ==================== Pain points tab ==================== -->
    <template v-if="activeTab === 'painpoints'">
      <!-- Empty state -->
      <div v-if="painPoints.length === 0" class="empty-state">
        <svg
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="none"
          stroke="#d0d0d0"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        <div class="empty-title">{{ t("evolutionpage.pain-point-empty-title") }}</div>
        <div class="empty-subtitle">{{ t("evolutionpage.pain-point-empty-subtitle") }}</div>
      </div>

      <!-- List view -->
      <div v-else class="pain-point-list">
        <div class="list-header">
          <span class="col-title">{{ t("evolutionpage.pain-point-col-title") }}</span>
          <span class="col-problem">{{ t("evolutionpage.pain-point-col-problem") }}</span>
          <span class="col-scenario">{{ t("evolutionpage.pain-point-col-scenario") }}</span>
          <span class="col-date">{{ t("evolutionpage.pain-point-col-date") }}</span>
          <span class="col-action">{{ t("evolutionpage.pain-point-col-action") }}</span>
        </div>
        <div
          v-for="item in painPoints"
          :key="item.id"
          class="list-row"
        >
          <span class="col-title">
            <div class="title-text">{{ item.title }}</div>
          </span>
          <span class="col-problem">
            <div class="problem-text">{{ item.problem }}</div>
          </span>
          <span class="col-scenario">
            <div class="scenario-text">{{ item.scenario || "-" }}</div>
          </span>
          <span class="col-date">
            <span class="date-text">{{ formatDate(item.createdAt) }}</span>
          </span>
          <span class="col-action">
            <button
              class="action-btn action-delete"
              type="button"
              @click="confirmDeletePainPoint(item.id)"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>{{ t("evolutionpage.pain-point-btn-delete") }}</span>
            </button>
          </span>
        </div>
      </div>
    </template>

    <!-- Chat modal -->
    <div v-if="showChatModal" class="modal-overlay" @click.self="showChatModal = false">
      <div class="modal-panel chat-panel">
        <div class="modal-title">{{ t("evolutionpage.chat-title") }}</div>
        <div class="chat-context">
          <div class="context-label">{{ t("evolutionpage.chat-context-label") }}</div>
          <div class="context-text">{{ chattingItem?.suggestion }}</div>
        </div>
        <div class="chat-body" ref="chatBodyRef">
          <div
            v-for="(msg, idx) in chattingItem?.chatMessages"
            :key="idx"
            :class="['chat-message', msg.role === 'ai' ? 'msg-ai' : 'msg-user']"
          >
            <div class="msg-bubble">
              <div class="msg-role">{{ msg.role === "ai" ? t("evolutionpage.ai-label") : t("evolutionpage.you-label") }}</div>
              <div class="msg-content">{{ msg.content }}</div>
            </div>
          </div>
        </div>
        <div class="chat-input-area">
          <textarea
            v-model="chatInput"
            class="chat-input"
            :placeholder="t('evolutionpage.chat-placeholder')"
            rows="2"
            @keydown="handleChatKeydown"
          ></textarea>
          <button
            class="btn btn-send"
            type="button"
            :disabled="!chatInput.trim()"
            @click="sendChatMessage"
          >
            {{ t("evolutionpage.chat-send") }}
          </button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showChatModal = false">
            {{ t("evolutionpage.chat-close") }}
          </button>
          <button
            v-if="chattingItem?.status !== 'adopted'"
            class="btn btn-confirm"
            type="button"
            @click="
              showChatModal = false;
              confirmAdopt(chattingItem!);
            "
          >
            {{ t("evolutionpage.btn-adopt") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pain point add modal -->
    <div v-if="showPainPointModal" class="modal-overlay" @click.self="showPainPointModal = false">
      <div class="modal-panel form-panel">
        <div class="modal-title">{{ t("evolutionpage.pain-point-modal-title") }}</div>
        <div class="form-body">
          <div class="form-field">
            <label class="form-label">{{ t("evolutionpage.pain-point-field-title") }} <span class="required">*</span></label>
            <input
              v-model="painPointForm.title"
              class="form-input"
              type="text"
              :placeholder="t('evolutionpage.pain-point-title-placeholder')"
            />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("evolutionpage.pain-point-field-problem") }} <span class="required">*</span></label>
            <textarea
              v-model="painPointForm.problem"
              class="form-textarea"
              rows="3"
              :placeholder="t('evolutionpage.pain-point-problem-placeholder')"
            ></textarea>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("evolutionpage.pain-point-field-scenario") }}</label>
            <textarea
              v-model="painPointForm.scenario"
              class="form-textarea"
              rows="2"
              :placeholder="t('evolutionpage.pain-point-scenario-placeholder')"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showPainPointModal = false">
            {{ t("evolutionpage.pain-point-cancel") }}
          </button>
          <button
            class="btn btn-confirm"
            type="button"
            :disabled="!painPointForm.title.trim() || !painPointForm.problem.trim()"
            @click="submitPainPoint"
          >
            {{ t("evolutionpage.pain-point-submit") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Pain point delete confirm modal -->
    <div v-if="showPainPointDeleteModal" class="modal-overlay" @click.self="showPainPointDeleteModal = false">
      <div class="modal-panel confirm-panel">
        <div class="modal-title">{{ t("evolutionpage.pain-point-delete-confirm-title") }}</div>
        <div class="confirm-body">{{ t("evolutionpage.pain-point-delete-confirm-msg") }}</div>
        <div class="modal-footer">
          <button class="btn btn-cancel" type="button" @click="showPainPointDeleteModal = false">
            {{ t("evolutionpage.pain-point-cancel") }}
          </button>
          <button class="btn btn-danger" type="button" @click="onPainPointDeleteConfirm">
            {{ t("evolutionpage.pain-point-confirm-delete") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Adopt confirm modal -->
    <ConfirmModal
      v-if="showAdoptModal"
      :title="t('evolutionpage.adopt-confirm-title')"
      :message="`${t('evolutionpage.adopt-confirm-msg')}\n\n「${adoptingItem?.suggestion}」`"
      :confirm-text="t('evolutionpage.btn-adopt')"
      :danger="false"
      @confirm="onAdoptConfirm"
      @cancel="onAdoptCancel"
    />
  </div>
</template>

<style lang="scss" scoped>
.evolution-page {
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

// Tab toggle
.view-toggle {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;

  .toggle-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    padding: 0;
    border: none;
    background-color: #ffffff;
    color: #9a9a9a;
    cursor: pointer;
    transition: all 0.15s ease;

    &:first-child {
      border-right: 1px solid #e5e5e5;
    }

    &:hover {
      background-color: #f0f0f0;
      color: #1f1f1f;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}

// Status tabs (suggestions)
.status-tabs {
  display: flex;
  align-items: center;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  overflow: hidden;

  .tab-btn {
    height: 28px;
    padding: 0 12px;
    border: none;
    background-color: #ffffff;
    color: #6b6b6b;
    font-size: 12px;
    font-family: "JetBrainsMono", sans-serif;
    cursor: pointer;
    transition: all 0.15s ease;
    border-right: 1px solid #e5e5e5;

    &:last-child {
      border-right: none;
    }

    &:hover {
      background-color: #f0f0f0;
    }

    &.active {
      background-color: #1f1f1f;
      color: #ffffff;
    }
  }
}

.pain-point-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background-color: #1f1f1f;
  color: #ffffff;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: opacity 0.15s ease;
  white-space: nowrap;

  &:hover {
    opacity: 0.85;
  }
}

// Shared empty state
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 8px;

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: #4a4a4a;
    margin-top: 12px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: #9a9a9a;
  }
}

// Shared list
.evolution-list,
.pain-point-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;

  .list-header {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    color: #9a9a9a;
    border-bottom: 1px solid #e5e5e5;
    flex-shrink: 0;
  }

  .list-row {
    display: flex;
    align-items: flex-start;
    min-height: 56px;
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: #fafafa;
    }
  }
}

// Evolution list columns
.evolution-list {
  .col-suggestion {
    flex: 3;
    min-width: 0;
    padding-right: 12px;

    .suggestion-text {
      font-size: 13px;
      color: #1f1f1f;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-problem {
    flex: 3;
    min-width: 0;
    padding-right: 12px;

    .problem-text {
      font-size: 13px;
      color: #4a4a4a;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-source {
    flex: 1.5;
    min-width: 0;
    padding-right: 12px;

    .source-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .source-name {
      font-size: 13px;
      color: #1f1f1f;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .source-date {
      font-size: 11px;
      color: #9a9a9a;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-status {
    flex: 0 0 80px;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
      align-items: center;
      padding-top: 0;
    }
  }

  .col-action {
    flex: 0 0 180px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    justify-content: flex-end;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }
}

// Pain point list columns
.pain-point-list {
  .col-title {
    flex: 2;
    min-width: 0;
    padding-right: 12px;

    .title-text {
      font-size: 13px;
      color: #1f1f1f;
      line-height: 1.5;
      font-weight: 500;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-problem {
    flex: 3;
    min-width: 0;
    padding-right: 12px;

    .problem-text {
      font-size: 13px;
      color: #4a4a4a;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-scenario {
    flex: 2;
    min-width: 0;
    padding-right: 12px;

    .scenario-text {
      font-size: 13px;
      color: #6b6b6b;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }

  .col-date {
    flex: 0 0 140px;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;

    .date-text {
      font-size: 12px;
      color: #9a9a9a;
    }

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
      align-items: center;
      padding-top: 0;
    }
  }

  .col-action {
    flex: 0 0 80px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
    justify-content: flex-end;

    .list-header & {
      font-weight: 600;
      color: #9a9a9a;
    }
  }
}

.status-tag {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;

  &.status-pending {
    color: #d97706;
    background-color: #fef3c7;
    border: 1px solid #fde68a;
  }

  &.status-adopted {
    color: #059669;
    background-color: #d1fae5;
    border: 1px solid #a7f3d0;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrainsMono", sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &.action-chat {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #4a4a4a;

    &:hover {
      background-color: #f5f5f5;
      border-color: #d0d0d0;
    }
  }

  &.action-adopt {
    border: none;
    background-color: #1f1f1f;
    color: #ffffff;

    &:hover {
      opacity: 0.85;
    }
  }

  &.action-delete {
    border: 1px solid #e5e5e5;
    background-color: #ffffff;
    color: #1f1f1f;

    &:hover {
      background-color: #f5f5f5;
      border-color: #d0d0d0;
    }
  }
}

.adopted-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #059669;
  font-family: "JetBrainsMono", sans-serif;
}

// Modal
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

.modal-panel {
  width: 580px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #1f1f1f;
    padding: 20px 24px 0;
    flex-shrink: 0;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
}

// Chat modal
.chat-context {
  margin: 16px 24px 0;
  padding: 10px 12px;
  background-color: #f8f8f8;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  flex-shrink: 0;

  .context-label {
    font-size: 11px;
    font-weight: 600;
    color: #9a9a9a;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .context-text {
    font-size: 13px;
    color: #1f1f1f;
    line-height: 1.5;
  }
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
  max-height: 320px;
}

.chat-message {
  display: flex;

  &.msg-ai {
    justify-content: flex-start;
  }

  &.msg-user {
    justify-content: flex-end;
  }
}

.msg-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 8px;

  .msg-role {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .msg-content {
    font-size: 13px;
    line-height: 1.5;
    color: #1f1f1f;
  }

  .msg-ai & {
    background-color: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-bottom-left-radius: 2px;

    .msg-role {
      color: #6b6b6b;
    }
  }

  .msg-user & {
    background-color: #1f1f1f;
    border-bottom-right-radius: 2px;

    .msg-role {
      color: rgba(255, 255, 255, 0.6);
    }

    .msg-content {
      color: #ffffff;
    }
  }
}

.chat-input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;

  .chat-input {
    flex: 1;
    height: 30px;
    min-height: 30px;
    max-height: 80px;
    padding: 6px 10px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    color: #1f1f1f;
    outline: none;
    resize: none;
    line-height: 1.5;
    transition: border-color 0.15s ease;

    &:focus {
      border-color: #1f1f1f;
    }

    &::placeholder {
      color: #c0c0c0;
    }
  }

  .btn-send {
    height: 32px;
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    background-color: #1f1f1f;
    color: #ffffff;
    font-size: 13px;
    font-family: "JetBrainsMono", sans-serif;
    cursor: pointer;
    transition: opacity 0.15s ease;
    flex-shrink: 0;

    &:hover {
      opacity: 0.85;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

// Pain point form modal
.form-panel {
  width: 480px;

  .form-body {
    padding: 16px 24px 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: #4a4a4a;

      .required {
        color: #e74c3c;
      }
    }

    .form-input {
      height: 32px;
      padding: 0 10px;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      font-size: 13px;
      font-family: "JetBrainsMono", sans-serif;
      color: #1f1f1f;
      background-color: #ffffff;
      outline: none;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: #1f1f1f;
      }

      &::placeholder {
        color: #c0c0c0;
      }
    }

    .form-textarea {
      padding: 8px 10px;
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      font-size: 13px;
      font-family: "JetBrainsMono", sans-serif;
      color: #1f1f1f;
      background-color: #ffffff;
      outline: none;
      resize: vertical;
      line-height: 1.5;
      transition: border-color 0.15s ease;

      &:focus {
        border-color: #1f1f1f;
      }

      &::placeholder {
        color: #c0c0c0;
      }
    }
  }
}

// Confirmation modal
.confirm-panel {
  width: 400px;

  .confirm-body {
    padding: 12px 24px 4px;
    font-size: 13px;
    color: #4a4a4a;
    line-height: 1.6;
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

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
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
