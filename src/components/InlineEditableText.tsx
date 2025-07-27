import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';

interface InlineEditableTextProps {
  text: string;
  onSave: (newText: string) => void;
  className?: string;
  placeholder?: string;
  searchQuery?: string;
}

const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  text,
  onSave,
  className = '',
  placeholder = '',
  searchQuery = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部text变化
  useEffect(() => {
    if (!isEditing) {
      setEditText(text);
    }
  }, [text, isEditing]);

  // 进入编辑模式时聚焦并选中文本
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 高亮搜索关键词
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmedText = editText.trim();
    if (trimmedText && trimmedText !== text) {
      onSave(trimmedText);
    } else if (!trimmedText) {
      // 如果为空，恢复原文本
      setEditText(text);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "bg-white border border-blue-300 rounded px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
          className
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onDoubleClick={handleDoubleClick}
      className={cn(
        "inline-editable-text cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors",
        className
      )}
      title="双击编辑"
    >
      {highlightText(text, searchQuery)}
    </span>
  );
};

export default InlineEditableText;