import { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 显示动画
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // 自动消失
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckIcon className="w-4 h-4" />;
      case 'error': return <XMarkIcon className="w-4 h-4" />;
      case 'warning': return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'info': return <InformationCircleIcon className="w-4 h-4" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const getToastStyles = () => {
    const baseStyles = "flex items-start gap-3 p-4 rounded-macos-lg backdrop-blur-xl border transition-all duration-300 cursor-pointer min-w-[300px] max-w-[400px]";
    
    switch (toast.type) {
      case 'success':
        return cn(baseStyles, "bg-green-50/90 border-green-200/50 text-green-800");
      case 'error':
        return cn(baseStyles, "bg-red-50/90 border-red-200/50 text-red-800");
      case 'warning':
        return cn(baseStyles, "bg-orange-50/90 border-orange-200/50 text-orange-800");
      case 'info':
        return cn(baseStyles, "bg-blue-50/90 border-blue-200/50 text-blue-800");
      default:
        return cn(baseStyles, "bg-gray-50/90 border-gray-200/50 text-gray-800");
    }
  };

  const getIconStyles = () => {
    switch (toast.type) {
      case 'success': return "text-green-600";
      case 'error': return "text-red-600";
      case 'warning': return "text-orange-600";
      case 'info': return "text-blue-600";
      default: return "text-gray-600";
    }
  };

  return (
    <div 
      className={cn(
        getToastStyles(),
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <div className={cn("flex-shrink-0 mt-0.5", getIconStyles())}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{toast.title}</div>
        {toast.message && (
          <div className="text-sm opacity-80 mt-1">{toast.message}</div>
        )}
      </div>
      <button 
        className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;