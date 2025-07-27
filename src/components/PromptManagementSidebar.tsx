import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  ClockIcon,
  TagIcon,
  StarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  FireIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import {
  SparklesIcon as SparklesIconSolid,
  BookmarkIcon as BookmarkIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';
import { PromptTemplate, PromptCategory } from '../types/prompt';
import { SmartPromptWizard } from './SmartPromptWizard';
import { cn } from '../utils/cn';

interface PromptManagementSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptSelect: (prompt: PromptTemplate) => void;
  onCreatePrompt: (prompt: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => void;
}

interface SidebarState {
  searchQuery: string;
  selectedCategory: PromptCategory | 'all' | 'favorites' | 'recent';
  prompts: PromptTemplate[];
  isLoading: boolean;
}

const CATEGORIES = [
  { 
    id: 'all', 
    name: '全部提示词', 
    icon: DocumentTextIcon, 
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    count: 0
  },
  { 
    id: 'recent', 
    name: '最近使用', 
    icon: ClockIcon, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    count: 0
  },
  { 
    id: 'favorites', 
    name: '收藏夹', 
    icon: StarIcon, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    count: 0
  },
  { 
    id: 'general', 
    name: '通用场景', 
    icon: SparklesIcon, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    count: 0
  },
  { 
    id: 'meeting', 
    name: '会议记录', 
    icon: DocumentTextIcon, 
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    count: 0
  },
  { 
    id: 'interview', 
    name: '访谈对话', 
    icon: TagIcon, 
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    count: 0
  },
  { 
    id: 'technical', 
    name: '技术讨论', 
    icon: Cog6ToothIcon, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    count: 0
  },
];

const QUICK_ACTIONS = [
  {
    id: 'smart-wizard',
    name: '智能向导',
    description: 'AI辅助创建专业提示词',
    icon: SparklesIconSolid,
    gradient: 'from-purple-500 to-pink-500',
    primary: true
  },
  {
    id: 'quick-template',
    name: '快速模板',
    description: '基于预设模板快速创建',
    icon: DocumentTextIcon,
    gradient: 'from-blue-500 to-indigo-500',
    primary: false
  },
  {
    id: 'import',
    name: '导入提示词',
    description: '从文件或其他来源导入',
    icon: BookmarkIcon,
    gradient: 'from-green-500 to-emerald-500',
    primary: false
  }
];

export const PromptManagementSidebar: React.FC<PromptManagementSidebarProps> = ({
  isOpen,
  onClose,
  onPromptSelect,
  onCreatePrompt
}) => {
  const [state, setState] = useState<SidebarState>({
    searchQuery: '',
    selectedCategory: 'all',
    prompts: [],
    isLoading: false
  });

  const [showSmartWizard, setShowSmartWizard] = useState(false);
  const [stats, setStats] = useState({
    totalPrompts: 0,
    recentUsed: 0,
    favorites: 0,
    customPrompts: 0
  });

  // 模拟数据加载
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // 模拟API调用
    setTimeout(() => {
      const mockPrompts: PromptTemplate[] = [
        {
          id: '1',
          name: '产品会议记录',
          content: '这是一场产品规划会议...',
          category: 'meeting',
          language: 'zh',
          description: '专用于产品团队会议记录',
          tags: ['产品', '会议', '规划'],
          is_built_in: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 15
        },
        {
          id: '2',
          name: '技术访谈',
          content: '技术面试场景的语音识别...',
          category: 'interview',
          language: 'zh',
          description: '技术人员面试专用',
          tags: ['技术', '面试', '访谈'],
          is_built_in: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 8
        }
      ];

      setState(prev => ({ 
        ...prev, 
        prompts: mockPrompts, 
        isLoading: false 
      }));

      setStats({
        totalPrompts: mockPrompts.length,
        recentUsed: mockPrompts.filter(p => p.usage_count > 0).length,
        favorites: mockPrompts.filter(p => p.usage_count > 10).length,
        customPrompts: mockPrompts.filter(p => !p.is_built_in).length
      });
    }, 1000);
  };

  const filteredPrompts = state.prompts.filter(prompt => {
    const matchesSearch = prompt.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                         prompt.description?.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                         prompt.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    const matchesCategory = state.selectedCategory === 'all' || 
                           prompt.category === state.selectedCategory ||
                           (state.selectedCategory === 'favorites' && prompt.usage_count > 10) ||
                           (state.selectedCategory === 'recent' && prompt.usage_count > 0);
    
    return matchesSearch && matchesCategory;
  });

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'smart-wizard':
        setShowSmartWizard(true);
        break;
      case 'quick-template':
        // TODO: 实现快速模板功能
        break;
      case 'import':
        // TODO: 实现导入功能
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* 侧边栏主体 */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200 z-50 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 opacity-90" />
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>
          
          <div className="relative p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <SparklesIconSolid className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">提示词管理</h2>
                  <p className="text-white/80 text-sm">专业语音识别助手</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <span className="text-lg">×</span>
              </button>
            </div>

            {/* 统计数据 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '总数', value: stats.totalPrompts, icon: DocumentTextIcon },
                { label: '常用', value: stats.recentUsed, icon: FireIcon },
                { label: '收藏', value: stats.favorites, icon: StarIconSolid },
                { label: '自定义', value: stats.customPrompts, icon: ChartBarIcon }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-1">
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">快速操作</h3>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    action.primary
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg transform hover:scale-[1.02]"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    action.primary ? "bg-white/20" : `bg-gradient-to-r ${action.gradient}`
                  )}>
                    <IconComponent className={cn(
                      "w-4 h-4",
                      action.primary ? "text-white" : "text-white"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{action.name}</div>
                    <div className={cn(
                      "text-xs",
                      action.primary ? "text-white/80" : "text-gray-500"
                    )}>
                      {action.description}
                    </div>
                  </div>
                  <ChevronRightIcon className={cn(
                    "w-4 h-4",
                    action.primary ? "text-white/70" : "text-gray-400"
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-3">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* 分类导航 */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">分类浏览</h3>
          <div className="space-y-1">
            {CATEGORIES.map((category) => {
              const IconComponent = category.icon;
              const isActive = state.selectedCategory === category.id;
              const count = category.id === 'all' ? state.prompts.length :
                           category.id === 'recent' ? stats.recentUsed :
                           category.id === 'favorites' ? stats.favorites :
                           state.prompts.filter(p => p.category === category.id).length;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setState(prev => ({ ...prev, selectedCategory: category.id as any }))}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center",
                      isActive ? "bg-blue-100" : category.bgColor
                    )}>
                      <IconComponent className={cn(
                        "w-3.5 h-3.5",
                        isActive ? "text-blue-600" : category.color
                      )} />
                    </div>
                    <span>{category.name}</span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 提示词列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {state.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">暂无匹配的提示词</p>
              <button
                onClick={() => setShowSmartWizard(true)}
                className="text-sm text-blue-500 hover:underline"
              >
                创建新提示词
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="group bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => onPromptSelect(prompt)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                      {prompt.name}
                    </h4>
                    <div className="flex items-center gap-1 ml-2">
                      {prompt.usage_count > 10 && (
                        <StarIconSolid className="w-3 h-3 text-yellow-500" />
                      )}
                      {prompt.is_built_in && (
                        <BookmarkIconSolid className="w-3 h-3 text-blue-500" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {prompt.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {prompt.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{prompt.tags.length - 2}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {prompt.usage_count}次使用
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 智能向导 */}
      <SmartPromptWizard
        isOpen={showSmartWizard}
        onClose={() => setShowSmartWizard(false)}
        onSave={(prompt) => {
          onCreatePrompt(prompt);
          setShowSmartWizard(false);
          loadPrompts(); // 重新加载数据
        }}
      />
    </>
  );
};