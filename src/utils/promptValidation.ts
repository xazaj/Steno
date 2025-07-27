import { PromptCategory } from '../types/prompt';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  suggestions: string[];
  warnings: string[];
}

export interface PromptAnalysis {
  wordCount: number;
  hasSpecificTerms: boolean;
  hasProperNouns: boolean;
  categoryAlignment: number;
  completeness: number;
}

// Common technical terms by category
const CATEGORY_KEYWORDS: Record<PromptCategory, string[]> = {
  general: ['会议', '讨论', '对话', '交流', '沟通'],
  meeting: ['议程', '决议', '行动项', '跟进', '会议纪要', '讨论要点'],
  interview: ['采访', '访谈', '问答', '嘉宾', '主持人'],
  technical: ['API', '算法', '架构', '代码', '开发', '测试', '部署', '系统'],
  medical: ['诊断', '治疗', '症状', '药物', '患者', '医生', '临床'],
  custom: []
};

// Sensitive terms that might indicate quality issues
const QUALITY_INDICATORS = {
  vague: ['东西', '那个', '这个', '什么的', '之类的', '等等'],
  specific: ['具体', '详细', '明确', '精确', '准确'],
  professional: ['专业', '行业', '领域', '技术', '标准']
};

export class PromptValidator {
  static validateAudioTopic(topic: string, category: PromptCategory): ValidationResult {
    const suggestions: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    
    // Basic length check
    if (topic.length < 10) {
      warnings.push('主题描述过于简短，建议至少包含10个字符');
    } else if (topic.length > 20) {
      score += 20;
    }
    
    // Check for vague terms
    const vagueness = QUALITY_INDICATORS.vague.filter(term => topic.includes(term));
    if (vagueness.length > 0) {
      warnings.push(`避免使用模糊词汇：${vagueness.join('、')}`);
      suggestions.push(`使用更具体的描述，如"产品功能讨论"而非"讨论一些东西"`);
    } else {
      score += 20;
    }
    
    // Check category alignment
    const categoryKeywords = CATEGORY_KEYWORDS[category] || [];
    const hasRelevantKeywords = categoryKeywords.some((keyword: string) => topic.includes(keyword));
    if (hasRelevantKeywords) {
      score += 20;
    } else if (categoryKeywords.length > 0) {
      suggestions.push(`考虑包含${category}类别相关的关键词：${categoryKeywords.slice(0, 3).join('、')}`);
    }
    
    // Check for specificity indicators
    const hasSpecific = QUALITY_INDICATORS.specific.some(term => topic.includes(term));
    if (hasSpecific) {
      score += 20;
    }
    
    // Check for context information
    const contextPatterns = [
      /关于.*的/, /一场.*/, /.*会议/, /.*讨论/, /.*主题/, /.*内容/
    ];
    const hasContext = contextPatterns.some(pattern => pattern.test(topic));
    if (hasContext) {
      score += 20;
    } else {
      suggestions.push(`尝试包含上下文信息，如"关于...的会议"或"一场...讲座"`);
    }
    
    return {
      isValid: topic.length >= 10,
      score: Math.min(score, 100),
      suggestions,
      warnings
    };
  }
  
  static validateSpecializedTerms(terms: string): ValidationResult {
    const suggestions: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    
    if (!terms.trim()) {
      warnings.push('建议添加专用词汇以提高识别准确率');
      return { isValid: false, score: 0, suggestions, warnings };
    }
    
    // Split by common delimiters
    const termList = terms.split(/[,，、\n]/).map(t => t.trim()).filter(t => t.length > 0);
    
    // Score based on number of terms
    if (termList.length >= 5) {
      score += 40;
    } else if (termList.length >= 3) {
      score += 30;
    } else if (termList.length >= 1) {
      score += 20;
    }
    
    // Check for variety in term types
    const hasChineseNames = termList.some(term => /^[\u4e00-\u9fa5]{2,4}$/.test(term));
    const hasEnglishTerms = termList.some(term => /^[A-Za-z]+$/.test(term));
    const hasAcronyms = termList.some(term => /^[A-Z]{2,6}$/.test(term));
    const hasBrands = termList.some(term => term.includes('公司') || term.includes('App') || term.includes('项目'));
    
    let varietyScore = 0;
    if (hasChineseNames) varietyScore += 15;
    if (hasEnglishTerms) varietyScore += 15;
    if (hasAcronyms) varietyScore += 15;
    if (hasBrands) varietyScore += 15;
    
    score += varietyScore;
    
    // Provide suggestions based on missing types
    if (!hasAcronyms && (hasEnglishTerms || terms.includes('技术') || terms.includes('系统'))) {
      suggestions.push('考虑添加常用缩写词，如API、UI、AI等');
    }
    
    if (!hasChineseNames && terms.length > 20) {
      suggestions.push('如果涉及人名或地名，建议添加以提高准确率');
    }
    
    // Check for formatting
    const wellFormatted = termList.every(term => term.length > 0 && !term.includes('  '));
    if (!wellFormatted) {
      warnings.push('建议使用逗号分隔词汇，避免多余空格');
    } else {
      score += 20;
    }
    
    return {
      isValid: termList.length > 0,
      score: Math.min(score, 100),
      suggestions,
      warnings
    };
  }
  
