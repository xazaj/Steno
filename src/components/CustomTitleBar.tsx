import React, { useState, useEffect } from 'react';
import MacOSTitleBar from './MacOSTitleBar';
import { getPlatform, type Platform } from '../utils/platform';

interface CustomTitleBarProps {
  title?: string;
  showTitle?: boolean;
  // 工具栏相关props
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ 
  title, 
  showTitle,
  searchQuery,
  onSearchChange
}) => {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectPlatform = async () => {
      try {
        const detectedPlatform = await getPlatform();
        setPlatform(detectedPlatform);
      } catch (error) {
        console.error('平台检测失败:', error);
        setPlatform('unknown');
      } finally {
        setIsLoading(false);
      }
    };

    detectPlatform();
  }, []);

  // 在平台检测期间显示占位符
  if (isLoading) {
    return (
      <div className="h-10 bg-gray-50 border-b border-gray-200 animate-pulse">
        {/* 占位符 */}
      </div>
    );
  }

  // 根据平台返回相应的标题栏
  switch (platform) {
    case 'macos':
      return (
        <MacOSTitleBar 
          title={title} 
          showTitle={showTitle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      );
    case 'windows':
      // 可以在这里添加 Windows 风格的标题栏
      return (
        <MacOSTitleBar 
          title={title} 
          showTitle={showTitle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      ); // 暂时使用 macOS 样式
    case 'linux':
      // 可以在这里添加 Linux 风格的标题栏
      return (
        <MacOSTitleBar 
          title={title} 
          showTitle={showTitle}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />
      ); // 暂时使用 macOS 样式
    default:
      // 默认不显示自定义标题栏
      return null;
  }
};

export default CustomTitleBar;