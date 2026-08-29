import React from 'react';
import { XMarkIcon } from './icons';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3 border-b border-brand-border">
          <h3 className="text-base font-bold text-ink">
            Chi tiết hình ảnh
          </h3>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors cursor-pointer"
            aria-label="Close image viewer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 flex-grow overflow-hidden flex justify-center items-center bg-surface-alt">
          <img
            src={imageUrl}
            alt="Full size view"
            className="max-w-full max-h-[75vh] object-contain rounded shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;
