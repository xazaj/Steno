import React, { useState, useRef, useEffect } from 'react';
import { 
  DocumentIcon,
  StarIcon,
  PlayIcon,
  ArrowPathIcon,
  XCircleIcon,
  ChevronDownIcon,
  FunnelIcon,
  MicrophoneIcon,
  CalendarDaysIcon,
  CalendarIcon,
  UserGroupIcon,
  MegaphoneIcon,
  SpeakerWaveIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../utils/cn';
import { TranscriptionRecord } from '../types/transcription';
import InlineEditableText from './InlineEditableText';
import ContextMenu from './ContextMenu';

interface UnifiedTranscriptionListProps {
  records: TranscriptionRecord[];
  selectedRecord: string | null;
  onRecordSelect: (recordId: string) => void;
  onToggleStar: (recordId: string) => void;
  onNewTranscription: () => void;
  searchQuery: string;
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  recordCounts: Record<string, number>;
  isLoading?: boolean;
  onUpdateRecordName?: (recordId: string, newName: string) => void;
  onDeleteRecord?: (recordId: string) => void;
  onStopTranscription?: (recordId: string) => void;
}


// 分类配置
const CATEGORIES = [
  { id: 'all', name: '全部', icon: MicrophoneIcon },
  { id: 'today', name: '今天', icon: CalendarDaysIcon },
  { id: 'week', name: '本周', icon: CalendarIcon },
  { id: 'starred', name: '收藏', icon: StarIcon },
  { id: 'meetings', name: '会议', icon: UserGroupIcon },
  { id: 'interviews', name: '访谈', icon: MegaphoneIcon },
  { id: 'podcasts', name: '播客', icon: SpeakerWaveIcon },
];

const UnifiedTranscriptionList: React.FC<UnifiedTranscriptionListProps> = ({
  records,
  selectedRecord,
  onRecordSelect,
  onToggleStar,
  onNewTranscription,
  searchQuery,
  selectedCategory,
  onCategorySelect,
  recordCounts,
  isLoading = false,
  onUpdateRecordName,
  onDeleteRecord,
  onStopTranscription
}) => {
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    recordId: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    recordId: ''
  });

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryFilter(false);
      }
    };

    if (showCategoryFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryFilter]);


  // 格式化时长
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 格式化相对时间
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}天前`;
    } else if (diffHours > 0) {
      return `${diffHours}小时前`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  // 获取录音来源类型
  const getSourceType = (record: TranscriptionRecord) => {
    // 安全检查标签数组
    const tags = record.tags || [];
    
    // 优先检查标签
    if (tags.includes('实时录音')) {
      return '实时转录';
    }
    if (tags.includes('文件上传')) {
      return '文件转录';
    }
    
    // 兼容存量数据：根据文件属性判断
    if (record.fileSize === 0 && (record.filePath === '' || !record.filePath)) {
      return '实时转录';
    }
    
    // 默认为文件上传
    return '文件转录';
  };

  // 高亮搜索关键词
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  // 获取当前分类名称
  const getCurrentCategoryName = () => {
    const category = CATEGORIES.find(cat => cat.id === selectedCategory);
    return category?.name || '全部';
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, recordId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      recordId
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleDeleteRecord = () => {
    if (contextMenu.recordId && onDeleteRecord) {
      onDeleteRecord(contextMenu.recordId);
    }
  };

  const handleStopTranscription = () => {
    if (contextMenu.recordId && onStopTranscription) {
      onStopTranscription(contextMenu.recordId);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full border-r border-gray-200 bg-gradient-to-b from-white to-gray-50/50 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <div className="spinner border-color-primary border-t-transparent"></div>
          </div>
          <p className="text-sm text-text-secondary font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full border-r border-gray-200 bg-gradient-to-b from-white to-gray-50/50 scrollable-flex-container backdrop-blur-sm">
      {/* 顶部筛选器 */}
      <div className="px-4 py-3 border-b border-gray-200/60 bg-white/95 backdrop-blur-sm">
        {/* macOS风格分类筛选器 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300/70 rounded-lg shadow-sm hover:bg-gray-50/80 hover:border-gray-400/70 transition-all duration-150 ease-macos-standard focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center">
                <FunnelIcon className="w-3 h-3 text-gray-600" />
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.01em] text-gray-800" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>{getCurrentCategoryName()}</span>
              {recordCounts[selectedCategory] > 0 && (
                <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight min-w-[22px] text-center" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'}}>
                  {recordCounts[selectedCategory]}
                </span>
              )}
            </div>
            <ChevronDownIcon className={cn(
              "w-4 h-4 text-gray-500 transition-all duration-200 ease-macos-standard",
              showCategoryFilter && "rotate-180 text-blue-500"
            )} />
          </button>

          {/* macOS风格下拉菜单 */}
          {showCategoryFilter && (
            <div 
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200/50 z-50 overflow-hidden"
              style={{
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
              }}
            >
              <div className="py-2">
                {CATEGORIES.map((category, index) => {
                  const IconComponent = category.icon;
                  const isSelected = selectedCategory === category.id;
                  const count = recordCounts[category.id] || 0;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        onCategorySelect(category.id);
                        setShowCategoryFilter(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-150 ease-macos-standard",
                        isSelected
                          ? "bg-blue-50/80 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50/80",
                        index > 0 && "border-t border-gray-100/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center transition-colors duration-150",
                          isSelected ? "bg-blue-100/80" : "bg-gray-100/80"
                        )}>
                          <IconComponent className={cn(
                            "w-3.5 h-3.5 transition-colors duration-150",
                            isSelected ? "text-blue-600" : "text-gray-600"
                          )} />
                        </div>
                        <span className="font-semibold text-[13px] tracking-[-0.005em]" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>{category.name}</span>
                      </div>
                      {count > 0 && (
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight min-w-[22px] text-center transition-colors duration-150",
                          isSelected 
                            ? "bg-blue-200/60 text-blue-800"
                            : "bg-gray-200/60 text-gray-600"
                        )} style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'}}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 记录列表 */}
      <div 
        className="scrollable-content macos-scrollbar-list scroll-smooth"
        onContextMenu={(e) => {
          // 阻止默认的浏览器右键菜单，除非是在记录项上
          if (!(e.target as HTMLElement).closest('[data-record-item]')) {
            e.preventDefault();
          }
        }}
      >
        {records.length > 0 ? (
          <div className="p-3 space-y-2">
            {records.map((record) => {
              const isSelected = selectedRecord === record.id;
              
              return (
                <div
                  key={record.id}
                  data-record-item
                  onClick={(e) => {
                    // 只有点击非编辑区域时才选中记录
                    if (!(e.target as HTMLElement).closest('.inline-editable-text')) {
                      onRecordSelect(record.id);
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, record.id)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-all duration-200 border hover:shadow-sm",
                    isSelected 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  )}
                >
                  {/* 主要内容：标题和内容预览 */}
                  <div className="mb-2">
                    {/* 标题行 */}
                    <div className="flex items-center justify-between mb-1">
                      <div className={cn(
                        "font-semibold text-[15px] leading-tight tracking-[-0.01em] truncate flex-1",
                        isSelected ? "text-blue-900" : "text-gray-900"
                      )} style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>
                        <InlineEditableText
                          text={record.name}
                          onSave={(newName) => onUpdateRecordName?.(record.id, newName)}
                          searchQuery={searchQuery}
                          placeholder="输入标题..."
                          className="refined-typography"
                        />
                      </div>
                      
                      {/* 右侧操作 */}
                      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                        {/* 收藏按钮 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(record.id);
                          }}
                          className={cn(
                            "p-1 rounded transition-colors",
                            record.isStarred 
                              ? "text-yellow-500 hover:bg-yellow-50" 
                              : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
                          )}
                        >
                          {record.isStarred ? (
                            <StarIconSolid className="w-4 h-4" />
                          ) : (
                            <StarIcon className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* 状态指示 */}
                        {record.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />
                            {onStopTranscription && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStopTranscription(record.id);
                                }}
                                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                                title="停止转录"
                              >
                                <StopIcon className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        )}
                        {record.status === 'failed' && (
                          <XCircleIcon className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    {/* 内容预览 */}
                    {record.result?.text && (
                      <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed mb-2 tracking-[-0.005em]" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>
                        {highlightText(record.result.text.slice(0, 120), searchQuery)}
                        {record.result.text.length > 120 && '...'}
                      </p>
                    )}
                  </div>

                  {/* 次要信息：紧凑单行显示 */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 tracking-tight" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", system-ui, sans-serif'}}>
                    <div className="flex items-center gap-3">
                      {/* 识别时间 */}
                      <span>{formatRelativeTime(record.createdAt)}</span>
                      
                      {/* 音频长度 */}
                      {record.duration && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <PlayIcon className="w-3 h-3" />
                            <span>{formatDuration(record.duration)}</span>
                          </div>
                        </>
                      )}
                      
                      {/* 分类 */}
                      {record.category && record.category !== 'other' && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-600 tracking-tight" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", system-ui, sans-serif'}}>
                            {record.category === 'meetings' ? '会议' : 
                             record.category === 'interviews' ? '访谈' : 
                             record.category === 'podcasts' ? '播客' : record.category}
                          </span>
                        </>
                      )}
                    </div>
                    
                    {/* 右侧信息：标签和来源类型 */}
                    <div className="flex items-center gap-2">
                      {/* 标签（最多显示2个，排除来源类型标签） */}
                      {(() => {
                        const filteredTags = record.tags.filter(tag => 
                          tag !== '实时录音' && tag !== '文件上传'
                        );
                        return filteredTags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {filteredTags.slice(0, 2).map((tag, index) => (
                              <span 
                                key={index}
                                className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium tracking-tight"
                                style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", system-ui, sans-serif'}}
                              >
                                {tag}
                              </span>
                            ))}
                            {filteredTags.length > 2 && (
                              <span className="text-gray-400 text-[10px] font-medium tracking-tight" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'}}>+{filteredTags.length - 2}</span>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* 来源类型显示 */}
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium tracking-tight",
                        getSourceType(record) === '实时转录' 
                          ? "bg-green-50 text-green-600" 
                          : "bg-orange-50 text-orange-600"
                      )} style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", system-ui, sans-serif'}}>
                        {getSourceType(record)}
                      </span>
                    </div>
                  </div>

                  {/* 处理中进度条 */}
                  {record.status === 'processing' && (
                    <div className="mt-2 bg-gray-200 rounded-full h-1 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${record.progress}%` }}
                      />
                    </div>
                  )}

                  {/* 错误信息 */}
                  {record.error && (
                    <div className="mt-2 text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded font-medium tracking-tight" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", system-ui, sans-serif'}}>
                      {record.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-xs animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <DocumentIcon className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-[16px] font-semibold text-text-primary mb-2 tracking-[-0.01em]" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>暂无转录记录</h3>
              <p className="text-[13px] text-text-secondary mb-6 leading-relaxed tracking-[-0.005em]" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>
                使用侧边栏功能开始您的第一个转录项目
              </p>
              <button
                onClick={onNewTranscription}
                className="macos-button hover-lift transition-all duration-250 ease-macos-standard shadow-sm"
              >
                <span style={{fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'}}>新建转录</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={handleCloseContextMenu}
        onDelete={handleDeleteRecord}
        onStop={handleStopTranscription}
        canStop={(() => {
          const record = records.find(r => r.id === contextMenu.recordId);
          return record?.status === 'processing' && !!onStopTranscription;
        })()}
      />
    </div>
  );
};

export default UnifiedTranscriptionList;