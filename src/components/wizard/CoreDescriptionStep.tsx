import React, { useState } from 'react';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  DocumentTextIcon, 
  GlobeAltIcon,
  RectangleStackIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  CogIcon,
  MegaphoneIcon,
  ServerIcon,
  UserIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  UserGroupIcon
} from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { WizardFormData, SceneTemplate } from './SmartPromptWizard.types';
import { SCENE_TEMPLATES } from './SmartPromptWizard.constants';

interface CoreDescriptionStepProps {
  formData: WizardFormData;
  onUpdateFormData: (updates: Partial<WizardFormData>) => void;
  onApplyTemplate: (template: SceneTemplate) => void;
  onGenerateSmartName: () => string;
}

export const CoreDescriptionStep: React.FC<CoreDescriptionStepProps> = ({
  formData,
  onUpdateFormData,
  onApplyTemplate,
  onGenerateSmartName
}) => {
  const [generatingName, setGeneratingName] = useState(false);

  const handleTemplateSelect = (template: SceneTemplate) => {
    // 一键填充：自动填充名称、描述和类别
    onApplyTemplate(template);
    onUpdateFormData({
      name: template.label.replace(/^[^a-zA-Z\u4e00-\u9fa5]*/, ''), // 移除emoji
      coreDescription: `此提示词适用于${template.description}，重点关注相关内容的准确记录和整理。`,
      category: template.category
    });
  };

  const handleGenerateName = async () => {
    setGeneratingName(true);
    try {
      const generatedName = onGenerateSmartName();
      if (generatedName) {
        onUpdateFormData({ name: generatedName });
      }
    } finally {
      setGeneratingName(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-10 max-w-6xl mx-auto">
      {/* 左栏：核心输入区 */}
      <div className="col-span-7 space-y-6">
        {/* 提示词名称 */}
        <div>
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            提示词名称
          </label>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            请用一句话描述您的音频内容
          </p>
          <div className="relative">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onUpdateFormData({ name: e.target.value })}
              placeholder="如：产品营销复盘会议"
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
            />
            <button
              onClick={handleGenerateName}
              disabled={!formData.coreDescription.trim() || generatingName}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200",
                formData.coreDescription.trim()
                  ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  : "text-gray-300 cursor-not-allowed"
              )}
              title="根据详细描述智能生成名称"
            >
              <SparklesIcon className={cn("w-5 h-5", generatingName && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* 场景与领域声明 */}
        <div>
          <label className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <GlobeAltIcon className="w-5 h-5 text-emerald-600" />
            场景与领域声明 <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            用一两句清晰的话语描述音频的核心场景、领域和语言风格
          </p>
          

          <textarea
            value={formData.coreDescription}
            onChange={(e) => onUpdateFormData({ coreDescription: e.target.value })}
            placeholder="请描述您的音频场景，包括具体情境、语言风格等..."
            className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 leading-relaxed"
            rows={5}
          />
        </div>
      </div>

      {/* 右栏：常用场景预填充 */}
      <div className="col-span-5">
        <div className="sticky top-8 space-y-5">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <RectangleStackIcon className="w-5 h-5 text-purple-600" />
              常用场景
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              点击下方场景快速填充到输入框
            </p>
          </div>
          
          <div className="space-y-2.5">
            {[
              {
                title: "财务会议",
                content: "这是一场关于第三季度财务分析的董事会会议，重点讨论营收增长、成本控制和下季度预算规划，语言风格正式严谨。",
                icon: CurrencyDollarIcon,
                color: "text-green-600"
              },
              {
                title: "产品评审",
                content: "这是一次关于新产品功能的设计评审会议，参与者包括产品经理、UI设计师和技术负责人，语言风格专业务实。",
                icon: CogIcon,
                color: "text-blue-600"
              },
              {
                title: "营销策略",
                content: "这是一场关于品牌推广和市场营销的策略讨论会议，内容涉及用户增长、渠道投放和ROI分析，语言风格商务专业。",
                icon: MegaphoneIcon,
                color: "text-orange-600"
              },
              {
                title: "技术架构",
                content: "这是一场关于系统架构升级的技术评审会议，内容涉及微服务改造、性能优化和安全加固，语言风格技术化专业。",
                icon: ServerIcon,
                color: "text-purple-600"
              },
              {
                title: "客户访谈",
                content: "这是一次关于用户需求调研的客户访谈会议，重点了解用户痛点、产品体验和改进建议，语言风格友好专业。",
                icon: UserIcon,
                color: "text-indigo-600"
              },
              {
                title: "团队汇报",
                content: "这是一场关于项目进展的团队周报会议，内容包括任务完成情况、遇到的问题和下周计划，语言风格务实高效。",
                icon: ClipboardDocumentListIcon,
                color: "text-gray-600"
              },
              {
                title: "培训分享",
                content: "这是一次关于业务知识或技能提升的内部培训分享，内容具有教育性和实用性，语言风格清晰易懂。",
                icon: AcademicCapIcon,
                color: "text-teal-600"
              },
              {
                title: "商务谈判",
                content: "这是一场关于合作协议或商务条款的谈判会议，涉及价格、条件和合作细节的讨论，语言风格正式谨慎。",
                icon: UserGroupIcon,
                color: "text-red-600"
              }
            ].map((scene, index) => {
              const IconComponent = scene.icon;
              return (
              <button
                key={index}
                onClick={() => onUpdateFormData({ coreDescription: scene.content })}
                className="w-full p-3 text-left rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-700 transition-colors duration-200">
                  <IconComponent className={`w-4 h-4 ${scene.color}`} />
                  {scene.title}
                </div>
                <div className="text-xs text-gray-500 leading-tight line-clamp-2">
                  {scene.content}
                </div>
              </button>
              );
            })}
          </div>

          {/* 使用提示 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-4">
            <h5 className="flex items-center gap-2 font-medium text-emerald-900 mb-2 text-sm">
              <LightBulbIcon className="w-4 h-4 text-emerald-600" />
              使用提示
            </h5>
            <ul className="text-xs text-emerald-700 space-y-1 leading-relaxed">
              <li>• 点击上方场景可快速填充到输入框</li>
              <li>• 可基于预设内容进行个性化修改</li>
              <li>• 详细的场景描述有助于提升识别准确率</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};