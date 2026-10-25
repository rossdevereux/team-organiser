import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'lg',
  children,
  footer,
  className = '',
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in print:hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${maxWidthMap[maxWidth]} bg-[var(--surface-card)] text-[var(--text-main)] border border-[var(--surface-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[92vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        {(title || icon) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--surface-border)] shrink-0">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              {icon && (
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {typeof title === 'string' ? (
                  <h3 className="text-base font-bold text-[var(--text-main)] truncate">{title}</h3>
                ) : (
                  title
                )}
                {subtitle && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-800 transition cursor-pointer flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className={`p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 flex-1 ${footer ? 'pb-24 sm:pb-6' : 'pb-8 sm:pb-6'}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 sm:p-5 border-t border-[var(--surface-border)] bg-black/10 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
