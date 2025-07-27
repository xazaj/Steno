import React from 'react';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, DocumentTextIcon } from '@heroicons/react/24/solid';
import { cn } from '../../utils/cn';
import { WizardFormData, PreviewContent } from './SmartPromptWizard.types';

interface DashboardStepProps {
  formData: WizardFormData;
  previewContent: PreviewContent;
  onEdit: (step: number) => void;
}

export const DashboardStep: React.FC<DashboardStepProps> = ({
  formData,
  previewContent,
  onEdit
}) => {
  const { qualityScore } = previewContent;
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score: number) => {
    if (score >= 90) return 'bg-green-50 border-green-200';
    if (score >= 70) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  // 生成结构化的Whisper提示词
  const generateStructuredPrompt = () => {
    const sections = [];
    
    // 1. 场景与领域声明
    sections.push('# --- Whisper 上下文感知提示词 ---\n');
    sections.push('## 1. 场景与领域声明');
    sections.push(formData.coreDescription || '未设置场景描述\n');
    
    // 2. 核心术语与专有名词
    sections.push('## 2. 核心术语与专有名词');
    
    // 2.1 人名/机构名/产品名
    sections.push('### 2.1 人名/机构名/产品名');
    if (formData.peopleNameTags.length > 0) {
      formData.peopleNameTags.forEach(tag => {
        sections.push(`* ${tag}`);
      });
    } else {
      sections.push('* (暂无)');
    }
    sections.push('');
    
    // 2.2 行业术语/专业词汇
    sections.push('### 2.2 行业术语/专业词汇');
    if (formData.technicalTermTags.length > 0) {
      formData.technicalTermTags.forEach(tag => {
        sections.push(`* ${tag}`);
      });
    } else {
      sections.push('* (暂无)');
    }
    sections.push('');
    
    // 2.3 特定概念或口头禅
    sections.push('### 2.3 特定概念或口头禅');
    if (formData.brandNameTags.length > 0) {
      formData.brandNameTags.forEach(tag => {
        sections.push(`* ${tag}`);
      });
    } else {
      sections.push('* (暂无)');
    }
    sections.push('\n');
    
    // 3. 格式化要求示例
    sections.push('## 3. 格式化要求示例\n');
    sections.push(`* 标点类型: ${formData.useFullWidthPunctuation !== undefined ? (formData.useFullWidthPunctuation ? '全角标点' : '半角标点') : '未设置'}`);
    sections.push(`* 分段方式: ${formData.paragraphSpacing || '未设置'}`);
    
    if (formData.useFullWidthPunctuation !== undefined) {
      const previewText = formData.useFullWidthPunctuation ? 
        '今天的会议很重要，请大家准时参加。' : 
        'Today\'s meeting is very important, please attend on time.';
      sections.push(`* 预览效果: ${previewText}`);
    }
    
    sections.push('\n# --- 提示词结束 ---');
    
    return sections.join('\n');
  };

  return (
    <div className="grid grid-cols-12 gap-10 max-w-6xl mx-auto">
      {/* 左栏：最终生成提示词 */}
      <div className="col-span-7 space-y-6">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            最终生成提示词
          </h3>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            按照 Whisper 优化的结构化模板生成，可直接复制使用
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 h-full overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
            {generateStructuredPrompt()}
          </pre>
        </div>
      </div>

      {/* 右栏：质量评分侧边栏 */}
      <div className="col-span-5">
        <div className="sticky top-8 space-y-5">
          {/* 质量评分 */}
          <div className={cn("p-5 rounded-xl border-2", getScoreBackgroundColor(qualityScore.total))}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">质量评分</h3>
              <div className="flex items-center gap-3">
                {qualityScore.total >= 90 ? (
                  <CheckCircleIconSolid className="w-6 h-6 text-green-600" />
                ) : (
                  <CheckCircleIcon className="w-6 h-6 text-gray-400" />
                )}
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getScoreColor(qualityScore.total))}>
                    {qualityScore.total}
                  </div>
                  <div className="text-xs text-gray-500">/ 100</div>
                </div>
              </div>
            </div>

            {/* 评分环形图 */}
            <div className="mb-5">
              <div className="flex justify-center">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-gray-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      className={qualityScore.total >= 90 ? 'text-green-500' : qualityScore.total >= 70 ? 'text-yellow-500' : 'text-red-500'}
                      strokeDasharray={`${(qualityScore.total / 100) * 251} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={cn("text-lg font-bold", getScoreColor(qualityScore.total))}>
                        {qualityScore.total}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {qualityScore.total >= 90 ? '优秀' : qualityScore.total >= 70 ? '良好' : '待改进'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 改进建议 */}
            {qualityScore.suggestions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-blue-500" />
                  改进建议
                </h4>
                <ul className="space-y-2">
                  {qualityScore.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 提示词统计 */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-900 text-sm">提示词统计</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">场景描述:</span>
                  <span className="font-medium text-gray-900">
                    {formData.coreDescription ? '已设置' : '未设置'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">格式配置:</span>
                  <span className="font-medium text-gray-900">
                    {(formData.useFullWidthPunctuation !== undefined && formData.paragraphSpacing && formData.paragraphSpacing !== '') ? '已配置' : '未配置'}
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">专业术语:</span>
                  <span className="font-medium text-gray-900">
                    {formData.technicalTermTags.length} 个
                  </span>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">重要人名:</span>
                  <span className="font-medium text-gray-900">
                    {formData.peopleNameTags.length} 个
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 使用提示 */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100 p-4">
            <h5 className="flex items-center gap-2 font-medium text-emerald-900 mb-2 text-sm">
              <SparklesIcon className="w-4 h-4 text-emerald-600" />
              使用提示
            </h5>
            <ul className="text-xs text-emerald-700 space-y-1 leading-relaxed">
              <li>• 应用后自动发送给Whisper模型</li>
              <li>• 质量评分越高，转录准确率越高</li>
              <li>• 建议完善改进建议中的内容</li>
              <li>• 提示词可重复使用于同类型音频</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};