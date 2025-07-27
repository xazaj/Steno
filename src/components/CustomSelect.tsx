import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Option {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "请选择",
  label,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full flex items-center justify-between
          px-3 py-2.5 text-left
          bg-white border border-gray-200 rounded-lg
          hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
          disabled:bg-gray-50 disabled:cursor-not-allowed
          transition-all duration-200
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption ? (
            <>
              <span className="text-sm font-medium text-gray-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className={`
                  px-2 py-0.5 text-xs rounded-full font-medium
                  ${selectedOption.badgeColor || 'bg-gray-100 text-gray-600'}
                `}>
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-500">{placeholder}</span>
          )}
        </div>
        
        <ChevronDownIcon 
          className={`
            w-4 h-4 text-gray-400 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} 
        />
      </button>

      {isOpen && (
        <div className="
          absolute z-10 w-full mt-1
          bg-white border border-gray-200 rounded-lg shadow-lg
          max-h-60 overflow-auto
        ">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5
                text-left hover:bg-gray-50
                first:rounded-t-lg last:rounded-b-lg
                transition-colors duration-150
                ${option.value === value ? 'bg-blue-50' : ''}
              `}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-sm font-medium truncate
                      ${option.value === value ? 'text-blue-700' : 'text-gray-900'}
                    `}>
                      {option.label}
                    </span>
                    {option.badge && (
                      <span className={`
                        px-2 py-0.5 text-xs rounded-full font-medium
                        ${option.badgeColor || 'bg-gray-100 text-gray-600'}
                      `}>
                        {option.badge}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
              
              {option.value === value && (
                <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;