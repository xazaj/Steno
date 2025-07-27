import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { WizardValidation, WizardFormData } from './SmartPromptWizard.types';
import { WIZARD_TABS } from './SmartPromptWizard.constants';
import { WizardFormControls } from './WizardFormControls';

interface WizardNavigationProps {
  currentTab: number;
  validation: WizardValidation;
  onTabChange: (tab: number) => void;
  onClose: () => void;
  canGoNext: boolean;
  isEditMode: boolean;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentTab,
  validation,
  onTabChange,
  onClose,
  canGoNext,
  isEditMode
}) => {
  return (
    <>
      {/* 头部导航 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? '编辑' : '创建'}智能提示词
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>步骤 {currentTab} / 4</span>
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentTab / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 步骤标签页 */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {WIZARD_TABS.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = currentTab === tab.id;
            const isCompleted = validation[`step${tab.id}` as keyof WizardValidation];
            const isAccessible = tab.id === 1 || validation[`step${tab.id - 1}` as keyof WizardValidation];
            
            return (
              <button
                key={tab.id}
                onClick={() => isAccessible && onTabChange(tab.id)}
                disabled={!isAccessible}
                className={cn(
                  "flex-1 flex items-center justify-center gap-3 px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200",
                  isActive
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : isCompleted
                    ? "border-green-500 text-green-600 hover:bg-green-50"
                    : isAccessible
                    ? "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    : "border-transparent text-gray-300 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-r transition-all duration-200",
                  isActive
                    ? tab.gradient
                    : isCompleted
                    ? "from-green-500 to-green-600"
                    : isAccessible
                    ? "from-gray-400 to-gray-500"
                    : "from-gray-200 to-gray-300"
                )}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-medium">{tab.title}</div>
                  <div className="text-xs opacity-75">{tab.subtitle}</div>
                </div>
                {isCompleted && (
                  <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </>
  );
};

export const WizardFooter: React.FC<{
  currentTab: number;
  validation: WizardValidation;
  formData: WizardFormData;
  onPrevious: () => void;
  onNext: () => void;
  onSave: () => void;
  onResetCurrentStep: (currentTab: number) => void;
  onResetAllData: () => void;
  onRestoreDefaults: () => void;
  canGoNext: boolean;
  isEditMode: boolean;
}> = ({
  currentTab,
  validation,
  formData,
  onPrevious,
  onNext,
  onSave,
  onResetCurrentStep,
  onResetAllData,
  onRestoreDefaults,
  canGoNext,
  isEditMode
}) => {
  const isLastStep = currentTab === 4;
  
  return (
    <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
      <button
        onClick={onPrevious}
        disabled={currentTab === 1}
        className={cn(
          "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
          currentTab === 1
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-200"
        )}
      >
        <ChevronLeftIcon className="w-4 h-4" />
        上一步
      </button>

      <div className="flex items-center gap-3">
        {/* 表单管理控制组件 */}
        <WizardFormControls
          currentTab={currentTab}
          formData={formData}
          onResetCurrentStep={() => onResetCurrentStep(currentTab)}
          onResetAllData={onResetAllData}
          onRestoreDefaults={onRestoreDefaults}
        />

        {isLastStep ? (
          <button
            onClick={onSave}
            disabled={!validation.overall}
            className={cn(
              "flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors",
              validation.overall
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
{isEditMode ? '更新并应用' : '保存并应用'}
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              canGoNext
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            下一步
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};