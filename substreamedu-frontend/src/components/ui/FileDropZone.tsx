import React, { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import styles from './FileDropZone.module.css';

export interface FileDropZoneProps {
  accept: string;
  title: React.ReactNode;
  hint?: React.ReactNode;
  selectedFileName?: string;
  isBusy?: boolean;
  busyTitle?: React.ReactNode;
  error?: string | null;
  forceActive?: boolean;
  inputId?: string;
  variant?: 'light' | 'dark';
  compact?: boolean;
  className?: string;
  onFilesSelected: (files: FileList) => void;
  onDragStateChange?: (dragging: boolean) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  accept,
  title,
  hint,
  selectedFileName,
  isBusy = false,
  busyTitle = 'Processing file...',
  error,
  forceActive = false,
  inputId,
  variant = 'light',
  compact = false,
  className,
  onFilesSelected,
  onDragStateChange,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const active = isDragOver || forceActive;

  const setDragging = (next: boolean) => {
    setIsDragOver(next);
    onDragStateChange?.(next);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragOver) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!isBusy && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  const openPicker = () => {
    if (!isBusy) {
      inputRef.current?.click();
    }
  };

  return (
    <motion.div
      role="button"
      tabIndex={isBusy ? -1 : 0}
      aria-disabled={isBusy}
      data-dragging={active ? 'true' : 'false'}
      className={cn(
        styles.zone,
        styles[variant],
        compact && styles.compact,
        active && styles.active,
        className
      )}
      animate={
        prefersReducedMotion
          ? undefined
          : {
              scale: active ? 1.012 : 1,
            }
      }
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 380, damping: 24 }
      }
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className={styles.hiddenInput}
        tabIndex={-1}
      />

      <motion.div
        className={styles.iconBadge}
        animate={
          prefersReducedMotion
            ? undefined
            : { y: active ? -4 : 0, scale: active ? 1.08 : 1 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 420, damping: 22 }
        }
        aria-hidden="true"
      >
        {isBusy ? (
          <Loader2 size={20} className={styles.spinner} />
        ) : selectedFileName ? (
          <FileText size={20} strokeWidth={2} />
        ) : (
          <Upload size={20} strokeWidth={2} />
        )}
      </motion.div>

      <div className={styles.textBlock}>
        <div className={styles.title}>{isBusy ? busyTitle : title}</div>
        {hint && <div className={styles.hint}>{hint}</div>}
        {selectedFileName && !isBusy && (
          <span className={styles.fileChip}>{selectedFileName}</span>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </motion.div>
  );
};

export default FileDropZone;
