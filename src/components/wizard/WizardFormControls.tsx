import React, { useState } from 'react';
import { 
  ArrowPathIcon, 
  TrashIcon, 
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { WizardFormData } from './SmartPromptWizard.types';

interface WizardFormControlsProps {
  currentTab: number;
  formData: WizardFormData;
  onResetCurrentStep: () => void;
  onResetAllData: () => void;
  onRestoreDefaults: () => void;
}

const getStepName = (step: number): string => {
  const stepNames = {
    1: '核心描述',
    2: '词汇工厂', 
    3: '格式模板',
    4: '预览仪表盘'
  };
  return stepNames[step as keyof typeof stepNames] || '当前步骤';
};

const getStepFields = (step: number): (keyof WizardFormData)[] => {
  const stepFields = {
    1: ['name', 'coreDescription', 'selectedTemplate'] as (keyof WizardFormData)[],
    2: ['peopleNameTags', 'brandNameTags', 'technicalTermTags'] as (keyof WizardFormData)[],
    3: ['useFullWidthPunctuation', 'paragraphSpacing', 'specialNotations', 'formatTemplate', 'keyPhrases'] as (keyof WizardFormData)[],
    4: [] as (keyof WizardFormData)[]
  };
  return stepFields[step as keyof typeof stepFields] || [];
};

export const WizardFormControls: React.FC<WizardFormControlsProps> = ({
  currentTab,
  formData,
  onResetCurrentStep,
  onResetAllData,
  onRestoreDefaults
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<'current' | 'all' | null>(null);

  const stepName = getStepName(currentTab);
  const stepFields = getStepFields(currentTab);
  
  // 检查当前步骤是否有数据
  const hasCurrentStepData = stepFields.some(field => {
    const value = formData[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value !== undefined;
    return value !== null && value !== undefined;
  });

  // 检查是否有任何数据
  const hasAnyData = Object.entries(formData).some(([key, value]) => {
    if (key === 'category' || key === 'language') return false; // 忽略默认选择
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value !== true; // 默认值检查
    return value !== null && value !== undefined;
  });

  const handleConfirmAction = (action: 'current' | 'all') => {
    if (action === 'current') {
      onResetCurrentStep();
    } else {
      onResetAllData();
    }
    setShowConfirmDialog(null);
    setShowDropdown(false);
  };

  const handleRestoreDefaults = () => {
    onRestoreDefaults();
    setShowDropdown(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          title="表单管理选项"
        >
          <EllipsisHorizontalIcon className="w-4 h-4" />
          <span className="hidden sm:inline">表单管理</span>
        </button>

        {showDropdown && (
          <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* 重置当前步骤 */}
            <button
              onClick={() => setShowConfirmDialog('current')}
              disabled={!hasCurrentStepData || currentTab === 4}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                hasCurrentStepData && currentTab !== 4
                  ? "text-gray-700 hover:bg-gray-50" 
                  : "text-gray-400 cursor-not-allowed"
              )}
            >
              <ArrowPathIcon className="w-4 h-4" />
              <div>
                <div className="font-medium">重置{stepName}</div>
                <div className="text-xs text-gray-500">清空当前步骤的所有输入</div>
              </div>
            </button>

            {/* 分割线 */}
            <div className="h-px bg-gray-100 mx-2 my-1" />

            {/* 恢复默认配置 */}
            <button
              onClick={handleRestoreDefaults}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 text-blue-600" />
              <div>
                <div className="font-medium">恢复默认配置</div>
                <div className="text-xs text-gray-500">应用推荐的表单设置</div>
              </div>
            </button>

            {/* 分割线 */}
            <div className="h-px bg-gray-100 mx-2 my-1" />

            {/* 重置所有数据 */}
            <button
              onClick={() => setShowConfirmDialog('all')}
              disabled={!hasAnyData}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                hasAnyData
                  ? "text-red-600 hover:bg-red-50" 
                  : "text-gray-400 cursor-not-allowed"
              )}
            >
              <TrashIcon className="w-4 h-4" />
              <div>
                <div className="font-medium">重置所有内容</div>
                <div className="text-xs text-gray-500">清空整个表单的所有数据</div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                确认{showConfirmDialog === 'current' ? '重置当前步骤' : '重置所有内容'}
              </h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              {showConfirmDialog === 'current' 
                ? `确定要清空"${stepName}"的所有输入内容吗？此操作不可撤销。`
                : '确定要清空整个表单的所有数据吗？这将删除您在所有步骤中输入的内容，此操作不可撤销。'
              }
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleConfirmAction(showConfirmDialog)}
                className={cn(
                  "px-4 py-2 text-white rounded-lg transition-colors",
                  showConfirmDialog === 'current'
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                确认{showConfirmDialog === 'current' ? '重置' : '清空'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 点击外部关闭下拉菜单 */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  );
};