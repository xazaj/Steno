import React from 'react';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({
  isOpen,
  onClose,
  feature
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            功能开发中
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="text-center mb-8">
          <div className="mb-4">
            <ClockIcon className="h-16 w-16 text-blue-500 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {feature}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            该功能正在紧锣密鼓地开发中，敬请期待！
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            我们将在未来的版本中为您带来更强大的实时录音功能
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};