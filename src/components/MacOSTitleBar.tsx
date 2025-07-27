import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { 
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import AppMenu from './AppMenu';

interface MacOSTitleBarProps {
  title?: string;
  showTitle?: boolean;
  // 工具栏相关props
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const MacOSTitleBar: React.FC<MacOSTitleBarProps> = ({ 
  title = 'Steno', 
  showTitle = false,
  searchQuery,
  onSearchChange
}) => {
  const handleMaximize = () => getCurrentWindow().toggleMaximize();


  return (
    <div 
      data-tauri-drag-region
      className="macos-titlebar flex items-center justify-between px-4 py-1 bg-gradient-to-b from-white/95 to-gray-50/95 backdrop-blur-xl border-b border-black/5 select-none cursor-move"
      style={{ height: '44px' }}
      onDoubleClick={handleMaximize}
    >
      {/* 左侧：空白区域 */}
      <div className="w-16">
        {/* 预留空间，与侧边栏对齐 */}
      </div>

      {/* 中间标题区域 */}
      {showTitle && (
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-sm font-semibold text-gray-700 select-none">
            {title}
          </h1>
        </div>
      )}

      {/* 右侧工具栏 */}
      <div className="flex items-center gap-1.5 md:gap-2 pl-4 pr-3" style={{ pointerEvents: 'none' }}>
          {/* 全局搜索 */}
          <div className="relative hidden sm:block">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索转录记录..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="macos-input pl-9 pr-4 py-1 text-sm w-36 md:w-48 lg:w-56 h-7"
              style={{ pointerEvents: 'auto' }}
            />
          </div>
          
          {/* 移动端搜索按钮 */}
          <button className="sm:hidden macos-toolbar-button hover:bg-gray-50 hover:border-gray-200 hover:text-gray-700" style={{ pointerEvents: 'auto' }}>
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>

          {/* 应用菜单 */}
          <div style={{ pointerEvents: 'auto' }}>
            <AppMenu />
          </div>
      </div>
    </div>
  );
};

export default MacOSTitleBar;