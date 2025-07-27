import React from 'react';
import { CheckCircleIcon, ArrowPathIcon, TrashIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface ModelInfo {
  name: string;
  path: string;
  size: number;
  is_current: boolean;
}

interface InstalledModelsListProps {
  models: ModelInfo[];
  loading: boolean;
  onSwitchModel: (modelPath: string) => void;
  onDeleteModel: (modelPath: string) => void;
}

const InstalledModelsList: React.FC<InstalledModelsListProps> = ({
  models,
  loading,
  onSwitchModel,
  onDeleteModel
}) => {
  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDelete = (modelPath: string, modelName: string) => {
    if (window.confirm(`确定要删除模型 ${modelName} 吗？此操作无法撤销。`)) {
      onDeleteModel(modelPath);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
        <CpuChipIcon className="w-5 h-5 text-green-600" />
        已安装模型
      </h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>暂未安装任何模型</p>
          <p className="text-sm mt-1">请从下方可下载模型列表中选择模型进行安装</p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.path}
              className={`
                p-3 rounded-lg border transition-colors
                ${model.is_current 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {model.name}
                    </span>
                    {model.is_current && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircleIcon className="w-4 h-4" />
                        当前使用
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    大小: {formatSize(model.size)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!model.is_current && (
                    <button
                      onClick={() => onSwitchModel(model.path)}
                      disabled={loading}
                      className="
                        flex items-center gap-1 px-3 py-1 text-sm
                        bg-blue-500 text-white rounded-md
                        hover:bg-blue-600 disabled:opacity-50
                        transition-colors
                      "
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                      切换
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(model.path, model.name)}
                    disabled={loading || model.is_current}
                    className={`
                      flex items-center gap-1 px-3 py-1 text-sm rounded-md
                      transition-colors
                      ${model.is_current
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50'
                      }
                    `}
                    title={model.is_current ? '无法删除当前使用的模型' : '删除模型'}
                  >
                    <TrashIcon className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstalledModelsList;