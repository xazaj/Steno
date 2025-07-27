import React from 'react';
import { 
  // PlayIcon, 
  // ClipboardDocumentIcon,
  // ArrowDownTrayIcon,
  // MagnifyingGlassIcon,
  // SpeakerWaveIcon,
  // CheckIcon
} from '@heroicons/react/24/outline';
// import { cn } from '../utils/cn';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { TranscriptionRecord } from '../types/transcription';
import { ProcessingConfig } from '../types/longAudio';
import LongAudioProcessor from './LongAudioProcessor';
import TranscriptionDisplay from './TranscriptionDisplay';

interface SmartTranscriptionDisplayProps {
  record: TranscriptionRecord;
  config?: ProcessingConfig;
  onComplete?: (result: { text: string; processingTime: number }) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
}

const SmartTranscriptionDisplay: React.FC<SmartTranscriptionDisplayProps> = ({
  record,
  config,
  onComplete,
  onProgress,
  onError
}) => {
  // 检测是否为长音频（5分钟以上）
  const isLongAudio = record.duration && record.duration > 300;
  
  // 检测是否需要处理
  const needsProcessing = record.status === 'processing' && !record.result;

  // 处理导出功能
  const handleExport = async () => {
    try {
      if (!record.result?.text) {
        console.warn('没有转录内容可以导出');
        return;
      }

      // 打开文件保存对话框
      const filePath = await save({
        filters: [{
          name: 'Text Files',
          extensions: ['txt']
        }],
        defaultPath: `${record.name}.txt`
      });

      if (filePath) {
        // 写入文件
        await writeTextFile(filePath, record.result.text);
        console.log('文件已保存到:', filePath);
      }
    } catch (error) {
      console.error('导出文件失败:', error);
    }
  };

  const defaultConfig: ProcessingConfig = {
    language: record.config.language,
    model_mode: record.config.mode,
    audio_enhancement: record.config.audioEnhancement,
    segment_overlap: 1.0,
    max_segment_length: 60.0,
    min_segment_length: 10.0,
  };

  const processingConfig = config || defaultConfig;

  if (needsProcessing && isLongAudio) {
    return (
      <LongAudioProcessor
        record={record}
        config={processingConfig}
        onComplete={onComplete || (() => {})}
        onProgress={onProgress}
        onError={onError}
      />
    );
  }

  // 对于短音频或已完成的转录，使用原始显示组件
  return (
    <TranscriptionDisplay
      text={record.result?.text || ''}
      fileName={record.name}
      processingTime={record.result?.processingTime}
      accuracy={record.result?.accuracy}
      audioFilePath={record.audioFilePath} // 传递音频文件路径
      onExport={handleExport} // 传递导出功能
      onTimeSeek={(time) => {
        // 时间跳转功能可以后续实现
        console.log('Time seek:', time);
      }}
    />
  );
};

export default SmartTranscriptionDisplay;