import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import InstalledModelsList from './InstalledModelsList';
import AvailableModelsList from './AvailableModelsList';
import ModelDownloadProgress from './ModelDownloadProgress';
import ModelStorageInfo from './ModelStorageInfo';
import LocalModelLoader from './LocalModelLoader';

interface ModelInfo {
  name: string;
  path: string;
  size: number;
  is_current: boolean;
}

interface AvailableModel {
  name: string;
  size: string;
  url: string;
  description: string;
  languages: string;
  quality: string;
}

interface StorageInfo {
  used_space: number;
  total_space: number;
  available_space: number;
}

interface DownloadProgress {
  model_name: string;
  downloaded: number;
  total: number;
  speed: number;
  status: 'downloading' | 'completed' | 'error' | 'paused';
}

const ModelManagementPanel: React.FC = () => {
  const [installedModels, setInstalledModels] = useState<ModelInfo[]>([]);
  const [availableModels] = useState<AvailableModel[]>([
    {
      name: 'ggml-large-v3',
      size: '3.1GB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
      description: 'Whisper Large V3 - 最高质量',
      languages: 'multilingual',
      quality: 'highest'
    },
    {
      name: 'ggml-large-v2',
      size: '3.09GB', 
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v2.bin',
      description: 'Whisper Large V2 - 高质量',
      languages: 'multilingual',
      quality: 'high'
    },
    {
      name: 'ggml-medium',
      size: '1.53GB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
      description: 'Whisper Medium - 良好质量',
      languages: 'multilingual',
      quality: 'good'
    },
    {
      name: 'ggml-small',
      size: '488MB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
      description: 'Whisper Small - 一般质量',
      languages: 'multilingual',
      quality: 'fair'
    },
    {
      name: 'ggml-base',
      size: '148MB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
      description: 'Whisper Base - 基础质量',
      languages: 'multilingual',
      quality: 'basic'
    },
    {
      name: 'ggml-tiny',
      size: '77.7MB',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
      description: 'Whisper Tiny - 最小模型',
      languages: 'multilingual',
      quality: 'minimal'
    }
  ]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInstalledModels();
    loadStorageInfo();
    
    const unlistenDownload = listen<DownloadProgress>('model_download_progress', (event) => {
      setDownloadProgress(event.payload);
    });

    return () => {
      unlistenDownload.then(fn => fn());
    };
  }, []);

  const loadInstalledModels = async () => {
    try {
      setLoading(true);
      const models = await invoke<ModelInfo[]>('list_installed_models');
      setInstalledModels(models);
    } catch (error) {
      console.error('Failed to load installed models:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await invoke<StorageInfo>('get_storage_info');
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const handleDownloadModel = async (model: AvailableModel) => {
    try {
      await invoke('download_model', { 
        modelName: model.name,
        url: model.url 
      });
    } catch (error) {
      console.error('Failed to start model download:', error);
    }
  };

  const handleSwitchModel = async (modelPath: string) => {
    try {
      setLoading(true);
      await invoke('switch_model', { modelPath });
      await loadInstalledModels();
    } catch (error) {
      console.error('Failed to switch model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (modelPath: string) => {
    try {
      setLoading(true);
      await invoke('delete_model', { modelPath });
      await loadInstalledModels();
      await loadStorageInfo();
    } catch (error) {
      console.error('Failed to delete model:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDownloadComplete = () => {
    setDownloadProgress(null);
    loadInstalledModels();
    loadStorageInfo();
  };

  const onLocalModelsLoaded = () => {
    loadInstalledModels();
    loadStorageInfo();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <CloudArrowDownIcon className="w-6 h-6" />
          Whisper模型管理
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {storageInfo && (
          <ModelStorageInfo storageInfo={storageInfo} />
        )}

        {downloadProgress && (
          <ModelDownloadProgress 
            progress={downloadProgress}
            onComplete={onDownloadComplete}
          />
        )}

        <InstalledModelsList 
          models={installedModels}
          loading={loading}
          onSwitchModel={handleSwitchModel}
          onDeleteModel={handleDeleteModel}
        />

        <LocalModelLoader
          onModelsLoaded={onLocalModelsLoaded}
          loading={loading}
        />

        <AvailableModelsList
          models={availableModels}
          installedModels={installedModels}
          onDownloadModel={handleDownloadModel}
          downloading={downloadProgress !== null}
        />
      </div>
    </div>
  );
};

export default ModelManagementPanel;