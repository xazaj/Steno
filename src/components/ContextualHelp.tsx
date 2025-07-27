import React, { useState } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ContextualHelpProps {
  title: string;
  content: string | React.ReactNode;
  examples?: string[];
  tips?: string[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  title,
  content,
  examples = [],
  tips = [],
  position = 'bottom',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <InformationCircleIcon className="w-4 h-4" />
      </button>
      
      {isVisible && (
        <div className={`absolute z-50 w-80 ${positionClasses[position]}`}>
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm text-gray-700 mb-3">
              {typeof content === 'string' ? <p>{content}</p> : content}
            </div>
            
            {examples.length > 0 && (
              <div className="mb-3">
                <h5 className="font-medium text-gray-900 text-xs mb-2">📝 示例</h5>
                <div className="space-y-1">
                  {examples.map((example, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {example}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tips.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 text-xs mb-2">💡 小贴士</h5>
                <ul className="space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Arrow pointer */}
            <div className={`absolute w-2 h-2 bg-white border-gray-200 transform rotate-45 ${
              position === 'top' ? 'top-full border-t border-l -mt-1' :
              position === 'bottom' ? 'bottom-full border-b border-r -mb-1' :
              position === 'left' ? 'left-full border-l border-b -ml-1' :
              'right-full border-r border-t -mr-1'
            }`} />
          </div>
        </div>
      )}
    </div>
  );
};

// Predefined help content for common use cases
export const HELP_CONTENT = {
  audioTopic: {
    title: '音频主题描述指南',
    content: '准确描述音频内容有助于AI选择正确的词汇和语境。越具体越好！',
    examples: [
      '✓ 好例子：一场关于人工智能在医疗领域应用的学术研讨会',
      '✗ 差例子：讨论一些科技的东西',
      '✓ 好例子：公司产品团队关于新版本功能规划的内部会议',
      '✗ 差例子：开会讨论工作'
    ],
    tips: [
      '包含场景信息：会议、讲座、访谈等',
      '提及主要参与者：公司内部、专家学者等',
      '说明讨论领域：技术、医疗、商业等',
      `避免使用"东西"、"那个"等模糊词汇`
    ]
  },
  
  specializedTerms: {
    title: '专用词汇添加指南',
    content: '这是提升识别准确率的关键！列出AI可能不认识或容易搞错的专有名词。',
    examples: [
      '人名：张伟、李静、John Smith',
      '公司/品牌：阿里巴巴、微软、Tesla',
      `项目名："天狼星"计划、Project Alpha`,
      '技术术语：API、机器学习、区块链、IoT'
    ],
    tips: [
      '用逗号分隔不同词汇',
      '包含中英文变体，如：人工智能, AI, Artificial Intelligence',
      '添加行业特定缩写：ROI、KPI、B2B等',
      '不确定的词汇也可以加上，宁多勿少'
    ]
  },
  
  formatRequirements: {
    title: '格式要求设置指南',
    content: '明确的格式要求可以减少后期编辑工作，让输出更符合您的需求。',
    examples: [
      '中文：使用中文全角标点符号（，。？）',
      'English: Use proper English punctuation',
      '段落：段落之间请空一行',
      '缩写：保留英文缩写的大写格式'
    ],
    tips: [
      '明确标点符号要求（中文全角 vs 英文半角）',
      '说明段落分隔方式',
      '指定数字和英文的处理方式',
      '可以要求保持原有的专业术语格式'
    ]
  },
  
  keyPhrases: {
    title: '关键句预览指南',
    content: `如果您知道音频开头或关键部分的内容，提供这些"锚点"可以大幅提升识别准确率。`,
    examples: [
      `开场白：大家好，欢迎收听本期的"商业洞察家"`,
      '会议开始：今天我们讨论的核心议题是...',
      '关键句：本次发布的新功能主要包括三个方面',
      '结束语：感谢大家的参与，我们下次再见'
    ],
    tips: [
      '不需要完全准确，大概意思即可',
      '可以是开头、中间或结尾的任意片段',
      '包含人名、项目名等关键信息的句子效果更好',
      '即使只有几个关键词也有帮助'
    ]
  }
};