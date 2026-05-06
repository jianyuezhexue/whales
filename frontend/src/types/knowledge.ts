export interface KnowledgeFile {
  name: string
  path: string
  isDir: boolean
  size: number
  modTime: string
}

export type SchemaFieldType = "string" | "number" | "date" | "select" | "boolean"

export interface SchemaField {
  id: string
  name: string
  type: SchemaFieldType
  required: boolean
  options?: string[]
}

export interface Schema {
  id: string
  name: string
  fields: SchemaField[]
}

export interface IndexLink {
  title: string
  file: string
}

export interface SearchResult {
  file: string
  snippet: string
}

export interface TreeNode {
  type: "file" | "folder"
  name: string
  path: string
  file?: KnowledgeFile
  children: TreeNode[]
  expanded: boolean
  loading: boolean
}
