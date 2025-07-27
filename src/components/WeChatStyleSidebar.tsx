import React from 'react';
import { 
  MicrophoneIcon,
  ArrowUpTrayIcon,
  CloudArrowDownIcon,
  Cog6ToothIcon,
  XMarkIcon,
  MinusIcon,
  Squares2X2Icon,
  ChatBubbleBottomCenterTextIcon,
  QueueListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { 
  MicrophoneIcon as MicrophoneIconSolid,
  ArrowUpTrayIcon as ArrowUpTrayIconSolid,
  QueueListIcon as QueueListIconSolid,
  SparklesIcon as SparklesIconSolid
} from '@heroicons/react/24/solid';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  activeIcon?: React.ComponentType<any>;
  badge?: number;
  onClick?: () => void;
}

interface WeChatStyleSidebarProps {
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  className?: string;
  recordingState?: any;
  onStartRecording?: () => void;
  onShowSettings?: () => void;
  onNewTranscription?: () => void;
  onShowPromptManager?: () => void;
  onShowPromptSidebar?: () => void;
  onShowModelManager?: () => void;
}

const WeChatStyleSidebar: React.FC<WeChatStyleSidebarProps> = ({
  activeItem = 'transcriptions',
  onItemClick,
  className = '',
  recordingState,
  onStartRecording,
  onShowSettings,
  onNewTranscription,
  onShowPromptManager,
  onShowPromptSidebar,
  onShowModelManager
}) => {
  const sidebarItems: SidebarItem[] = [
    {
      id: 'transcriptions',
      label: '转录记录',
      icon: QueueListIcon,
      activeIcon: QueueListIconSolid,
      onClick: () => onItemClick?.('all')
    },
    {
      id: 'new-transcription',
      label: '新建转录',
      icon: ArrowUpTrayIcon,
      activeIcon: ArrowUpTrayIconSolid,
      onClick: onNewTranscription
    },
    {
      id: 'realtime',
      label: '实时录音',
      icon: MicrophoneIcon,
      activeIcon: MicrophoneIconSolid,
      onClick: onStartRecording
    },
    {
      id: 'prompt-manager',
      label: '提示词管理',
      icon: SparklesIcon,
      activeIcon: SparklesIconSolid,
      onClick: onShowPromptManager
    },
    {
      id: 'model-config',
      label: '模型配置',
      icon: CloudArrowDownIcon,
      onClick: onShowModelManager
    }
  ];

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch (error) {
      console.error('Failed to maximize window:', error);
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (error) {
      console.error('Failed to close window:', error);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gray-100 border-r border-gray-200 ${className}`}>
      {/* 顶部空白区域 */}
      <div className="bg-gray-100" style={{ height: '22px' }}>
      </div>
      
      {/* 窗口控制区域 - 向下偏移 */}
      <div className="relative bg-gray-100" style={{ height: '44px' }}>
        {/* 红绿灯按钮 - 向上调整18px */}
        <div className="absolute left-2 flex items-center space-x-1.5" style={{ top: 'calc(50% - 18px)', transform: 'translateY(-50%)' }}>
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors flex items-center justify-center group"
            title="关闭"
          >
            <XMarkIcon className="w-2 h-2 text-red-800 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          {/* 最小化按钮 */}
          <button
            onClick={handleMinimize}
            className="w-3 h-3 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors flex items-center justify-center group"
            title="最小化"
          >
            <MinusIcon className="w-2 h-2 text-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          
          {/* 最大化按钮 */}
          <button
            onClick={handleMaximize}
            className="w-3 h-3 bg-green-500 rounded-full hover:bg-green-600 transition-colors flex items-center justify-center group"
            title="最大化"
          >
            <Squares2X2Icon className="w-2 h-2 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      </div>

      {/* 主导航区域 */}
      <div className="flex-1" style={{ paddingTop: '16px', paddingBottom: '24px' }}>
        <nav className="space-y-3 px-2">
          {sidebarItems.map((item) => {
            const isActive = activeItem === item.id;
            const Icon = isActive && item.activeIcon ? item.activeIcon : item.icon;
            const isRecording = item.id === 'realtime' && recordingState?.status === 'recording';
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="w-full flex items-center justify-center p-2.5 transition-colors duration-200"
                title={item.label}
              >
                <Icon className={`
                  w-6 h-6 transition-colors duration-200
                  ${isActive 
                    ? 'text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                  }
                  ${isRecording ? 'text-red-500' : ''}
                `} />
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shadow-lg font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 底部操作区域 */}
      <div className="bg-gray-100" style={{ paddingTop: '38px', paddingBottom: '16px', paddingLeft: '8px', paddingRight: '8px' }}>
        <div className="flex flex-col space-y-3">
          {/* 软件配置按钮 */}
          <button
            onClick={onShowSettings}
            className="w-full flex items-center justify-center p-2.5 text-gray-600 hover:bg-white/70 hover:shadow-md hover:scale-105 rounded-lg transition-all duration-300 group"
            title="软件配置"
          >
            <Cog6ToothIcon className="w-6 h-6 stroke-[1.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeChatStyleSidebar;