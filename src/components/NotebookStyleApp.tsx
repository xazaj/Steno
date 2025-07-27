import React, { useState, useEffect, useCallback } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Components
import UnifiedTranscriptionList from './UnifiedTranscriptionList';
// import TranscriptionDisplay from './TranscriptionDisplay';
import NewTranscriptionModal from './NewTranscriptionModal';
import SettingsPanel from './SettingsPanel';
import Toast from './Toast';
import RealtimeRecordingModal from './RealtimeRecordingModal';
import RealtimeConfigPanel from './RealtimeConfigPanel';
import GlobalRecordingIndicator from './GlobalRecordingIndicator';
import RealtimeTranscriptionDisplay from './RealtimeTranscriptionDisplay';
import CustomTitleBar from './CustomTitleBar';
import WeChatStyleSidebar from './WeChatStyleSidebar';
import { PromptManager } from './PromptManager';
import { PromptManagementSidebar } from './PromptManagementSidebar';
import ModelManagementPanel from './ModelManagementPanel';

// Types and hooks
import { TranscriptionRecord } from '../types/transcription';
import { useToast } from '../hooks/useToast';
import { storageService } from '../utils/storage';
import SmartTranscriptionDisplay from './SmartTranscriptionDisplay';
import { useRealtimeRecording } from '../hooks/useRealtimeRecording';

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

const NotebookStyleApp: React.FC = () => {
  // 状态管理
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewTranscriptionModal, setShowNewTranscriptionModal] = useState(false);
  const [showRealtimeRecordingModal, setShowRealtimeRecordingModal] = useState(false);
  const [showRealtimeConfigPanel, setShowRealtimeConfigPanel] = useState(false);
  const [activeRealtimeRecordId, setActiveRealtimeRecordId] = useState<string | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [showPromptSidebar, setShowPromptSidebar] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  
  // 转录记录
  const [transcriptionRecords, setTranscriptionRecords] = useState<TranscriptionRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TranscriptionRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  
  // Toast 通知
  const { toasts, removeToast, success, error, info } = useToast();
  
  // 实时录音功能 - 已集成真实的 Whisper.cpp 调用
  const {
    recordingState,
    audioLevel,
    error: recordingError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    // clearTranscript,
    // updateConfig,
    config: realtimeConfig,
  } = useRealtimeRecording();

  // 录音错误处理
  useEffect(() => {
    if (recordingError) {
      error('录音错误', recordingError);
    }
  }, [recordingError, error]);


  // 录音结果处理
  const handleRecordingResult = useCallback(async (segments: any[]) => {
    if (segments.length === 0) return;

    try {
      // 将录音段落转换为转录记录
      const transcriptText = segments
        .filter(seg => !seg.isTemporary)
        .map(seg => seg.speaker ? `${seg.speaker}：${seg.text}` : seg.text)
        .join('\n');

      if (!transcriptText.trim()) return;

      // 创建新的转录记录
      const newRecord: Omit<TranscriptionRecord, 'id'> = {
        name: `实时录音_${new Date().toLocaleString()}`,
        originalFileName: `实时录音_${new Date().toLocaleString()}`,
        filePath: '',
        fileSize: 0,
        status: 'completed',
        progress: 100,
        result: {
          text: transcriptText,
          processingTime: recordingState.duration,
          accuracy: segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isStarred: false,
        tags: ['实时录音'],
        category: '实时录音',
        config: {
          language: realtimeConfig.language,
          mode: realtimeConfig.mode,
          audioEnhancement: realtimeConfig.noiseReduction,
        },
      };

      // 为新记录生成ID
      const recordWithId = { ...newRecord, id: `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
      await storageService.saveRecord(recordWithId);
      setTranscriptionRecords(prev => [recordWithId, ...prev]);
      
      success('录音完成', `已保存 ${segments.length} 个语音段落`);
      
      // 选中新创建的记录
      setSelectedRecord(recordWithId.id);
      
    } catch (err) {
      console.error('保存录音结果失败:', err);
      error('保存失败', '无法保存录音结果');
    }
  }, [recordingState.duration, recordingState.speakerCount, realtimeConfig, success, error]);

  // 处理实时录音开始
  const handleStartRealtimeRecording = useCallback(async (config: any) => {
    try {
      // 创建新的实时录音记录
      const recordId = `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newRecord: TranscriptionRecord = {
        id: recordId,
        name: `实时录音 ${new Date().toLocaleString()}`,
        originalFileName: `实时录音_${new Date().toISOString().split('T')[0]}`,
        filePath: '',
        fileSize: 0,
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['实时录音'],
        category: 'meetings',
        isStarred: false,
        config: {
          language: config.language,
          mode: config.mode,
          audioEnhancement: config.noiseReduction
        },
        result: {
          text: '',
          processingTime: 0,
          accuracy: 0
        }
      };

      // 添加到记录列表顶部
      setTranscriptionRecords(prev => [newRecord, ...prev]);
      
      // 选中新创建的记录
      setSelectedRecord(recordId);
      setActiveRealtimeRecordId(recordId);
      
      // 保存到存储
      await storageService.saveRecord(newRecord);
      
      // 开始实际录音
      await startRecording(config);
      
      // 关闭配置面板
      setShowRealtimeConfigPanel(false);
      
      info('开始录音', '实时转录记录已创建，正在进行语音识别...');
      
    } catch (err) {
      console.error('启动实时录音失败:', err);
      error('录音失败', '无法启动实时录音功能');
    }
  }, [startRecording, info, error]);

  // 处理录音停止
  const handleStopRealtimeRecording = useCallback(async () => {
    try {
      await stopRecording();
      
      if (activeRealtimeRecordId) {
        // 更新录音记录状态为完成
        const finalText = recordingState.segments
          .filter(seg => !seg.isTemporary)
          .map(seg => seg.speaker ? `${seg.speaker}：${seg.text}` : seg.text)
          .join('\n');
          
        setTranscriptionRecords(prev => prev.map(r => 
          r.id === activeRealtimeRecordId
            ? {
                ...r,
                status: 'completed',
                progress: 100,
                updatedAt: new Date(),
                audioFilePath: recordingState.audioFilePath, // 保存音频文件路径
                result: {
                  text: finalText || '录音无有效内容',
                  processingTime: recordingState.duration,
                  accuracy: recordingState.segments.length > 0 
                    ? recordingState.segments.reduce((sum, seg) => sum + seg.confidence, 0) / recordingState.segments.length * 100
                    : 0
                }
              }
            : r
        ));
        
        // 更新存储
        await storageService.updateResult(activeRealtimeRecordId, {
          text: finalText || '录音无有效内容',
          processing_time: recordingState.duration,
          accuracy: recordingState.segments.length > 0 
            ? recordingState.segments.reduce((sum, seg) => sum + seg.confidence, 0) / recordingState.segments.length * 100
            : 0
        });
        
        setActiveRealtimeRecordId(null);
        success('录音完成', `已保存 ${recordingState.segments.length} 个语音段落`);
      }
      
    } catch (err) {
      console.error('停止录音失败:', err);
      error('停止失败', '录音停止时发生错误');
    }
  }, [stopRecording, activeRealtimeRecordId, recordingState, success, error]);

  // 录音状态变化处理
  useEffect(() => {
    if (recordingState.status === 'idle' && activeRealtimeRecordId) {
      // 录音已结束，保存最终结果
      handleStopRealtimeRecording();
    }
  }, [recordingState.status, activeRealtimeRecordId, handleStopRealtimeRecording]);

  // 实时更新录音记录内容
  useEffect(() => {
    if (activeRealtimeRecordId && recordingState.status === 'recording') {
      const currentText = recordingState.segments
        .filter(seg => !seg.isTemporary)
        .map(seg => seg.speaker ? `${seg.speaker}：${seg.text}` : seg.text)
        .join('\n');
        
      if (recordingState.currentText) {
        // 添加临时文本预览
        const previewText = currentText + (currentText ? '\n' : '') + 
          `[正在识别] ${recordingState.currentText}`;
        
        setTranscriptionRecords(prev => prev.map(r => 
          r.id === activeRealtimeRecordId
            ? {
                ...r,
                result: {
                  ...r.result!,
                  text: previewText
                },
                updatedAt: new Date()
              }
            : r
        ));
      } else if (currentText !== (transcriptionRecords.find(r => r.id === activeRealtimeRecordId)?.result?.text || '')) {
        // 更新确认的文本
        setTranscriptionRecords(prev => prev.map(r => 
          r.id === activeRealtimeRecordId
            ? {
                ...r,
                result: {
                  ...r.result!,
                  text: currentText
                },
                updatedAt: new Date()
              }
            : r
        ));
      }
    }
  }, [activeRealtimeRecordId, recordingState, transcriptionRecords]);

  // 全局快捷键支持
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + R: 开始/停止录音
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        if (recordingState.status === 'recording' || recordingState.status === 'paused') {
          handleStopRealtimeRecording();
        } else {
          setShowRealtimeConfigPanel(true);
        }
      }
      
      // 空格键: 暂停/继续录音（仅在弃音时）
      if (event.code === 'Space' && (recordingState.status === 'recording' || recordingState.status === 'paused')) {
        // 检查是否在输入框中
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return; // 在输入框中时不触发快捷键
        }
        
        event.preventDefault();
        if (recordingState.status === 'recording') {
          pauseRecording();
        } else if (recordingState.status === 'paused') {
          resumeRecording();
        }
      }
      
      // Escape: 关闭配置面板
      if (event.key === 'Escape') {
        if (showRealtimeConfigPanel) {
          setShowRealtimeConfigPanel(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [recordingState.status, handleStopRealtimeRecording, pauseRecording, resumeRecording, showRealtimeConfigPanel]);

  // 初始化加载数据
  useEffect(() => {
    const loadStoredRecords = async () => {
      try {
        setIsLoadingRecords(true);
        const records = await storageService.getAllRecords();
        
        // 直接设置记录，不进行存储更新以避免错误
        // 数据迁移在显示层面处理
        setTranscriptionRecords(records);
      } catch (err) {
        console.error('Failed to load stored records:', err);
        error("加载失败", "无法加载已保存的转录记录");
      } finally {
        setIsLoadingRecords(false);
      }
    };

    loadStoredRecords();
  }, [error]);

  // 自动选中第一条记录
  useEffect(() => {
    if (!isLoadingRecords && filteredRecords.length > 0) {
      // 如果没有选中任何记录，或者当前选中的记录不在筛选结果中，则自动选中第一条
      const isSelectedRecordInFiltered = selectedRecord && filteredRecords.some(r => r.id === selectedRecord);
      if (!selectedRecord || !isSelectedRecordInFiltered) {
        setSelectedRecord(filteredRecords[0].id);
      }
    } else if (filteredRecords.length === 0) {
      // 如果没有筛选结果，清空选中状态
      setSelectedRecord(null);
    }
  }, [isLoadingRecords, selectedRecord, filteredRecords]);

  // 计算各分类的记录数量
  const getRecordCounts = useCallback(() => {
    const counts: Record<string, number> = {};
    
    // 系统分类计数
    counts['all'] = transcriptionRecords.length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    counts['today'] = transcriptionRecords.filter(r => 
      r.createdAt >= today
    ).length;
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    counts['week'] = transcriptionRecords.filter(r => 
      r.createdAt >= weekStart
    ).length;
    
    counts['starred'] = transcriptionRecords.filter(r => r.isStarred).length;
    
    // 自定义分类计数
    counts['meetings'] = transcriptionRecords.filter(r => r.category === 'meetings').length;
    counts['interviews'] = transcriptionRecords.filter(r => r.category === 'interviews').length;
    counts['podcasts'] = transcriptionRecords.filter(r => r.category === 'podcasts').length;
    
    return counts;
  }, [transcriptionRecords]);

  // 过滤记录
  useEffect(() => {
    let filtered = [...transcriptionRecords];

    // 按分类过滤
    if (selectedCategory === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => r.createdAt >= today);
    } else if (selectedCategory === 'week') {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(r => r.createdAt >= weekStart);
    } else if (selectedCategory === 'starred') {
      filtered = filtered.filter(r => r.isStarred);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // 按搜索关键词过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.originalFileName.toLowerCase().includes(query) ||
        (r.result?.text && r.result.text.toLowerCase().includes(query)) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 按时间倒序排列
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    setFilteredRecords(filtered);
  }, [transcriptionRecords, selectedCategory, searchQuery]);

  // 创建转录任务
  const handleCreateTranscription = useCallback(async (files: File[], config: any) => {
    const newRecords: TranscriptionRecord[] = files.map(file => {
      const recordId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      return {
        id: recordId,
        name: file.name.replace(/\.[^/.]+$/, ""), // 移除扩展名
        originalFileName: file.name,
        filePath: (file as any).path || file.name,
        fileSize: file.size,
        status: 'waiting',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [...(config.tags || []), '文件上传'],
        category: config.category || 'other',
        isStarred: false,
        config: {
          language: config.model.language,
          mode: config.model.mode,
          audioEnhancement: Object.values(config.audio).some(Boolean)
        }
      };
    });

    // 添加到记录列表并保存到存储
    setTranscriptionRecords(prev => [...newRecords, ...prev]);
    
    // 保存新记录到存储
    for (const record of newRecords) {
      try {
        await storageService.saveRecord(record);
      } catch (err) {
        console.error('Failed to save record:', err);
      }
    }

    // 开始处理第一个文件
    if (newRecords.length > 0) {
      const firstRecord = newRecords[0];
      setSelectedRecord(firstRecord.id);
      processTranscriptionRecord(firstRecord, config);
    }

    info("转录任务已创建", `已添加 ${files.length} 个文件到处理队列`);
  }, [info]);

  // 检测是否为长音频
  const isLongAudio = useCallback((duration?: number) => {
    return duration && duration > 300; // 5分钟以上视为长音频
  }, []);

  // 处理转录记录
  const processTranscriptionRecord = useCallback(async (record: TranscriptionRecord, config: any) => {
    // 更新状态为处理中
    const updatedRecord = { ...record, status: 'processing' as const, progress: 0, updatedAt: new Date() };
    setTranscriptionRecords(prev => prev.map(r => 
      r.id === record.id ? updatedRecord : r
    ));
    
    // 更新存储中的状态
    try {
      await storageService.updateStatus(record.id, 'processing', 0);
    } catch (err) {
      console.error('Failed to update record status:', err);
    }

    try {
      info("开始转录", `正在处理: ${record.name}`);
      
      // 检查是否为长音频，如果是则使用长音频处理流程
      if (isLongAudio(record.duration)) {
        info("检测到长音频", "将使用专门的长音频处理流程");
        // 长音频处理逻辑将在TranscriptionDisplay中处理
        return;
      }
      
      // 设置进度监听
      const progressUnlisten = await listen<RecognitionProgress>('recognition_progress', async (event) => {
        const progress = event.payload;
        
        setTranscriptionRecords(prev => prev.map(r => 
          r.id === record.id 
            ? { ...r, progress: progress.progress, updatedAt: new Date() }
            : r
        ));
        
        // 更新存储中的进度
        try {
          await storageService.updateStatus(record.id, 'processing', progress.progress);
        } catch (err) {
          console.error('Failed to update progress:', err);
        }
      });

      // 设置完成监听
      const completeUnlisten = await listen<RecognitionResult>('recognition_complete', async (event) => {
        const result = event.payload;
        
        if (result.success && result.text) {
          const completedRecord = {
            text: result.text,
            processingTime: result.processing_time,
            accuracy: estimateAccuracy(result.text)
          };
          
          // 更新存储中的结果
          try {
            await storageService.updateResult(record.id, {
              text: result.text,
              processing_time: result.processing_time,
              accuracy: completedRecord.accuracy,
            });
          } catch (err) {
            console.error('Failed to save result:', err);
          }
          
          success("转录完成", `处理时间: ${result.processing_time.toFixed(1)}秒`);
        } else {
          const errorMsg = result.error || "未知错误";
          
          // 更新存储中的错误状态
          try {
            await storageService.updateStatus(record.id, 'failed', 0, errorMsg);
          } catch (err) {
            console.error('Failed to update error status:', err);
          }
          
          error("转录失败", errorMsg);
        }
        
        setTranscriptionRecords(prev => prev.map(r => {
          if (r.id === record.id) {
            if (result.success && result.text) {
              return {
                ...r,
                status: 'completed',
                progress: 100,
                updatedAt: new Date(),
                result: {
                  text: result.text,
                  processingTime: result.processing_time,
                  accuracy: estimateAccuracy(result.text)
                }
              };
            } else {
              return {
                ...r,
                status: 'failed',
                error: result.error || "未知错误",
                updatedAt: new Date()
              };
            }
          }
          return r;
        }));

        // 清理监听器
        progressUnlisten();
        completeUnlisten();
      });
      
      // 调用后台API
      // 获取持久化的提示词设置（优先使用数据库中的活跃提示词）
      let initial_prompt = '';
      try {
        const prompts = await invoke<any[]>('get_prompt_templates');
        const activePrompt = prompts.find(prompt => prompt.is_active);
        if (activePrompt && activePrompt.content) {
          initial_prompt = activePrompt.content;
        } else {
          // 回退到localStorage（向后兼容）
          initial_prompt = localStorage.getItem('whisperPrompt') || '';
        }
      } catch (err) {
        console.warn('Failed to load prompt templates, using localStorage:', err);
        initial_prompt = localStorage.getItem('whisperPrompt') || '';
      }
      
      await invoke("recognize_file_async", {
        path: record.filePath,
        language: config.model.language,
        mode: config.model.mode,
        initial_prompt: initial_prompt || null,
      });
      
    } catch (err) {
      const errorMsg = err as string;
      setTranscriptionRecords(prev => prev.map(r => 
        r.id === record.id 
          ? { ...r, status: 'failed', error: errorMsg, updatedAt: new Date() }
          : r
      ));
      error("转录失败", errorMsg);
    }
  }, [info, success, error]);

  // 估算准确率
  const estimateAccuracy = (text: string): number => {
    if (!text) return 0;
    
    const hasProperPunctuation = /[.!?;:,]/.test(text);
    const hasRepeatedChars = /(.)\\1{3,}/.test(text);
    const avgWordLength = text.replace(/\\s+/g, '').length / (text.split(/\\s+/).length || 1);
    
    let score = 85;
    if (hasProperPunctuation) score += 8;
    if (!hasRepeatedChars) score += 5;
    if (avgWordLength > 1.5 && avgWordLength < 8) score += 2;
    
    return Math.min(Math.max(score, 70), 98);
  };

  // 切换收藏状态
  const handleToggleStarred = useCallback(async (recordId: string) => {
    try {
      const newStarState = await storageService.toggleStar(recordId);
      setTranscriptionRecords(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, isStarred: newStarState, updatedAt: new Date() }
          : r
      ));
    } catch (err) {
      console.error('Failed to toggle star:', err);
      error("操作失败", "无法更新收藏状态");
    }
  }, [error]);

  // 更新记录名称
  const handleUpdateRecordName = useCallback(async (recordId: string, newName: string) => {
    try {
      await storageService.updateRecordName(recordId, newName);
      setTranscriptionRecords(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, name: newName, updatedAt: new Date() }
          : r
      ));
    } catch (err) {
      console.error('Failed to update record name:', err);
      error("更新失败", "无法更新转录记录名称");
    }
  }, [error]);

  // 删除记录
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    try {
      await storageService.deleteRecord(recordId);
      setTranscriptionRecords(prev => prev.filter(r => r.id !== recordId));
      
      // 如果删除的是当前选中的记录，清空选中状态
      if (selectedRecord === recordId) {
        setSelectedRecord(null);
      }
      
      success("删除成功", "转录记录已删除");
    } catch (err) {
      console.error('Failed to delete record:', err);
      error("删除失败", "无法删除转录记录");
    }
  }, [selectedRecord, success, error]);

  // 停止转录
  const handleStopTranscription = useCallback(async (recordId: string) => {
    try {
      await invoke('cancel_file_transcription');
      info("取消转录", "转录任务已取消");
      
      // 更新记录状态
      setTranscriptionRecords(prev => prev.map(r => 
        r.id === recordId 
          ? { ...r, status: 'failed' as const, error: '用户取消', updatedAt: new Date() }
          : r
      ));
      
      // 更新存储中的状态
      await storageService.updateStatus(recordId, 'failed', 0, '用户取消');
      
    } catch (err) {
      console.error('Failed to stop transcription:', err);
      error("取消失败", "无法停止转录任务");
    }
  }, [info, error]);

  // 获取当前选中的记录
  const currentRecord = transcriptionRecords.find(r => r.id === selectedRecord);

  return (
    <div className="app-window h-screen flex">
      {/* 微信风格侧边栏 */}
      <div className="w-16 flex-shrink-0">
        <WeChatStyleSidebar
          activeItem={
            showPromptManager ? 'prompt-manager' : 
            showModelManager ? 'model-config' : 
            'transcriptions'
          }
          onItemClick={(category) => {
            setSelectedCategory(category);
            setShowPromptManager(false); // 点击任何其他项目时关闭提示词管理
            setShowModelManager(false); // 点击任何其他项目时关闭模型管理
          }}
          recordingState={recordingState}
          onStartRecording={() => {
            setShowRealtimeConfigPanel(true);
            setShowPromptManager(false);
            setShowModelManager(false);
          }}
          onShowSettings={() => {
            setShowSettings(true);
            setShowPromptManager(false);
            setShowModelManager(false);
          }}
          onNewTranscription={() => {
            setShowNewTranscriptionModal(true);
            setShowPromptManager(false);
            setShowModelManager(false);
          }}
          onShowPromptManager={() => {
            setShowPromptManager(true);
            setShowModelManager(false); // 关闭模型管理
            setSelectedRecord(null);
          }}
          onShowPromptSidebar={() => {
            setShowPromptSidebar(true);
          }}
          onShowModelManager={() => {
            setShowModelManager(true);
            setShowPromptManager(false); // 关闭提示词管理
            setSelectedRecord(null);
          }}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 自定义标题栏（集成工具栏功能） */}
        <CustomTitleBar 
          title="Steno" 
          showTitle={false}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* 内容区域 - 响应式布局 */}
        <div className="flex-1 flex overflow-hidden">
          {showPromptManager ? (
            /* 提示词管理全屏显示 */
            <div className="flex-1 h-full">
              <PromptManager />
            </div>
          ) : showModelManager ? (
            /* 模型管理全屏显示 */
            <div className="flex-1 h-full">
              <ModelManagementPanel />
            </div>
          ) : (
            <>
              {/* 左侧：统一的转录记录列表 */}
              <div className="w-full md:w-96 flex-shrink-0 h-full">
                <UnifiedTranscriptionList
                  records={filteredRecords}
                  selectedRecord={selectedRecord}
                  onRecordSelect={(recordId) => {
                    setSelectedRecord(recordId);
                    setShowPromptManager(false);
                  }}
                  onToggleStar={handleToggleStarred}
                  onNewTranscription={() => setShowNewTranscriptionModal(true)}
                  searchQuery={searchQuery}
                  selectedCategory={selectedCategory}
                  onCategorySelect={(category) => {
                    setSelectedCategory(category);
                    setShowPromptManager(false);
                  }}
                  recordCounts={getRecordCounts()}
                  isLoading={isLoadingRecords}
                  onUpdateRecordName={handleUpdateRecordName}
                  onDeleteRecord={handleDeleteRecord}
                  onStopTranscription={handleStopTranscription}
                />
              </div>

          {/* 右侧：转录内容展示 */}
          <div className="hidden md:flex flex-1 flex-col">
            {activeRealtimeRecordId && recordingState.status !== 'idle' ? (
              <RealtimeTranscriptionDisplay
                segments={recordingState.segments}
                currentText={recordingState.currentText}
                duration={recordingState.duration}
                speakerCount={recordingState.speakerCount}
                isRecording={recordingState.status === 'recording'}
                className="h-full"
              />
            ) : currentRecord ? (
              <SmartTranscriptionDisplay
                record={currentRecord}
                onComplete={(result) => {
                  // 更新记录状态
                  setTranscriptionRecords(prev => prev.map(r => 
                    r.id === currentRecord.id 
                      ? { 
                          ...r, 
                          status: 'completed',
                          progress: 100,
                          updatedAt: new Date(),
                          result: {
                            text: result.text,
                            processingTime: result.processingTime,
                            accuracy: estimateAccuracy(result.text)
                          }
                        }
                      : r
                  ));
                  
                  // 保存到存储
                  storageService.updateResult(currentRecord.id, {
                    text: result.text,
                    processing_time: result.processingTime,
                    accuracy: estimateAccuracy(result.text),
                  }).catch(err => console.error('Failed to save result:', err));
                  
                  success("转录完成", `处理时间: ${result.processingTime.toFixed(1)}秒`);
                }}
                onProgress={(progress) => {
                  setTranscriptionRecords(prev => prev.map(r => 
                    r.id === currentRecord.id 
                      ? { ...r, progress, updatedAt: new Date() }
                      : r
                  ));
                }}
                onError={(errorMsg) => {
                  setTranscriptionRecords(prev => prev.map(r => 
                    r.id === currentRecord.id 
                      ? { ...r, status: 'failed', error: errorMsg, updatedAt: new Date() }
                      : r
                  ));
                  
                  // 更新存储中的错误状态
                  storageService.updateStatus(currentRecord.id, 'failed', 0, errorMsg)
                    .catch(err => console.error('Failed to update error status:', err));
                  
                  error("转录失败", errorMsg);
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    选择转录记录
                  </h3>
                  <p className="text-gray-600 mb-6">
                    从左侧选择一个转录记录来查看详细内容，或创建新的转录任务。
                  </p>
                  <button
                    onClick={() => setShowNewTranscriptionModal(true)}
                    className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                  >
                    新建转录
                  </button>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* 弹出框 */}
      <NewTranscriptionModal
        isOpen={showNewTranscriptionModal}
        onClose={() => setShowNewTranscriptionModal(false)}
        onCreateTranscription={handleCreateTranscription}
      />

      <RealtimeRecordingModal
        isOpen={showRealtimeRecordingModal}
        onClose={() => {
          if (recordingState.status !== 'recording') {
            setShowRealtimeRecordingModal(false);
          }
        }}
        onStartRecording={startRecording}
        onStopRecording={async () => {
          await stopRecording();
          // 等待一小段时间确保状态更新
          setTimeout(() => {
            handleRecordingResult(recordingState.segments);
          }, 100);
        }}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
      />

      <RealtimeConfigPanel
        isOpen={showRealtimeConfigPanel}
        onClose={() => setShowRealtimeConfigPanel(false)}
        onStartRecording={handleStartRealtimeRecording}
        defaultConfig={realtimeConfig}
      />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* 全局录音指示器 */}
      <GlobalRecordingIndicator
        isRecording={recordingState.status === 'recording'}
        isPaused={recordingState.status === 'paused'}
        duration={recordingState.duration}
        audioLevel={audioLevel}
        onStop={handleStopRealtimeRecording}
        onPause={pauseRecording}
        onResume={resumeRecording}
      />

      {/* 提示词管理侧边栏 */}
      <PromptManagementSidebar
        isOpen={showPromptSidebar}
        onClose={() => setShowPromptSidebar(false)}
        onPromptSelect={(prompt) => {
          console.log('Selected prompt:', prompt);
          // TODO: 应用选中的提示词
          setShowPromptSidebar(false);
        }}
        onCreatePrompt={(prompt) => {
          console.log('Created prompt:', prompt);
          // TODO: 保存新创建的提示词
        }}
      />

      {/* Toast 通知 */}
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default NotebookStyleApp;