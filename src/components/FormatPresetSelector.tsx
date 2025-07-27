import React, { useState } from 'react';
import { 
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  CheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { FORMAT_PRESETS, KEY_PHRASES_PRESETS } from '../data/promptTags';

interface FormatPresetSelectorProps {
  formatValue: string;
  keyPhrasesValue: string;
  onFormatChange: (value: string) => void;
  onKeyPhrasesChange: (value: string) => void;
}

export const FormatPresetSelector: React.FC<FormatPresetSelectorProps> = ({
  formatValue,
  keyPhrasesValue,
  onFormatChange,
  onKeyPhrasesChange
}) => {
  const [activeTab, setActiveTab] = useState<'format' | 'phrases'>('format');
  const [selectedFormatId, setSelectedFormatId] = useState<string>('');
  const [selectedPhrasesIds, setSelectedPhrasesIds] = useState<string[]>([]);

  const handleFormatSelect = (preset: typeof FORMAT_PRESETS[0]) => {
    setSelectedFormatId(preset.id);
    onFormatChange(preset.value);
  };

  const handlePhraseSelect = (preset: typeof KEY_PHRASES_PRESETS[0]) => {
    const isSelected = selectedPhrasesIds.includes(preset.id);
    
    if (isSelected) {
      // 移除选中的短语
      setSelectedPhrasesIds(prev => prev.filter(id => id !== preset.id));
      const remainingPhrases = KEY_PHRASES_PRESETS
        .filter(p => selectedPhrasesIds.includes(p.id) && p.id !== preset.id)
        .map(p => p.value);
      onKeyPhrasesChange(remainingPhrases.join(' '));
    } else {
      // 添加新短语
      setSelectedPhrasesIds(prev => [...prev, preset.id]);
      const newValue = keyPhrasesValue ? 
        `${keyPhrasesValue} ${preset.value}` : 
        preset.value;
      onKeyPhrasesChange(newValue);
    }
  };

  const clearFormat = () => {
    setSelectedFormatId('');
    onFormatChange('');
  };

  const clearPhrases = () => {
    setSelectedPhrasesIds([]);
    onKeyPhrasesChange('');
  };

  const getFormatIcon = (formatId: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'format-chinese-standard': GlobeAltIcon,
      'format-english-standard': GlobeAltIcon,
      'format-mixed-language': GlobeAltIcon,
      'format-meeting-minutes': ClipboardDocumentCheckIcon,
      'format-interview-qa': ChatBubbleLeftRightIcon,
      'format-technical-doc': CodeBracketIcon
    };
    return iconMap[formatId] || DocumentTextIcon;
  };

  // const getPhrasesIcon = (phraseId: string) => {
  //   const iconMap: Record<string, React.ComponentType<any>> = {
  //     'phrase-meeting-start': ClipboardDocumentCheckIcon,
  //     'phrase-presentation-start': DocumentTextIcon,
  //     'phrase-interview-start': ChatBubbleLeftRightIcon,
  //     'phrase-course-start': DocumentTextIcon,
  //     'phrase-summary': CheckIcon,
  //     'phrase-next-steps': SparklesIcon
  //   };
  //   return iconMap[phraseId] || DocumentTextIcon;
  // };

  return (
    <div className="space-y-6">
      {/* Tab 导航 */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('format')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'format'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4 inline mr-2" />
          格式设置
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('phrases')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'phrases'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <SparklesIcon className="w-4 h-4 inline mr-2" />
          关键句预览
        </button>
      </div>

      {/* 格式设置面板 */}
      {activeTab === 'format' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">选择输出格式</h3>
            {selectedFormatId && (
              <button
                type="button"
                onClick={clearFormat}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                清除选择
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORMAT_PRESETS.map((preset) => {
              const Icon = getFormatIcon(preset.id);
              const isSelected = selectedFormatId === preset.id;
              
              return (
                <div
                  key={preset.id}
                  className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFormatSelect(preset)}
                >
                  {/* 选中指示器 */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* 预设内容 */}
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {preset.label}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        isSelected ? 'text-blue-700' : 'text-gray-600'
                      }`}>
                        {preset.value.length > 60 
                          ? `${preset.value.substring(0, 60)}...`
                          : preset.value
                        }
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 自定义格式提醒 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <PencilSquareIcon className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">自定义格式</h4>
                <p className="text-sm text-gray-600 mt-1">
                  如果预设格式不符合需求，您可以在下方文本框中自定义格式要求。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 关键句预览面板 */}
      {activeTab === 'phrases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">选择关键句预览</h3>
              <p className="text-sm text-gray-600 mt-1">可多选，为AI提供"锚点"引导识别</p>
            </div>
            {selectedPhrasesIds.length > 0 && (
              <button
                type="button"
                onClick={clearPhrases}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                清空选择 ({selectedPhrasesIds.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {KEY_PHRASES_PRESETS.map((preset) => {
              const isSelected = selectedPhrasesIds.includes(preset.id);
              
              return (
                <div
                  key={preset.id}
                  className={`relative p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePhraseSelect(preset)}
                >
                  {/* 选中指示器 */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="flex items-start space-x-3">
                    <div className={`p-1 rounded ${
                      isSelected ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <DocumentTextIcon className={`w-4 h-4 ${
                        isSelected ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium text-sm ${
                        isSelected ? 'text-green-900' : 'text-gray-900'
                      }`}>
                        {preset.label}
                      </h4>
                      <p className={`text-xs mt-1 ${
                        isSelected ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {preset.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 关键句使用提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">使用技巧</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 选择最符合您音频开头或重要节点的句子</li>
              <li>• 可以多选组合，但建议不超过3个关键句</li>
              <li>• 即使内容不完全一致，相似的表达也会有帮助</li>
              <li>• 关键句将作为AI识别的"锚点"，提升整体准确率</li>
            </ul>
          </div>
        </div>
      )}

      {/* 实时预览 */}
      {((activeTab === 'format' && formatValue) || (activeTab === 'phrases' && keyPhrasesValue)) && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3">当前内容预览</h4>
          <div className="bg-white border rounded-lg p-3 text-sm text-gray-700">
            {activeTab === 'format' ? formatValue : keyPhrasesValue}
          </div>
        </div>
      )}
    </div>
  );
};