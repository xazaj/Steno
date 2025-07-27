import React from 'react';
import { PromptCategory } from '../types/prompt';
import {
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  MicrophoneIcon,
  ComputerDesktopIcon,
  HeartIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface CompactCategorySelectorProps {
  selectedCategory: PromptCategory;
  onCategoryChange: (category: PromptCategory) => void;
  className?: string;
}

const CATEGORY_OPTIONS: { value: PromptCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'general', label: '通用对话', icon: ChatBubbleLeftRightIcon },
  { value: 'meeting', label: '会议记录', icon: ClipboardDocumentListIcon },
  { value: 'interview', label: '访谈采访', icon: MicrophoneIcon },
  { value: 'technical', label: '技术讨论', icon: ComputerDesktopIcon },
  { value: 'medical', label: '医疗健康', icon: HeartIcon },
  { value: 'custom', label: '自定义场景', icon: Cog6ToothIcon }
];

export const CompactCategorySelector: React.FC<CompactCategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  className = ''
}) => {
  return (
    <div className={`${className}`}>
      <label className="wizard-text-label block mb-3">
        提示词类别 <span style={{ color: 'var(--wizard-primary)' }}>*</span>
      </label>
      
      {/* Dropdown Style Selector */}
      <div className="space-y-2">
        {CATEGORY_OPTIONS.map((option) => {
          const IconComponent = option.icon;
          const isSelected = selectedCategory === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onCategoryChange(option.value)}
              className={`w-full rounded-lg border transition-all duration-200 flex items-center text-left ${
                isSelected
                  ? 'shadow-sm'
                  : 'hover:border-gray-300 hover:bg-gray-50'
              }`}
              style={{
                padding: 'var(--wizard-card-padding)',
                gap: 'var(--wizard-space-sm)',
                backgroundColor: isSelected ? 'var(--wizard-primary-light)' : 'var(--wizard-bg-primary)',
                borderColor: isSelected ? 'var(--wizard-primary)' : 'var(--wizard-border-light)'
              }}
            >
              <div className={`p-2 rounded-md`} style={{
                backgroundColor: isSelected ? '#dbeafe' : 'var(--wizard-bg-tertiary)'
              }}>
                <IconComponent className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
              </div>
              
              <div className="flex-1">
                <div className={`wizard-text-body font-medium`} style={{
                  color: isSelected ? 'var(--wizard-primary-dark)' : 'var(--wizard-text-primary)'
                }}>
                  {option.label}
                </div>
                <div className={`wizard-text-small mt-0.5`} style={{
                  color: isSelected ? 'var(--wizard-primary-dark)' : 'var(--wizard-text-secondary)'
                }}>
                  {option.value === 'general' && '适用于日常对话和一般内容'}
                  {option.value === 'meeting' && '会议记录、讨论和决策内容'}
                  {option.value === 'interview' && '采访、问答和对话内容'}
                  {option.value === 'technical' && '技术讨论、编程和专业内容'}
                  {option.value === 'medical' && '医疗健康、诊断和科普内容'}
                  {option.value === 'custom' && '其他特定场景或个人需求'}
                </div>
              </div>
              
              {isSelected && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};