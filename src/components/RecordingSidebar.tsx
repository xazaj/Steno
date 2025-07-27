import React, { useState } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  MicrophoneIcon,
  PlayIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

interface RecordingSession {
  id: string;
  title: string;
  date: Date;
  duration: number;
  summary: string;
  isProcessed: boolean;
  speakerCount: number;
}

interface RecordingSidebarProps {
  sessions: RecordingSession[];
  selectedSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewRecording: () => void;
  className?: string;
}

const RecordingSidebar: React.FC<RecordingSidebarProps> = ({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewRecording,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) {
      return `${mins}分${secs}秒`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}小时${remainingMins}分钟`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: '2-digit', 
        day: '2-digit' 
      });
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const today = new Date();
    const sessionDate = session.date;
    const diffTime = today.getTime() - sessionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let groupKey = '';
    if (diffDays === 0) {
      groupKey = '今天';
    } else if (diffDays === 1) {
      groupKey = '昨天';
    } else if (diffDays < 7) {
      groupKey = '本周';
    } else if (diffDays < 30) {
      groupKey = '本月';
    } else {
      groupKey = '更早';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(session);
    
    return groups;
  }, {} as Record<string, RecordingSession[]>);

  return (
    <div className={cn("flex flex-col h-full bg-surface-primary border-r border-border-primary", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <h2 className="font-semibold text-text-primary">全部记录</h2>
        <div className="flex gap-1">
          <button 
            className="macos-toolbar-button"
            onClick={() => setShowFilters(!showFilters)}
            title="筛选"
          >
            <FunnelIcon className="w-4 h-4" />
          </button>
          <button 
            className="macos-toolbar-button"
            onClick={onNewRecording}
            title="新建录音"
          >
            <MicrophoneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border-primary">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="在全部记录中搜索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-secondary border border-border-secondary rounded-macos-md text-sm focus:outline-none focus:ring-2 focus:ring-macos-blue focus:border-transparent"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto macos-scrollbar">
        {Object.entries(groupedSessions).map(([groupName, groupSessions]) => (
          <div key={groupName} className="p-4">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-3">
              {groupName}
            </h3>
            <div className="space-y-2">
              {groupSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "p-3 rounded-macos-md cursor-pointer transition-all duration-150",
                    selectedSessionId === session.id
                      ? "bg-macos-blue text-white"
                      : "hover:bg-surface-hover"
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={cn(
                      "font-medium text-sm truncate flex-1",
                      selectedSessionId === session.id ? "text-white" : "text-text-primary"
                    )}>
                      {session.title}
                    </h4>
                    <button
                      className={cn(
                        "ml-2 p-1 rounded-full transition-colors",
                        selectedSessionId === session.id 
                          ? "hover:bg-white/20" 
                          : "hover:bg-surface-hover"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 显示操作菜单
                      }}
                    >
                      <EllipsisHorizontalIcon className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <ClockIcon className="w-3 h-3" />
                    <span className={cn(
                      selectedSessionId === session.id ? "text-white/80" : "text-text-secondary"
                    )}>
                      {formatDate(session.date)}
                    </span>
                    <span className={cn(
                      selectedSessionId === session.id ? "text-white/60" : "text-text-tertiary"
                    )}>
                      •
                    </span>
                    <span className={cn(
                      selectedSessionId === session.id ? "text-white/80" : "text-text-secondary"
                    )}>
                      {formatDuration(session.duration)}
                    </span>
                  </div>
                  
                  <p className={cn(
                    "text-xs leading-relaxed line-clamp-2",
                    selectedSessionId === session.id ? "text-white/80" : "text-text-tertiary"
                  )}>
                    {session.summary || "暂无转录内容"}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {session.speakerCount > 1 && (
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          selectedSessionId === session.id 
                            ? "bg-white/20 text-white" 
                            : "bg-surface-secondary text-text-secondary"
                        )}>
                          {session.speakerCount}人对话
                        </span>
                      )}
                      {!session.isProcessed && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 bg-macos-blue rounded-full animate-pulse" />
                          <span className={cn(
                            "text-xs",
                            selectedSessionId === session.id ? "text-white/80" : "text-macos-blue"
                          )}>
                            处理中
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        selectedSessionId === session.id 
                          ? "hover:bg-white/20" 
                          : "hover:bg-surface-hover"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 播放录音
                      }}
                    >
                      <PlayIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {filteredSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-center p-4">
            <MicrophoneIcon className="w-8 h-8 text-text-tertiary mb-2" />
            <p className="text-sm text-text-secondary">
              {searchQuery ? "未找到匹配的记录" : "暂无录音记录"}
            </p>
            <button
              className="mt-3 text-xs text-macos-blue hover:underline"
              onClick={onNewRecording}
            >
              开始录音
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingSidebar;