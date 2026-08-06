import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
}) => {
  const modalRef = useRef(null);
  const titleId = useId();
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4',
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Focus the dialog itself so keyboard users start inside the active modal.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  // Rendering at the document root keeps fixed positioning and backdrop filters
  // independent from transformed/animated page cards.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">

          {/* Overlay */}
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal Content */}
          <Motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`
              relative mx-auto my-4 sm:my-8 w-full ${sizes[size]}
              bg-white dark:bg-dark-900
              border border-gray-100 dark:border-dark-700
              rounded-2xl shadow-xl dark:shadow-glow
              max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col
              ${className}
            `}
            onClick={(e) => e.stopPropagation()} // stop closing when clicking inside
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
          >

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dark-700 bg-white dark:bg-dark-900">
                {title && (
                  <h2 id={titleId} className="text-xl font-display font-bold text-gray-900 dark:text-white tracking-tight">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                             hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
              {children}
            </div>

          </Motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
