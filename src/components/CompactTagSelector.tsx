import React, { useState } from 'react';
import { 
  PlusIcon, 
  ChevronDownIcon,
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

interface CompactTagSelectorProps {
  title: string;
  tags: Tag[];
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  onCustomAdd?: (text: string) => void;
  multiSelect?: boolean;
  maxVisible?: number;
  className?: string;
}

export const CompactTagSelector: React.FC<CompactTagSelectorProps> = ({
  title,
  tags,
  selectedTags,
  onTagSelect,
  onCustomAdd,
  multiSelect = true,
  maxVisible = 6,
  className = ''
}) => {
  const [showAll, setShowAll] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const handleTagClick = (tag: Tag) => {
    if (!multiSelect) {
      onTagSelect([tag.value]);
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

  const displayTags = showAll ? tags : tags.slice(0, maxVisible);
  const remainingCount = tags.length - displayTags.length;

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="wizard-text-label">{title}</div>
        {selectedTags.length > 0 && (
          <span className="wizard-text-micro px-2 py-1 rounded-full" style={{ 
            backgroundColor: 'var(--wizard-bg-tertiary)', 
            color: 'var(--wizard-text-secondary)' 
          }}>
            已选 {selectedTags.length}
          </span>
        )}
      </div>

      {/* Compact Tag Grid */}
      <div className="flex flex-wrap gap-2 mb-3">
        {displayTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.value);
          
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagClick(tag)}
              className={`relative inline-flex items-center px-3 py-1.5 wizard-text-micro font-medium rounded-full border transition-all duration-200 ${
                isSelected
                  ? 'shadow-sm'
                  : 'hover:bg-gray-50 hover:border-gray-400'
              }`}
              style={{
                backgroundColor: isSelected ? 'var(--wizard-primary)' : 'var(--wizard-bg-primary)',
                color: isSelected ? 'white' : 'var(--wizard-text-primary)',
                borderColor: isSelected ? 'var(--wizard-primary)' : 'var(--wizard-border-light)'
              }}
            >
              {tag.icon && <span className="mr-1">{tag.icon}</span>}
              <span className="truncate max-w-24">{tag.label}</span>
              {isSelected && (
                <CheckIcon className="w-3 h-3 ml-1 flex-shrink-0" />
              )}
            </button>
          );
        })}

        {/* Show More Button */}
        {!showAll && remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 border border-dashed border-gray-300 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ChevronDownIcon className="w-3 h-3 mr-1" />
            +{remainingCount}
          </button>
        )}
      </div>

      {/* Custom Input */}
      {onCustomAdd && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="自定义添加..."
            className="flex-1 wizard-input"
            onKeyPress={(e) => e.key === 'Enter' && handleCustomAdd()}
            style={{ padding: '6px 12px' }}
          />
          <button
            type="button"
            onClick={handleCustomAdd}
            disabled={!customInput.trim()}
            className="px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors wizard-text-micro font-medium flex items-center"
            style={{
              backgroundColor: 'var(--wizard-primary)',
              color: 'white'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wizard-primary-dark)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--wizard-primary)'}
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Show Less Button */}
      {showAll && remainingCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="w-full mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          收起
        </button>
      )}
    </div>
  );
};