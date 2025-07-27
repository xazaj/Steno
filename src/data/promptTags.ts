import { PromptCategory } from '../types/prompt';

export interface TagPreset {
  id: string;
  label: string;
  value: string;
  category?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'default';
  icon?: string;
  description?: string;
}

// 音频主题预设标签
export const AUDIO_TOPIC_TAGS: TagPreset[] = [
  // 会议类型
  {
    id: 'meeting-internal',
    label: '内部会议',
    value: '公司内部团队会议，讨论项目进展和工作安排',
    category: 'meeting',
    color: 'primary',
    icon: undefined
  },
  {
    id: 'meeting-client',
    label: '客户会议',
    value: '与客户进行的商务会议，讨论项目需求和合作方案',
    category: 'meeting',
    color: 'primary',
    icon: undefined
  },
  {
    id: 'meeting-brainstorm',
    label: '头脑风暴',
    value: '创意讨论会议，团队成员分享想法和解决方案',
    category: 'meeting',
    color: 'secondary',
    icon: undefined
  },
  {
    id: 'meeting-review',
    label: '项目评审',
    value: '项目阶段性评审会议，总结成果和规划下步工作',
    category: 'meeting',
    color: 'warning',
    icon: undefined
  },

  // 访谈类型
  {
    id: 'interview-job',
    label: '招聘面试',
    value: '人才招聘面试对话，评估候选人能力和适配度',
    category: 'interview',
    color: 'success',
    icon: undefined
  },
  {
    id: 'interview-user',
    label: '用户访谈',
    value: '产品用户访谈，了解用户需求和使用体验',
    category: 'interview',
    color: 'primary',
    icon: undefined
  },
  {
    id: 'interview-expert',
    label: '专家访谈',
    value: '行业专家深度访谈，获取专业见解和建议',
    category: 'interview',
    color: 'secondary',
    icon: undefined
  },

  // 技术类型
  {
    id: 'tech-code-review',
    label: '代码评审',
    value: '技术团队代码评审会议，讨论代码质量和架构设计',
    category: 'technical',
    color: 'primary',
    icon: undefined
  },
  {
    id: 'tech-architecture',
    label: '架构设计',
    value: '系统架构设计讨论，规划技术方案和实现路径',
    category: 'technical',
    color: 'warning',
    icon: undefined
  },
  {
    id: 'tech-training',
    label: '技术培训',
    value: '技术知识分享和培训课程，提升团队技术能力',
    category: 'technical',
    color: 'success',
    icon: undefined
  },

  // 医疗类型
  {
    id: 'medical-consultation',
    label: '医疗咨询',
    value: '医生与患者的诊疗对话，讨论病情和治疗方案',
    category: 'medical',
    color: 'success',
    icon: undefined
  },
  {
    id: 'medical-education',
    label: '医学教育',
    value: '医学知识教学和科普内容，传播健康医疗知识',
    category: 'medical',
    color: 'primary',
    icon: undefined
  },

  // 通用类型
  {
    id: 'general-presentation',
    label: '演讲展示',
    value: '公开演讲或产品展示，向听众传达重要信息',
    category: 'general',
    color: 'secondary',
    icon: undefined
  },
  {
    id: 'general-podcast',
    label: '播客节目',
    value: '播客录音节目，主持人与嘉宾的深度对话',
    category: 'general',
    color: 'primary',
    icon: undefined
  },
  {
    id: 'general-course',
    label: '在线课程',
    value: '在线教育课程录音，教师讲解知识内容',
    category: 'general',
    color: 'success',
    icon: undefined
  }
];

// 🏷️ 专用词汇标签（按类别分组）
export const VOCABULARY_TAGS: Record<string, TagPreset[]> = {
  // 人名相关
  people: [
    { id: 'name-chinese', label: '中文姓名', value: '张伟, 李娜, 王强, 刘洋', color: 'primary', icon: '👤' },
    { id: 'name-english', label: '英文姓名', value: 'John Smith, Sarah Johnson, Michael Brown', color: 'primary', icon: '👨‍💼' },
    { id: 'name-title', label: '职位头衔', value: 'CEO, CTO, 产品经理, 项目总监', color: 'secondary', icon: '👔' },
    { id: 'name-department', label: '部门名称', value: '研发部, 市场部, 人事部, 财务部', color: 'warning', icon: '🏢' }
  ],

  // 技术术语
  technical: [
    { id: 'tech-dev', label: '开发技术', value: 'React, Vue, Node.js, Python, Java', color: 'primary', icon: '💻' },
    { id: 'tech-ai', label: '人工智能', value: '机器学习, 深度学习, 神经网络, GPT, AIGC', color: 'secondary', icon: '🤖' },
    { id: 'tech-cloud', label: '云计算', value: 'AWS, Azure, 阿里云, 腾讯云, Docker', color: 'success', icon: '☁️' },
    { id: 'tech-data', label: '数据相关', value: '大数据, 数据分析, BI, 数据仓库, ETL', color: 'warning', icon: '📊' },
    { id: 'tech-mobile', label: '移动开发', value: 'iOS, Android, React Native, Flutter', color: 'primary', icon: '📱' }
  ],

  // 商业术语
  business: [
    { id: 'biz-metrics', label: '业务指标', value: 'KPI, ROI, GMV, DAU, MAU, LTV', color: 'success', icon: '📈' },
    { id: 'biz-model', label: '商业模式', value: 'B2B, B2C, C2C, SaaS, PaaS', color: 'primary', icon: '💼' },
    { id: 'biz-marketing', label: '市场营销', value: '用户增长, 转化率, 获客成本, 品牌营销', color: 'secondary', icon: '📢' },
    { id: 'biz-finance', label: '财务相关', value: '营收, 利润率, 现金流, 投资回报', color: 'warning', icon: '💰' }
  ],

  // 行业术语
  industry: [
    { id: 'ind-fintech', label: '金融科技', value: '区块链, 数字货币, 支付系统, 风控', color: 'warning', icon: '🏦' },
    { id: 'ind-ecommerce', label: '电商零售', value: '供应链, 库存管理, 物流配送, 客服', color: 'primary', icon: '🛒' },
    { id: 'ind-education', label: '在线教育', value: '学习管理系统, 教学内容, 学员评估', color: 'success', icon: '📚' },
    { id: 'ind-healthcare', label: '医疗健康', value: '远程医疗, 健康监测, 医疗设备, 药物', color: 'secondary', icon: '🏥' }
  ],

  // 公司品牌
  brands: [
    { id: 'brand-tech', label: '科技公司', value: '苹果, 谷歌, 微软, 阿里巴巴, 腾讯', color: 'primary', icon: '🏢' },
    { id: 'brand-startup', label: '创业公司', value: 'OpenAI, Figma, Notion, Slack', color: 'secondary', icon: '🚀' },
    { id: 'brand-product', label: '产品名称', value: 'ChatGPT, iPhone, Windows, 微信, 钉钉', color: 'success', icon: '📦' }
  ]
};

