export type PromptCategory = 'general' | 'meeting' | 'interview' | 'medical' | 'technical' | 'custom';
export type PromptLanguage = 'zh' | 'en' | 'auto';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: PromptCategory;
  language: PromptLanguage;
  is_built_in: boolean;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  usage_count: number;
  is_active: boolean;
}

export interface PromptManagerState {
  prompts: PromptTemplate[];
  selectedCategory: string;
  selectedLanguage: string;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

export interface CreatePromptData {
  name: string;
  content: string;
  category: string;
  language: string;
  description?: string;
  tags: string[];
}

export const CATEGORY_NAMES = {
  general: '通用',
  meeting: '会议',
  interview: '采访',
  medical: '医疗',
  technical: '技术',
  custom: '自定义'
} as const;

export const CATEGORY_COLORS = {
  general: 'bg-blue-100 text-blue-800',
  meeting: 'bg-green-100 text-green-800',
  interview: 'bg-purple-100 text-purple-800',
  medical: 'bg-red-100 text-red-800',
  technical: 'bg-yellow-100 text-yellow-800',
  custom: 'bg-gray-100 text-gray-800'
} as const;