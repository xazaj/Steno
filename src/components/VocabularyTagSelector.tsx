import React, { useState } from 'react';
import { 
  UserGroupIcon,
  CommandLineIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { SmartTagSelector } from './SmartTagSelector';
import { VOCABULARY_TAGS, TagPreset } from '../data/promptTags';

interface VocabularyTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onValueChange: (field: 'peopleNames' | 'brandNames' | 'technicalTerms', value: string) => void;
  currentValues: {
    peopleNames: string;
    brandNames: string;
    technicalTerms: string;
  };
}

const VOCABULARY_CATEGORIES = [
  {
    id: 'people',
    label: '人名相关',
    icon: UserGroupIcon,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    field: 'peopleNames' as const,
    description: '姓名、职位、部门等人员信息'
  },
  {
    id: 'technical',
    label: '技术术语',
    icon: CommandLineIcon,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    field: 'technicalTerms' as const,
    description: '技术栈、工具、专业术语'
  },
  {
    id: 'business',
    label: '商业术语',
    icon: BriefcaseIcon,
    color: 'bg-green-50 border-green-200 text-green-700',
    field: 'technicalTerms' as const,
    description: '商业指标、模式、营销术语'
  },
  {
    id: 'industry',
    label: '行业术语',
    icon: BuildingOfficeIcon,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    field: 'technicalTerms' as const,
    description: '特定行业的专业词汇'
  },
  {
    id: 'brands',
    label: '品牌公司',
    icon: TagIcon,
    color: 'bg-pink-50 border-pink-200 text-pink-700',
    field: 'brandNames' as const,
    description: '公司、产品、品牌名称'
  }
];

export const VocabularyTagSelector: React.FC<VocabularyTagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  onValueChange,
  currentValues
}) => {
  // const [activeCategory, setActiveCategory] = useState<string>('people');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['people']));

  const handleTagSelect = (categoryId: string, tags: string[]) => {
    const category = VOCABULARY_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return;

    // 合并所选标签的值
    const combinedValue = tags.join(', ');
    
    // 根据类别更新对应字段
    onValueChange(category.field, combinedValue);
    
    // 更新全局选中状态
    const newGlobalTags = [...selectedTags.filter(tag => 
      !VOCABULARY_TAGS[categoryId]?.some(vocabTag => vocabTag.value === tag)
    ), ...tags];
    
    onTagsChange(newGlobalTags);
  };

  const handleCustomAdd = (categoryId: string, text: string) => {
    const category = VOCABULARY_CATEGORIES.find(cat => cat.id === categoryId);
    if (!category) return;

    const currentValue = currentValues[category.field];
    const newValue = currentValue ? `${currentValue}, ${text}` : text;
    
    onValueChange(category.field, newValue);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategorySelectedTags = (categoryId: string): string[] => {
    const categoryTags = VOCABULARY_TAGS[categoryId] || [];
    return selectedTags.filter(tag => 
      categoryTags.some(vocabTag => vocabTag.value === tag)
    );
  };

  const getPreviewText = (field: 'peopleNames' | 'brandNames' | 'technicalTerms'): string => {
    const value = currentValues[field];
    if (!value) return '暂无内容';
    
    const words = value.split(',').map(w => w.trim()).filter(w => w.length > 0);
    if (words.length <= 3) return value;
    
    return `${words.slice(0, 3).join(', ')} 等 ${words.length} 项`;
  };

  return (
    <div className="space-y-6">
      {/* 整体说明 */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <TagIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h4 className="font-medium text-orange-900">专用词汇与名称</h4>
            <p className="text-sm text-orange-700 mt-1">
              这是提升准确率<strong>最重要</strong>的部分！请选择或添加音频中可能出现的专有词汇。
            </p>
          </div>
        </div>
      </div>

      {/* 分类选择器 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {VOCABULARY_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedCategories.has(category.id);
          const categoryTags = VOCABULARY_TAGS[category.id] || [];
          const selectedCount = getCategorySelectedTags(category.id).length;
          
          return (
            <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* 分类头部 */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`w-full p-4 text-left transition-all duration-200 hover:bg-opacity-80 ${category.color}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <div>
                      <h4 className="font-medium">{category.label}</h4>
                      <p className="text-sm opacity-80">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedCount > 0 && (
                      <span className="px-2 py-1 bg-white bg-opacity-80 rounded-full text-xs font-medium">
                        {selectedCount}
                      </span>
                    )}
                    <div className={`transform transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}>
                      ↓
                    </div>
                  </div>
                </div>
              </button>

              {/* 分类内容 */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-100">
                  <SmartTagSelector
                    title=""
                    tags={categoryTags.map(tag => ({
                      ...tag,
                      id: `${category.id}-${tag.id}`
                    }))}
                    selectedTags={getCategorySelectedTags(category.id)}
                    onTagSelect={(tags) => handleTagSelect(category.id, tags)}
                    onCustomAdd={(text) => handleCustomAdd(category.id, text)}
                    multiSelect={true}
                    searchable={true}
                    className="border-none"
                  />
                  
                  {/* 当前内容预览 */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">当前内容预览</h5>
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                      {getPreviewText(category.field)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 全局统计 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-3">词汇统计</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-semibold text-blue-600">
              {currentValues.peopleNames.split(',').filter(w => w.trim()).length}
            </div>
            <div className="text-sm text-gray-600">人名相关</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-semibold text-purple-600">
              {currentValues.brandNames.split(',').filter(w => w.trim()).length}
            </div>
            <div className="text-sm text-gray-600">品牌公司</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-lg font-semibold text-green-600">
              {currentValues.technicalTerms.split(',').filter(w => w.trim()).length}
            </div>
            <div className="text-sm text-gray-600">专业术语</div>
          </div>
        </div>
      </div>

      {/* 操作建议 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-medium text-yellow-900 mb-2">填写建议</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• <strong>用逗号分隔</strong>不同的词汇</li>
          <li>• <strong>重点 {">"} 全面：</strong>关注那些 AI 最可能搞错的词</li>
          <li>• <strong>包含变体：</strong>如果有简称，请一并列出</li>
          <li>• <strong>至少填写一项</strong>来继续下一步</li>
        </ul>
      </div>
    </div>
  );
};