import React, { useState } from 'react';
import { 
  SparklesIcon, 
  UserIcon, 
  BuildingOfficeIcon, 
  CogIcon, 
  PlusIcon, 
  CheckCircleIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';
import { UserIcon as UserOutlineIcon, BuildingOfficeIcon as BuildingOutlineIcon, CogIcon as CogOutlineIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { WizardFormData } from './SmartPromptWizard.types';

interface VocabularyFactoryStepProps {
  formData: WizardFormData;
  onUpdateFormData: (updates: Partial<WizardFormData>) => void;
  onAddTag: (field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>, tag: string) => void;
  onRemoveTag: (field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>, index: number) => void;
  getSuggestedTags: (field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>) => string[];
}

// 行业术语标签集合
const INDUSTRY_TERMS_PACKAGES = [
  {
    label: '金融银行',
    icon: '💰',
    terms: ['风险控制', '资产负债率', '净资产收益率 (ROE)', '市盈率 (P/E)', '流动性风险', '信贷投放', '不良贷款率', '拨备覆盖率', '资本充足率', '同业拆借', '票据贴现', '投资银行业务']
  },
  {
    label: '医疗健康',
    icon: '🏥', 
    terms: ['磨玻璃结节 (GGN)', '实性成分', '纵隔淋巴结', '正电子发射断层扫描 (PET-CT)', '低剂量螺旋CT', '恶性肿瘤 vs. 良性结节', '弥漫性 vs. 局灶性', '钙化', '标准化摄取值 (SUV)', '毫西弗 (mSv)', '影像学表现', '病理特征']
  },
  {
    label: 'IT技术',
    icon: '💻',
    terms: ['微服务架构', '服务网格 (Service Mesh)', '容器编排 (Container Orchestration)', '持续集成/持续部署 (CI/CD)', '金丝雀发布', '蓝绿部署', '可观测性 (Observability)', '基础设施即代码 (IaC)', 'API网关', 'Sidecar模式', 'Kubernetes (K8s)', 'Docker容器']
  },
  {
    label: '制造工业',
    icon: '🏭',
    terms: ['精益生产 (Lean Production)', '六西格玛 (Six Sigma)', '全面质量管理 (TQM)', '准时化生产 (JIT)', '设备综合效率 (OEE)', '供应链管理 (SCM)', '企业资源计划 (ERP)', '制造执行系统 (MES)', '预防性维护', '质量控制点 (QCP)', '工艺流程优化', '自动化生产线']
  },
  {
    label: '电商零售',
    icon: '🛒',
    terms: ['用户获取成本 (CAC)', '客户生命周期价值 (CLV)', '转化率优化 (CRO)', '搜索引擎优化 (SEO)', '社交媒体营销 (SMM)', '精准营销', '全渠道零售', '库存周转率', '毛利率', 'SKU管理', '供应链可视化', '最后一公里配送']
  },
  {
    label: '教育培训',
    icon: '📚',
    terms: ['学习管理系统 (LMS)', '混合式学习 (Blended Learning)', '翻转课堂', '个性化学习', '适应性学习', '学习分析', '教学设计', '课程开发', '学习成果评估', '教育技术 (EdTech)', '在线教育平台', '知识图谱']
  }
];

// 特定概念标签集合
const CONCEPT_PACKAGES = [
  {
    label: '金融概念',
    icon: '💼',
    concepts: ['资金链紧张', '现金流为王', '风险可控前提下', '审慎经营理念', '稳健发展策略', '合规经营底线', '防范系统性风险', '服务实体经济', '普惠金融', '数字化转型', '客户至上原则', '价值投资理念']
  },
  {
    label: '医疗概念',
    icon: '⚕️',
    concepts: ['随访观察', '建议穿刺活检', '影像表现符合', '临床相关性', '多学科会诊 (MDT)', '循证医学', '精准医疗', '个体化治疗', '临床路径', '医疗质量安全', '患者安全第一', '人文关怀']
  },
  {
    label: 'IT概念',
    icon: '⚡',
    concepts: ['端到端的可观测性', '声明式API', '赋能开发者', '云原生架构', '数字化转型', '敏捷开发', 'DevOps文化', '用户体验至上', '数据驱动决策', '技术债务', '架构演进', '开发效能']
  },
  {
    label: '制造概念',
    icon: '🔧',
    concepts: ['持续改进', '零缺陷管理', '安全第一', '绿色制造', '智能制造', '工匠精神', '标准化作业', '全员参与', '客户导向', '成本控制', '效率提升', '创新驱动']
  },
  {
    label: '电商概念',
    icon: '📱',
    concepts: ['用户体验至上', '数据驱动增长', '精准营销', '全域营销', '私域流量', '用户留存', '转化漏斗', '增长黑客', '用户画像', '个性化推荐', '社交电商', '直播带货']
  },
  {
    label: '教育概念',
    icon: '🎓',
    concepts: ['因材施教', '寓教于乐', '启发式教学', '互动式学习', '终身学习', '全人教育', '素质教育', '创新思维', '批判性思维', '协作学习', '项目式学习', '体验式学习']
  }
];

const VOCABULARY_SECTIONS = [
  {
    id: 'terms',
    title: '行业术语/专业词汇',
    subtitle: 'Industry Jargon / Technical Terms',
    description: '领域专业术语、概念全称缩写、容易混淆的同音近音词',
    field: 'technicalTermTags' as const,
    icon: CogIcon,
    outlineIcon: CogOutlineIcon,
    color: 'from-purple-500 to-purple-600',
    placeholder: '微服务架构 (Microservices), 容器编排, principal vs. principle...',
    examples: [
      '微服务架构, 服务网格, 金丝雀发布',
      '正电子发射断层扫描 (PET-CT)',
      'principal vs. principle, aural vs. oral'
    ]
  },
  {
    id: 'concepts',
    title: '特定概念或口头禅',
    subtitle: 'Specific Concepts or Catchphrases',
    description: '项目特定短语、发言人标志性口头禅、场景下的特殊含义词',
    field: 'brandNameTags' as const,
    icon: ChatBubbleLeftRightIcon,
    outlineIcon: CogOutlineIcon,
    color: 'from-emerald-500 to-emerald-600',
    placeholder: '端到端的可观测性, 赋能开发者, 随访观察...',
    examples: [
      '端到端的可观测性 (End-to-end observability)',
      '建议穿刺活检 (Biopsy is recommended)',
      '声明式API (Declarative API)'
    ]
  },
  {
    id: 'names',
    title: '人名/机构名/产品名',
    subtitle: 'Names: People, Organizations, Products',
    description: '人名、职位头衔、公司机构全称简称、产品技术服务名称',
    field: 'peopleNameTags' as const,
    icon: UserIcon,
    outlineIcon: UserOutlineIcon,
    color: 'from-blue-500 to-blue-600',
    placeholder: '张伟 (Wei Zhang), 首席架构师, 协和医院放射科, 星尘平台 (Stardust Platform)...',
    examples: [
      '张伟 (Wei Zhang), 李教授 (Professor Li)',
      '协和医院放射科, 云启科技 (Cloud-Native Inc.)',
      '星尘平台 (Stardust Platform), Kubernetes (K8s)'
    ]
  }
];

export const VocabularyFactoryStep: React.FC<VocabularyFactoryStepProps> = ({
  formData,
  onUpdateFormData,
  onAddTag,
  onRemoveTag,
  getSuggestedTags
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({
    terms: '',
    concepts: '',
    names: ''
  });

  const handleAddTag = (sectionId: string, field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>) => {
    const value = inputValues[sectionId]?.trim();
    if (value && !formData[field].includes(value)) {
      onAddTag(field, value);
      setInputValues(prev => ({ ...prev, [sectionId]: '' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, sectionId: string, field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(sectionId, field);
    }
  };

  // 处理行业标签包的添加 - 直接应用到标签展示区域，不显示在编辑框
  const handleAddIndustryPackage = (packageData: string[], field: keyof Pick<WizardFormData, 'peopleNameTags' | 'brandNameTags' | 'technicalTermTags'>) => {
    const currentTags = formData[field] as string[];
    const newTags = packageData.filter(tag => !currentTags.includes(tag));
    
    // 批量添加到数据，一次性更新所有标签
    if (newTags.length > 0) {
      onUpdateFormData({
        [field]: [...currentTags, ...newTags]
      });
    }
  };

  const getTotalCount = () => {
    return formData.peopleNameTags.length + formData.brandNameTags.length + formData.technicalTermTags.length;
  };

  return (
    <div className="grid grid-cols-12 gap-12 max-w-6xl mx-auto">
      {/* 左栏：主要填写区域 */}
      <div className="col-span-7 space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            核心术语与专有名词
          </h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            按照Whisper优化的结构化模板，添加音频中可能出现的专有名词和专业术语
          </p>
        </div>

        {VOCABULARY_SECTIONS.map((section) => {
          const tags = formData[section.field];
          const IconComponent = section.icon;
          const OutlineIconComponent = section.outlineIcon;
          
          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2.5 rounded-lg bg-gradient-to-r", section.color)}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900">{section.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{section.subtitle}</p>
                  <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                </div>
              </div>

              
              {/* 快捷输入区域 */}
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputValues[section.id] || ''}
                      onChange={(e) => setInputValues(prev => ({ ...prev, [section.id]: e.target.value }))}
                      onKeyDown={(e) => handleKeyDown(e, section.id, section.field)}
                      placeholder="快速添加术语..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => handleAddTag(section.id, section.field)}
                    disabled={!inputValues[section.id]?.trim()}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                      inputValues[section.id]?.trim()
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    添加
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  按回车键快速添加，或点击右侧推荐标签包快速填充
                </p>
              </div>

              {/* 已添加的标签 */}
              {tags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      已收录 ({tags.length})
                    </span>
                    <button
                      onClick={() => onUpdateFormData({ [section.field]: [] })}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-all duration-200"
                    >
                      清空全部
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all duration-200",
                          section.id === 'terms' ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" :
                          section.id === 'concepts' ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" :
                          "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        )}
                      >
                        {tag}
                        <button
                          onClick={() => onRemoveTag(section.field, index)}
                          className="opacity-60 hover:opacity-100 hover:text-red-600 transition-all duration-200 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 空状态 */}
              {tags.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-100 text-center">
                  <OutlineIconComponent className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600 mb-1">暂无
                    {section.id === 'concepts' ? '特定概念' : 
                     section.id === 'names' ? '重要人名' : 
                     section.title.split('/')[0]}词汇
                  </p>
                  <p className="text-xs text-gray-500">
                    点击右侧推荐标签包快速填充，或使用上方输入框手动添加
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 右栏：辅助功能区域 */}
      <div className="col-span-5">
        <div className="sticky top-8 space-y-6">
          {/* 统计信息 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-blue-900 text-sm">词汇统计</p>
              </div>
              <p className="text-xs text-blue-700">已收录 {getTotalCount()} 个核心术语</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {VOCABULARY_SECTIONS.map((section) => {
                let displayName = section.title.split('/')[0];
                if (section.id === 'concepts') {
                  displayName = '特定概念';
                } else if (section.id === 'names') {
                  displayName = '重要人名';
                }
                return (
                  <div key={section.id} className="text-center p-2 bg-white rounded-lg">
                    <div className="font-semibold text-lg text-gray-900">{formData[section.field].length}</div>
                    <div className="text-gray-500 mt-1 text-xs leading-tight">{displayName}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 智能推荐 */}
          <div>
            <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <LightBulbIcon className="w-5 h-5 text-amber-600" />
              智能推荐
            </h4>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              选择行业标签包，直接应用到左侧标签展示区域
            </p>

            <div className="space-y-4">
              {/* 行业术语推荐 */}
              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                    <CogIcon className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 text-sm">行业术语包</h5>
                    <p className="text-xs text-gray-500">选择行业快速添加专业术语</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {INDUSTRY_TERMS_PACKAGES.map((pkg, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddIndustryPackage(pkg.terms, 'technicalTermTags')}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-all duration-200"
                    >
                      <span>{pkg.icon}</span>
                      <span>{pkg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 特定概念推荐 */}
              <div className="bg-white rounded-lg border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600">
                    <ChatBubbleLeftRightIcon className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 text-sm">特定概念包</h5>
                    <p className="text-xs text-gray-500">选择行业快速添加常用概念</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {CONCEPT_PACKAGES.map((pkg, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddIndustryPackage(pkg.concepts, 'brandNameTags')}
                      className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200"
                    >
                      <span>{pkg.icon}</span>
                      <span>{pkg.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 使用提示 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-4">
            <h5 className="flex items-center gap-2 font-medium text-emerald-900 mb-2 text-sm">
              <LightBulbIcon className="w-4 h-4 text-emerald-600" />
              使用提示
            </h5>
            <ul className="text-xs text-emerald-700 space-y-1 leading-relaxed">
              <li>• 点击右侧标签包可快速批量添加专业术语</li>
              <li>• 使用上方小输入框快速添加单个术语</li>
              <li>• 推荐标签包会直接应用到标签展示区域</li>
              <li>• 专有名词是提升识别准确率的关键要素</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};