import React, { useState, useEffect, useRef } from 'react';
import { 
  Cog6ToothIcon, 
  CheckIcon, 
  PlusIcon, 
  SparklesIcon,
  DocumentTextIcon,
  LightBulbIcon,
  AdjustmentsHorizontalIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { Cog6ToothIcon as CogOutlineIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { WizardFormData } from './SmartPromptWizard.types';
import { FORMAT_TEMPLATES, PARAGRAPH_SPACING_OPTIONS } from './SmartPromptWizard.constants';

interface FormatTemplateStepProps {
  formData: WizardFormData;
  onUpdateFormData: (updates: Partial<WizardFormData>) => void;
}

export const FormatTemplateStep: React.FC<FormatTemplateStepProps> = ({
  formData,
  onUpdateFormData
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  const handleTemplateSelect = (templateId: string) => {
    const template = FORMAT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      onUpdateFormData({
        formatTemplate: templateId,
        useFullWidthPunctuation: template.config.useFullWidthPunctuation,
        paragraphSpacing: template.config.paragraphSpacing,
        specialNotations: [...template.config.specialNotations]
      });
    }
  };

  const handleAddSpecialNotation = () => {
    onUpdateFormData({
      specialNotations: [
        ...formData.specialNotations,
        { trigger: '', format: '' }
      ]
    });
  };

  const handleUpdateSpecialNotation = (index: number, field: 'trigger' | 'format', value: string) => {
    const newNotations = [...formData.specialNotations];
    newNotations[index] = { ...newNotations[index], [field]: value };
    onUpdateFormData({ specialNotations: newNotations });
  };

  const handleRemoveSpecialNotation = (index: number) => {
    const newNotations = formData.specialNotations.filter((_, i) => i !== index);
    onUpdateFormData({ specialNotations: newNotations });
  };

  const getCompletionStats = () => {
    const hasBasicSettings = formData.useFullWidthPunctuation !== undefined && formData.paragraphSpacing;
    const hasSpecialNotations = formData.specialNotations.length > 0;
    const hasKeyPhrases = formData.keyPhrases.trim().length > 0;
    const completed = [hasBasicSettings, hasSpecialNotations, hasKeyPhrases].filter(Boolean).length;
    return { completed, total: 3 };
  };

  return (
    <div className="grid grid-cols-12 gap-10 max-w-6xl mx-auto">
      {/* 左栏：核心输入区 */}
      <div className="col-span-7 space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <DocumentTextIcon className="w-5 h-5 text-purple-600" />
            格式化要求示例
          </h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            设置转录结果的格式样式，包括标点符号类型和段落分割方式
          </p>
        </div>

        {/* 标点符号设置 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
              <AdjustmentsHorizontalIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-gray-900">标点符号类型</h4>
              <p className="text-sm text-gray-600 mt-1">选择转录结果中使用的标点符号格式</p>
            </div>
          </div>
          

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onUpdateFormData({ useFullWidthPunctuation: true })}
              className={cn(
                "p-4 text-left rounded-lg border-2 transition-all duration-200",
                formData.useFullWidthPunctuation === true
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="font-medium text-gray-900 mb-1">全角标点</div>
              <div className="text-sm text-gray-600">（，。！？）</div>
              {formData.useFullWidthPunctuation === true && (
                <CheckIcon className="w-4 h-4 text-purple-600 mt-2" />
              )}
            </button>
            <button
              onClick={() => onUpdateFormData({ useFullWidthPunctuation: false })}
              className={cn(
                "p-4 text-left rounded-lg border-2 transition-all duration-200",
                formData.useFullWidthPunctuation === false
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="font-medium text-gray-900 mb-1">半角标点</div>
              <div className="text-sm text-gray-600">(,.!?)</div>
              {formData.useFullWidthPunctuation === false && (
                <CheckIcon className="w-4 h-4 text-purple-600 mt-2" />
              )}
            </button>
          </div>
        </div>

        {/* 段落分割设置 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
              <DocumentTextIcon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-semibold text-gray-900">段落分割方式</h4>
              <p className="text-sm text-gray-600 mt-1">选择转录内容的段落组织和间距格式</p>
            </div>
          </div>


          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between transition-all duration-200 hover:border-gray-300"
            >
              <span className="text-gray-900">
                {PARAGRAPH_SPACING_OPTIONS.find(opt => opt.value === formData.paragraphSpacing)?.label || '选择分割方式'}
              </span>
              <ChevronDownIcon 
                className={cn(
                  "w-5 h-5 text-gray-400 transition-transform duration-200",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {PARAGRAPH_SPACING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onUpdateFormData({ paragraphSpacing: option.value });
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0",
                      formData.paragraphSpacing === option.value && "bg-blue-50 text-blue-700"
                    )}
                  >
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 右栏：辅助填写区域 */}
      <div className="col-span-5">
        <div className="sticky top-8 space-y-5">
          {/* 当前配置 */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-900 text-sm">当前配置</p>
              </div>
              <p className="text-xs text-purple-700">
                已配置 {(formData.useFullWidthPunctuation !== undefined ? 1 : 0) + (formData.paragraphSpacing && formData.paragraphSpacing !== '' ? 1 : 0)} / 2 项格式
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-xs">
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">标点类型:</span>
                  <span className="font-medium text-gray-900">
                    {formData.useFullWidthPunctuation !== undefined ? 
                      (formData.useFullWidthPunctuation ? '全角标点' : '半角标点') : '未设置'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">分段方式:</span>
                  <span className="font-medium text-gray-900">
                    {PARAGRAPH_SPACING_OPTIONS.find(opt => opt.value === formData.paragraphSpacing)?.label || '未设置'}
                  </span>
                </div>
              </div>
              {formData.useFullWidthPunctuation !== undefined && formData.paragraphSpacing && formData.paragraphSpacing !== '' && (
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-600 mb-2 text-xs">预览效果:</div>
                  <div className="bg-gray-50 px-2 py-1.5 rounded text-xs leading-relaxed text-gray-700">
                    {formData.useFullWidthPunctuation ? 
                      '今天的会议很重要，请大家准时参加。' : 
                      'Today\'s meeting is very important, please attend on time.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 快速模板 */}
          <div>
            <h4 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
              <LightBulbIcon className="w-5 h-5 text-amber-600" />
              快速模板
            </h4>
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              选择预设模板快速配置格式
            </p>
            
            <div className="space-y-2.5">
              {FORMAT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    "w-full p-3 text-left rounded-lg border transition-all duration-200 relative",
                    formData.formatTemplate === template.id
                      ? "border-purple-500 bg-purple-50 shadow-sm"
                      : "border-gray-100 hover:border-purple-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 mb-1 text-sm">{template.name}</div>
                      <div className="text-xs text-gray-600 leading-tight">{template.description}</div>
                    </div>
                    {formData.formatTemplate === template.id && (
                      <CheckIcon className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>


          {/* 使用提示 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-4">
            <h5 className="flex items-center gap-2 font-medium text-emerald-900 mb-2 text-sm">
              <LightBulbIcon className="w-4 h-4 text-emerald-600" />
              使用提示
            </h5>
            <ul className="text-xs text-emerald-700 space-y-1 leading-relaxed">
              <li>• 按照Whisper格式化要求配置转录样式</li>
              <li>• 全角标点适用于中文内容，半角标点适用于英文</li>
              <li>• 选择合适的段落分割方式提升可读性</li>
              <li>• 可使用快速模板一键应用常用配置</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};