import React, { useState, useCallback } from 'react';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import ConversationView from '../ConversationView';

interface FileTranscriptionWorkspaceProps {
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  onModeSwitch: (mode: 'file' | 'recording', reason?: string) => void;
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  duration?: number;
  accuracy?: number;
  transcription?: string;
}

const FileTranscriptionWorkspace: React.FC<FileTranscriptionWorkspaceProps> = ({
  selectedProject,
  onProjectSelect,
  onModeSwitch,
}) => {
  const [uploadQueue, setUploadQueue] = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('zh');
  const [selectedQuality, setSelectedQuality] = useState('standard');
  const [batchMode, setBatchMode] = useState(false);
  // const [currentPlayingFile, setCurrentPlayingFile] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 文件处理
  const handleFileSelect = useCallback(async () => {
    // TODO: 实现文件选择逻辑
    const mockFile: FileItem = {
      id: Date.now().toString(),
      name: '示例音频.mp3',
      size: 5242880, // 5MB
      type: 'audio/mp3',
      status: 'pending',
      progress: 0,
      duration: 300, // 5 minutes
    };
    
    setUploadQueue(prev => [...prev, mockFile]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    const newFiles: FileItem[] = audioFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
    }));
    
    setUploadQueue(prev => [...prev, ...newFiles]);
    
    if (audioFiles.length > 1) {
      setBatchMode(true);
    }
  }, []);

  const handleProcessFile = (fileId: string) => {
    setUploadQueue(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, status: 'processing' as const }
        : file
    ));
    
    // 模拟处理进度
    const interval = setInterval(() => {
      setUploadQueue(prev => prev.map(file => {
        if (file.id === fileId && file.status === 'processing') {
          const newProgress = Math.min(file.progress + 10, 100);
          if (newProgress === 100) {
            clearInterval(interval);
            return {
              ...file,
              status: 'completed' as const,
              progress: 100,
              accuracy: 94 + Math.random() * 5, // 94-99%
              transcription: '这是一段示例转录文本，展示了高质量的语音识别结果...',
            };
          }
          return { ...file, progress: newProgress };
        }
        return file;
      }));
    }, 200);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: FileItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const completedFiles = uploadQueue.filter(f => f.status === 'completed');
  const processingFiles = uploadQueue.filter(f => f.status === 'processing');
  const pendingFiles = uploadQueue.filter(f => f.status === 'pending');

  return (
    <div className="flex-1 flex">
      {/* Left Panel: File Management */}
      <div className="w-96 border-r border-gray-200 bg-white/40 backdrop-blur-sm flex flex-col">
        {/* Upload Area */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">文件转录</h2>
            <p className="text-sm text-gray-600">上传音频文件进行高质量转录处理</p>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
              isDragOver 
                ? "border-blue-400 bg-blue-50" 
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {isDragOver ? '松开以上传文件' : '拖拽文件到这里'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              支持 MP3, WAV, M4A, FLAC 等格式
            </p>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleFileSelect();
              }}
            >
              选择文件
            </button>
          </div>

          {/* Quick Settings */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                识别语言
              </label>
              <select 
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="auto">自动检测</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                处理质量
              </label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fast">快速模式</option>
                <option value="standard">标准质量</option>
                <option value="high">高精度</option>
              </select>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">批量处理模式</span>
            </label>
          </div>
        </div>

        {/* File Queue */}
        {uploadQueue.length > 0 && (
          <div className="flex-1 border-t border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">处理队列</h3>
              <div className="flex items-center gap-2">
                <QueueListIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">{uploadQueue.length}</span>
              </div>
            </div>

            <div className="space-y-3">
              {uploadQueue.map((file) => (
                <div 
                  key={file.id}
                  className="bg-white rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        {file.duration && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(file.duration)}</span>
                          </>
                        )}
                        {file.accuracy && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">准确率: {file.accuracy.toFixed(1)}%</span>
                          </>
                        )}
                      </div>
                      
                      {file.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>处理中...</span>
                            <span>{file.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {file.status === 'pending' && (
                        <button
                          onClick={() => handleProcessFile(file.id)}
                          className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded"
                        >
                          开始
                        </button>
                      )}
                      {file.status === 'completed' && (
                        <button
                          onClick={() => onProjectSelect(file.id)}
                          className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded"
                        >
                          查看
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Actions */}
            {uploadQueue.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      pendingFiles.forEach(file => handleProcessFile(file.id));
                    }}
                    disabled={pendingFiles.length === 0}
                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    处理全部 ({pendingFiles.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 flex flex-col">
        {selectedProject || completedFiles.length > 0 ? (
          <>
            {/* Audio Player (if file selected) */}
            {selectedProject && (
              <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </button>
                    <button className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                      <BackwardIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                      <ForwardIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>00:00</span>
                      <span>05:30</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 cursor-pointer">
                      <div className="bg-blue-500 h-1 rounded-full w-1/3" />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <SpeakerWaveIcon className="w-4 h-4 text-gray-500" />
                    <div className="w-20 h-1 bg-gray-200 rounded-full">
                      <div className="bg-blue-500 h-1 rounded-full w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transcription Results */}
            <div className="flex-1">
              <ConversationView
                resultText={completedFiles[0]?.transcription || "转录结果将在处理完成后显示..."}
                hasResult={completedFiles.length > 0}
                isRecognizing={processingFiles.length > 0}
                onCopy={() => {}}
                onClear={() => setUploadQueue([])}
                onExport={() => {}}
              />
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <DocumentIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                开始文件转录
              </h3>
              <p className="text-gray-600 mb-6">
                上传音频文件，获得高质量的转录结果。支持批量处理和多种音频格式。
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleFileSelect}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  选择文件开始
                </button>
                <button
                  onClick={() => onModeSwitch('recording', '尝试录音模式')}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  或者尝试实时录音模式
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTranscriptionWorkspace;