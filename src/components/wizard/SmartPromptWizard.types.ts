import { PromptTemplate, PromptCategory, PromptLanguage } from '../../types/prompt';

export interface SmartPromptWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => void;
  editingPrompt?: PromptTemplate | null;
}

export interface WizardFormData {
  name: string;
  description: string;
  category: PromptCategory;
  language: PromptLanguage;
  tags: string[];
  coreDescription: string;
  selectedTemplate: string;
  peopleNameTags: string[];
  brandNameTags: string[];
  technicalTermTags: string[];
  useFullWidthPunctuation: boolean | undefined;
  paragraphSpacing: string;
  specialNotations: { trigger: string; format: string }[];
  formatTemplate: string;
  keyPhrases: string;
}

export interface WizardValidation {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
  overall: boolean;
}

export interface SceneTemplate {
  id: string;
  label: string;
  description: string;
  category: PromptCategory;
  suggestedTags: string[];
  formatPreset: {
    useFullWidthPunctuation: boolean;
    paragraphSpacing: string;
    specialNotations: { trigger: string; format: string }[];
  };
}

export interface WizardTab {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  gradient: string;
  description: string;
  detailedDescription: string;
  tips: string[];
  examples: string[];
}

export interface CategoryOption {
  value: PromptCategory;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

export interface FormatTemplate {
  id: string;
  name: string;
  description: string;
  config: {
    useFullWidthPunctuation: boolean;
    paragraphSpacing: string;
    specialNotations: { trigger: string; format: string }[];
  };
}

export interface ParagraphSpacingOption {
  value: string;
  label: string;
  description: string;
}

export interface VocabularyTabType {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>;
}

export interface QualityScore {
  total: number;
  breakdown: {
    description: number;
    vocabulary: number;
    format: number;
    completeness: number;
  };
  suggestions: string[];
}

export interface PreviewContent {
  generatedPrompt: string;
  exampleOutput: string;
  qualityScore: QualityScore;
}