import React, { useState, useCallback, useEffect } from 'react';
import { 
  XMarkIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  Cog6ToothIcon,
  CheckIcon,
  SparklesIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../utils/cn';
import CustomSelect from './CustomSelect';
import ReactMarkdown from 'react-markdown';

interface AudioProcessingConfig {
  enable_noise_reduction: boolean;
  enable_vad: boolean;
  enable_spectral_enhancement: boolean;
  enable_normalization: boolean;
}

interface WhisperModelConfig {
  language: string;
  mode: string;
  temperature: number;
  beam_size: number;
  n_threads: number;
}

interface ModelInfo {
  name: string;
  path: string;
  size: number;
  is_current: boolean;
  display_name: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

interface NewTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTranscription: (files: File[], config: any) => void;
}

const NewTranscriptionModal: React.FC<NewTranscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreateTranscription
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'config'>('upload');
  const [category, setCategory] = useState('meetings');
  const [tags, setTags] = useState('');
  const [currentModel, setCurrentModel] = useState<ModelInfo | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<PromptTemplate | null>(null);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  // 音频处理配置
  const [audioConfig, setAudioConfig] = useState<AudioProcessingConfig>({
    enable_noise_reduction: true,
    enable_vad: true,
    enable_spectral_enhancement: true,
    enable_normalization: true,
  });

  // Whisper模型配置（默认英文+标准质量）
  const [modelConfig, setModelConfig] = useState<WhisperModelConfig>({
    language: 'en',
    mode: 'standard',
    temperature: 0.0,
    beam_size: 2,
    n_threads: 4,
  });

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles([]);
      setTags('');
      setCurrentStep('upload');
      loadCurrentSettings();
    }
  }, [isOpen]);

  // 加载当前生效的模型和提示词
  const loadCurrentSettings = async () => {
    try {
      // 获取当前模型 - 使用专门的API
      const activeModel = await invoke<ModelInfo | null>('get_current_model');
      setCurrentModel(activeModel);

      // 获取当前提示词
      const prompts = await invoke<PromptTemplate[]>('get_prompt_templates');
      const activePrompt = prompts.find(prompt => prompt.is_active);
      
      // 如果没有活跃的提示词，尝试从 localStorage 获取（向后兼容）
      if (!activePrompt) {
        const legacyPrompt = localStorage.getItem('whisperPrompt');
        if (legacyPrompt) {
          setCurrentPrompt({
            id: 'legacy',
            name: '默认提示词',
            content: legacyPrompt,
            is_active: true,
            created_at: '',
            updated_at: '',
            usage_count: 0
          });
        }
      } else {
        setCurrentPrompt(activePrompt);
      }
    } catch (error) {
      console.error('Failed to load current settings:', error);
    }
  };

  // 智能推荐配置（简化版）
  const getSmartRecommendations = (files: File[]) => {
    const hasLargeFiles = files.some(file => file.size > 50 * 1024 * 1024);
    const fileCount = files.length;
    
    // 自动调整模式
    if (hasLargeFiles || fileCount > 3) {
      setModelConfig(prev => ({ ...prev, mode: 'standard' }));
    } else {
      setModelConfig(prev => ({ ...prev, mode: 'high_precision' }));
    }
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

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        
        // 注意：Tauri环境下需要特殊处理文件对象
        const fileObjects = files.map(path => ({
          name: path.split('/').pop() || path.split('\\').pop() || 'Unknown',
          path,
          size: Math.floor(Math.random() * 10 * 1024 * 1024) + 1024 * 1024, // 模拟文件大小 1-10MB
          type: 'audio/mpeg' // 简化处理
        } as any));
        
        setSelectedFiles(fileObjects);
        
        // 智能推荐配置
        getSmartRecommendations(fileObjects);
        
        // 自动进入配置步骤
        setCurrentStep('config');
      }
    } catch (err) {
      console.error('文件选择失败:', err);
    }
  }, []);

  // 拖拽处理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => 
      /\.(wav|mp3|flac|ogg|aac|m4a|wma)$/i.test(file.name)
    );
    
    if (audioFiles.length > 0) {
      setSelectedFiles(audioFiles);
      // 智能推荐配置
      getSmartRecommendations(audioFiles);
      // 自动进入配置步骤
      setCurrentStep('config');
    }
  }, []);

  // 移除文件
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    // 如果没有文件了，返回上传步骤
    if (newFiles.length === 0) {
      setCurrentStep('upload');
    }
  };

  // 更换/添加文件
  const handleChangeFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Audio Files',
          extensions: ['wav', 'mp3', 'flac', 'ogg', 'aac', 'm4a', 'wma']
        }]
      });

      if (selected) {
        const files = Array.isArray(selected) ? selected : [selected];
        
        const fileObjects = files.map(path => ({
          name: path.split('/').pop() || path.split('\\').pop() || 'Unknown',
          path,
          size: Math.floor(Math.random() * 10 * 1024 * 1024) + 1024 * 1024,
          type: 'audio/mpeg'
        } as any));
        
        setSelectedFiles(prev => [...prev, ...fileObjects]);
        getSmartRecommendations([...selectedFiles, ...fileObjects]);
      }
    } catch (err) {
      console.error('文件选择失败:', err);
    }
  }, [selectedFiles]);

  // 创建转录
  const handleCreate = () => {
    if (selectedFiles.length === 0) return;

    const config = {
      audio: audioConfig,
      model: modelConfig,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean)
    };

    onCreateTranscription(selectedFiles, config);
    
    // 重置状态
    setSelectedFiles([]);
    setTags('');
    onClose();
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 获取预计处理时间
  const getEstimatedTime = () => {
    if (selectedFiles.length === 0) return 0;
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return Math.ceil(totalSize / (1024 * 1024) * 0.3); // 大致估算
  };

  // 选项配置
  const categoryOptions = [
    { 
      value: 'meetings', 
      label: '会议记录', 
      description: '商务会议、团队讨论',
      badge: '常用',
      badgeColor: 'bg-green-100 text-green-700'
    },
    { 
      value: 'interviews', 
      label: '客户访谈', 
      description: '用户调研、客户沟通',
      badge: '专业',
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    { 
      value: 'podcasts', 
      label: '播客录音', 
      description: '音频节目、在线课程',
      badge: '媒体',
      badgeColor: 'bg-purple-100 text-purple-700'
    },
    { 
      value: 'other', 
      label: '其他', 
      description: '自定义分类内容'
    }
  ];

  const languageOptions = [
    { 
      value: 'auto', 
      label: '自动检测', 
      description: '智能识别音频语言',
      badge: '推荐',
      badgeColor: 'bg-orange-100 text-orange-700'
    },
    { 
      value: 'zh', 
      label: '中文', 
      description: '简体中文、繁体中文'
    },
    { 
      value: 'en', 
      label: 'English', 
      description: '英语（美式、英式）'
    }
  ];

  const qualityOptions = [
    { 
      value: 'high_precision', 
      label: '高精度', 
      description: '最佳质量，处理时间较长',
      badge: '最佳',
      badgeColor: 'bg-green-100 text-green-700'
    },
    { 
      value: 'standard', 
      label: '标准', 
      description: '平衡质量与速度',
      badge: '推荐',
      badgeColor: 'bg-blue-100 text-blue-700'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">新建转录</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 主要内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'upload' ? (
            /* 第一步：文件上传 */
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div 
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer w-full max-w-md",
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
                <CloudArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {isDragOver ? '松开以上传文件' : '拖拽音频文件到这里'}
                </h3>
                <p className="text-gray-600 mb-6">
                  支持 WAV, MP3, FLAC, OGG, AAC, M4A, WMA 格式
                </p>
                <button 
                  className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileSelect();
                  }}
                >
                  或点击选择文件
                </button>
              </div>
            </div>
          ) : (
            /* 第二步：参数配置 */
            <div className="space-y-6">
              {/* 已选择文件展示 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    已选择 {selectedFiles.length} 个文件
                  </h4>
                  <button
                    onClick={handleChangeFiles}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    添加文件
                  </button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>


              {/* 快速配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">转录配置</h3>
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI 已优化</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <CustomSelect
                    label="分类"
                    value={category}
                    onChange={setCategory}
                    options={categoryOptions}
                    placeholder="选择分类"
                  />

                  <CustomSelect
                    label="语言"
                    value={modelConfig.language}
                    onChange={(value) => setModelConfig(prev => ({ ...prev, language: value }))}
                    options={languageOptions}
                    placeholder="选择语言"
                  />

                  <CustomSelect
                    label="质量"
                    value={modelConfig.mode}
                    onChange={(value) => setModelConfig(prev => ({ ...prev, mode: value }))}
                    options={qualityOptions}
                    placeholder="选择质量"
                  />
                </div>

                {/* 标签输入 */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    标签 (可选)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="如：重要, 客户, Q1..."
                    className="
                      w-full px-3 py-2.5 text-sm
                      bg-white border border-gray-200 rounded-lg
                      placeholder:text-gray-400
                      hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                      transition-all duration-200
                    "
                  />
                </div>

                {/* 高级设置 */}
                <div>
                  <button
                    onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>{showAdvancedConfig ? '隐藏高级设置' : '显示高级设置'}</span>
                  </button>

                  {showAdvancedConfig && (
                    <div className="mt-4 bg-gray-50 rounded-lg p-4 space-y-5">
                      {/* 1. 使用模型 */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-800">使用模型</h4>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5">
                              <CpuChipIcon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {currentModel ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {currentModel.name}.bin
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {currentModel.display_name}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">未选择模型</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. 提示词模板 */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-800">提示词模板</h4>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mt-0.5">
                              <ChatBubbleLeftRightIcon className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {currentPrompt ? (
                                <div>
                                  <div className="text-sm font-medium text-gray-900 mb-2">
                                    {currentPrompt.name}
                                  </div>
                                  <div className="relative">
                                    <div className={cn(
                                      "bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200",
                                      !showFullPrompt && currentPrompt.content.length > 80 && "cursor-pointer hover:bg-gray-100 transition-colors"
                                    )}>
                                      {currentPrompt.content ? (
                                        <div className="prompt-content text-xs text-gray-700 leading-relaxed">
                                          <ReactMarkdown
                                            components={{
                                              // 段落
                                              p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                              // 标题
                                              h1: ({children}) => <h1 className="text-sm font-bold text-gray-900 mb-2 mt-0">{children}</h1>,
                                              h2: ({children}) => <h2 className="text-sm font-semibold text-gray-800 mb-1.5 mt-2 first:mt-0">{children}</h2>,
                                              h3: ({children}) => <h3 className="text-xs font-semibold text-gray-800 mb-1 mt-1.5 first:mt-0">{children}</h3>,
                                              // 强调
                                              strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                              em: ({children}) => <em className="italic">{children}</em>,
                                              // 代码
                                              code: ({children, className}) => {
                                                const isInline = !className?.includes('language-');
                                                return isInline ? 
                                                  <code className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded font-mono text-xs">{children}</code> :
                                                  <code className="block bg-gray-200 text-gray-800 p-2 rounded font-mono text-xs overflow-x-auto">{children}</code>;
                                              },
                                              // 列表
                                              ul: ({children}) => <ul className="list-disc list-inside space-y-0.5 mb-2 ml-2">{children}</ul>,
                                              ol: ({children}) => <ol className="list-decimal list-inside space-y-0.5 mb-2 ml-2">{children}</ol>,
                                              li: ({children}) => <li className="text-xs">{children}</li>,
                                              // 引用
                                              blockquote: ({children}) => (
                                                <blockquote className="border-l-3 border-gray-300 pl-3 italic text-gray-600 mb-2 bg-gray-50 py-1">
                                                  {children}
                                                </blockquote>
                                              ),
                                              // 链接
                                              a: ({children, href}) => (
                                                <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
                                                  {children}
                                                </a>
                                              ),
                                            }}
                                          >
                                            {!showFullPrompt && currentPrompt.content.length > 80 
                                              ? `${currentPrompt.content.slice(0, 80)}...` 
                                              : currentPrompt.content
                                            }
                                          </ReactMarkdown>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-500 italic">(空提示词)</div>
                                      )}
                                    </div>
                                    {currentPrompt.content.length > 80 && (
                                      <button
                                        onClick={() => setShowFullPrompt(!showFullPrompt)}
                                        className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                      >
                                        {showFullPrompt ? (
                                          <>
                                            <ChevronUpIcon className="w-3 h-3" />
                                            收起内容
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDownIcon className="w-3 h-3" />
                                            查看完整内容
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">未设置提示词</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. 音频预处理设置 */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                          <h4 className="text-sm font-semibold text-gray-800">音频预处理设置</h4>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 border border-gray-100">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'enable_noise_reduction', label: '噪声抑制', desc: '降低背景噪音' },
                              { key: 'enable_vad', label: '智能分段', desc: '自动检测语音' },
                              { key: 'enable_spectral_enhancement', label: '频谱增强', desc: '提升音质清晰度' },
                              { key: 'enable_normalization', label: '音量标准化', desc: '统一音量大小' }
                            ].map(({ key, label, desc }) => (
                              <label key={key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={audioConfig[key as keyof AudioProcessingConfig]}
                                  onChange={(e) => setAudioConfig(prev => ({ 
                                    ...prev, 
                                    [key]: e.target.checked 
                                  }))}
                                  className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 mt-0.5"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 group-hover:text-gray-800">
                                    {label}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {desc}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {currentStep === 'upload' ? (
            <>
              <div className="text-sm text-gray-600">
                请选择音频文件开始转录
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                取消
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                <span>✓ 已选择 {selectedFiles.length} 个文件，点击开始处理</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all",
                    "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md"
                  )}
                >
                  <CheckIcon className="w-4 h-4" />
                  开始转录
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default NewTranscriptionModal;