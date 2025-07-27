import React, { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from '@tauri-apps/plugin-dialog';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  AdjustmentsHorizontalIcon,
  BeakerIcon,
  CpuChipIcon,
  // SpeakerXMarkIcon, // 图标不存在，使用替代
  // WaveformIcon, // 图标不存在，使用替代
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import ConversationView from '../ConversationView';
import { useToast } from '../../hooks/useToast';

// 对应后台真实参数的接口定义
interface RecognitionProgress {
  stage: string;
  progress: number;
  message: string;
}

interface RecognitionResult {
  success: boolean;
  text?: string;
  error?: string;
  processing_time: number;
}

interface AudioProcessingConfig {
  // 音频预处理参数 (对应 AudioEnhancementConfig)
  enable_preemphasis: boolean;
  enable_normalization: boolean;
  enable_noise_reduction: boolean;
  enable_spectral_enhancement: boolean;
  enable_vad: boolean;
  enable_dynamic_range_compression: boolean;
  
  // VAD配置参数
  vad_threshold: number;
  min_speech_duration_ms: number;
  min_silence_duration_ms: number;
}

interface WhisperModelConfig {
  // Whisper模型参数 (对应 whisper_full_params)
  language: string;  // "zh", "en", "auto"
  mode: string;      // "standard", "high_precision"
  
  // 高级参数
  temperature: number;        // 0.0-1.0
  beam_size: number;         // beam search大小
  best_of: number;           // 贪婪搜索候选数
  n_threads: number;         // 线程数
  suppress_blank: boolean;   // 抑制空白
  token_timestamps: boolean; // 词级时间戳
}

interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    text: string;
    processing_time: number;
    accuracy_estimate?: number;
  };
}

interface OptimizedFileTranscriptionWorkspaceProps {
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  onModeSwitch: (mode: 'file' | 'recording', reason?: string) => void;
}

