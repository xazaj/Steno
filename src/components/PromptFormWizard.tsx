import React, { useState, useEffect } from 'react';
import { PromptTemplate, PromptCategory, PromptLanguage } from '../types/prompt';
import { PromptValidator } from '../utils/promptValidation';
import { ContextualHelp, HELP_CONTENT } from './ContextualHelp';
import { SmartTagSelector } from './SmartTagSelector';
import { VocabularyTagSelector } from './VocabularyTagSelector';
import { FormatPresetSelector } from './FormatPresetSelector';
import { AnimatedContainer, StepAnimation, HoverEffect } from './AnimatedContainer';
import { CompactCategorySelector } from './CompactCategorySelector';
import { CompactTagSelector } from './CompactTagSelector';
import { InfoPanel, FeatureInfo, UsageTip, ImportantNote } from './InfoPanel';
import { AUDIO_TOPIC_TAGS, getTagsByCategory, VOCABULARY_TAGS, FORMAT_PRESETS, KEY_PHRASES_PRESETS } from '../data/promptTags';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentTextIcon,
  UserGroupIcon,
  TagIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface PromptFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => void;
  editingPrompt?: PromptTemplate | null;
}

interface PromptFormData {
  name: string;
  description: string;
  category: PromptCategory;
  language: PromptLanguage;
  tags: string[];
  // Whisper-specific fields
  audioTopic: string;
  peopleNames: string;
  brandNames: string;
  technicalTerms: string;
  formatRequirements: string;
  keyPhrases: string;
}

const WIZARD_STEPS = [
  { id: 1, title: '基本信息', icon: DocumentTextIcon, description: '设置提示词名称和类别' },
  { id: 2, title: '音频主题', icon: LightBulbIcon, description: '描述音频的核心内容' },
  { id: 3, title: '专用词汇', icon: TagIcon, description: '添加关键词汇和术语' },
  { id: 4, title: '格式设置', icon: Cog6ToothIcon, description: '定义输出格式要求' },
  { id: 5, title: '预览确认', icon: CheckCircleIcon, description: '检查并保存提示词' }
];

const CATEGORY_OPTIONS: { value: PromptCategory; label: string; description: string }[] = [
  { value: 'general', label: '通用', description: '适用于日常对话和一般内容' },
  { value: 'meeting', label: '会议', description: '会议记录、讨论和决策内容' },
  { value: 'interview', label: '访谈', description: '采访、问答和对话内容' },
  { value: 'technical', label: '技术', description: '技术讨论、编程和专业内容' },
  { value: 'medical', label: '医疗', description: '医疗健康、诊断和科普内容' },
  { value: 'custom', label: '自定义', description: '其他特定场景或个人需求' }
];

