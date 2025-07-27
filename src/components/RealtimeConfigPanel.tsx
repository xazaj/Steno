import React, { useState } from 'react';
import { 
  MicrophoneIcon, 
  Cog6ToothIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  CheckIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface RealtimeConfig {
  language: 'zh' | 'en' | 'auto';
  mode: 'streaming' | 'buffered' | 'hybrid';
  speakerDiarization: boolean;
  noiseReduction: boolean;
  autoSave: boolean;
  saveInterval: number;
}

interface RealtimeConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: (config: RealtimeConfig) => void;
  defaultConfig?: Partial<RealtimeConfig>;
}

const RealtimeConfigPanel: React.FC<RealtimeConfigPanelProps> = ({
  isOpen,
  onClose,
  onStartRecording,
  defaultConfig = {}
}) => {
  const [config, setConfig] = useState<RealtimeConfig>({
    language: 'zh',
    mode: 'hybrid',
    speakerDiarization: true,
    noiseReduction: true,
    autoSave: true,
    saveInterval: 5,
    ...defaultConfig
  });

  const handleStartRecording = () => {
    onStartRecording(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-xl mx-6 max-h-[90vh] flex flex-col overflow-hidden" 
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          minHeight: '500px'
        }}
      >
        {/* 头部 - macOS 风格标题栏 */}
        <div className="flex items-center justify-between px-7 py-6 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <MicrophoneIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">实时录音配置</h2>
              <p className="text-sm text-gray-600 mt-1">设置语音识别参数和高级选项</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100/80 active:bg-gray-200/80 transition-all duration-200"
            title="关闭 (Esc)"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 配置内容 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8 min-h-0 macos-scrollbar">
          {/* 语言设置 */}
          <div className="space-y-4">
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-1">
                识别语言
              </label>
              <p className="text-sm text-gray-600">选择要进行语音识别的语言类型</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'zh' as const, label: '中文', icon: '🇨🇳', desc: '普通话/方言' },
                { value: 'en' as const, label: 'English', icon: '🇺🇸', desc: '美式英语' },
                { value: 'auto' as const, label: '智能检测', icon: '🌐', desc: '自动识别' }
              ].map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => setConfig(prev => ({ ...prev, language: lang.value }))}
                  className={cn(
                    "group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
                    config.language === lang.value
                      ? "border-blue-500 bg-blue-50/80 text-blue-700 shadow-lg shadow-blue-500/15"
                      : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50/80"
                  )}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{lang.icon}</span>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{lang.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{lang.desc}</div>
                  </div>
                  {config.language === lang.value && (
                    <CheckIcon className="w-4 h-4 text-blue-600 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 识别模式 */}
          <div className="space-y-4">
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-1">
                识别模式
              </label>
              <p className="text-sm text-gray-600">选择最适合您使用场景的识别模式</p>
            </div>
            <div className="space-y-3">
              {[
                { 
                  value: 'streaming' as const, 
                  label: '流式模式', 
                  desc: '最低延迟，适合实时对话和演讲',
                  icon: '⚡️',
                  performance: '延迟最低'
                },
                { 
                  value: 'hybrid' as const, 
                  label: '混合模式', 
                  desc: '平衡准确性和延迟，推荐日常使用',
                  icon: '⚖️',
                  performance: '推荐选择'
                },
                { 
                  value: 'buffered' as const, 
                  label: '缓冲模式', 
                  desc: '最高准确性，适合重要会议记录',
                  icon: '🎯',
                  performance: '准确度最高'
                }
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setConfig(prev => ({ ...prev, mode: mode.value }))}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]",
                    config.mode === mode.value
                      ? "border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-500/10"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{mode.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {mode.label}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          mode.value === 'hybrid' 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {mode.performance}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">{mode.desc}</div>
                    </div>
                  </div>
                  {config.mode === mode.value && (
                    <CheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 高级选项 */}
          <div className="space-y-4">
            <div>
              <label className="block text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-blue-600" />
                高级选项
              </label>
              <p className="text-sm text-gray-600">优化录音质量和智能功能</p>
            </div>
            
            <div className="bg-gray-50/80 rounded-2xl p-5 space-y-4">
              {/* 说话人分离 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">说话人分离</div>
                    <div className="text-sm text-gray-600">自动识别和区分不同说话人</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, speakerDiarization: !prev.speakerDiarization }))}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    config.speakerDiarization ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-lg",
                      config.speakerDiarization ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* 智能降噪 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <SpeakerWaveIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">智能降噪</div>
                    <div className="text-sm text-gray-600">AI增强音质，减少背景噪音</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, noiseReduction: !prev.noiseReduction }))}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    config.noiseReduction ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-lg",
                      config.noiseReduction ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              {/* 自动保存 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Cog6ToothIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">自动保存</div>
                    <div className="text-sm text-gray-600">定期保存录音内容和进度</div>
                  </div>
                </div>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                  className={cn(
                    "relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    config.autoSave ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-lg",
                      config.autoSave ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="flex items-start gap-4 p-4 bg-blue-50/80 rounded-2xl border border-blue-200/50">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium mb-1">准备就绪</p>
              <p className="text-sm text-blue-700">
                点击"开始录制"后将返回主界面，实时识别结果会在转录记录中显示。
              </p>
            </div>
          </div>
        </div>

        {/* 底部操作栏 - 固定位置 */}
        <div className="flex items-center gap-4 px-7 py-6 border-t border-gray-200/60 bg-white/80 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 text-gray-700 bg-white/80 border border-gray-300 rounded-xl hover:bg-gray-50/80 active:bg-gray-100/80 transition-all duration-200 font-medium"
          >
            取消
          </button>
          <button
            onClick={handleStartRecording}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 font-semibold shadow-lg shadow-blue-500/25 flex items-center justify-center gap-3"
          >
            <MicrophoneIcon className="w-5 h-5" />
            开始录制识别
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealtimeConfigPanel;