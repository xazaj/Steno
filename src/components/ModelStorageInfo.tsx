import React from 'react';
import { ServerStackIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface StorageInfo {
  used_space: number;
  total_space: number;
  available_space: number;
}

interface ModelStorageInfoProps {
  storageInfo: StorageInfo;
}

const ModelStorageInfo: React.FC<ModelStorageInfoProps> = ({ storageInfo }) => {
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getUsagePercentage = (): number => {
    if (storageInfo.total_space === 0) return 0;
    return Math.round((storageInfo.used_space / storageInfo.total_space) * 100);
  };

  const getUsageColor = (): string => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getUsageTextColor = (): string => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const percentage = getUsagePercentage();

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
      <h3 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
        <ServerStackIcon className="w-5 h-5 text-blue-600" />
        存储空间信息
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">模型存储使用情况</span>
          <span className={`text-sm font-medium ${getUsageTextColor()}`}>
            {formatBytes(storageInfo.used_space)} / {formatBytes(storageInfo.total_space)}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>已使用 {percentage}%</span>
            <span>可用空间: {formatBytes(storageInfo.available_space)}</span>
          </div>
        </div>

        {percentage >= 90 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            存储空间即将用完，建议删除不需要的模型文件
          </div>
        )}

        {percentage >= 70 && percentage < 90 && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" />
            存储空间使用较多，可考虑清理旧模型文件
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-800">
              {formatBytes(storageInfo.used_space)}
            </div>
            <div className="text-gray-500">已使用</div>
          </div>
          
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-800">
              {formatBytes(storageInfo.available_space)}
            </div>
            <div className="text-gray-500">可用</div>
          </div>
          
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium text-gray-800">
              {formatBytes(storageInfo.total_space)}
            </div>
            <div className="text-gray-500">总计</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelStorageInfo;