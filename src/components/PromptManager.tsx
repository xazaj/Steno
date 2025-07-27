import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  TagIcon,
  LanguageIcon,
  LightBulbIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { SparklesIcon as SparklesIconSolid } from '@heroicons/react/24/solid';
import { 
  PromptTemplate, 
  PromptManagerState, 
  CreatePromptData, 
  CATEGORY_NAMES
} from '../types/prompt';
import { PromptCard } from './PromptCard';
import { PromptForm } from './PromptForm';
import { PromptFormWizard } from './PromptFormWizard';
import { SmartPromptWizard } from './SmartPromptWizard';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export const PromptManager: React.FC = () => {
  const [state, setState] = useState<PromptManagerState>({
    prompts: [],
    selectedCategory: 'all',
    selectedLanguage: 'all',
    searchQuery: '',
    isLoading: true,
    error: null
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [currentActivePromptId, setCurrentActivePromptId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    promptId: string | null;
    promptName: string | null;
  }>({
    isOpen: false,
    promptId: null,
    promptName: null
  });

  // 加载提示词数据
  const loadPrompts = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const prompts = await invoke<PromptTemplate[]>('get_prompt_templates');
      
      console.log('Loaded prompts:', prompts.length, prompts);
      
      // 检查数据兼容性，但暂时不修复数据库，只在内存中处理
      const processedPrompts = prompts.map(prompt => {
        if (prompt.is_active === undefined) {
          console.log('Found prompt without is_active field:', prompt.name, 'treating as false');
          return {
            ...prompt,
            is_active: false
          };
        }
        return prompt;
      });
      
      console.log('Processed prompts:', processedPrompts.length, processedPrompts.map(p => ({ 
        name: p.name, 
        is_active: p.is_active, 
        category: p.category,
        usage_count: p.usage_count
      })));
      
      // 查找当前生效的提示词（通过is_active字段）
      let activePrompt = processedPrompts.find(p => p.is_active);
      
      // 如果没有生效的提示词，暂时在内存中选择一个（不修改数据库）
      if (!activePrompt && processedPrompts.length > 0) {
        const sortedPrompts = [...processedPrompts].sort((a, b) => b.usage_count - a.usage_count);
        activePrompt = sortedPrompts[0]; // 暂时不设置为active，只用于UI显示
        console.log('No active prompt found, will use most used for display:', activePrompt.name);
      }
      
      setState(prev => ({ 
        ...prev, 
        prompts: processedPrompts, 
        isLoading: false 
      }));
      
      setCurrentActivePromptId(activePrompt?.id || null);
      console.log('Current active prompt ID:', activePrompt?.id);
    } catch (error) {
      console.error('Failed to load prompts:', error);
      setState(prev => ({ 
        ...prev, 
        error: error as string, 
        isLoading: false 
      }));
    }
  };

  // 筛选提示词
  const getFilteredPrompts = () => {
    console.log('getFilteredPrompts called, state.prompts.length:', state.prompts.length);
    console.log('All prompts:', state.prompts.map(p => ({ name: p.name, is_active: p.is_active, id: p.id })));
    
    let filtered = state.prompts;

    // 按分类筛选
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === state.selectedCategory);
      console.log('After category filter:', filtered.length);
    }

    // 按语言筛选
    if (state.selectedLanguage !== 'all') {
      filtered = filtered.filter(prompt => prompt.language === state.selectedLanguage);
      console.log('After language filter:', filtered.length);
    }

    // 按搜索词筛选
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query))
      );
      console.log('After search filter:', filtered.length);
    }

    // 按内置、使用次数排序
    const result = filtered.sort((a, b) => {
      if (a.is_built_in !== b.is_built_in) {
        return a.is_built_in ? -1 : 1;
      }
      return b.usage_count - a.usage_count;
    });
    
    console.log('Final filtered prompts:', result.length, result.map(p => ({ name: p.name, is_active: p.is_active })));
    return result;
  };

  // 使用提示词
  const handleUsePrompt = async (prompt: PromptTemplate) => {
    try {
      console.log('Applying prompt:', prompt.name, prompt.id);
      
      // 1. 更新当前选择的提示词（增加使用次数并设为active）
      const targetPrompt = {
        ...prompt,
        is_active: true,
        usage_count: prompt.usage_count + 1
      };
      
      // 2. 先保存目标提示词
      await invoke('save_prompt_template', { prompt: targetPrompt });
      console.log('Saved target prompt successfully');
      
      // 3. 然后更新其他提示词的is_active状态（更保守的方式）
      const otherPrompts = state.prompts.filter(p => p.id !== prompt.id);
      console.log('Checking other prompts for deactivation:', otherPrompts.length);
      
      for (const otherPrompt of otherPrompts) {
        if (otherPrompt.is_active) { // 只更新之前是active的提示词
          console.log('Deactivating prompt:', otherPrompt.name);
          try {
            // 只更新is_active字段，保持其他数据不变
            const updatedOtherPrompt = {
              ...otherPrompt,
              is_active: false
            };
            await invoke('save_prompt_template', { prompt: updatedOtherPrompt });
            console.log('Successfully deactivated:', otherPrompt.name);
          } catch (updateError) {
            console.error('Failed to deactivate prompt:', otherPrompt.name, updateError);
            // 继续处理其他提示词，不中断整个流程
          }
        }
      }
      
      // 4. 更新本地状态
      setCurrentActivePromptId(prompt.id);
      
      // 5. 显示成功通知
      setNotification({
        type: 'success',
        message: `已应用提示词: ${prompt.name}`
      });

      // 6. 刷新数据以获取最新状态
      loadPrompts();
      
      // 7. 这里应该调用实际的Whisper配置更新
      console.log('Applied prompt successfully:', targetPrompt.name);
    } catch (error) {
      console.error('Failed to apply prompt:', error);
      setNotification({
        type: 'error',
        message: `应用提示词失败: ${error}`
      });
    }
  };

  // 创建新提示词
  const handleCreatePrompt = async (data: CreatePromptData) => {
    try {
      console.log('Creating new prompt:', data.name);
      
      // 1. 创建新提示词（设为active）
      const newPrompt: PromptTemplate = {
        id: `custom_${Date.now()}`,
        name: data.name,
        content: data.content,
        category: data.category as any,
        language: data.language as any,
        is_built_in: false,
        description: data.description,
        tags: data.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: 1, // 初始使用次数为1，因为创建后立即应用
        is_active: true
      };

      // 2. 保存新提示词
      await invoke('save_prompt_template', { prompt: newPrompt });
      console.log('Saved new prompt successfully');
      
      // 3. 将之前的active提示词设为inactive
      const activePrompts = state.prompts.filter(p => p.is_active);
      console.log('Deactivating previous active prompts:', activePrompts.length);
      
      for (const activePrompt of activePrompts) {
        const deactivatedPrompt = {
          ...activePrompt,
          is_active: false
        };
        await invoke('save_prompt_template', { prompt: deactivatedPrompt });
        console.log('Deactivated prompt:', activePrompt.name);
      }
      
      // 4. 更新本地状态
      setCurrentActivePromptId(newPrompt.id);
      
      // 5. 显示成功通知
      setNotification({
        type: 'success',
        message: `提示词已保存并应用: ${newPrompt.name}`
      });

      setShowCreateForm(false);
      setShowWizard(false);
      loadPrompts();
      
      console.log('Created and applied new prompt:', newPrompt.name);
    } catch (error) {
      console.error('Failed to create and apply prompt:', error);
      setNotification({
        type: 'error',
        message: `创建失败: ${error}`
      });
    }
  };

  // 编辑提示词
  const handleEditPrompt = async (data: CreatePromptData) => {
    if (!editingPrompt) return;

    try {
      console.log('Editing prompt:', editingPrompt.name);
      
      // 1. 更新当前编辑的提示词
      const updatedPrompt: PromptTemplate = {
        ...editingPrompt,
        name: data.name,
        content: data.content,
        category: data.category as any,
        language: data.language as any,
        description: data.description,
        tags: data.tags,
        updated_at: new Date().toISOString(),
        usage_count: editingPrompt.usage_count + 1, // 更新后使用次数+1
        is_active: true // 编辑后自动设为active
      };

      // 2. 保存更新后的提示词
      await invoke('save_prompt_template', { prompt: updatedPrompt });
      console.log('Saved updated prompt successfully');
      
      // 3. 将其他active提示词设为inactive
      const otherActivePrompts = state.prompts.filter(p => p.id !== editingPrompt.id && p.is_active);
      console.log('Deactivating other active prompts:', otherActivePrompts.length);
      
      for (const activePrompt of otherActivePrompts) {
        const deactivatedPrompt = {
          ...activePrompt,
          is_active: false
        };
        await invoke('save_prompt_template', { prompt: deactivatedPrompt });
        console.log('Deactivated prompt:', activePrompt.name);
      }
      
      // 4. 更新本地状态
      setCurrentActivePromptId(updatedPrompt.id);
      
      // 5. 显示成功通知
      setNotification({
        type: 'success',
        message: `提示词已更新并应用: ${updatedPrompt.name}`
      });

      setEditingPrompt(null);
      loadPrompts();
      
      console.log('Updated and applied prompt:', updatedPrompt.name);
    } catch (error) {
      console.error('Failed to update and apply prompt:', error);
      setNotification({
        type: 'error',
        message: `更新失败: ${error}`
      });
    }
  };

  // 显示删除确认对话框
  const handleDeletePrompt = (id: string) => {
    const prompt = state.prompts.find(p => p.id === id);
    if (prompt) {
      setDeleteConfirm({
        isOpen: true,
        promptId: id,
        promptName: prompt.name
      });
    }
  };

  // 确认删除提示词
  const confirmDeletePrompt = async () => {
    if (!deleteConfirm.promptId) return;

    try {
      await invoke('delete_prompt_template', { id: deleteConfirm.promptId });
      
      setNotification({
        type: 'success',
        message: '提示词删除成功'
      });

      loadPrompts();
    } catch (error) {
      setNotification({
        type: 'error',
        message: `删除失败: ${error}`
      });
    } finally {
      setDeleteConfirm({
        isOpen: false,
        promptId: null,
        promptName: null
      });
    }
  };

  // 取消删除
  const cancelDeletePrompt = () => {
    setDeleteConfirm({
      isOpen: false,
      promptId: null,
      promptName: null
    });
  };


  // 使用提示词的回调函数
  const createUseHandler = (prompt: PromptTemplate) => () => handleUsePrompt(prompt);
  
  // 编辑提示词的回调函数
  const createEditHandler = (prompt: PromptTemplate) => 
    prompt.is_built_in ? undefined : () => setEditingPrompt(prompt);
    
  // 删除提示词的回调函数
  const createDeleteHandler = (prompt: PromptTemplate) => 
    prompt.is_built_in ? undefined : () => handleDeletePrompt(prompt.id);

  // 初始化加载
  useEffect(() => {
    console.log('PromptManager component mounted, loading prompts...');
    loadPrompts();
  }, []);

  // 监控state.prompts的变化
  useEffect(() => {
    console.log('state.prompts changed:', state.prompts.length, state.prompts.map(p => ({ name: p.name, is_active: p.is_active })));
  }, [state.prompts]);

  // 清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const filteredPrompts = getFilteredPrompts();

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 通知栏 */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5 mr-2" />
          ) : (
            <XCircleIcon className="w-5 h-5 mr-2" />
          )}
          {notification.message}
        </div>
      )}

      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Whisper提示词管理</h1>
              <p className="text-sm text-gray-600 mt-1">管理语音识别提示词，提高识别准确率</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {/* 智能向导按钮 */}
            <button
              onClick={() => setShowWizard(true)}
              className="group relative bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 hover:scale-[1.02] font-medium overflow-hidden text-sm"
            >
              <div className="relative z-10 p-1 bg-white/15 rounded-md backdrop-blur-sm">
                <SparklesIconSolid className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="relative z-10">智能向导</span>
              
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-white/5 rounded-full -translate-y-2 translate-x-2"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 bg-white/8 rounded-full translate-y-1 -translate-x-1"></div>
              
              {/* 悬停光效 */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/8 transition-all duration-300 rounded-lg"></div>
            </button>
            
            {/* 快速创建按钮 */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="group relative bg-gray-800 hover:bg-gray-700 text-gray-100 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium border border-gray-700/50 hover:border-gray-600 text-sm overflow-hidden"
            >
              <div className="relative z-10 p-1 bg-gray-700/60 group-hover:bg-gray-600/80 rounded-md transition-colors duration-300 backdrop-blur-sm">
                <PencilSquareIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-100 transition-colors duration-300" />
              </div>
              <span className="relative z-10">快速创建</span>
              
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-7 h-7 bg-white/5 rounded-full -translate-y-1.5 translate-x-1.5"></div>
              <div className="absolute bottom-0 left-0 w-5 h-5 bg-white/8 rounded-full translate-y-0.5 -translate-x-0.5"></div>
              
              {/* 悬停效果 */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-300 rounded-lg"></div>
            </button>
          </div>
        </div>
      </div>

      {/* 筛选和搜索工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* 分类筛选 */}
          <div className="relative">
            <TagIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
            <select
              value={state.selectedCategory}
              onChange={(e) => setState(prev => ({ ...prev, selectedCategory: e.target.value }))}
              className="appearance-none border border-gray-300 rounded-md pl-10 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors min-w-32"
            >
              <option value="all">全部分类</option>
              {Object.entries(CATEGORY_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
            <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* 语言筛选 */}
          <div className="relative">
            <LanguageIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2 z-10" />
            <select
              value={state.selectedLanguage}
              onChange={(e) => setState(prev => ({ ...prev, selectedLanguage: e.target.value }))}
              className="appearance-none border border-gray-300 rounded-md pl-10 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:border-gray-400 transition-colors min-w-32"
            >
              <option value="all">全部语言</option>
              <option value="zh">中文</option>
              <option value="en">英文</option>
              <option value="auto">自动</option>
            </select>
            <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md ml-auto">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="搜索提示词..."
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {state.isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <ClockIcon className="w-5 h-5 animate-spin" />
              <span>加载中...</span>
            </div>
          </div>
        ) : state.error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600">加载失败: {state.error}</p>
              <button
                onClick={loadPrompts}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 统计信息 */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-semibold text-gray-900">{state.prompts.length}</div>
                <div className="text-sm text-gray-600">总提示词数</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-semibold text-blue-600">
                  {state.prompts.filter(p => p.is_built_in).length}
                </div>
                <div className="text-sm text-gray-600">内置提示词</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-semibold text-green-600">
                  {state.prompts.filter(p => !p.is_built_in).length}
                </div>
                <div className="text-sm text-gray-600">自定义提示词</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-semibold text-purple-600">{filteredPrompts.length}</div>
                <div className="text-sm text-gray-600">当前显示</div>
              </div>
            </div>

            {/* 提示词列表 */}
            {filteredPrompts.length === 0 ? (
              <div className="text-center py-12">
                <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">没有找到匹配的提示词</p>
                <p className="text-gray-400 text-sm mt-1">尝试调整筛选条件或创建新的提示词</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrompts.map(prompt => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    isActive={currentActivePromptId === prompt.id}
                    onUse={createUseHandler(prompt)}
                    onEdit={createEditHandler(prompt)}
                    onDelete={createDeleteHandler(prompt)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 智能向导模态框 */}
      <SmartPromptWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSave={handleCreatePrompt}
        editingPrompt={null}
      />

      {/* 创建表单模态框 */}
      {showCreateForm && (
        <PromptForm
          title="新建提示词"
          initialData={{
            name: 'IT技术讨论提示词',
            content: `# --- Whisper 上下文感知提示词 ---

## 1. 场景与领域声明
这是一场关于"星尘"云原生平台的V3版本新功能发布会，内容围绕微服务、容器化和DevOps，技术性强。

## 2. 核心术语与专有名词
### 2.1 人名/机构名/产品名
* 张伟 (Wei Zhang), 首席架构师 (Chief Architect)
* 云启科技 (Cloud-Native Inc.)
* 星尘平台 (Stardust Platform), "天穹"监控系统 ("Sky-Dome" Monitoring System)
* Kubernetes (K8s), Docker, Istio, Prometheus, Grafana

### 2.2 行业术语/专业词汇
* 微服务架构 (Microservices Architecture), 服务网格 (Service Mesh)
* 容器编排 (Container Orchestration), 持续集成/持续部署 (CI/CD)
* 金丝雀发布 (Canary Release), 蓝绿部署 (Blue-Green Deployment)
* 可观测性 (Observability), 基础设施即代码 (Infrastructure as Code, IaC)
* API网关 (API Gateway), Sidecar模式

### 2.3 特定概念或口头禅
* 端到端的可观测性 (End-to-end observability)
* 声明式API (Declarative API)
* 赋能开发者 (Empower developers)


## 3. 格式化要求示例

* 标点类型:全角标点
* 分段方式:问答格式
* 预览效果:今天的会议很重要，请大家准时参加。

# --- 提示词结束 ---`,
            category: 'technology',
            language: 'zh',
            description: 'IT技术讨论场景的Whisper优化提示词',
            tags: ['技术', 'IT', '云原生', '微服务']
          }}
          onSubmit={handleCreatePrompt}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* 编辑表单模态框 */}
      {editingPrompt && (
        <PromptForm
          title="编辑提示词"
          initialData={{
            name: editingPrompt.name,
            content: editingPrompt.content,
            category: editingPrompt.category,
            language: editingPrompt.language,
            description: editingPrompt.description,
            tags: editingPrompt.tags
          }}
          onSubmit={handleEditPrompt}
          onCancel={() => setEditingPrompt(null)}
        />
      )}

      {/* 删除确认对话框 */}
      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="确认删除提示词"
        message={`确定要删除提示词"${deleteConfirm.promptName}"吗？删除后无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDeletePrompt}
        onCancel={cancelDeletePrompt}
      />
    </div>
  );
};