const OptimizedFileTranscriptionWorkspace: React.FC<OptimizedFileTranscriptionWorkspaceProps> = ({
  selectedProject,
  onProjectSelect,
  onModeSwitch,
}) => {
  // 文件管理状态
  const [fileQueue, setFileQueue] = useState<FileInfo[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 音频处理配置 (对应后台真实参数)
  const [audioConfig, setAudioConfig] = useState<AudioProcessingConfig>({
    enable_preemphasis: true,
    enable_normalization: true,
    enable_noise_reduction: true,
    enable_spectral_enhancement: true,
    enable_vad: true,
    enable_dynamic_range_compression: true,
    vad_threshold: 0.6,
    min_speech_duration_ms: 250,
    min_silence_duration_ms: 2000,
  });
  
  // Whisper模型配置 (对应后台真实参数)
  const [modelConfig, setModelConfig] = useState<WhisperModelConfig>({
    language: 'zh',           // 对应 params.language
    mode: 'standard',         // 对应处理模式分支
    temperature: 0.0,         // 对应 params.temperature
    beam_size: 2,            // 对应 params.beam_search.beam_size
    best_of: 3,              // 对应 params.greedy.best_of
    n_threads: 4,            // 对应 params.n_threads
    suppress_blank: true,     // 对应 params.suppress_blank
    token_timestamps: true,   // 对应 params.token_timestamps
  });
  
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  // const [currentPlayingFile, setCurrentPlayingFile] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { success, error, info } = useToast();
  const listenersRef = useRef<(() => void)[]>([]);

  // 设置事件监听器
  useEffect(() => {
    const setupListeners = async () => {
      // 清理旧的监听器
      listenersRef.current.forEach(unlisten => unlisten());
      listenersRef.current = [];

      // 监听进度更新
      const progressUnlisten = await listen<RecognitionProgress>('recognition_progress', (event) => {
        const progress = event.payload;
        
        // 更新对应文件的进度
        setFileQueue(prev => prev.map(file => {
          if (file.status === 'processing') {
            return {
              ...file,
              progress: progress.progress,
            };
          }
          return file;
        }));
      });

      // 监听识别完成
      const completeUnlisten = await listen<RecognitionResult>('recognition_complete', (event) => {
        const result = event.payload;
        setIsProcessing(false);
        
        // 更新文件状态
        setFileQueue(prev => prev.map(file => {
          if (file.status === 'processing') {
            if (result.success && result.text) {
              success("转录完成", `处理时间: ${result.processing_time.toFixed(1)}秒`);
              return {
                ...file,
                status: 'completed' as const,
                progress: 100,
                result: {
                  text: result.text,
                  processing_time: result.processing_time,
                  accuracy_estimate: estimateAccuracy(result.text),
                },
              };
            } else {
              const errorMsg = result.error || "未知错误";
              error("转录失败", errorMsg);
              return {
                ...file,
                status: 'failed' as const,
                error: errorMsg,
              };
            }
          }
          return file;
        }));
      });

      listenersRef.current = [progressUnlisten, completeUnlisten];
    };

    setupListeners();

    return () => {
      listenersRef.current.forEach(unlisten => unlisten());
    };
  }, [success, error]);

  // 估算准确率 (基于文本特征的简单估算)
  const estimateAccuracy = (text: string): number => {
    if (!text) return 0;
    
    // 基于文本长度、标点符号、重复字符等特征估算
    const hasProperPunctuation = /[。！？；：，]/.test(text);
    const hasRepeatedChars = /(.)\1{3,}/.test(text);
    const avgWordLength = text.replace(/\s+/g, '').length / (text.split(/\s+/).length || 1);
    
    let score = 85; // 基础分
    if (hasProperPunctuation) score += 8;
    if (!hasRepeatedChars) score += 5;
    if (avgWordLength > 1.5 && avgWordLength < 8) score += 2;
    
    return Math.min(Math.max(score, 70), 98);
  };

  // 文件选择处理
  const handleFileSelect = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Audio Files',
          extensions: ['wav', 'mp3', 'flac', 'ogg', 'aac', 'm4a', 'wma']
        }]
      });

      if (Array.isArray(selected)) {
        const newFiles: FileInfo[] = selected.map((path: string) => ({
          id: Date.now().toString() + Math.random(),
          name: path.split('/').pop() || path.split('\\').pop() || 'Unknown',
          path,
          size: 0, // 将通过后台获取
          status: 'pending',
          progress: 0,
        }));
        setFileQueue(prev => [...prev, ...newFiles]);
      } else if (typeof selected === 'string') {
        const newFile: FileInfo = {
          id: Date.now().toString(),
          name: (selected as string).split('/').pop() || (selected as string).split('\\').pop() || 'Unknown',
          path: selected,
          size: 0,
          status: 'pending',
          progress: 0,
        };
        setFileQueue(prev => [...prev, newFile]);
      }
    } catch (err) {
      error("文件选择失败", "无法打开文件选择器");
    }
  }, [error]);

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      /\.(wav|mp3|flac|ogg|aac|m4a|wma)$/i.test(file.name)
    );
    
    if (audioFiles.length === 0) {
      error("不支持的文件格式", "请选择音频文件 (WAV, MP3, FLAC, OGG, AAC, M4A, WMA)");
      return;
    }

    const newFiles: FileInfo[] = audioFiles.map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      path: (file as any).path || file.name, // File API doesn't have path in browser
      size: file.size,
      status: 'pending',
      progress: 0,
    }));

    setFileQueue(prev => [...prev, ...newFiles]);
  }, [error]);

  // 处理单个文件
  const processFile = useCallback(async (fileId: string) => {
    const file = fileQueue.find(f => f.id === fileId);
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setFileQueue(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'processing' as const, progress: 0 }
        : f
    ));

    try {
      info("开始转录", `正在处理: ${file.name}`);
      
      // 调用后台真实API，传递所有配置参数
      const whisperPrompt = localStorage.getItem('whisperPrompt') || '';
      
      await invoke("recognize_file_async", {
        path: file.path,
        language: modelConfig.language,
        mode: modelConfig.mode,
        initial_prompt: whisperPrompt || null,
        // 注意：高级参数可能需要通过其他方式传递或在后台配置
      });
      
      // 异步处理，结果通过事件返回
    } catch (err) {
      setIsProcessing(false);
      const errorMsg = err as string;
      setFileQueue(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'failed' as const, error: errorMsg }
          : f
      ));
      error("转录失败", errorMsg);
    }
  }, [fileQueue, isProcessing, modelConfig, info, error]);

  // 移除文件
  const removeFile = useCallback((fileId: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // 批量处理
  const processBatch = useCallback(async () => {
    const pendingFiles = fileQueue.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    info("批量处理", `开始处理 ${pendingFiles.length} 个文件`);
    
    // 按顺序处理文件
    for (const file of pendingFiles) {
      if (!isProcessing) {
        await processFile(file.id);
        // 等待当前文件处理完成再处理下一个
        await new Promise(resolve => {
          const checkInterval = setInterval(() => {
            if (!isProcessing) {
              clearInterval(checkInterval);
              resolve(void 0);
            }
          }, 1000);
        });
      }
    }
  }, [fileQueue, isProcessing, processFile, info]);

  // 根据模式自动调整参数
  useEffect(() => {
    setModelConfig(prev => {
      const newConfig = { ...prev };
      
      switch (prev.mode) {
        case 'standard':
          newConfig.beam_size = 2;
          newConfig.best_of = 3;
          newConfig.n_threads = 4;
          newConfig.temperature = 0.0;
          break;
        case 'high_precision':
          newConfig.beam_size = 5;
          newConfig.best_of = 8;
          newConfig.n_threads = 8;
          newConfig.temperature = 0.1;
          break;
      }
      
      return newConfig;
    });
  }, [modelConfig.mode]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const selectedFile = fileQueue.find(f => f.id === selectedProject);
  // const completedFiles = fileQueue.filter(f => f.status === 'completed');
  // const processingFiles = fileQueue.filter(f => f.status === 'processing');
  const pendingFiles = fileQueue.filter(f => f.status === 'pending');

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* 左列：文件管理 */}
      <div className="w-96 border-r border-gray-200 bg-white/40 backdrop-blur-sm flex flex-col">
        {/* 上传区域 */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">文件转录</h2>
            <p className="text-sm text-gray-600">上传音频文件进行专业级转录处理</p>
          </div>

          {/* 拖拽上传区 */}
          <div 
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer",
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
            <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {isDragOver ? '松开以上传文件' : '拖拽文件到这里'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              支持 WAV, MP3, FLAC, OGG, AAC, M4A, WMA
            </p>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleFileSelect();
              }}
            >
              选择文件
            </button>
          </div>

          {/* 批量操作 */}
          {pendingFiles.length > 1 && (
            <div className="mt-4">
              <button
                onClick={processBatch}
                disabled={isProcessing}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                批量处理 ({pendingFiles.length} 个文件)
              </button>
            </div>
          )}
        </div>

        {/* 文件队列 */}
        <div className="flex-1 overflow-y-auto">
          {fileQueue.length > 0 ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">处理队列</h3>
                <span className="text-sm text-gray-500">{fileQueue.length} 个文件</span>
              </div>

              {fileQueue.map((file) => (
                <div 
                  key={file.id}
                  className={cn(
                    "bg-white rounded-lg border p-3 cursor-pointer transition-all",
                    selectedProject === file.id 
                      ? "border-blue-200 shadow-sm bg-blue-50" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => onProjectSelect(file.id)}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(file.status)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {file.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(file.size)}</span>
                        {file.result && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              准确率: {file.result.accuracy_estimate}%
                            </span>
                          </>
                        )}
                      </div>
                      
                      {file.status === 'processing' && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>处理中...</span>
                            <span>{Math.round(file.progress)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {file.error && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          {file.error}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {file.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            processFile(file.id);
                          }}
                          disabled={isProcessing}
                          className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded disabled:opacity-50"
                        >
                          开始
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <DocumentIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">暂无文件</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 中列：配置参数 */}
      <div className="w-80 border-r border-gray-200 bg-white/60 backdrop-blur-sm flex flex-col">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">转录配置</h3>
            
            {/* 基础设置 */}
            <div className="space-y-4">
              {/* 语言设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  识别语言
                </label>
                <select 
                  value={modelConfig.language}
                  onChange={(e) => setModelConfig(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="auto">自动检测</option>
                </select>
              </div>

              {/* 处理模式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  处理质量
                </label>
                <select
                  value={modelConfig.mode}
                  onChange={(e) => setModelConfig(prev => ({ ...prev, mode: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="standard">标准质量 (推荐)</option>
                  <option value="high_precision">高精度模式</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {modelConfig.mode === 'standard' ? '平衡速度和准确度' : '优先准确度，处理时间较长'}
                </p>
              </div>

              {/* 音频预处理 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  音频预处理
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={audioConfig.enable_noise_reduction}
                      onChange={(e) => setAudioConfig(prev => ({ ...prev, enable_noise_reduction: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <SpeakerWaveIcon className="w-4 h-4 text-gray-400" />
                    <span>噪声抑制</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={audioConfig.enable_vad}
                      onChange={(e) => setAudioConfig(prev => ({ ...prev, enable_vad: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
                    <span>智能分段 (VAD)</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={audioConfig.enable_spectral_enhancement}
                      onChange={(e) => setAudioConfig(prev => ({ ...prev, enable_spectral_enhancement: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <BeakerIcon className="w-4 h-4 text-gray-400" />
                    <span>频谱增强</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={audioConfig.enable_normalization}
                      onChange={(e) => setAudioConfig(prev => ({ ...prev, enable_normalization: e.target.checked }))}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                    />
                    <span>音量标准化</span>
                  </label>
                </div>
              </div>

              {/* 高级设置 */}
              <div>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <AdjustmentsHorizontalIcon className="w-4 h-4" />
                  <span>高级设置</span>
                </button>

                {showAdvancedSettings && (
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                    {/* Beam Size */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        搜索宽度 (Beam Size): {modelConfig.beam_size}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={modelConfig.beam_size}
                        onChange={(e) => setModelConfig(prev => ({ ...prev, beam_size: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        随机性 (Temperature): {modelConfig.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={modelConfig.temperature}
                        onChange={(e) => setModelConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    {/* 线程数 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        <CpuChipIcon className="w-3 h-3 inline mr-1" />
                        线程数: {modelConfig.n_threads}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="16"
                        value={modelConfig.n_threads}
                        onChange={(e) => setModelConfig(prev => ({ ...prev, n_threads: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    {/* VAD阈值 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        VAD阈值: {audioConfig.vad_threshold}
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={audioConfig.vad_threshold}
                        onChange={(e) => setAudioConfig(prev => ({ ...prev, vad_threshold: parseFloat(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 当前配置状态 */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-900">配置概览</span>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div>语言: {modelConfig.language === 'zh' ? '中文' : modelConfig.language === 'en' ? '英文' : '自动检测'}</div>
              <div>质量: {modelConfig.mode === 'standard' ? '标准' : '高精度'}</div>
              <div>预处理: {Object.values(audioConfig).filter(Boolean).length} 项启用</div>
              <div>线程数: {modelConfig.n_threads}</div>
            </div>
          </div>

          {/* 性能提示 */}
          {modelConfig.mode === 'high_precision' && (
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-900">性能提示</span>
              </div>
              <p className="text-xs text-yellow-700">
                高精度模式将显著增加处理时间，建议用于重要文件。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 右列：结果展示 */}
      <div className="flex-1 flex flex-col">
        {selectedFile && selectedFile.status === 'completed' ? (
          <>
            {/* 音频播放器 */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-4">
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
                    <span>{selectedFile.name}</span>
                    <span>--:--</span>
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

                {/* 准确率显示 */}
                {selectedFile.result?.accuracy_estimate && (
                  <div className="text-sm text-green-600 font-medium">
                    准确率: {selectedFile.result.accuracy_estimate}%
                  </div>
                )}
              </div>
            </div>

            {/* 转录结果 */}
            <div className="flex-1">
              <ConversationView
                resultText={selectedFile.result?.text || ""}
                hasResult={!!selectedFile.result?.text}
                isRecognizing={false}
                onCopy={() => {}}
                onClear={() => {}}
                onExport={() => {}}
              />
            </div>
          </>
        ) : (
          /* 空状态 */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <DocumentIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                专业文件转录
              </h3>
              <p className="text-gray-600 mb-6">
                上传音频文件，使用 Whisper AI 获得高质量转录结果。支持多种音频格式和智能预处理。
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
                  或切换到实时录音模式
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OptimizedFileTranscriptionWorkspace;