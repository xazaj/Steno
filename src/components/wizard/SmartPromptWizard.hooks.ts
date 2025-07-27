import { useState, useEffect, useCallback } from 'react';
import { WizardFormData, WizardValidation, QualityScore, PreviewContent, SceneTemplate } from './SmartPromptWizard.types';

const getInitialFormData = (): WizardFormData => ({
  name: '',
  description: '',
  category: 'general',
  language: 'zh',
  tags: [],
  coreDescription: '',
  selectedTemplate: '',
  peopleNameTags: [],
  brandNameTags: [],
  technicalTermTags: [],
  useFullWidthPunctuation: undefined,
  paragraphSpacing: '',
  specialNotations: [],
  formatTemplate: '',
  keyPhrases: ''
});

const getDefaultFormData = (): WizardFormData => ({
  name: '',
  description: '',
  category: 'general',
  language: 'zh',
  tags: [],
  coreDescription: '这是一场关于产品功能讨论的会议，参与者包括产品经理、设计师和开发工程师，语言风格专业务实。',
  selectedTemplate: '',
  peopleNameTags: ['张经理', '李设计师', '王工程师'],
  brandNameTags: ['用户体验', '产品迭代', '功能优化'],
  technicalTermTags: ['前端开发', '后端接口', 'API设计', '数据库优化'],
  useFullWidthPunctuation: true,
  paragraphSpacing: '双换行',
  specialNotations: [],
  formatTemplate: 'meeting',
  keyPhrases: ''
});

