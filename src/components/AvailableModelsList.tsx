import React from 'react';
import { ArrowDownTrayIcon, CheckIcon, CloudIcon } from '@heroicons/react/24/outline';

interface AvailableModel {
  name: string;
  size: string;
  url: string;
  description: string;
  languages: string;
  quality: string;
}

interface ModelInfo {
  name: string;
  path: string;
  size: number;
  is_current: boolean;
}

interface AvailableModelsListProps {
  models: AvailableModel[];
  installedModels: ModelInfo[];
  onDownloadModel: (model: AvailableModel) => void;
  downloading: boolean;
}

const AvailableModelsList: React.FC<AvailableModelsListProps> = ({
  models,
  installedModels,
  onDownloadModel,
  downloading
}) => {
  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case 'highest': return 'text-purple-600 bg-purple-100';
      case 'high': return 'text-blue-600 bg-blue-100';
      case 'good': return 'text-green-600 bg-green-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'basic': return 'text-orange-600 bg-orange-100';
      case 'minimal': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getQualityText = (quality: string): string => {
    switch (quality) {
      case 'highest': return '最高';
      case 'high': return '高';
      case 'good': return '良好';
      case 'fair': return '一般';
      case 'basic': return '基础';
      case 'minimal': return '最小';
      default: return '未知';
    }
  };

  const isModelInstalled = (modelName: string): boolean => {
    return installedModels.some(model => model.name === modelName);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
        <CloudIcon className="w-5 h-5 text-blue-600" />
        可下载模型
      </h3>
      
      <div className="space-y-2">
        {models.map((model) => {
          const installed = isModelInstalled(model.name);
          
          return (
            <div
              key={model.name}
              className="p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800">
                      {model.name}
                    </span>
                    <span className={`
                      px-2 py-1 text-xs rounded-full font-medium
                      ${getQualityColor(model.quality)}
                    `}>
                      {getQualityText(model.quality)}质量
                    </span>
                    {installed && (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckIcon className="w-4 h-4" />
                        已安装
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{model.description}</p>
                    <div className="flex items-center gap-4">
                      <span>大小: {model.size}</span>
                      <span>语言: 多语言支持</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  {installed ? (
                    <div className="flex items-center gap-1 px-3 py-2 text-sm text-green-600 bg-green-100 rounded-md">
                      <CheckIcon className="w-4 h-4" />
                      已安装
                    </div>
                  ) : (
                    <button
                      onClick={() => onDownloadModel(model)}
                      disabled={downloading}
                      className="
                        flex items-center gap-1 px-3 py-2 text-sm
                        bg-blue-500 text-white rounded-md
                        hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors
                      "
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {downloading ? '下载中...' : '下载'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">模型选择建议:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>- <strong>Large V3</strong>: 最佳转录质量，适合专业使用</li>
          <li>- <strong>Medium</strong>: 质量与速度平衡，推荐日常使用</li>
          <li>- <strong>Small/Base</strong>: 适合快速转录，对准确性要求不高</li>
          <li>- <strong>Tiny</strong>: 最小模型，适合低配置设备</li>
        </ul>
      </div>
    </div>
  );
};

export default AvailableModelsList;