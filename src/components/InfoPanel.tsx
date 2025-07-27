import React from 'react';
import { 
  InformationCircleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export type InfoPanelType = 'info' | 'tip' | 'warning' | 'success' | 'feature';

interface InfoPanelProps {
  type: InfoPanelType;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({
  type,
  title,
  children,
  compact = false,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <InformationCircleIcon className="w-4 h-4" />;
      case 'tip':
        return <LightBulbIcon className="w-4 h-4" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4" />;
      case 'success':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'feature':
        return <SparklesIcon className="w-4 h-4" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-600',
          title: 'text-blue-900'
        };
      case 'tip':
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-600',
          title: 'text-yellow-900'
        };
      case 'warning':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: 'text-orange-600',
          title: 'text-orange-900'
        };
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: 'text-green-600',
          title: 'text-green-900'
        };
      case 'feature':
        return {
          container: 'bg-purple-50 border-purple-200 text-purple-800',
          icon: 'text-purple-600',
          title: 'text-purple-900'
        };
    }
  };

  const styles = getStyles();
  const padding = compact ? 'p-3' : 'p-4';

  return (
    <div className={`border rounded-lg ${styles.container} ${padding} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${styles.title} ${compact ? 'text-sm' : 'text-base'}`}>
            {title}
          </h4>
          <div className={`mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// 预定义的通用信息面板
export const FeatureInfo: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <InfoPanel type="feature" title="智能功能" compact className={className}>
    {children}
  </InfoPanel>
);

export const UsageTip: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <InfoPanel type="tip" title="使用建议" compact className={className}>
    {children}
  </InfoPanel>
);

export const ImportantNote: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <InfoPanel type="warning" title="重要提示" compact className={className}>
    {children}
  </InfoPanel>
);

export const SuccessMessage: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <InfoPanel type="success" title="操作成功" compact className={className}>
    {children}
  </InfoPanel>
);