export const useWizardFormData = (editingPrompt?: any) => {
  const [formData, setFormData] = useState<WizardFormData>(getInitialFormData());

  useEffect(() => {
    if (editingPrompt) {
      setFormData(prev => ({
        ...prev,
        name: editingPrompt.name || '',
        description: editingPrompt.description || '',
        category: editingPrompt.category || 'general',
        language: editingPrompt.language || 'zh',
        tags: editingPrompt.tags || [],
      }));
    }
  }, [editingPrompt]);

  const updateFormData = useCallback((updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetCurrentStep = useCallback((currentTab: number) => {
    const stepResetData: Record<number, Partial<WizardFormData>> = {
      1: {
        name: '',
        coreDescription: '',
        selectedTemplate: ''
      },
      2: {
        peopleNameTags: [],
        brandNameTags: [],
        technicalTermTags: []
      },
      3: {
        useFullWidthPunctuation: undefined,
        paragraphSpacing: '',
        specialNotations: [],
        formatTemplate: '',
        keyPhrases: ''
      }
    };

    if (stepResetData[currentTab]) {
      setFormData(prev => ({ ...prev, ...stepResetData[currentTab] }));
    }
  }, []);

  const resetAllData = useCallback(() => {
    setFormData(getInitialFormData());
  }, []);

  const restoreDefaults = useCallback(() => {
    setFormData(getDefaultFormData());
  }, []);

  return { 
    formData, 
    updateFormData, 
    setFormData, 
    resetCurrentStep, 
    resetAllData, 
    restoreDefaults 
  };
};

export const useWizardValidation = (formData: WizardFormData) => {
  const [validation, setValidation] = useState<WizardValidation>({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    overall: false
  });

  useEffect(() => {
    // 第1步：核心描述必须填写且长度大于10
    const step1Valid = formData.coreDescription.trim().length > 10;
    
    // 第2步：至少有一个词汇标签或者用户明确跳过（实际填写过内容才算完成）
    const step2Valid = formData.peopleNameTags.length > 0 || 
                      formData.brandNameTags.length > 0 || 
                      formData.technicalTermTags.length > 0;
    
    // 第3步：用户已经进行过格式配置（不是默认值）
    const step3Valid = formData.useFullWidthPunctuation !== undefined && 
                      formData.paragraphSpacing !== 'auto' && 
                      formData.paragraphSpacing !== '';
    
    // 第4步：依赖第1步完成
    const step4Valid = step1Valid;
    
    // 整体有效：至少第1步完成
    const overallValid = step1Valid;

    setValidation({
      step1: step1Valid,
      step2: step2Valid,
      step3: step3Valid,
      step4: step4Valid,
      overall: overallValid
    });
  }, [formData]);

  return validation;
};

export const useSmartNameGeneration = (formData: WizardFormData) => {
  const generateSmartName = useCallback(() => {
    if (!formData.coreDescription.trim()) return '';

    const description = formData.coreDescription.trim();
    
    // 提取关键词
    const keywords = description.split(/[，。！？；：\s]+/).filter(word => 
      word.length > 1 && !['的', '了', '和', '与', '或', '及'].includes(word)
    );

    // 根据类别生成前缀
    const categoryPrefixes = {
      meeting: '会议',
      interview: '访谈',
      technical: '技术',
      medical: '医疗',
      general: '通用',
      custom: '自定义'
    };

    const prefix = categoryPrefixes[formData.category] || '通用';
    const mainKeywords = keywords.slice(0, 2).join('');
    
    return `${prefix}-${mainKeywords}`;
  }, [formData.coreDescription, formData.category]);

  return generateSmartName;
};

export const useTemplateApplication = (updateFormData: (updates: Partial<WizardFormData>) => void) => {
  const applyTemplate = useCallback((template: SceneTemplate) => {
    updateFormData({
      selectedTemplate: template.id,
      category: template.category,
      tags: [...template.suggestedTags],
      useFullWidthPunctuation: template.formatPreset.useFullWidthPunctuation,
      paragraphSpacing: template.formatPreset.paragraphSpacing,
      specialNotations: [...template.formatPreset.specialNotations]
    });
  }, [updateFormData]);

  return applyTemplate;
};

export const useVocabularyManagement = (formData: WizardFormData, updateFormData: (updates: Partial<WizardFormData>) => void) => {
  const addTag = useCallback((field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>, tag: string) => {
    if (!tag.trim()) return;
    
    const currentTags = formData[field] as string[];
    if (!currentTags.includes(tag.trim())) {
      updateFormData({
        [field]: [...currentTags, tag.trim()]
      });
    }
  }, [formData, updateFormData]);

  const removeTag = useCallback((field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>, index: number) => {
    const currentTags = formData[field] as string[];
    const newTags = currentTags.filter((_, i) => i !== index);
    updateFormData({
      [field]: newTags
    });
  }, [formData, updateFormData]);

  const getSuggestedTags = useCallback((field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>) => {
    const category = formData.category;

    const suggestions: Record<string, Record<string, string[]>> = {
      peopleNameTags: {
        meeting: ['张总', '李经理', 'CEO', 'CTO', '产品负责人'],
        interview: ['受访者', '专家', '用户', '客户', '嘉宾'],
        technical: ['架构师', '开发工程师', 'DevOps', '测试工程师'],
        medical: ['医生', '患者', '专家', '护士'],
        general: ['主持人', '发言人', '参与者']
      },
      brandNameTags: {
        meeting: ['微信', '钉钉', 'Teams', 'Zoom'],
        interview: ['产品名', '品牌名', '公司名'],
        technical: ['GitHub', 'Docker', 'Kubernetes', 'AWS', 'React'],
        medical: ['药品名', '设备名', '检查项目'],
        general: ['常用品牌', '产品名称']
      },
      technicalTermTags: {
        meeting: ['KPI', 'OKR', 'ROI', 'MVP', '季度复盘'],
        interview: ['用户体验', '需求分析', '痛点', '改进建议'],
        technical: ['API', '架构', '性能优化', '代码审查', '部署'],
        medical: ['症状', '诊断', '治疗方案', '用药指导'],
        general: ['专业术语', '行业词汇']
      }
    };

    return suggestions[field]?.[category] || suggestions[field]?.['general'] || [];
  }, [formData.category]);

  return { addTag, removeTag, getSuggestedTags };
};

export const useQualityAssessment = (formData: WizardFormData) => {
  const calculateQualityScore = useCallback((): QualityScore => {
    let descriptionScore = 0;
    let vocabularyScore = 0;
    let formatScore = 0;
    let completenessScore = 0;
    const suggestions: string[] = [];

    // 描述质量评分 (0-30分)
    const description = formData.coreDescription.trim();
    if (description.length > 50) descriptionScore += 15;
    else if (description.length > 20) descriptionScore += 10;
    else if (description.length > 10) descriptionScore += 5;

    if (description.includes('会议') || description.includes('讨论') || description.includes('访谈')) {
      descriptionScore += 5;
    }
    if (/[，。！？；：]/.test(description)) descriptionScore += 5;
    if (description.length < 20) suggestions.push('建议详细描述应用场景，包含具体的业务背景');
    if (description.split(/[，。！？；：\s]+/).length < 5) suggestions.push('描述可以更具体，包含参与者和讨论重点');

    // 词汇管理评分 (0-25分)
    const totalVocab = formData.peopleNameTags.length + formData.brandNameTags.length + formData.technicalTermTags.length;
    if (totalVocab >= 10) vocabularyScore = 25;
    else if (totalVocab >= 6) vocabularyScore = 20;
    else if (totalVocab >= 3) vocabularyScore = 15;
    else if (totalVocab >= 1) vocabularyScore = 10;

    if (totalVocab === 0) suggestions.push('添加专用词汇可显著提升识别准确率');
    else if (totalVocab < 5) suggestions.push('建议添加更多相关的人名、品牌和术语');

    // 格式配置评分 (0-25分)
    formatScore = 15; // 基础分
    if (formData.specialNotations.length > 0) formatScore += 5;
    if (formData.paragraphSpacing !== 'auto') formatScore += 3;
    if (formData.keyPhrases.trim().length > 0) formatScore += 2;

    if (formData.specialNotations.length === 0) suggestions.push('配置特殊标注规则可以突出重要信息');

    // 完整性评分 (0-20分)
    if (formData.name.trim()) completenessScore += 5;
    if (formData.tags.length > 0) completenessScore += 5;
    if (formData.selectedTemplate) completenessScore += 5;
    if (totalVocab > 0) completenessScore += 5;

    if (!formData.name.trim()) suggestions.push('建议设置一个便于识别的名称');

    const total = descriptionScore + vocabularyScore + formatScore + completenessScore;

    return {
      total,
      breakdown: {
        description: descriptionScore,
        vocabulary: vocabularyScore,
        format: formatScore,
        completeness: completenessScore
      },
      suggestions
    };
  }, [formData]);

  return calculateQualityScore;
};

export const usePreviewGeneration = (formData: WizardFormData) => {
  const calculateQualityScore = useQualityAssessment(formData);
  
  const generatePreview = useCallback((): PreviewContent => {
    const qualityScore = calculateQualityScore();
    
    // 生成提示词
    let generatedPrompt = `请将以下音频转录为文本，`;
    
    if (formData.coreDescription.trim()) {
      generatedPrompt += `内容是：${formData.coreDescription}。`;
    }

    // 添加词汇要求
    const allVocab = [
      ...formData.peopleNameTags,
      ...formData.brandNameTags,
      ...formData.technicalTermTags
    ];
    
    if (allVocab.length > 0) {
      generatedPrompt += `\n\n请特别注意以下专用词汇的准确识别：\n`;
      if (formData.peopleNameTags.length > 0) {
        generatedPrompt += `人名：${formData.peopleNameTags.join('、')}\n`;
      }
      if (formData.brandNameTags.length > 0) {
        generatedPrompt += `品牌/产品：${formData.brandNameTags.join('、')}\n`;
      }
      if (formData.technicalTermTags.length > 0) {
        generatedPrompt += `专业术语：${formData.technicalTermTags.join('、')}\n`;
      }
    }

    // 添加格式要求
    generatedPrompt += `\n格式要求：\n`;
    generatedPrompt += `- 使用${formData.useFullWidthPunctuation ? '全角' : '半角'}标点符号\n`;
    
    const spacingLabels = {
      auto: '智能分段',
      speaker: '按发言人分段',
      topic: '按主题分段',
      qa: '问答格式',
      time: '按时间分段'
    };
    generatedPrompt += `- 分段方式：${spacingLabels[formData.paragraphSpacing as keyof typeof spacingLabels] || '智能分段'}\n`;

    if (formData.specialNotations.length > 0) {
      generatedPrompt += `- 特殊标注：\n`;
      formData.specialNotations.forEach(notation => {
        generatedPrompt += `  - "${notation.trigger}" → "${notation.format}"\n`;
      });
    }

    if (formData.keyPhrases.trim()) {
      generatedPrompt += `\n关键表述示例：${formData.keyPhrases}`;
    }

    // 生成示例输出
    const exampleOutput = generateExampleOutput(formData);

    return {
      generatedPrompt,
      exampleOutput,
      qualityScore
    };
  }, [formData, calculateQualityScore]);

  return generatePreview;
};

const generateExampleOutput = (formData: WizardFormData): string => {
  const category = formData.category;
  const examples = {
    meeting: `会议时间：2024年3月15日\n参与人员：${formData.peopleNameTags.slice(0, 2).join('、') || '张经理、李总监'}\n\n【讨论议题】\n本次会议主要讨论了第一季度的业务进展和下季度规划。\n\n【决策】\n确定了新产品的上线时间表。\n\n【待办】\n1. 完成需求文档整理\n2. 安排开发资源`,
    
    interview: `Q: 您对我们产品的整体体验如何？\nA: 整体来说${formData.brandNameTags[0] || '产品'}的用户体验不错，但在${formData.technicalTermTags[0] || '某些功能'}方面还有改进空间。\n\nQ: 具体有什么建议？\nA: 建议优化加载速度，提升用户满意度。`,
    
    technical: `【技术问题】\n当前${formData.technicalTermTags[0] || 'API'}接口在高并发场景下响应较慢。\n\n【解决方案】\n1. 引入缓存机制\n2. 优化数据库查询\n3. 考虑使用${formData.technicalTermTags[1] || '负载均衡'}`,
    
    medical: `【症状】\n患者${formData.peopleNameTags[0] || '李先生'}主诉胸闷气短，持续3天。\n\n【诊断】\n初步诊断为轻度心律不齐。\n\n【治疗方案】\n1. 建议规律作息\n2. 适当运动\n3. 定期复查`,
    
    general: formData.coreDescription || '这是转录结果的示例内容，会根据您的配置进行格式化处理。'
  };

  return examples[category as keyof typeof examples] || examples.general;
};

export const useWizardNavigation = () => {
  const [currentTab, setCurrentTab] = useState(1);

  const goToNext = useCallback(() => {
    setCurrentTab(prev => Math.min(prev + 1, 4));
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentTab(prev => Math.max(prev - 1, 1));
  }, []);

  const goToTab = useCallback((tab: number) => {
    setCurrentTab(Math.max(1, Math.min(tab, 4)));
  }, []);

  const canGoNext = useCallback((validation: WizardValidation) => {
    switch (currentTab) {
      case 1: return validation.step1;
      case 2: return validation.step2;
      case 3: return validation.step3;
      case 4: return validation.step4;
      default: return false;
    }
  }, [currentTab]);

  return {
    currentTab,
    goToNext,
    goToPrevious,
    goToTab,
    canGoNext
  };
};