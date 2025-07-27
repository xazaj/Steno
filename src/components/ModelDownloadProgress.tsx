import React, { useEffect } from 'react';
import { XMarkIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

interface DownloadProgress {
  model_name: string;
  downloaded: number;
  total: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error' | 'paused';
}

interface ModelDownloadProgressProps {
  progress: DownloadProgress;
  onComplete: () => void;
}

const ModelDownloadProgress: React.FC<ModelDownloadProgressProps> = ({
  progress,
  onComplete
}) => {
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const getProgressPercentage = (): number => {
    if (progress.total === 0) return 0;
    return Math.round((progress.downloaded / progress.total) * 100);
  };

  const getStatusText = (): string => {
    switch (progress.status) {
      case 'downloading': return '下载中';
      case 'completed': return '下载完成';
      case 'error': return '下载失败';
      case 'paused': return '已暂停';
      default: return '未知状态';
    }
  };

  const getStatusColor = (): string => {
    switch (progress.status) {
      case 'downloading': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    if (progress.status === 'completed') {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress.status, onComplete]);

  const percentage = getProgressPercentage();

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-800 flex items-center gap-2">
          <ArchiveBoxIcon className="w-5 h-5 text-blue-600" />
          模型下载进度
        </h4>
        {progress.status === 'error' && (
          <button
            onClick={onComplete}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {progress.model_name}
          </span>
          <span className={`
            px-2 py-1 text-xs rounded-full text-white font-medium
            ${getStatusColor()}
          `}>
            {getStatusText()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</span>
            <span>{percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {progress.status === 'downloading' && progress.speed > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>下载速度: {formatSpeed(progress.speed)}</span>
            <span>
              剩余时间: {
                progress.speed > 0 
                  ? Math.ceil((progress.total - progress.downloaded) / progress.speed) + 's'
                  : '计算中...'
              }
            </span>
          </div>
        )}

        {progress.status === 'completed' && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <span>下载完成！正在更新模型列表...</span>
          </div>
        )}

        {progress.status === 'error' && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <span>下载失败，请检查网络连接后重试</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelDownloadProgress;