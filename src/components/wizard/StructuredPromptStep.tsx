import React, { useState } from 'react';
import { SparklesIcon, PlusIcon, DocumentTextIcon, TagIcon, Cog6ToothIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { WizardFormData, SceneTemplate } from './SmartPromptWizard.types';
import { SCENE_TEMPLATES } from './SmartPromptWizard.constants';

interface StructuredPromptStepProps {
  formData: WizardFormData;
  onUpdateFormData: (updates: Partial<WizardFormData>) => void;
  onApplyTemplate: (template: SceneTemplate) => void;
  onGenerateSmartName: () => string;
}

interface PromptStructure {
  sceneDeclaration: string;
  peopleNames: string[];
  organizationNames: string[];
  productNames: string[];
  technicalTerms: string[];
  industryJargon: string[];
  specificConcepts: string[];
  commonSentences: string[];
  formatExamples: string[];
}

export const StructuredPromptStep: React.FC<StructuredPromptStepProps> = ({
  formData,
  onUpdateFormData,
  onApplyTemplate,
  onGenerateSmartName
}) => {
  const [promptStructure, setPromptStructure] = useState<PromptStructure>({
    sceneDeclaration: formData.coreDescription || '',
    peopleNames: formData.peopleNameTags || [],
    organizationNames: [],
    productNames: formData.brandNameTags || [],
    technicalTerms: formData.technicalTermTags || [],
    industryJargon: [],
    specificConcepts: [],
    commonSentences: [],
    formatExamples: []
  });

  const [activeSection, setActiveSection] = useState<string>('scene');

  const handleUpdateStructure = (field: keyof PromptStructure, value: any) => {
    setPromptStructure(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddItem = (field: keyof PromptStructure) => {
    if (Array.isArray(promptStructure[field])) {
      setPromptStructure(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), '']
      }));
    }
  };

  const handleUpdateItem = (field: keyof PromptStructure, index: number, value: string) => {
    if (Array.isArray(promptStructure[field])) {
      const newArray = [...(promptStructure[field] as string[])];
      newArray[index] = value;
      setPromptStructure(prev => ({
        ...prev,
        [field]: newArray
      }));
    }
  };

  const handleRemoveItem = (field: keyof PromptStructure, index: number) => {
    if (Array.isArray(promptStructure[field])) {
      const newArray = (promptStructure[field] as string[]).filter((_, i) => i !== index);
      setPromptStructure(prev => ({
        ...prev,
        [field]: newArray
      }));
    }
  };

  const generateWhisperPrompt = () => {
    return `# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明 (Scene & Domain Declaration)
${promptStructure.sceneDeclaration}

## 2. 核心术语与专有名词 (Core Terminology & Proper Nouns)

### 2.1 人名/机构名/产品名 (Names: People, Organizations, Products)
${promptStructure.peopleNames.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}
${promptStructure.organizationNames.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}
${promptStructure.productNames.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}

### 2.2 行业术语/专业词汇 (Industry Jargon / Technical Terms)
${promptStructure.technicalTerms.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}
${promptStructure.industryJargon.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}

### 2.3 特定概念或口头禅 (Specific Concepts or Catchphrases)
${promptStructure.specificConcepts.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}

## 3. 常用句式与表达范例 (Common Sentences & Expression Examples)
${promptStructure.commonSentences.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}

## 4. 格式化要求示例 (Formatting Requirement Examples)
${promptStructure.formatExamples.filter(item => item.trim()).map(item => `* ${item}`).join('\n')}

# --- 提示词结束 ---`;
  };

  const getCompletionStats = () => {
    const sections = [
      { name: '场景声明', completed: promptStructure.sceneDeclaration.trim().length > 0 },
      { name: '专有名词', completed: [...promptStructure.peopleNames, ...promptStructure.organizationNames, ...promptStructure.productNames].some(item => item.trim()) },
      { name: '专业术语', completed: [...promptStructure.technicalTerms, ...promptStructure.industryJargon, ...promptStructure.specificConcepts].some(item => item.trim()) },
      { name: '表达范例', completed: promptStructure.commonSentences.some(item => item.trim()) },
      { name: '格式要求', completed: promptStructure.formatExamples.some(item => item.trim()) }
    ];
    return {
      completed: sections.filter(s => s.completed).length,
      total: sections.length,
      sections
    };
  };

  const handleTemplateSelect = (template: SceneTemplate) => {
    onApplyTemplate(template);
    // 将模板数据映射到结构化格式
    setPromptStructure(prev => ({
      ...prev,
      sceneDeclaration: `这是一段${template.description}相关的对话内容，语言风格专业。`,
      technicalTerms: template.suggestedTags || []
    }));
  };

  const sections = [
    { id: 'scene', title: '场景声明', icon: DocumentTextIcon, color: 'from-blue-500 to-blue-600' },
    { id: 'names', title: '专有名词', icon: TagIcon, color: 'from-green-500 to-green-600' },
    { id: 'terms', title: '专业术语', icon: Cog6ToothIcon, color: 'from-purple-500 to-purple-600' },
    { id: 'sentences', title: '表达范例', icon: DocumentTextIcon, color: 'from-orange-500 to-orange-600' },
    { id: 'format', title: '格式要求', icon: Cog6ToothIcon, color: 'from-red-500 to-red-600' }
  ];

  return (
    <div className="grid grid-cols-12 gap-12 max-w-6xl mx-auto">
      {/* 左栏：结构化编辑区域 */}
      <div className="col-span-7 space-y-8">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            结构化提示词编辑
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            按照Whisper优化的结构化模板创建专业提示词，提升语音识别准确率
          </p>
        </div>

        {/* 导航栏 */}
        <div className="flex space-x-1 border-b border-gray-200">
          {sections.map((section) => {
            const IconComponent = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200",
                  isActive
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg bg-gradient-to-r",
                  isActive ? section.color : "from-gray-400 to-gray-500"
                )}>
                  <IconComponent className="w-3 h-3 text-white" />
                </div>
                {section.title}
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 min-h-[400px]">
          {activeSection === 'scene' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">场景与领域声明</h4>
              <p className="text-gray-600 mb-4 text-sm">
                用一两句清晰的话语描述音频的核心场景、领域和语言风格
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-blue-900 mb-2">填写指南</h5>
                <p className="text-sm text-blue-800 mb-3">请按照以下格式描述您的音频场景：</p>
                <div className="text-xs text-blue-700 space-y-2">
                  <div><strong>示例1：</strong>这是一场关于第三季度财务报告的董事会电话会议，重点讨论营收、利润和市场预测，语言风格正式严谨。</div>
                  <div><strong>示例2：</strong>这是一次关于新产品发布的营销策略讨论会议，参与者包括产品经理和市场总监，语言风格专业务实。</div>
                  <div><strong>示例3：</strong>这是一场关于数字化转型的技术架构评审会议，内容涉及云原生和微服务架构，语言风格技术化专业。</div>
                </div>
              </div>
              <textarea
                value={promptStructure.sceneDeclaration}
                onChange={(e) => handleUpdateStructure('sceneDeclaration', e.target.value)}
                placeholder="请描述您的音频场景..."
                className="w-full px-4 py-4 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-relaxed"
                rows={6}
              />
            </div>
          )}

          {activeSection === 'names' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">专有名词管理</h4>
              
              {/* 人名 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">人名/职位</h5>
                  <button
                    onClick={() => handleAddItem('peopleNames')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {promptStructure.peopleNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleUpdateItem('peopleNames', index, e.target.value)}
                        placeholder="如：张伟 (Wei Zhang), 首席架构师 (Chief Architect)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleRemoveItem('peopleNames', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 机构名 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">机构/组织名</h5>
                  <button
                    onClick={() => handleAddItem('organizationNames')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {promptStructure.organizationNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleUpdateItem('organizationNames', index, e.target.value)}
                        placeholder="如：云启科技 (Cloud-Native Inc.)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={() => handleRemoveItem('organizationNames', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 产品名 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">产品/技术名</h5>
                  <button
                    onClick={() => handleAddItem('productNames')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {promptStructure.productNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleUpdateItem('productNames', index, e.target.value)}
                        placeholder="如：星尘平台 (Stardust Platform)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => handleRemoveItem('productNames', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'terms' && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">专业术语管理</h4>
              
              {/* 技术术语 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">技术术语/行业词汇</h5>
                  <button
                    onClick={() => handleAddItem('technicalTerms')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {promptStructure.technicalTerms.map((term, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => handleUpdateItem('technicalTerms', index, e.target.value)}
                        placeholder="如：微服务架构 (Microservices Architecture)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleRemoveItem('technicalTerms', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 特定概念 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">特定概念/口头禅</h5>
                  <button
                    onClick={() => handleAddItem('specificConcepts')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {promptStructure.specificConcepts.map((concept, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={concept}
                        onChange={(e) => handleUpdateItem('specificConcepts', index, e.target.value)}
                        placeholder="如：端到端的可观测性 (End-to-end observability)"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleRemoveItem('specificConcepts', index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sentences' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">常用句式与表达范例</h4>
              <p className="text-gray-600 mb-4 text-sm">
                提供1-3个该场景下极具代表性的完整句子，帮助模型适应语言风格
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">句子示例</span>
                <button
                  onClick={() => handleAddItem('commonSentences')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  <PlusIcon className="w-3 h-3" />
                  添加示例
                </button>
              </div>
              <div className="space-y-3">
                {promptStructure.commonSentences.map((sentence, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <textarea
                      value={sentence}
                      onChange={(e) => handleUpdateItem('commonSentences', index, e.target.value)}
                      placeholder="如：我们通过Istio的服务网格能力，实现了无侵入式的金丝雀发布和流量治理。"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      rows={2}
                    />
                    <button
                      onClick={() => handleRemoveItem('commonSentences', index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg mt-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'format' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">格式化要求示例</h4>
              <p className="text-gray-600 mb-4 text-sm">
                如果对数字、日期、货币等格式有特殊要求，在这里给出示例
              </p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">格式要求</span>
                <button
                  onClick={() => handleAddItem('formatExamples')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <PlusIcon className="w-3 h-3" />
                  添加格式
                </button>
              </div>
              <div className="space-y-2">
                {promptStructure.formatExamples.map((example, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={example}
                      onChange={(e) => handleUpdateItem('formatExamples', index, e.target.value)}
                      placeholder="如：版本号: v3.1.4 或 日期格式: YYYY-MM-DD"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => handleRemoveItem('formatExamples', index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右栏：辅助功能区域 */}
      <div className="col-span-5">
        <div className="sticky top-8 space-y-6">
          {/* 完成进度 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-5">
            <div className="flex items-center gap-3 mb-4">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">完成进度</p>
                <p className="text-sm text-blue-700">
                  已完成 {getCompletionStats().completed} / {getCompletionStats().total} 个部分
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {getCompletionStats().sections.map((section, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircleIcon className={cn(
                    "w-4 h-4",
                    section.completed ? "text-green-500" : "text-gray-300"
                  )} />
                  <span className={cn(
                    section.completed ? "text-gray-900" : "text-gray-500"
                  )}>
                    {section.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 快速场景填充 */}
          {activeSection === 'scene' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                常用场景
              </h4>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                点击下方场景快速填充到输入框
              </p>
              
              <div className="space-y-3">
                {[
                  {
                    title: "财务会议",
                    content: "这是一场关于第三季度财务分析的董事会会议，重点讨论营收增长、成本控制和下季度预算规划，语言风格正式严谨。"
                  },
                  {
                    title: "产品评审",
                    content: "这是一次关于新产品功能的设计评审会议，参与者包括产品经理、UI设计师和技术负责人，语言风格专业务实。"
                  },
                  {
                    title: "营销策略",
                    content: "这是一场关于品牌推广和市场营销的策略讨论会议，内容涉及用户增长、渠道投放和ROI分析，语言风格商务专业。"
                  },
                  {
                    title: "技术架构",
                    content: "这是一场关于系统架构升级的技术评审会议，内容涉及微服务改造、性能优化和安全加固，语言风格技术化专业。"
                  },
                  {
                    title: "客户访谈",
                    content: "这是一次关于用户需求调研的客户访谈会议，重点了解用户痛点、产品体验和改进建议，语言风格友好专业。"
                  },
                  {
                    title: "团队汇报",
                    content: "这是一场关于项目进展的团队周报会议，内容包括任务完成情况、遇到的问题和下周计划，语言风格务实高效。"
                  },
                  {
                    title: "培训分享",
                    content: "这是一次关于业务知识或技能提升的内部培训分享，内容具有教育性和实用性，语言风格清晰易懂。"
                  },
                  {
                    title: "商务谈判",
                    content: "这是一场关于合作协议或商务条款的谈判会议，涉及价格、条件和合作细节的讨论，语言风格正式谨慎。"
                  }
                ].map((scene, index) => (
                  <button
                    key={index}
                    onClick={() => handleUpdateStructure('sceneDeclaration', scene.content)}
                    className="w-full p-3 text-left rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-700">
                      {scene.title}
                    </div>
                    <div className="text-xs text-gray-600 leading-tight line-clamp-2">
                      {scene.content}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 其他tab的快速模板 */}
          {activeSection !== 'scene' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                快速模板
              </h4>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                选择场景模板快速填充结构化内容
              </p>
              
              <div className="space-y-3">
                {SCENE_TEMPLATES.slice(0, 4).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-3 text-left rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">{template.label}</div>
                    <div className="text-xs text-gray-600 leading-tight">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 生成的提示词预览 */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
            <h5 className="font-semibold text-gray-900 mb-3 text-sm">📋 提示词预览</h5>
            <div className="bg-white rounded-lg p-3 max-h-40 overflow-y-auto">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                {generateWhisperPrompt()}
              </pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateWhisperPrompt());
              }}
              className="mt-3 w-full px-3 py-2 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              复制提示词
            </button>
          </div>

          {/* 使用提示 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4">
            <h5 className="font-medium text-emerald-900 mb-2 text-sm">💡 使用提示</h5>
            <ul className="text-xs text-emerald-800 space-y-1 leading-relaxed">
              <li>• 按照Whisper优化的结构化模板创建</li>
              <li>• 专有名词是提升识别准确率的关键</li>
              <li>• 提供典型句式帮助模型适应语言风格</li>
              <li>• 可随时预览和复制生成的提示词</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};