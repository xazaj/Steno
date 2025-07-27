import React, { useState } from 'react';
import { FolderOpenIcon, CheckCircleIcon, XCircleIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

interface LocalModel {
  name: string;
  path: string;
  size: number;
  valid: boolean;
}

interface LocalModelLoaderProps {
  onModelsLoaded: (models: LocalModel[]) => void;
  loading: boolean;
}

const LocalModelLoader: React.FC<LocalModelLoaderProps> = ({ onModelsLoaded, loading }) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [scannedModels, setScannedModels] = useState<LocalModel[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSelectFolder = async () => {
    try {
      const folderPath = await open({
        directory: true,
        multiple: false,
        title: '选择包含Whisper模型的文件夹'
      });

      if (folderPath && typeof folderPath === 'string') {
        setSelectedFolder(folderPath);
        await scanFolder(folderPath);
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
    }
  };

  const scanFolder = async (folderPath: string) => {
    try {
      setScanning(true);
      const models = await invoke<LocalModel[]>('scan_local_models', { folderPath });
      setScannedModels(models);
    } catch (error) {
      console.error('扫描文件夹失败:', error);
      setScannedModels([]);
    } finally {
      setScanning(false);
    }
  };

  const handleImportModels = async () => {
    if (scannedModels.length === 0) return;

    try {
      setImportLoading(true);
      const validModels = scannedModels.filter(model => model.valid);
      
      for (const model of validModels) {
        await invoke('import_local_model', { 
          modelPath: model.path,
          modelName: model.name 
        });
      }

      // 通知父组件刷新模型列表
      onModelsLoaded(validModels);
      
      // 重置状态
      setSelectedFolder('');
      setScannedModels([]);
    } catch (error) {
      console.error('导入模型失败:', error);
    } finally {
      setImportLoading(false);
    }
  };

  const validModelCount = scannedModels.filter(model => model.valid).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-gray-700 flex items-center gap-2">
          <FolderOpenIcon className="w-5 h-5 text-orange-600" />
          本地模型导入
        </h3>
      </div>

      {/* 选择文件夹 */}
      <div className="space-y-3">
        <button
          onClick={handleSelectFolder}
          disabled={loading || scanning || importLoading}
          className="
            w-full flex items-center justify-center gap-2 p-3 
            border-2 border-dashed border-gray-300 rounded-lg
            hover:border-orange-400 hover:bg-orange-50
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <FolderOpenIcon className="w-5 h-5" />
          {scanning ? '扫描中...' : '选择包含模型文件的文件夹'}
        </button>

        {selectedFolder && (
          <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded border-l-4 border-orange-400">
            <strong>已选择文件夹:</strong> {selectedFolder}
          </div>
        )}
      </div>

      {/* 扫描结果 */}
      {scannedModels.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              发现 {scannedModels.length} 个文件，其中 {validModelCount} 个有效模型
            </span>
            {validModelCount > 0 && (
              <button
                onClick={handleImportModels}
                disabled={importLoading}
                className="
                  px-4 py-2 text-sm bg-orange-500 text-white rounded-md
                  hover:bg-orange-600 disabled:opacity-50
                  transition-colors
                "
              >
                {importLoading ? '导入中...' : `导入 ${validModelCount} 个模型`}
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {scannedModels.map((model, index) => (
              <div
                key={index}
                className={`
                  p-3 rounded-lg border flex items-center justify-between
                  ${model.valid 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <DocumentIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-800">
                      {model.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatSize(model.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {model.valid ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircleIcon className="w-4 h-4" />
                      有效模型
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600 text-sm">
                      <XCircleIcon className="w-4 h-4" />
                      无效文件
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scannedModels.length === 0 && selectedFolder && !scanning && (
        <div className="text-center py-6 text-gray-500">
          <DocumentIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>该文件夹中未找到有效的Whisper模型文件</p>
          <p className="text-sm mt-1">支持的文件格式: .bin</p>
        </div>
      )}

      {/* 使用说明 - 只在有扫描结果或选择了文件夹时显示 */}
      {(scannedModels.length > 0 || selectedFolder) && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="text-sm font-medium text-orange-800 mb-2">使用说明:</h4>
          <ul className="text-xs text-orange-700 space-y-1">
            <li>- 选择包含Whisper模型文件(.bin格式)的文件夹</li>
            <li>- 系统会自动扫描并识别有效的模型文件</li>
            <li>- 有效的模型文件将被复制到应用的模型目录</li>
            <li>- 导入后可在已安装模型列表中查看和使用</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocalModelLoader;