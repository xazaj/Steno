import React from 'react';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShieldCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { PromptTemplate, CATEGORY_NAMES, CATEGORY_COLORS } from '../types/prompt';

interface PromptCardProps {
  prompt: PromptTemplate;
  isActive?: boolean;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  isActive = false,
  onUse,
  onEdit,
  onDelete
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageLabel = (language: string) => {
    switch (language) {
      case 'zh': return '中文';
      case 'en': return 'English';
      case 'auto': return '自动';
      default: return language.toUpperCase();
    }
  };

  return (
    <div className={`rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md hover:-translate-y-1 ${
      isActive 
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-blue-100' 
        : 'bg-white border-gray-200'
    }`}>
      {/* 当前生效标识 */}
      {isActive && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-t-lg">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircleIconSolid className="w-4 h-4" />
            当前生效的提示词
          </div>
        </div>
      )}
      
      <div className="p-4">
        {/* 头部：标题 + 操作区域 */}
        <div className="flex items-start justify-between mb-3">
          <h3 className={`font-semibold flex-1 pr-2 leading-tight ${
            isActive ? 'text-blue-900' : 'text-gray-900'
          }`}>{prompt.name}</h3>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {prompt.is_built_in ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                <ShieldCheckIcon className="w-3 h-3 mr-1" />
                内置
              </span>
            ) : (
              <>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className={`p-1.5 rounded transition-colors ${
                      isActive 
                        ? 'text-blue-700 hover:bg-blue-100' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title="编辑"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="删除"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 分类标签区域 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${CATEGORY_COLORS[prompt.category]}`}>
              {CATEGORY_NAMES[prompt.category]}
            </span>
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              {getLanguageLabel(prompt.language)}
            </span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <EyeIcon className="w-3 h-3 mr-1" />
            <span>{prompt.usage_count}</span>
          </div>
        </div>

        {/* 内容预览 */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {prompt.content}
          </p>
        </div>

        {/* 用户标签（如果有的话） */}
        {prompt.tags.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {prompt.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700"
                >
                  {tag}
                </span>
              ))}
              {prompt.tags.length > 2 && (
                <span className="text-xs text-gray-400 px-1">
                  +{prompt.tags.length - 2}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 描述（如果有的话） */}
        {prompt.description && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 italic">
              {prompt.description}
            </p>
          </div>
        )}

        {/* 底部：时间 + 使用按钮 */}
        <div className={`flex items-center justify-between pt-2 border-t ${
          isActive ? 'border-blue-100' : 'border-gray-100'
        }`}>
          <span className={`text-xs ${isActive ? 'text-blue-400' : 'text-gray-400'}`}>
            {formatDate(prompt.updated_at)}
          </span>
          {isActive ? (
            <div className="flex items-center gap-1 text-sm font-medium text-blue-600">
              <CheckCircleIconSolid className="w-4 h-4" />
              <span>生效中</span>
            </div>
          ) : (
            <button
              onClick={onUse}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              使用
            </button>
          )}
        </div>
      </div>
    </div>
  );
};