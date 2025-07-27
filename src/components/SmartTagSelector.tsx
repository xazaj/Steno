import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  SparklesIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Tag {
  id: string;
  label: string;
  value: string;
  category?: string;
  color?: string;
  icon?: string;
}

interface SmartTagSelectorProps {
  title: string;
  description?: string;
  placeholder?: string;
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  onCustomAdd?: (text: string) => void;
  multiSelect?: boolean;
  maxSelection?: number;
  searchable?: boolean;
  className?: string;
  autoFillMode?: 'append' | 'replace';
}

export const SmartTagSelector: React.FC<SmartTagSelectorProps> = ({
  title,
  description,
  placeholder = '搜索或添加...',
  tags,
  selectedTags,
  onTagSelect,
  onCustomAdd,
  multiSelect = true,
  maxSelection,
  searchable = true,
  className = '',
  autoFillMode = 'append'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTags, setFilteredTags] = useState(tags);
  const [showAll, setShowAll] = useState(false);
  
  // 避免未使用变量警告
  console.log('autoFillMode:', autoFillMode);
  const [customInput, setCustomInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const filtered = tags.filter(tag =>
      tag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.value.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredTags(filtered);
  }, [searchQuery, tags]);

  const handleTagClick = (tag: Tag) => {
    if (!multiSelect) {
      onTagSelect([tag.value]);
      return;
    }

    if (maxSelection && selectedTags.length >= maxSelection && !selectedTags.includes(tag.value)) {
      return;
    }

    const newTags = selectedTags.includes(tag.value)
      ? selectedTags.filter(t => t !== tag.value)
      : [...selectedTags, tag.value];
    
    onTagSelect(newTags);
  };

  const handleCustomAdd = () => {
    if (customInput.trim() && onCustomAdd) {
      onCustomAdd(customInput.trim());
      setCustomInput('');
    }
  };

  const displayTags = showAll ? filteredTags : filteredTags.slice(0, 12);
  const remainingCount = filteredTags.length - displayTags.length;

  const getTagColor = (tag: Tag, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105';
    }
    
    const colors = {
      primary: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100',
      secondary: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100',
      success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 hover:from-green-100 hover:to-emerald-100',
      warning: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-yellow-700 hover:from-yellow-100 hover:to-orange-100',
      default: 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 text-gray-700 hover:from-gray-100 hover:to-slate-100'
    };
    
    return colors[tag.color as keyof typeof colors] || colors.default;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SparklesIcon className="w-5 h-5 text-blue-500 mr-2" />
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          {isExpanded ? '收起' : '展开所有'}
        </button>
      </div>

      {/* Search Bar */}
      {searchable && (
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
          />
        </div>
      )}

      {/* Selected Count */}
      {multiSelect && selectedTags.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-700">
            已选择 <span className="font-semibold">{selectedTags.length}</span> 个标签
            {maxSelection && ` / ${maxSelection}`}
          </span>
          <button
            type="button"
            onClick={() => onTagSelect([])}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            清空选择
          </button>
        </div>
      )}

      {/* Tags Grid */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.value);
            const isDisabled = !!(maxSelection && selectedTags.length >= maxSelection && !isSelected);
            
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => !isDisabled && handleTagClick(tag)}
                disabled={isDisabled}
                className={`
                  relative p-3 rounded-xl border-2 text-sm font-medium transition-all duration-200 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${getTagColor(tag, isSelected)}
                  hover:shadow-md hover:-translate-y-0.5
                  active:transform active:scale-95
                  group
                `}
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border-2 border-blue-500 flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-blue-500" />
                  </div>
                )}
                
                {/* Tag Content */}
                <div className="flex items-center justify-center min-h-[2rem]">
                  {tag.icon && <span className="mr-1">{tag.icon}</span>}
                  <span className="truncate">{tag.label}</span>
                </div>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
              </button>
            );
          })}
        </div>

        {/* Show More Button */}
        {!showAll && remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors duration-200 text-sm font-medium"
          >
            显示更多 ({remainingCount} 个)
          </button>
        )}

        {showAll && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="w-full p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 text-sm"
          >
            收起
          </button>
        )}
      </div>

      {/* Custom Input */}
      {onCustomAdd && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">自定义添加</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="输入自定义内容..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleCustomAdd()}
            />
            <button
              type="button"
              onClick={handleCustomAdd}
              disabled={!customInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium flex items-center"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              添加
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border">
          <span className="text-xs text-gray-600 font-medium">快速操作:</span>
          <button
            type="button"
            onClick={() => onTagSelect([])}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            全部清除
          </button>
        </div>
      )}
    </div>
  );
};