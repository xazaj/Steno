import React, { useState, useEffect } from 'react';
import { XMarkIcon, TagIcon, LanguageIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CreatePromptData, CATEGORY_NAMES } from '../types/prompt';

interface PromptFormProps {
  title: string;
  initialData?: Partial<CreatePromptData>;
  onSubmit: (data: CreatePromptData) => void;
  onCancel: () => void;
}

export const PromptForm: React.FC<PromptFormProps> = ({
  title,
  initialData,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreatePromptData>({
    name: '',
    content: '',
    category: 'general',
    language: 'zh',
    description: '',
    tags: []
  });

  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        content: initialData.content || '',
        category: initialData.category || 'general',
        language: initialData.language || 'zh',
        description: initialData.description || '',
        tags: initialData.tags || []
      });
      setTagsInput(initialData.tags?.join(', ') || '');
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '请输入提示词名称';
    }

    if (!formData.content.trim()) {
      newErrors.content = '请输入提示词内容';
    }

    if (formData.content.length > 1000) {
      newErrors.content = '提示词内容不能超过1000字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 处理标签
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const submitData: CreatePromptData = {
      ...formData,
      tags
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: keyof CreatePromptData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 提示词名称 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              提示词名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="输入提示词名称"
              maxLength={100}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* 分类和语言 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                分类 *
              </label>
              <div className="relative">
                <TagIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="appearance-none w-full border border-gray-300 rounded-md pl-10 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors"
                >
                  {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                语言 *
              </label>
              <div className="relative">
                <LanguageIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className="appearance-none w-full border border-gray-300 rounded-md pl-10 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors"
                >
                  <option value="zh">中文</option>
                  <option value="en">英文</option>
                  <option value="auto">自动</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 提示词内容 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              提示词内容 *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={8}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.content ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="输入Whisper识别提示词内容，这将影响语音识别的准确率..."
              maxLength={1000}
            />
            <div className="flex justify-between mt-1">
              {errors.content ? (
                <p className="text-xs text-red-600">{errors.content}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  提示：好的提示词应该包含领域相关术语、常见词汇等，有助于提高识别准确率
                </p>
              )}
              <p className="text-xs text-gray-400">
                {formData.content.length}/1000
              </p>
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              描述（可选）
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="简短描述这个提示词的用途"
              maxLength={200}
            />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              标签（可选）
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="用逗号分隔多个标签，如：会议,技术,AI"
            />
            <p className="text-xs text-gray-500 mt-1">
              标签有助于搜索和分类管理
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};