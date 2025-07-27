import React, { useState } from 'react';
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  CommandLineIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface ShortcutsHelpProps {
  className?: string;
}

const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    {
      category: '录音控制',
      items: [
        { keys: ['⌘', 'Shift', 'R'], description: '开始/停止实时录音' },
        { keys: ['Space'], description: '暂停/继续录音（录音期间）' },
        { keys: ['Esc'], description: '关闭配置面板' }
      ]
    },
    {
      category: '导航操作',
      items: [
        { keys: ['⌘', 'F'], description: '聚焦搜索框' },
        { keys: ['⌘', 'N'], description: '新建转录任务' },
        { keys: ['⌘', ','], description: '打开设置' }
      ]
    }
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={cn(
          "p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600",
          className
        )}
        title="快捷键帮助"
      >
        <QuestionMarkCircleIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <CommandLineIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">快捷键指南</h2>
                  <p className="text-sm text-gray-600">提高使用效率的键盘快捷键</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-6">
                {shortcuts.map((category, idx) => (
                  <div key={idx}>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <KeyIcon className="w-4 h-4 text-blue-600" />
                      {category.category}
                    </h3>
                    <div className="space-y-3">
                      {category.items.map((shortcut, itemIdx) => (
                        <div key={itemIdx} className="flex items-center justify-between py-2">
                          <span className="text-gray-700">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, keyIdx) => (
                              <React.Fragment key={keyIdx}>
                                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800">
                                  {key}
                                </kbd>
                                {keyIdx < shortcut.keys.length - 1 && (
                                  <span className="text-gray-400 text-xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 提示信息 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>提示:</strong> 在macOS上使用 ⌘ (Command)，在Windows/Linux上使用 Ctrl。
                </p>
              </div>
            </div>

            {/* 底部 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShortcutsHelp;