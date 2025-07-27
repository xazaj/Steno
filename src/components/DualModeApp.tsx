import React, { useState, useEffect } from 'react';
import { 
  DocumentIcon, 
  MicrophoneIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  UserIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

// Shared components
import SharedSidebar from './shared/SharedSidebar';
import SettingsPanel from './SettingsPanel';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

// Mode-specific components  
import CompactFileTranscriptionWorkspace from './file-mode/CompactFileTranscriptionWorkspace';
import RecordingWorkspace from './recording-mode/RecordingWorkspace';

type AppMode = 'file' | 'recording';

interface Project {
  id: string;
  name: string;
  type: 'file' | 'recording';
  date: Date;
  duration?: number;
  status: 'processing' | 'completed' | 'failed';
  summary?: string;
  tags: string[];
}

const DualModeApp: React.FC = () => {
  // Global state
  const [currentMode, setCurrentMode] = useState<AppMode>('file'); // 文件优先
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { toasts, removeToast, info } = useToast();

  // Mock projects data
  const [projects] = useState<Project[]>([
    {
      id: '1',
      name: '客户访谈录音.mp3',
      type: 'file',
      date: new Date('2025-01-20T14:30:00'),
      duration: 1800, // 30 minutes
      status: 'completed',
      summary: '讨论了产品功能需求和用户体验改进建议...',
      tags: ['客户', '访谈', '产品'],
    },
    {
      id: '2', 
      name: '团队会议记录',
      type: 'recording',
      date: new Date('2025-01-20T10:00:00'),
      duration: 3600, // 1 hour
      status: 'completed',
      summary: '确定了Q1产品路线图和资源分配...',
      tags: ['会议', '规划', '团队'],
    },
    {
      id: '3',
      name: '播客采访素材.wav',
      type: 'file', 
      date: new Date('2025-01-19T16:00:00'),
      status: 'processing',
      tags: ['播客', '采访'],
    },
  ]);

  // 智能模式推荐
  const suggestMode = (action: string, _context?: any): AppMode => {
    if (action === 'file_drop' || action === 'file_select') return 'file';
    if (action === 'mic_permission' || action === 'quick_record') return 'recording';
    
    // 基于时间推荐 (会议时间推荐录音模式)
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 9 && hour <= 17 && [1, 2, 3, 4, 5].includes(now.getDay())) {
      // 工作时间推荐录音模式
      if (Math.random() > 0.7) return 'recording';
    }
    
    return 'file'; // 默认文件模式
  };

  // 模式切换处理
  const handleModeSwitch = (mode: AppMode, reason?: string) => {
    if (mode === currentMode) return;
    
    setCurrentMode(mode);
    
    // 提供切换反馈
    const modeNames = { file: '文件转录', recording: '实时录音' };
    info(`已切换到${modeNames[mode]}模式`, reason);
  };

  // 智能推荐提示
  const [showModeRecommendation, setShowModeRecommendation] = useState(false);
  const [recommendedMode, setRecommendedMode] = useState<AppMode>('file');

  useEffect(() => {
    // 模拟智能推荐逻辑
    const timer = setTimeout(() => {
      const suggested = suggestMode('time_based');
      if (suggested !== currentMode) {
        setRecommendedMode(suggested);
        setShowModeRecommendation(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentMode]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          handleModeSwitch('file', '键盘快捷键');
        } else if (e.key === '2') {
          e.preventDefault();
          handleModeSwitch('recording', '键盘快捷键');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const modes = [
    {
      id: 'file' as AppMode,
      name: '文件转录',
      icon: DocumentIcon,
      description: '上传音频文件进行高质量转录',
      shortcut: '⌘1'
    },
    {
      id: 'recording' as AppMode, 
      name: '实时录音',
      icon: MicrophoneIcon,
      description: '实时录音并同步转录',
      shortcut: '⌘2'
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="font-semibold text-gray-900 text-lg">Steno</span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = currentMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeSwitch(mode.id, '手动切换')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-white text-blue-600 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                  title={`${mode.description} (${mode.shortcut})`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{mode.name}</span>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-64"
            />
          </div>

          {/* Settings */}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="设置"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
          </button>

          {/* User */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <UserIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Smart Mode Recommendation */}
      {showModeRecommendation && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-blue-500" />
              <div className="text-sm">
                <span className="font-medium text-blue-900">智能建议: </span>
                <span className="text-blue-700">
                  检测到您可能需要使用{recommendedMode === 'recording' ? '录音模式' : '文件模式'}，是否切换？
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  handleModeSwitch(recommendedMode, 'AI智能推荐');
                  setShowModeRecommendation(false);
                }}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors"
              >
                切换
              </button>
              <button
                onClick={() => setShowModeRecommendation(false)}
                className="px-3 py-1 text-blue-600 text-sm hover:bg-blue-100 rounded-md transition-colors"
              >
                忽略
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Shared Sidebar */}
        <SharedSidebar
          projects={projects}
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
          searchQuery={searchQuery}
          currentMode={currentMode}
          onModeSwitch={handleModeSwitch}
        />

        {/* Mode-specific Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          {currentMode === 'file' ? (
            <CompactFileTranscriptionWorkspace
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              onModeSwitch={handleModeSwitch}
            />
          ) : (
            <RecordingWorkspace
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              onModeSwitch={handleModeSwitch}
            />
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default DualModeApp;