export const PromptFormWizard: React.FC<PromptFormWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPrompt
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PromptFormData>({
    name: '',
    description: '',
    category: 'general',
    language: 'zh',
    tags: [],
    audioTopic: '',
    peopleNames: '',
    brandNames: '',
    technicalTerms: '',
    formatRequirements: '使用中文全角标点符号（，。？）。段落之间请空一行。保留英文缩写的大写格式。',
    keyPhrases: ''
  });
  
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [realTimeValidation, setRealTimeValidation] = useState<Record<string, any>>({});
  const [smartSuggestions, setSmartSuggestions] = useState<any>({});
  const [selectedTopicTags, setSelectedTopicTags] = useState<string[]>([]);
  const [selectedVocabTags, setSelectedVocabTags] = useState<string[]>([]);

  useEffect(() => {
    if (editingPrompt) {
      setFormData({
        name: editingPrompt.name,
        description: editingPrompt.description || '',
        category: editingPrompt.category,
        language: editingPrompt.language,
        tags: editingPrompt.tags || [],
        audioTopic: '',
        peopleNames: '',
        brandNames: '',
        technicalTerms: '',
        formatRequirements: '使用中文全角标点符号（，。？）。段落之间请空一行。保留英文缩写的大写格式。',
        keyPhrases: ''
      });
    }
  }, [editingPrompt]);

  useEffect(() => {
    if (currentStep === 5) {
      generatePreviewContent();
    }
    validateCurrentStep();
    updateRealTimeValidation();
    updateSmartSuggestions();
  }, [formData, currentStep]);

  const updateRealTimeValidation = () => {
    const validation: Record<string, any> = {};
    
    validation.audioTopic = PromptValidator.validateAudioTopic(formData.audioTopic, formData.category);
    validation.specializedTerms = PromptValidator.validateSpecializedTerms(
      [formData.peopleNames, formData.brandNames, formData.technicalTerms].join(', ')
    );
    validation.formatRequirements = PromptValidator.validateFormatRequirements(formData.formatRequirements);
    
    setRealTimeValidation(validation);
  };

  const updateSmartSuggestions = () => {
    const suggestions = PromptValidator.generateSmartSuggestions(
      formData.category, 
      formData.audioTopic
    );
    setSmartSuggestions(suggestions);
  };

  const validateCurrentStep = () => {
    const validations: Record<number, boolean> = {};
    
    validations[1] = formData.name.trim().length >= 2;
    validations[2] = formData.audioTopic.trim().length >= 10;
    validations[3] = (formData.peopleNames + formData.brandNames + formData.technicalTerms).trim().length > 0;
    validations[4] = formData.formatRequirements.trim().length >= 5;
    validations[5] = Object.values(validations).slice(0, 4).every(Boolean);
    
    setStepValidation(validations);
  };

  const generatePreviewContent = () => {
    const sections = [];
    
    if (formData.audioTopic) {
      sections.push(`音频核心主题：${formData.audioTopic}`);
    }
    
    const vocabulary = [];
    if (formData.peopleNames) vocabulary.push(`人名/地名/组织名：${formData.peopleNames}`);
    if (formData.brandNames) vocabulary.push(`品牌/产品/项目名：${formData.brandNames}`);
    if (formData.technicalTerms) vocabulary.push(`行业术语/缩写词：${formData.technicalTerms}`);
    
    if (vocabulary.length > 0) {
      sections.push('专用词汇：\n' + vocabulary.join('\n'));
    }
    
    if (formData.formatRequirements) {
      sections.push(`格式要求：${formData.formatRequirements}`);
    }
    
    if (formData.keyPhrases) {
      sections.push(`关键句预览：${formData.keyPhrases}`);
    }
    
    setPreviewContent(sections.join('\n\n'));
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length && stepValidation[currentStep]) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    if (stepValidation[5]) {
      const finalPrompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'> = {
        name: formData.name,
        content: previewContent,
        category: formData.category,
        language: formData.language,
        description: formData.description,
        tags: formData.tags,
        is_built_in: false,
        is_active: true
      };
      onSave(finalPrompt);
      onClose();
    }
  };

  const getQualityScore = () => {
    const analysis = PromptValidator.analyzePromptQuality(formData);
    return analysis.overallScore;
  };

  const getQualityAnalysis = () => {
    return PromptValidator.analyzePromptQuality(formData);
  };

  // 处理音频主题标签选择
  const handleTopicTagSelect = (tags: string[]) => {
    setSelectedTopicTags(tags);
    if (tags.length > 0) {
      // 选择最后一个标签作为主题内容
      const selectedTag = AUDIO_TOPIC_TAGS.find(tag => tag.value === tags[tags.length - 1]);
      if (selectedTag) {
        setFormData({ ...formData, audioTopic: selectedTag.value });
      }
    }
  };

  // 处理自定义音频主题添加
  const handleCustomTopicAdd = (text: string) => {
    setFormData({ ...formData, audioTopic: text });
  };

  // 处理词汇标签变化
  const handleVocabTagsChange = (tags: string[]) => {
    setSelectedVocabTags(tags);
  };

  // 处理词汇字段更新
  const handleVocabFieldUpdate = (field: 'peopleNames' | 'brandNames' | 'technicalTerms', value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-space-y-lg">
            <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-bg-secondary)', border: '1px solid var(--wizard-border-light)' }}>
              <div className="wizard-text-small" style={{ color: 'var(--wizard-text-secondary)' }}>
                创建一个新的提示词模板，设置名称和类别以便后续管理和使用。选择合适的类别可以获得更好的识别效果。
              </div>
            </div>
            
            <div className="max-w-2xl mx-auto wizard-space-y-md">
              {/* 提示词名称 */}
              <div className="wizard-card">
                <label className="wizard-text-label block mb-3">
                  提示词名称 <span style={{ color: 'var(--wizard-primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：产品会议记录、技术访谈、医疗咨询..."
                  className="wizard-input w-full"
                />
                {formData.name.length > 0 && formData.name.length < 2 && (
                  <div className="flex items-center mt-2 wizard-text-micro" style={{ color: '#dc2626' }}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    名称至少需要2个字符
                  </div>
                )}
              </div>

              {/* 使用场景描述 */}
              <div className="wizard-card">
                <label className="wizard-text-label block mb-3">
                  使用场景描述
                  <span className="wizard-text-micro ml-1" style={{ color: 'var(--wizard-text-tertiary)' }}>(可选)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="简要描述该提示词的使用场景和目的..."
                  rows={3}
                  className="wizard-input w-full resize-none"
                  style={{ minHeight: '72px' }}
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="wizard-text-micro" style={{ color: 'var(--wizard-text-tertiary)' }}>
                    这将帮助您更好地管理和区分不同的提示词
                  </div>
                  <div className="wizard-text-micro" style={{ color: 'var(--wizard-text-tertiary)' }}>
                    {formData.description.length}/200
                  </div>
                </div>
              </div>

              {/* 提示词类别 */}
              <div className="wizard-card">
                <CompactCategorySelector
                  selectedCategory={formData.category}
                  onCategoryChange={(category) => setFormData({ ...formData, category })}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="wizard-space-y-lg">
            <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-bg-secondary)', border: '1px solid var(--wizard-border-light)' }}>
              <div className="wizard-text-small" style={{ color: 'var(--wizard-text-secondary)' }}>
                描述音频的核心内容和主题，让AI更好地理解上下文。您可以使用预设标签快速填写，或自定义内容。
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="wizard-space-y-md">
                  {/* 快速标签选择 */}
                  <div className="wizard-card">
                    <CompactTagSelector
                      title="音频主题快选"
                      tags={getTagsByCategory(formData.category, 'topic').map(tag => ({
                        ...tag,
                        id: `topic-${tag.id}`
                      }))}
                      selectedTags={selectedTopicTags}
                      onTagSelect={handleTopicTagSelect}
                      onCustomAdd={handleCustomTopicAdd}
                      multiSelect={false}
                      maxVisible={8}
                    />
                  </div>

                  {/* 自定义描述输入 */}
                  <div className="wizard-card">
                    <label className="wizard-text-label block mb-3">
                      音频核心主题描述 <span style={{ color: 'var(--wizard-primary)' }}>*</span>
                    </label>
                    <textarea
                      value={formData.audioTopic}
                      onChange={(e) => setFormData({ ...formData, audioTopic: e.target.value })}
                      placeholder="描述音频的具体内容和场景..."
                      rows={4}
                      className={`wizard-input w-full resize-none ${
                        realTimeValidation.audioTopic?.isValid === false ? 'border-red-300' :
                        realTimeValidation.audioTopic?.score >= 80 ? 'border-green-400' :
                        ''
                      }`}
                      style={{
                        backgroundColor: realTimeValidation.audioTopic?.isValid === false ? '#fef2f2' :
                                       realTimeValidation.audioTopic?.score >= 80 ? '#f0fdf4' : 'var(--wizard-bg-primary)',
                        minHeight: '96px'
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className={`wizard-text-micro ${
                        realTimeValidation.audioTopic?.isValid === false ? 'text-red-600' :
                        realTimeValidation.audioTopic?.score >= 80 ? 'text-green-600' :
                        ''
                      }`} style={{
                        color: realTimeValidation.audioTopic?.isValid === false ? '#dc2626' :
                               realTimeValidation.audioTopic?.score >= 80 ? '#16a34a' :
                               'var(--wizard-text-tertiary)'
                      }}>
                        {realTimeValidation.audioTopic?.isValid === false ? '需要至少10个字符' :
                         realTimeValidation.audioTopic?.score >= 80 ? '描述质量很好！' :
                         '描述详细度中等'}
                      </div>
                      <div className="wizard-text-micro" style={{ color: 'var(--wizard-text-tertiary)' }}>
                        {formData.audioTopic.length}/200
                      </div>
                    </div>
                  </div>
                </div>

                <div className="wizard-space-y-md">
                  {/* 智能建议 */}
                  {realTimeValidation.audioTopic?.suggestions?.length > 0 && (
                    <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-primary-light)', border: '1px solid #bfdbfe' }}>
                      <div className="wizard-text-label mb-2" style={{ color: 'var(--wizard-primary-dark)' }}>
                        智能建议
                      </div>
                      <div className="wizard-space-y-xs">
                        {realTimeValidation.audioTopic.suggestions.map((suggestion: string, index: number) => (
                          <div key={index} className="flex items-start wizard-text-small" style={{ color: 'var(--wizard-primary-dark)' }}>
                            <span className="mr-2" style={{ color: 'var(--wizard-primary)' }}>•</span>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 写作指南 */}
                  <div className="wizard-card" style={{ backgroundColor: '#fefce8', border: '1px solid #fde68a' }}>
                    <div className="wizard-text-label mb-2" style={{ color: '#a16207' }}>
                      写作指南
                    </div>
                    <div className="wizard-space-y-xs">
                      <div className="wizard-text-small" style={{ color: '#a16207' }}>
                        <strong>具体胜过模糊：</strong>"量子计算研讨会" 比 "科技谈话" 更好
                      </div>
                      <div className="wizard-text-small" style={{ color: '#a16207' }}>
                        <strong>包含关键信息：</strong>场景、参与者、讨论内容
                      </div>
                      <div className="wizard-text-small" style={{ color: '#a16207' }}>
                        <strong>突出专业领域：</strong>明确提及具体行业或领域
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizard-space-y-lg">
            <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-bg-secondary)', border: '1px solid var(--wizard-border-light)' }}>
              <div className="wizard-text-small" style={{ color: 'var(--wizard-text-secondary)' }}>
                添加专用词汇可以显著提升语音识别的准确率。包括人名、地名、品牌名称和专业术语。
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto wizard-space-y-md">
              {/* 人名/地名/组织名 */}
              <div className="wizard-card">
                <div className="wizard-space-y-sm">
                  <CompactTagSelector
                    title="人名/地名/组织名"
                    tags={VOCABULARY_TAGS.people.map(tag => ({
                      id: `people-${tag.id}`,
                      label: tag.label,
                      value: tag.value
                    }))}
                    selectedTags={formData.peopleNames.split(',').map(s => s.trim()).filter(Boolean)}
                    onTagSelect={(tags) => setFormData({ ...formData, peopleNames: tags.join(', ') })}
                    onCustomAdd={(text) => {
                      const current = formData.peopleNames ? formData.peopleNames + ', ' : '';
                      setFormData({ ...formData, peopleNames: current + text });
                    }}
                    maxVisible={6}
                  />
                  <textarea
                    value={formData.peopleNames}
                    onChange={(e) => setFormData({ ...formData, peopleNames: e.target.value })}
                    placeholder="张三、李四、北京、微软..."
                    rows={2}
                    className="wizard-input w-full resize-none"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>

              {/* 品牌/产品/项目名 */}
              <div className="wizard-card">
                <div className="wizard-space-y-sm">
                  <CompactTagSelector
                    title="品牌/产品/项目名"
                    tags={VOCABULARY_TAGS.brands.map(tag => ({
                      id: `brand-${tag.id}`,
                      label: tag.label,
                      value: tag.value
                    }))}
                    selectedTags={formData.brandNames.split(',').map(s => s.trim()).filter(Boolean)}
                    onTagSelect={(tags) => setFormData({ ...formData, brandNames: tags.join(', ') })}
                    onCustomAdd={(text) => {
                      const current = formData.brandNames ? formData.brandNames + ', ' : '';
                      setFormData({ ...formData, brandNames: current + text });
                    }}
                    maxVisible={6}
                  />
                  <textarea
                    value={formData.brandNames}
                    onChange={(e) => setFormData({ ...formData, brandNames: e.target.value })}
                    placeholder="iPhone、ChatGPT、阿里云..."
                    rows={2}
                    className="wizard-input w-full resize-none"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>

              {/* 行业术语/缩写词 */}
              <div className="wizard-card">
                <div className="wizard-space-y-sm">
                  <CompactTagSelector
                    title="行业术语/缩写词"
                    tags={VOCABULARY_TAGS.technical.map(tag => ({
                      id: `tech-${tag.id}`,
                      label: tag.label,
                      value: tag.value
                    }))}
                    selectedTags={formData.technicalTerms.split(',').map(s => s.trim()).filter(Boolean)}
                    onTagSelect={(tags) => setFormData({ ...formData, technicalTerms: tags.join(', ') })}
                    onCustomAdd={(text) => {
                      const current = formData.technicalTerms ? formData.technicalTerms + ', ' : '';
                      setFormData({ ...formData, technicalTerms: current + text });
                    }}
                    maxVisible={6}
                  />
                  <textarea
                    value={formData.technicalTerms}
                    onChange={(e) => setFormData({ ...formData, technicalTerms: e.target.value })}
                    placeholder="API、SaaS、KPI、ROI..."
                    rows={2}
                    className="wizard-input w-full resize-none"
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>

              <div className="wizard-card" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
                <div className="wizard-text-small" style={{ color: '#92400e' }}>
                  <strong>重要提示：</strong>专用词汇越准确，语音识别效果越好。建议添加音频中可能出现的专有名词和术语。
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wizard-space-y-lg">
            <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-bg-secondary)', border: '1px solid var(--wizard-border-light)' }}>
              <div className="wizard-text-small" style={{ color: 'var(--wizard-text-secondary)' }}>
                定义输出格式要求和关键句预览，让转录结果更符合您的需求。
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="wizard-space-y-md">
                  {/* 格式预设选择 */}
                  <div className="wizard-card">
                    <CompactTagSelector
                      title="格式预设"
                      tags={FORMAT_PRESETS.map(preset => ({
                        id: `format-${preset.id}`,
                        label: preset.label,
                        value: preset.value
                      }))}
                      selectedTags={[]}
                      onTagSelect={(tags) => {
                        if (tags.length > 0) {
                          const preset = FORMAT_PRESETS.find(p => p.value === tags[tags.length - 1]);
                          if (preset) {
                            setFormData({ ...formData, formatRequirements: preset.value });
                          }
                        }
                      }}
                      multiSelect={false}
                      maxVisible={6}
                    />
                  </div>

                  {/* 自定义格式要求 */}
                  <div className="wizard-card">
                    <label className="wizard-text-label block mb-3">
                      格式要求 <span style={{ color: 'var(--wizard-primary)' }}>*</span>
                    </label>
                    <textarea
                      value={formData.formatRequirements}
                      onChange={(e) => setFormData({ ...formData, formatRequirements: e.target.value })}
                      placeholder="描述您希望的输出格式..."
                      rows={4}
                      className="wizard-input w-full resize-none"
                      style={{ minHeight: '96px' }}
                    />
                  </div>
                </div>

                <div className="wizard-space-y-md">
                  {/* 关键句预设 */}
                  <div className="wizard-card">
                    <CompactTagSelector
                      title="关键句预设"
                      tags={KEY_PHRASES_PRESETS.map(preset => ({
                        id: `phrase-${preset.id}`,
                        label: preset.label,
                        value: preset.value
                      }))}
                      selectedTags={[]}
                      onTagSelect={(tags) => {
                        if (tags.length > 0) {
                          const preset = KEY_PHRASES_PRESETS.find(p => p.value === tags[tags.length - 1]);
                          if (preset) {
                            const current = formData.keyPhrases ? formData.keyPhrases + '\n' : '';
                            setFormData({ ...formData, keyPhrases: current + preset.value });
                          }
                        }
                      }}
                      multiSelect={false}
                      maxVisible={6}
                    />
                  </div>

                  {/* 关键句输入 */}
                  <div className="wizard-card">
                    <label className="wizard-text-label block mb-3">
                      关键句预览
                      <span className="wizard-text-micro ml-1" style={{ color: 'var(--wizard-text-tertiary)' }}>(可选)</span>
                    </label>
                    <textarea
                      value={formData.keyPhrases}
                      onChange={(e) => setFormData({ ...formData, keyPhrases: e.target.value })}
                      placeholder="添加音频开头或关键句子..."
                      rows={3}
                      className="wizard-input w-full resize-none"
                      style={{ minHeight: '72px' }}
                    />
                  </div>

                  <div className="wizard-card" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
                    <div className="wizard-text-small" style={{ color: '#92400e' }}>
                      <strong>重要提示：</strong>提供关键句可作为AI的"锚点"，大幅提升识别准确率。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        const qualityScore = getQualityScore();
        const qualityAnalysis = getQualityAnalysis();
        return (
          <div className="wizard-space-y-lg max-w-4xl mx-auto">
            {/* 质量评分卡片 */}
            <div className={`wizard-card`} style={{
              backgroundColor: qualityScore >= 80 ? '#f0fdf4' : qualityScore >= 60 ? '#fefce8' : '#fef2f2',
              borderColor: qualityScore >= 80 ? '#bbf7d0' : qualityScore >= 60 ? '#fde68a' : '#fecaca'
            }}>
              <div className="flex items-center justify-between mb-3">
                <div className={`wizard-text-subtitle`} style={{
                  color: qualityScore >= 80 ? '#15803d' : qualityScore >= 60 ? '#a16207' : '#dc2626'
                }}>
                  提示词质量评分
                </div>
                <div className={`text-3xl font-bold`} style={{
                  color: qualityScore >= 80 ? '#16a34a' : qualityScore >= 60 ? '#ca8a04' : '#dc2626'
                }}>
                  {qualityScore}%
                </div>
              </div>
              
              {/* 质量分解 */}
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="wizard-space-y-xs">
                  <div className="flex justify-between wizard-text-small">
                    <span>词汇丰富度:</span>
                    <span className="font-medium">{qualityAnalysis.hasSpecificTerms ? '✓' : '✗'}</span>
                  </div>
                  <div className="flex justify-between wizard-text-small">
                    <span>专有名词:</span>
                    <span className="font-medium">{qualityAnalysis.hasProperNouns ? '✓' : '✗'}</span>
                  </div>
                </div>
                <div className="wizard-space-y-xs">
                  <div className="flex justify-between wizard-text-small">
                    <span>类别匹配度:</span>
                    <span className="font-medium">{Math.round(qualityAnalysis.categoryAlignment * 100)}%</span>
                  </div>
                  <div className="flex justify-between wizard-text-small">
                    <span>完整度:</span>
                    <span className="font-medium">{Math.round(qualityAnalysis.completeness * 100)}%</span>
                  </div>
                </div>
              </div>
              
              <div className={`wizard-text-small mt-3`} style={{
                color: qualityScore >= 80 ? '#15803d' : qualityScore >= 60 ? '#a16207' : '#dc2626'
              }}>
                {qualityScore >= 80 ? '优秀！这个提示词将大大提升识别准确率。' :
                 qualityScore >= 60 ? '不错，但还可以进一步完善专用词汇部分。' :
                 '建议补充更多专用词汇以提升效果。'}
              </div>
              
              {/* 优化建议 */}
              {qualityAnalysis.recommendations.length > 0 && (
                <div className="mt-3 wizard-card" style={{ 
                  backgroundColor: 'var(--wizard-bg-primary)', 
                  border: '1px solid var(--wizard-border-light)' 
                }}>
                  <div className="wizard-text-label mb-2">优化建议</div>
                  <div className="wizard-space-y-xs">
                    {qualityAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start wizard-text-small">
                        <span className="mr-2" style={{ color: 'var(--wizard-primary)' }}>•</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 预览卡片 */}
            <div className="wizard-card">
              <div className="wizard-text-subtitle mb-3">预览生成的提示词</div>
              <div className="wizard-card max-h-64 overflow-y-auto" style={{ 
                backgroundColor: 'var(--wizard-bg-secondary)', 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace' 
              }}>
                <pre className="wizard-text-small whitespace-pre-wrap" style={{ color: 'var(--wizard-text-primary)' }}>
                  {previewContent || '请完善前面的步骤以生成预览'}
                </pre>
              </div>
            </div>

            {/* 使用建议卡片 */}
            <div className="wizard-card" style={{ backgroundColor: 'var(--wizard-primary-light)', border: '1px solid #bfdbfe' }}>
              <div className="wizard-text-subtitle mb-2" style={{ color: 'var(--wizard-primary-dark)' }}>
                使用建议
              </div>
              <div className="wizard-space-y-xs">
                <div className="wizard-text-small" style={{ color: 'var(--wizard-primary-dark)' }}>
                  • 首次使用时，建议先用一小段音频测试效果
                </div>
                <div className="wizard-text-small" style={{ color: 'var(--wizard-primary-dark)' }}>
                  • 如果识别结果不理想，可以根据错误结果补充遗漏的专用词汇
                </div>
                <div className="wizard-text-small" style={{ color: 'var(--wizard-primary-dark)' }}>
                  • 保存后可以在提示词管理中随时编辑和优化
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[85vh] overflow-hidden" style={{ minHeight: '700px' }}>
        {/* macOS Style Layout */}
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div style={{ padding: 'var(--wizard-card-padding)', borderBottom: '1px solid var(--wizard-border-light)' }}>
              <div className="wizard-text-title">
                {editingPrompt ? '编辑提示词' : '创建提示词'}
              </div>
              <div className="wizard-text-small mt-1" style={{ color: 'var(--wizard-text-secondary)' }}>
                专业语音识别向导
              </div>
            </div>

            {/* Steps Navigation */}
            <div className="flex-1" style={{ padding: 'var(--wizard-space-sm)' }}>
              <nav className="wizard-space-y-xs">
                {WIZARD_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = currentStep > step.id;
                  
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      disabled={!stepValidation[step.id] && step.id > currentStep}
                      className={`w-full flex items-center text-left rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'shadow-sm'
                          : isCompleted
                          ? 'hover:bg-green-100'
                          : 'hover:bg-gray-100'
                      }`}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: isActive ? 'var(--wizard-primary)' : isCompleted ? '#f0fdf4' : 'transparent',
                        color: isActive ? 'white' : isCompleted ? '#15803d' : 'var(--wizard-text-secondary)'
                      }}
                    >
                      <div className={`flex items-center justify-center w-6 h-6 rounded-full mr-3`} style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : isCompleted ? '#dcfce7' : 'var(--wizard-bg-tertiary)'
                      }}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <Icon className={`w-4 h-4`} style={{
                            color: isActive ? 'white' : 'var(--wizard-text-secondary)'
                          }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`wizard-text-body font-medium`} style={{
                          color: isActive ? 'white' : isCompleted ? '#15803d' : 'var(--wizard-text-primary)'
                        }}>
                          {step.title}
                        </div>
                        <div className={`wizard-text-micro`} style={{
                          color: isActive ? 'rgba(255,255,255,0.8)' : isCompleted ? '#16a34a' : 'var(--wizard-text-tertiary)'
                        }}>
                          {step.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quality Score */}
            {currentStep === 5 && (
              <div className="p-3 border-t border-gray-200">
                <div className="bg-white rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">质量评分</span>
                    <span className={`text-lg font-bold ${
                      getQualityScore() >= 80 ? 'text-green-600' : 
                      getQualityScore() >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getQualityScore()}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        getQualityScore() >= 80 ? 'bg-green-500' : 
                        getQualityScore() >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${getQualityScore()}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {renderStepContent()}
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              backgroundColor: 'var(--wizard-bg-secondary)', 
              padding: '16px 24px', 
              borderTop: '1px solid var(--wizard-border-light)' 
            }} className="flex justify-between items-center">
              <button
                onClick={currentStep === 1 ? onClose : handlePrevious}
                className="flex items-center rounded-lg transition-colors hover:bg-gray-100"
                style={{
                  padding: '8px 16px',
                  color: 'var(--wizard-text-secondary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--wizard-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--wizard-text-secondary)'}
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                <span className="wizard-text-body">{currentStep === 1 ? '取消' : '上一步'}</span>
              </button>
              
              <div className="flex items-center" style={{ gap: 'var(--wizard-space-sm)' }}>
                {!stepValidation[currentStep] && currentStep < 5 && (
                  <div className="flex items-center wizard-text-small px-3 py-1 rounded-full" style={{
                    color: '#d97706',
                    backgroundColor: '#fef3c7'
                  }}>
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    请完善当前步骤
                  </div>
                )}
                
                {currentStep < WIZARD_STEPS.length ? (
                  <button
                    onClick={handleNext}
                    disabled={!stepValidation[currentStep]}
                    className="flex items-center rounded-lg transition-all duration-200 shadow-sm wizard-text-body font-medium"
                    style={{
                      padding: '8px 24px',
                      backgroundColor: !stepValidation[currentStep] ? 'var(--wizard-border-medium)' : 'var(--wizard-primary)',
                      color: 'white',
                      cursor: !stepValidation[currentStep] ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (stepValidation[currentStep]) {
                        e.currentTarget.style.backgroundColor = 'var(--wizard-primary-dark)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (stepValidation[currentStep]) {
                        e.currentTarget.style.backgroundColor = 'var(--wizard-primary)';
                      }
                    }}
                  >
                    下一步
                    <ChevronRightIcon className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={!stepValidation[5]}
                    className="flex items-center rounded-lg transition-all duration-200 shadow-sm wizard-text-body font-medium"
                    style={{
                      padding: '8px 24px',
                      backgroundColor: !stepValidation[5] ? 'var(--wizard-border-medium)' : '#16a34a',
                      color: 'white',
                      cursor: !stepValidation[5] ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (stepValidation[5]) {
                        e.currentTarget.style.backgroundColor = '#15803d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (stepValidation[5]) {
                        e.currentTarget.style.backgroundColor = '#16a34a';
                      }
                    }}
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    保存提示词
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};