  static validateFormatRequirements(format: string): ValidationResult {
    const suggestions: string[] = [];
    const warnings: string[] = [];
    let score = 0;
    
    if (format.length < 5) {
      warnings.push('格式要求过于简单，建议详细说明');
      return { isValid: false, score: 0, suggestions, warnings };
    }
    
    // Check for punctuation specification
    if (format.includes('标点') || format.includes('punctuation')) {
      score += 25;
    } else {
      suggestions.push(`建议明确标点符号要求，如"使用中文全角标点符号"`);
    }
    
    // Check for paragraph formatting
    if (format.includes('段落') || format.includes('paragraph') || format.includes('空行')) {
      score += 25;
    }
    
    // Check for capitalization rules
    if (format.includes('大写') || format.includes('capitalization') || format.includes('缩写')) {
      score += 25;
    }
    
    // Check for language specification
    if (format.includes('中文') || format.includes('English') || format.includes('英文')) {
      score += 25;
    } else {
      suggestions.push('建议明确语言要求');
    }
    
    return {
      isValid: format.length >= 5,
      score,
      suggestions,
      warnings
    };
  }
  
  static analyzePromptQuality(data: {
    name: string;
    audioTopic: string;
    peopleNames: string;
    brandNames: string;
    technicalTerms: string;
    formatRequirements: string;
    keyPhrases: string;
    category: PromptCategory;
  }): PromptAnalysis & { overallScore: number; recommendations: string[] } {
    
    const topicValidation = this.validateAudioTopic(data.audioTopic, data.category);
    const termsValidation = this.validateSpecializedTerms(
      [data.peopleNames, data.brandNames, data.technicalTerms].join(', ')
    );
    const formatValidation = this.validateFormatRequirements(data.formatRequirements);
    
    const analysis: PromptAnalysis = {
      wordCount: data.audioTopic.length + data.peopleNames.length + data.brandNames.length + data.technicalTerms.length,
      hasSpecificTerms: [data.peopleNames, data.brandNames, data.technicalTerms].some(field => field.trim().length > 0),
      hasProperNouns: data.peopleNames.trim().length > 0 || data.brandNames.trim().length > 0,
      categoryAlignment: topicValidation.score / 100,
      completeness: data.keyPhrases.trim().length > 0 ? 1 : 0.8
    };
    
    // Calculate overall score
    const weights = {
      topic: 0.3,
      terms: 0.4,
      format: 0.2,
      completeness: 0.1
    };
    
    const overallScore = Math.round(
      topicValidation.score * weights.topic +
      termsValidation.score * weights.terms +
      formatValidation.score * weights.format +
      (analysis.completeness * 100) * weights.completeness
    );
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (topicValidation.suggestions.length > 0) {
      recommendations.push(...topicValidation.suggestions);
    }
    
    if (termsValidation.suggestions.length > 0) {
      recommendations.push(...termsValidation.suggestions);
    }
    
    if (formatValidation.suggestions.length > 0) {
      recommendations.push(...formatValidation.suggestions);
    }
    
    if (!analysis.hasSpecificTerms) {
      recommendations.push('添加专用词汇是提升识别准确率的关键');
    }
    
    if (data.keyPhrases.trim().length === 0) {
      recommendations.push('考虑添加关键句预览以进一步提升效果');
    }
    
    return {
      ...analysis,
      overallScore,
      recommendations: recommendations.slice(0, 3) // Limit to top 3
    };
  }
  
  static generateSmartSuggestions(category: PromptCategory, _currentContent: string): {
    topicSuggestions: string[];
    termSuggestions: string[];
    formatSuggestions: string[];
  } {
    const categoryKeywords = CATEGORY_KEYWORDS[category] || [];
    
    const topicSuggestions = [
      `一场关于${categoryKeywords[0] || '专业内容'}的讨论`,
      `${category === 'meeting' ? '公司内部' : '专业'}${categoryKeywords[0] || '主题'}会议`,
      `关于${categoryKeywords.slice(0, 2).join('和') || '相关主题'}的${category === 'interview' ? '访谈' : '讲座'}`
    ].filter((_, index) => index < 3);
    
    const termSuggestions = categoryKeywords.concat([
      'API', 'UI', 'AI', 'CEO', 'CTO', 'KPI', 'ROI'
    ]).slice(0, 6);
    
    const formatSuggestions = [
      '使用中文全角标点符号（，。？）。段落之间请空一行。',
      'Use proper English punctuation. Keep paragraphs separated.',
      '保留英文缩写的大写格式。使用标准中文表达。'
    ];
    
    return {
      topicSuggestions,
      termSuggestions,
      formatSuggestions
    };
  }
}