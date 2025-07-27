import { 
  DocumentTextIcon,
  TagIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BeakerIcon,
  HeartIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { PromptCategory } from '../../types/prompt';

export const SCENE_TEMPLATES = [
  {
    id: 'meeting',
    label: '💼 会议纪要',
    description: '适用于各类会议记录和讨论',
    category: 'meeting' as PromptCategory,
    suggestedTags: ['KPI', 'ROI', '季度', '复盘', '决策', '行动项'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'speaker',
      specialNotations: [
        { trigger: '决策', format: '【决策】' },
        { trigger: '待办', format: '【待办】' }
      ]
    }
  },
  {
    id: 'interview',
    label: '🎓 客户访谈',
    description: '用户访谈、需求调研、客户反馈',
    category: 'interview' as PromptCategory,
    suggestedTags: ['用户体验', '需求', '痛点', '建议', '满意度'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'qa',
      specialNotations: [
        { trigger: '问题', format: 'Q:' },
        { trigger: '回答', format: 'A:' }
      ]
    }
  },
  {
    id: 'medical',
    label: '🩺 医疗问诊',
    description: '医患对话、诊疗记录、病例讨论',
    category: 'interview' as PromptCategory,
    suggestedTags: ['症状', '诊断', '治疗', '药物', '复查', '建议'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'topic',
      specialNotations: [
        { trigger: '症状', format: '【症状】' },
        { trigger: '诊断', format: '【诊断】' },
        { trigger: '治疗', format: '【治疗方案】' }
      ]
    }
  },
  {
    id: 'technical',
    label: '🔧 技术讨论',
    description: '技术评审、架构设计、代码审查',
    category: 'technical' as PromptCategory,
    suggestedTags: ['架构', 'API', '性能', '优化', '部署', '测试'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'topic',
      specialNotations: [
        { trigger: '问题', format: '【技术问题】' },
        { trigger: '解决方案', format: '【解决方案】' }
      ]
    }
  },
  {
    id: 'education',
    label: '📚 课程培训',
    description: '培训课程、知识分享、学习记录',
    category: 'general' as PromptCategory,
    suggestedTags: ['知识点', '重点', '案例', '练习', '总结'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'topic',
      specialNotations: [
        { trigger: '重点', format: '【重点】' },
        { trigger: '案例', format: '【案例】' }
      ]
    }
  },
  {
    id: 'podcast',
    label: '🎤 播客转录',
    description: '播客、访谈节目、音频内容',
    category: 'general' as PromptCategory,
    suggestedTags: ['嘉宾', '主持人', '话题', '观点', '互动'],
    formatPreset: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'speaker',
      specialNotations: [
        { trigger: '主持人', format: '【主持人】' },
        { trigger: '嘉宾', format: '【嘉宾】' }
      ]
    }
  }
];

export const WIZARD_TABS = [
  {
    id: 1,
    title: '核心描述',
    subtitle: '描述应用场景和音频内容',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-blue-600',
    description: '定义提示词的核心应用场景',
    detailedDescription: '请详细描述这个提示词的应用场景或音频内容。系统会根据您的描述智能生成名称、推荐相关词汇，并预设合适的格式。这是创建高质量提示词的关键第一步。',
    tips: [
      '描述要具体详细，如"第三季度产品营销复盘会议"比"会议记录"更有效',
      '包含参与者信息，如"产品经理、市场总监参与的..."',
      '提及专业领域和讨论重点，帮助系统智能预设相关内容',
      '可以选择预设场景模板，系统会自动为您填充相关配置'
    ],
    examples: [
      '关于用户增长策略的产品团队季度复盘会议',
      '心血管疾病诊疗的医患对话记录',
      '微服务架构设计的技术评审会议'
    ]
  },
  {
    id: 2,
    title: '关键词工厂',
    subtitle: '智能管理专用词汇和术语',
    icon: TagIcon,
    gradient: 'from-emerald-500 to-teal-500',
    description: '收录和管理音频中的专有名词',
    detailedDescription: '通过标签化输入系统，轻松管理人名、品牌、术语等专用词汇。系统会根据您的核心描述智能推荐相关词汇，显著提升识别准确率。',
    tips: [
      '使用标签输入，每个词汇独立管理，支持快速添加和删除',
      '系统会根据场景描述智能推荐相关词汇供您选择',
      '可在人名地名、品牌产品、行业术语间快速切换',
      '输入时支持联想功能，提高词汇收集效率'
    ],
    examples: [
      '人名：张伟、李静、Dr.Smith、王产品经理',
      '品牌：微信、ChatGPT、阿里云、iPhone',
      '术语：KPI、ROI、DAU、机器学习、API'
    ]
  },
  {
    id: 3,
    title: '格式化模板',
    subtitle: '选择和定制输出格式',
    icon: Cog6ToothIcon,
    gradient: 'from-purple-500 to-indigo-500',
    description: '配置转录结果的展示格式',
    detailedDescription: '通过可视化控件和预设模板，快速配置转录结果的格式。包括标点符号、段落划分、特殊标注等设置，确保输出符合您的使用习惯。',
    tips: [
      '选择预设格式模板可一键应用最佳实践配置',
      '使用开关和选择器直观配置各项格式选项',
      '特殊标注支持自定义规则，如【决策】、【待办】等',
      '关键句预览为AI提供识别"锚点"，提升准确率'
    ],
    examples: [
      '会议纪要：按发言人分段，决策事项特殊标注',
      '访谈记录：问答格式，保持对话自然性',
      '课程笔记：按知识点分段，重点内容突出显示'
    ]
  },
  {
    id: 4,
    title: '动态仪表盘',
    subtitle: '预览、编辑和质量评估',
    icon: CheckCircleIcon,
    gradient: 'from-green-500 to-emerald-500',
    description: '智能评估提示词质量并支持快速编辑',
    detailedDescription: '全面展示提示词配置，提供智能质量评分和具体改进建议。支持直接编辑各个模块，无需重新走完整流程。',
    tips: [
      '质量评分提供具体的改进建议而非单纯分数',
      '每个配置模块都支持快速编辑和实时预览',
      '点击编辑按钮可直接修改对应部分内容',
      '90分以上表示配置优秀，可获得最佳识别效果'
    ],
    examples: []
  }
];

