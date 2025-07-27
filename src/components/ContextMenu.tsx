import React, { useRef, useEffect } from 'react';
import { TrashIcon, StopIcon } from '@heroicons/react/24/outline';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
  onStop?: () => void;
  visible: boolean;
  canStop?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onDelete,
  onStop,
  visible,
  canStop = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // 计算菜单位置，确保不超出屏幕边界
  const getMenuPosition = () => {
    if (!menuRef.current) return { left: x, top: y };
    
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // 如果菜单右边超出屏幕，向左调整
    if (left + menuRect.width > viewportWidth) {
      left = viewportWidth - menuRect.width - 8;
    }
    
    // 如果菜单底部超出屏幕，向上调整
    if (top + menuRect.height > viewportHeight) {
      top = viewportHeight - menuRect.height - 8;
    }
    
    return { left: Math.max(8, left), top: Math.max(8, top) };
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
    onClose();
  };

  const position = getMenuPosition();

  return (
    <div
      ref={menuRef}
      className="fixed bg-white/95 backdrop-blur-xl rounded-lg border border-gray-300/60 z-50 py-1 min-w-[120px] overflow-hidden"
      style={{
        left: position.left,
        top: position.top,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
      }}
    >
      {canStop && onStop && (
        <button
          onClick={handleStop}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-500 hover:text-white transition-all duration-100 ease-out"
        >
          <StopIcon className="w-4 h-4" />
          <span className="font-medium">停止转录</span>
        </button>
      )}
      <button
        onClick={handleDelete}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-500 hover:text-white transition-all duration-100 ease-out"
      >
        <TrashIcon className="w-4 h-4" />
        <span className="font-medium">删除记录</span>
      </button>
    </div>
  );
};

export default ContextMenu;