// 格式设置预设
export const FORMAT_PRESETS: TagPreset[] = [
  {
    id: 'format-chinese-standard',
    label: '中文标准',
    value: '使用中文全角标点符号（，。？！）。段落之间请空一行。保留英文缩写的大写格式。',
    color: 'primary',
    icon: '🇨🇳'
  },
  {
    id: 'format-english-standard',
    label: 'English Standard',
    value: 'Use proper English punctuation (, . ? !). Keep paragraphs separated by blank lines. Maintain capitalization for acronyms.',
    color: 'primary',
    icon: '🇺🇸'
  },
  {
    id: 'format-mixed-language',
    label: '中英混合',
    value: '中文使用全角标点，英文使用半角标点。专业术语保持原文格式。段落清晰分隔。',
    color: 'secondary',
    icon: '🌐'
  },
  {
    id: 'format-meeting-minutes',
    label: '会议纪要',
    value: '使用项目符号列出要点。时间格式为 HH:MM。发言人姓名加冒号。重要决议单独成段。',
    color: 'warning',
    icon: undefined
  },
  {
    id: 'format-interview-qa',
    label: '访谈问答',
    value: '问题以"Q:"开头，回答以"A:"开头。保持原始语言风格。重要观点加粗显示。',
    color: 'success',
    icon: '💬'
  },
  {
    id: 'format-technical-doc',
    label: '技术文档',
    value: '代码片段使用代码块格式。技术术语保持英文原文。添加适当的章节标题。',
    color: 'primary',
    icon: '📖'
  }
];

// 关键句预设
export const KEY_PHRASES_PRESETS: TagPreset[] = [
  {
    id: 'phrase-meeting-start',
    label: '会议开场',
    value: '大家好，今天我们开会主要讨论...',
    color: 'primary',
    icon: '🏁'
  },
  {
    id: 'phrase-presentation-start',
    label: '演讲开场',
    value: '欢迎大家参加今天的分享，我将为大家介绍...',
    color: 'secondary',
    icon: undefined
  },
  {
    id: 'phrase-interview-start',
    label: '访谈开场',
    value: '非常感谢您接受我们的访谈，首先请您简单介绍一下...',
    color: 'success',
    icon: undefined
  },
  {
    id: 'phrase-course-start',
    label: '课程开场',
    value: '同学们好，今天这节课我们将学习...',
    color: 'warning',
    icon: undefined
  },
  {
    id: 'phrase-summary',
    label: '总结要点',
    value: '总结一下今天讨论的几个关键点...',
    color: 'primary',
    icon: '📝'
  },
  {
    id: 'phrase-next-steps',
    label: '后续安排',
    value: '接下来我们需要完成以下几项工作...',
    color: 'warning',
    icon: '➡️'
  }
];

// 获取分类标签的辅助函数
export const getTagsByCategory = (category: PromptCategory, type: 'topic' | 'vocabulary'): TagPreset[] => {
  if (type === 'topic') {
    return AUDIO_TOPIC_TAGS.filter(tag => tag.category === category || tag.category === 'general');
  }
  
  // For vocabulary, return all relevant categories
  return Object.values(VOCABULARY_TAGS).flat();
};

// 搜索标签的辅助函数
export const searchTags = (tags: TagPreset[], query: string): TagPreset[] => {
  if (!query.trim()) return tags;
  
  const lowerQuery = query.toLowerCase();
  return tags.filter(tag => 
    tag.label.toLowerCase().includes(lowerQuery) ||
    tag.value.toLowerCase().includes(lowerQuery) ||
    (tag.description && tag.description.toLowerCase().includes(lowerQuery))
  );
};