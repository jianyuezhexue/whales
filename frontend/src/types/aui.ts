// ============ AUI Field Types (方案A: 字段级定义) ============

export type AuiFieldType = "text" | "number" | "link" | "tag" | "date" | "image" | "boolean" | "longtext"

export interface AuiField {
  id: string
  key: string
  title: string
  type: AuiFieldType
  required: boolean
  description: string
  options?: string[] // for tag/select type
}

// ============ Renderer Types ============

export type AuiRendererType = string

export const BUILTIN_RENDERER_OPTIONS: { value: string; label: string; labelEn: string }[] = [
  { value: "table", label: "数据表格", labelEn: "Data Table" },
  { value: "browser-preview", label: "浏览器预览", labelEn: "Browser Preview" },
  { value: "todo", label: "任务代办", labelEn: "Task Todo" },
]

// ============ AUI Instance ============

export interface AuiInstance {
  id: string
  name: string
  description: string
  rendererType: AuiRendererType

  // 方案A: 字段级定义 (用户编辑界面)
  fields: AuiField[]

  // 方案B: JSON Schema (自动生成)
  jsonSchema: Record<string, any>

  // 示例数据 (用于预览)
  sampleData: any

  // AI 提示词 (用于 AI 对话生成)
  aiPrompt: string

  createdAt: string
  updatedAt: string
}

// ============ Schema Generation (方案A → 方案B) ============

const fieldTypeToJsonSchema: Record<AuiFieldType, () => Record<string, any>> = {
  text: () => ({ type: "string" }),
  number: () => ({ type: "number" }),
  link: () => ({ type: "string", format: "uri" }),
  tag: () => ({ type: "array", items: { type: "string" } }),
  date: () => ({ type: "string", format: "date-time" }),
  image: () => ({ type: "string", format: "uri", "x-display": "image" }),
  boolean: () => ({ type: "boolean" }),
  longtext: () => ({ type: "string", format: "markdown" }),
}

export function generateJsonSchema(fields: AuiField[], rendererType: AuiRendererType): Record<string, any> {
  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const field of fields) {
    properties[field.key] = {
      ...fieldTypeToJsonSchema[field.type](),
      title: field.title,
      description: field.description || undefined,
    }
    if (field.required) {
      required.push(field.key)
    }
  }

  // Different renderers have different data shapes
  if (rendererType === "table") {
    return {
      type: "array",
      items: {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      },
    }
  }

  if (rendererType === "todo") {
    return {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "任务ID" },
          title: { type: "string", description: "任务标题" },
          done: { type: "boolean", description: "是否完成" },
          ...properties,
        },
        required: ["title"],
      },
    }
  }

  // browser-preview: expects { url: string, title?: string }
  if (rendererType === "browser-preview") {
    return {
      type: "object",
      properties: {
        url: { type: "string", format: "uri", description: "要预览的URL" },
        title: { type: "string", description: "页面标题" },
        ...properties,
      },
      required: ["url"],
    }
  }

  return { type: "object", properties, required: required.length > 0 ? required : undefined }
}

// ============ Sample Data Generation ============

export function generateSampleData(fields: AuiField[], rendererType: AuiRendererType): any {
  const sampleRow: Record<string, any> = {}
  for (const field of fields) {
    switch (field.type) {
      case "text":
        sampleRow[field.key] = `${field.title}示例`
        break
      case "number":
        sampleRow[field.key] = 42
        break
      case "link":
        sampleRow[field.key] = "https://example.com"
        break
      case "tag":
        sampleRow[field.key] = [`${field.title}标签`]
        break
      case "date":
        sampleRow[field.key] = new Date().toISOString().slice(0, 10)
        break
      case "image":
        sampleRow[field.key] = "https://via.placeholder.com/150"
        break
      case "boolean":
        sampleRow[field.key] = false
        break
      case "longtext":
        sampleRow[field.key] = `这是一段${field.title}的示例文本。`
        break
    }
  }

  if (rendererType === "table") {
    return [sampleRow, { ...sampleRow }]
  }

  if (rendererType === "todo") {
    return [
      { id: "1", title: "完成需求分析", done: true, ...sampleRow },
      { id: "2", title: "编写技术方案", done: false, ...sampleRow },
      { id: "3", title: "代码实现", done: false, ...sampleRow },
    ]
  }

  if (rendererType === "browser-preview") {
    return { url: "https://example.com", title: "示例页面", ...sampleRow }
  }

  return sampleRow
}