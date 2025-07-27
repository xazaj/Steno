// 转录记录相关的类型定义

export interface TranscriptionRecord {
  id: string;
  name: string;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  audioFilePath?: string; // 录音文件路径（用于实时录音）
  
  // 状态管理
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  
  // 转录结果
  result?: {
    text: string;
    processingTime: number;
    accuracy?: number;
    segments?: TranscriptionSegment[];
  };
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category?: string;
  isStarred: boolean;
  
  // 配置信息
  config: {
    language: string;
    mode: string;
    audioEnhancement: boolean;
  };
}

export interface TranscriptionSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface TranscriptionCategory {
  id: string;
  name: string;
  icon: string;
  type: 'system' | 'custom';
  recordCount: number;
}

export interface TranscriptionFilter {
  category?: string;
  status?: TranscriptionRecord['status'];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// 系统预设分类
export const SYSTEM_CATEGORIES: TranscriptionCategory[] = [
  {
    id: 'all',
    name: '所有转录',
    icon: 'MicrophoneIcon',
    type: 'system',
    recordCount: 0
  },
  {
    id: 'today',
    name: '今天',
    icon: 'CalendarDaysIcon',
    type: 'system',
    recordCount: 0
  },
  {
    id: 'week',
    name: '本周',
    icon: 'CalendarIcon',
    type: 'system',
    recordCount: 0
  },
  {
    id: 'starred',
    name: '收藏',
    icon: 'StarIcon',
    type: 'system',
    recordCount: 0
  }
];

// 转录状态图标映射
export const STATUS_ICONS = {
  waiting: 'ClockIcon',
  processing: 'ArrowPathIcon',
  completed: 'CheckCircleIcon',
  failed: 'XCircleIcon'
} as const;

// 转录状态颜色映射
export const STATUS_COLORS = {
  waiting: 'text-yellow-600 bg-yellow-50',
  processing: 'text-blue-600 bg-blue-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50'
} as const;