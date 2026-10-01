import type { Component } from 'vue';

export type ToolCategoryKey =
  | 'dev'
  | 'converter'
  | 'security'
  | 'network'
  | 'text'
  | 'pdf'
  | 'media'
  | 'calc';

export interface Tool {
  name: string
  path: string
  description: string
  keywords: string[]
  component: () => Promise<Component>
  icon: Component
  redirectFrom?: string[]
  isNew: boolean
  createdAt?: Date
}

export interface ToolCategory {
  name: ToolCategoryKey | string
  components: Tool[]
}

export type ToolWithCategory = Tool & { category: ToolCategoryKey | string };