export const CATEGORY_OPTIONS = [
  { 
    value: 'general' as PromptCategory, 
    label: '通用场景', 
    description: '适用于日常对话和一般性内容',
    icon: SparklesIcon,
    color: 'from-blue-400 to-blue-500'
  },
  { 
    value: 'meeting' as PromptCategory, 
    label: '会议记录', 
    description: '会议纪要、讨论和决策内容',
    icon: BuildingOfficeIcon,
    color: 'from-green-400 to-green-500'
  },
  { 
    value: 'interview' as PromptCategory, 
    label: '访谈对话', 
    description: '采访、问答和深度对话内容',
    icon: AcademicCapIcon,
    color: 'from-purple-400 to-purple-500'
  },
  { 
    value: 'technical' as PromptCategory, 
    label: '技术讨论', 
    description: '技术分享、编程和专业内容',
    icon: BeakerIcon,
    color: 'from-indigo-400 to-indigo-500'
  },
  { 
    value: 'medical' as PromptCategory, 
    label: '医疗健康', 
    description: '医疗诊断、健康咨询和科普',
    icon: HeartIcon,
    color: 'from-red-400 to-red-500'
  },
  { 
    value: 'custom' as PromptCategory, 
    label: '自定义', 
    description: '其他特定场景或个人需求',
    icon: CubeIcon,
    color: 'from-gray-400 to-gray-500'
  }
];

export const PARAGRAPH_SPACING_OPTIONS = [
  { value: 'auto', label: '智能分段', description: '自动识别语义分段' },
  { value: 'speaker', label: '按发言人', description: '根据说话人切换分段' },
  { value: 'topic', label: '按主题', description: '根据话题变化分段' },
  { value: 'qa', label: '问答格式', description: '问题和回答分别成段' },
  { value: 'time', label: '按时间', description: '每隔一定时间分段' }
];

export const FORMAT_TEMPLATES = [
  {
    id: 'default',
    name: '默认格式',
    description: '标准的文档格式，适合大多数场景',
    config: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'auto',
      specialNotations: []
    }
  },
  {
    id: 'meeting',
    name: '会议纪要',
    description: '适合会议记录，突出决策和行动项',
    config: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'speaker',
      specialNotations: [
        { trigger: '决策', format: '【决策】' },
        { trigger: '待办', format: '【待办】' },
        { trigger: '行动项', format: '【行动项】' }
      ]
    }
  },
  {
    id: 'interview',
    name: '访谈记录',
    description: '问答格式，保持对话的自然性',
    config: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'qa',
      specialNotations: [
        { trigger: '问题', format: 'Q:' },
        { trigger: '回答', format: 'A:' }
      ]
    }
  },
  {
    id: 'technical',
    name: '技术讨论',
    description: '突出技术要点和解决方案',
    config: {
      useFullWidthPunctuation: true,
      paragraphSpacing: 'topic',
      specialNotations: [
        { trigger: '问题', format: '【技术问题】' },
        { trigger: '解决方案', format: '【解决方案】' },
        { trigger: '代码', format: '【代码示例】' }
      ]
    }
  }
];