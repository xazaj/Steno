import React, { useMemo } from 'react';
import { SmartPromptWizardProps } from './SmartPromptWizard.types';
import { 
  useWizardFormData, 
  useWizardValidation, 
  useSmartNameGeneration,
  useTemplateApplication,
  useVocabularyManagement,
  usePreviewGeneration,
  useWizardNavigation
} from './SmartPromptWizard.hooks';
import { WizardNavigation, WizardFooter } from './WizardNavigation';
import { CoreDescriptionStep } from './CoreDescriptionStep';
import { VocabularyFactoryStep } from './VocabularyFactoryStep';
import { FormatTemplateStep } from './FormatTemplateStep';
import { DashboardStep } from './DashboardStep';

export const SmartPromptWizard: React.FC<SmartPromptWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPrompt
}) => {
  // 核心数据管理
  const { formData, updateFormData, resetCurrentStep, resetAllData, restoreDefaults } = useWizardFormData(editingPrompt);
  const validation = useWizardValidation(formData);
  
  // 业务逻辑hooks
  const generateSmartName = useSmartNameGeneration(formData);
  const applyTemplate = useTemplateApplication(updateFormData);
  const { addTag, removeTag, getSuggestedTags } = useVocabularyManagement(formData, updateFormData);
  const generatePreview = usePreviewGeneration(formData);
  
  // 导航控制
  const { currentTab, goToNext, goToPrevious, goToTab, canGoNext } = useWizardNavigation();
  
  // 生成预览内容（仅在第4步时计算）
  const previewContent = useMemo(() => {
    if (currentTab === 4) {
      try {
        return generatePreview();
      } catch (error) {
        console.error('Error generating preview:', error);
        return {
          generatedPrompt: '生成失败，请检查输入数据',
          exampleOutput: '预览生成出错',
          qualityScore: {
            total: 0,
            breakdown: { description: 0, vocabulary: 0, format: 0, completeness: 0 },
            suggestions: ['请重新填写表单数据']
          }
        };
      }
    }
    return {
      generatedPrompt: '',
      exampleOutput: '',
      qualityScore: {
        total: 0,
        breakdown: { description: 0, vocabulary: 0, format: 0, completeness: 0 },
        suggestions: []
      }
    };
  }, [currentTab, generatePreview]);

  // 事件处理
  const handleSave = () => {
    const promptData = {
      name: formData.name || generateSmartName(),
      description: formData.description || formData.coreDescription,
      category: formData.category,
      language: formData.language,
      tags: formData.tags,
      content: previewContent.generatedPrompt,
      is_built_in: false,
      is_active: true
    };
    
    onSave(promptData);
  };

  const canProceedNext = canGoNext(validation);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 导航头部 */}
        <WizardNavigation
          currentTab={currentTab}
          validation={validation}
          onTabChange={goToTab}
          onClose={onClose}
          canGoNext={canProceedNext}
          isEditMode={!!editingPrompt}
        />

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {currentTab === 1 && (
              <CoreDescriptionStep
                formData={formData}
                onUpdateFormData={updateFormData}
                onApplyTemplate={applyTemplate}
                onGenerateSmartName={generateSmartName}
              />
            )}
            
            {currentTab === 2 && (
              <VocabularyFactoryStep
                formData={formData}
                onUpdateFormData={updateFormData}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                getSuggestedTags={getSuggestedTags}
              />
            )}
            
            {currentTab === 3 && (
              <FormatTemplateStep
                formData={formData}
                onUpdateFormData={updateFormData}
              />
            )}
            
            {currentTab === 4 && (
              <DashboardStep
                formData={formData}
                previewContent={previewContent}
                onEdit={goToTab}
              />
            )}
          </div>
        </div>

        {/* 底部操作区 */}
        <WizardFooter
          currentTab={currentTab}
          validation={validation}
          formData={formData}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onSave={handleSave}
          onResetCurrentStep={resetCurrentStep}
          onResetAllData={resetAllData}
          onRestoreDefaults={restoreDefaults}
          canGoNext={canProceedNext}
          isEditMode={!!editingPrompt}
        />
      </div>
    </div>
  );
};