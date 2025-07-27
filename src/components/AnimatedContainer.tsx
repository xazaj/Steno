import React, { useState, useEffect } from 'react';

interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn' | 'none';
  delay?: number;
  duration?: number;
  className?: string;
  onAnimationComplete?: () => void;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 300,
  className = '',
  onAnimationComplete
}) => {
  const [isVisible, setIsVisible] = useState(animation === 'none');
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (animation === 'none') return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setHasAnimated(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [animation, delay]);

  useEffect(() => {
    if (hasAnimated && onAnimationComplete) {
      const timer = setTimeout(onAnimationComplete, duration);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, onAnimationComplete, duration]);

  const getAnimationClasses = () => {
    if (animation === 'none') return '';

    const baseClasses = 'transition-all ease-out';
    const durationClass = `duration-${duration}`;

    if (!isVisible) {
      switch (animation) {
        case 'fadeIn':
          return `${baseClasses} ${durationClass} opacity-0`;
        case 'slideUp':
          return `${baseClasses} ${durationClass} opacity-0 translate-y-4`;
        case 'slideDown':
          return `${baseClasses} ${durationClass} opacity-0 -translate-y-4`;
        case 'slideLeft':
          return `${baseClasses} ${durationClass} opacity-0 translate-x-4`;
        case 'slideRight':
          return `${baseClasses} ${durationClass} opacity-0 -translate-x-4`;
        case 'scaleIn':
          return `${baseClasses} ${durationClass} opacity-0 scale-95`;
        default:
          return `${baseClasses} ${durationClass} opacity-0`;
      }
    }

    return `${baseClasses} ${durationClass} opacity-100 translate-x-0 translate-y-0 scale-100`;
  };

  return (
    <div className={`${getAnimationClasses()} ${className}`}>
      {children}
    </div>
  );
};

// 专用的步骤动画组件
interface StepAnimationProps {
  children: React.ReactNode;
  step: number;
  currentStep: number;
  className?: string;
}

export const StepAnimation: React.FC<StepAnimationProps> = ({
  children,
  step,
  currentStep,
  className = ''
}) => {
  const isActive = step === currentStep;
  const hasBeenVisited = step < currentStep;
  
  return (
    <AnimatedContainer
      animation={isActive ? 'slideUp' : 'none'}
      delay={isActive ? 100 : 0}
      duration={400}
      className={`${className} ${
        isActive 
          ? 'opacity-100' 
          : hasBeenVisited 
          ? 'opacity-50' 
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {children}
    </AnimatedContainer>
  );
};

// 成功状态动画组件
interface SuccessAnimationProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  isVisible,
  children,
  className = ''
}) => {
  return (
    <div className={`${className} transition-all duration-500 ease-out ${
      isVisible 
        ? 'opacity-100 scale-100 translate-y-0' 
        : 'opacity-0 scale-95 translate-y-2'
    }`}>
      {children}
    </div>
  );
};

// 悬浮效果组件
interface HoverEffectProps {
  children: React.ReactNode;
  effect?: 'lift' | 'glow' | 'scale' | 'rotate';
  className?: string;
}

export const HoverEffect: React.FC<HoverEffectProps> = ({
  children,
  effect = 'lift',
  className = ''
}) => {
  const getHoverClasses = () => {
    switch (effect) {
      case 'lift':
        return 'hover:-translate-y-1 hover:shadow-lg';
      case 'glow':
        return 'hover:shadow-lg hover:shadow-blue-200';
      case 'scale':
        return 'hover:scale-105';
      case 'rotate':
        return 'hover:rotate-1';
      default:
        return '';
    }
  };

  return (
    <div className={`transition-all duration-200 ease-out ${getHoverClasses()} ${className}`}>
      {children}
    </div>
  );
};

// 加载动画组件
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'purple' | 'gray';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg className="animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// 进度条动画组件
interface ProgressBarProps {
  progress: number;
  color?: 'blue' | 'green' | 'purple';
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'blue',
  showPercentage = true,
  className = ''
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">进度</span>
        {showPercentage && (
          <span className="text-sm text-gray-600">{progress}%</span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ease-out ${colorClasses[color]}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// 脉搏动画组件
interface PulseAnimationProps {
  children: React.ReactNode;
  isActive?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  className?: string;
}

export const PulseAnimation: React.FC<PulseAnimationProps> = ({
  children,
  isActive = true,
  color = 'blue',
  className = ''
}) => {
  const colorClasses = {
    blue: 'ring-blue-400',
    green: 'ring-green-400',
    red: 'ring-red-400',
    yellow: 'ring-yellow-400'
  };

  return (
    <div className={`${className} ${
      isActive 
        ? `animate-pulse ring-2 ${colorClasses[color]} ring-opacity-50` 
        : ''
    }`}>
      {children}
    </div>
  );
};