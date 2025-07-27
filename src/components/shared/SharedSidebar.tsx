import React, { useState, useMemo } from 'react';
import {
  FolderIcon,
  ClockIcon,
  StarIcon,
  DocumentIcon,
  MicrophoneIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';

interface Project {
  id: string;
  name: string;
  type: 'file' | 'recording';
  date: Date;
  duration?: number;
  status: 'processing' | 'completed' | 'failed';
  summary?: string;
  tags: string[];
  isFavorite?: boolean;
}

interface SharedSidebarProps {
  projects: Project[];
  selectedProject: string | null;
  onProjectSelect: (projectId: string) => void;
  searchQuery: string;
  currentMode: 'file' | 'recording';
  onModeSwitch: (mode: 'file' | 'recording', reason?: string) => void;
}

const SharedSidebar: React.FC<SharedSidebarProps> = ({
  projects,
  selectedProject,
  onProjectSelect,
  searchQuery,
  currentMode,
  onModeSwitch,
}) => {
  const [activeCategory, setActiveCategory] = useState('recent');

  // 过滤和分组逻辑
  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [projects, searchQuery]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Project[]> = {
      recent: [],
      today: [],
      week: [],
      favorites: [],
      completed: [],
      processing: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));

    filteredProjects.forEach(project => {
      // Recent (all projects by date)
      groups.recent.push(project);
      
      // Today
      if (project.date >= today) {
        groups.today.push(project);
      }
      
      // This week
      if (project.date >= weekStart) {
        groups.week.push(project);
      }
      
      // Favorites
      if (project.isFavorite) {
        groups.favorites.push(project);
      }
      
      // By status
      groups[project.status].push(project);
    });

    // Sort by date (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.date.getTime() - a.date.getTime());
    });

    return groups;
  }, [filteredProjects]);

  const categories = [
    { id: 'recent', name: '最近项目', icon: ClockIcon, count: groupedProjects.recent.length },
    { id: 'today', name: '今日', icon: FolderIcon, count: groupedProjects.today.length },
    { id: 'week', name: '本周', icon: FolderIcon, count: groupedProjects.week.length },
    { id: 'favorites', name: '收藏', icon: StarIcon, count: groupedProjects.favorites.length },
    { id: 'completed', name: '已完成', icon: CheckCircleIcon, count: groupedProjects.completed.length },
    { id: 'processing', name: '处理中', icon: ArrowPathIcon, count: groupedProjects.processing.length },
  ];

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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}小时${mins % 60}分钟`;
    }
    return `${mins}分钟`;
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: Project['type']) => {
    return type === 'file' ? (
      <DocumentIcon className="w-4 h-4 text-gray-400" />
    ) : (
      <MicrophoneIcon className="w-4 h-4 text-gray-400" />
    );
  };

  const currentProjects = groupedProjects[activeCategory] || [];

  return (
    <div className="w-80 bg-white/60 backdrop-blur-xl border-r border-gray-200 flex flex-col">
      {/* Categories */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">项目分类</h3>
        <div className="space-y-1">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                )}>
                  {category.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {categories.find(c => c.id === activeCategory)?.name}
            </h3>
            {currentProjects.length > 0 && (
              <span className="text-xs text-gray-500">
                {currentProjects.length} 个项目
              </span>
            )}
          </div>

          {currentProjects.length === 0 ? (
            <div className="text-center py-8">
              <FolderIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">暂无项目</p>
              <button
                onClick={() => onModeSwitch(currentMode === 'file' ? 'recording' : 'file', '创建新项目')}
                className="mt-2 text-xs text-blue-500 hover:underline"
              >
                创建新项目
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {currentProjects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all",
                    selectedProject === project.id
                      ? "bg-blue-50 border-blue-200 shadow-sm"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  )}
                  onClick={() => onProjectSelect(project.id)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getTypeIcon(project.type)}
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {project.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {getStatusIcon(project.status)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Toggle favorite
                        }}
                        className="text-gray-400 hover:text-yellow-500 transition-colors"
                      >
                        {project.isFavorite ? (
                          <StarIconSolid className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <StarIcon className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Show context menu
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <EllipsisHorizontalIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span>{formatDate(project.date)}</span>
                    {project.duration && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(project.duration)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-xs",
                      project.type === 'file' 
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    )}>
                      {project.type === 'file' ? '文件' : '录音'}
                    </span>
                  </div>

                  {/* Summary */}
                  {project.summary && (
                    <p className="text-xs text-gray-600 leading-relaxed mb-2 line-clamp-2">
                      {project.summary}
                    </p>
                  )}

                  {/* Tags and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {project.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{project.tags.length - 2}</span>
                      )}
                    </div>
                    {project.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Play/preview
                        }}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        <PlayIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Mode Switch */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onModeSwitch('file', '快速切换')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              currentMode === 'file'
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <DocumentIcon className="w-4 h-4" />
            <span>文件</span>
          </button>
          <button
            onClick={() => onModeSwitch('recording', '快速切换')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              currentMode === 'recording'
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <MicrophoneIcon className="w-4 h-4" />
            <span>录音</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SharedSidebar;