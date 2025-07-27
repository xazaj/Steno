import React, { useState, useRef, useEffect } from 'react';
import {
  EllipsisHorizontalIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { getVersion } from '@tauri-apps/api/app';
import { getPlatform } from '../utils/platform';

interface AppMenuProps {
  className?: string;
}

const AppMenu: React.FC<AppMenuProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [platform, setPlatform] = useState("macOS");
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 获取应用版本号和平台信息
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const [version, platformInfo] = await Promise.all([
          getVersion(),
          getPlatform()
        ]);
        setAppVersion(version);
        setPlatform(platformInfo === 'macos' ? 'macOS' : 
                   platformInfo === 'windows' ? 'Windows' : 
                   platformInfo === 'linux' ? 'Linux' : 'Unknown');
      } catch (error) {
        console.error('获取应用信息失败:', error);
        // 如果获取失败，保持默认值
      }
    };
    loadAppInfo();
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const menuItems = [
    {
      id: 'faq',
      label: '常见问题',
      icon: QuestionMarkCircleIcon,
      onClick: () => {
        // TODO: 实现常见问题功能
        console.log('打开常见问题');
        setIsOpen(false);
      }
    },
    {
      id: 'changelog',
      label: '升级日志',
      icon: DocumentTextIcon,
      onClick: () => {
        setShowChangelogModal(true);
        setIsOpen(false);
      }
    },
    {
      id: 'version',
      label: `当前版本 v${appVersion}`,
      icon: InformationCircleIcon,
      onClick: () => {
        setShowVersionModal(true);
        setIsOpen(false);
      }
    }
  ];

  return (
    <>
      <div className="relative">
        <button 
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800 ${className}`}
          title="更多选项"
        >
          <EllipsisHorizontalIcon className="w-4 h-4" />
        </button>

        {isOpen && (
          <div 
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 py-2 z-50"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100/80 mb-1">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                帮助与信息
              </div>
            </div>
            
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-gray-50/80 transition-colors duration-150 group"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100/50 group-hover:bg-gray-200/50 transition-colors">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      {item.label}
                    </div>
                    {item.id === 'version' && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        最新版本
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* 底部分隔线和品牌信息 */}
            <div className="border-t border-gray-100/80 mt-1 pt-2 px-3">
              <div className="text-xs text-gray-400 text-center">
                Steno - AI 语音转录工具
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 版本信息弹窗 */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowVersionModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">版本信息</h2>
              <button
                onClick={() => setShowVersionModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <InformationCircleIcon className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Steno</h3>
                  <p className="text-sm text-gray-500">AI 语音转录工具</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">当前版本</span>
                  <span className="text-sm font-medium text-gray-900">v{appVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">构建日期</span>
                  <span className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">平台</span>
                  <span className="text-sm font-medium text-gray-900">{platform}</span>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setShowVersionModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 升级日志弹窗 */}
      {showChangelogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowChangelogModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[600px] max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">升级日志</h2>
              <button
                onClick={() => setShowChangelogModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* 版本 1.0.0 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">v{appVersion}</h3>
                  <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-1">✨ 新功能</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• 支持实时语音转录</li>
                      <li>• 支持多种音频格式文件转录</li>
                      <li>• 智能语音活动检测(VAD)</li>
                      <li>• 转录结果导出功能</li>
                      <li>• 多语言支持(中文、英文)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-600 mb-1">🛠 改进</h4>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• 优化转录准确率</li>
                      <li>• 改进用户界面体验</li>
                      <li>• 提升长时间音频处理性能</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* 占位符：未来版本 */}
              <div className="border-l-4 border-gray-300 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-500">v0.9.0</h3>
                  <span className="text-sm text-gray-400">更早版本</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">🔄 更新</h4>
                    <ul className="text-sm text-gray-500 space-y-1 ml-4">
                      <li>• 初始版本功能实现</li>
                      <li>• 基础转录功能</li>
                      <li>• 文件管理系统</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowChangelogModal(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppMenu;