import * as React from 'react';
import { cn } from '../utils/cn.js';

export interface FileUploadProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      className,
      onFilesSelected,
      accept,
      maxFiles = 1,
      maxSizeMB = 10,
      disabled = false,
      children,
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const validate = React.useCallback(
      (files: File[]): string | null => {
        if (files.length > maxFiles) {
          return `Maximum ${maxFiles} file${maxFiles === 1 ? '' : 's'} allowed`;
        }
        const maxBytes = maxSizeMB * 1024 * 1024;
        const oversized = files.find((f) => f.size > maxBytes);
        if (oversized) {
          return `"${oversized.name}" exceeds ${maxSizeMB} MB limit`;
        }
        return null;
      },
      [maxFiles, maxSizeMB],
    );

    const handleFiles = React.useCallback(
      (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const list = Array.from(files);
        const msg = validate(list);
        if (msg) {
          setError(msg);
          return;
        }
        setError(null);
        onFilesSelected(list);
      },
      [validate, onFilesSelected],
    );

    const onDragEnter = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setDragOver(true);
      },
      [disabled],
    );

    const onDragOver = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setDragOver(true);
      },
      [disabled],
    );

    const onDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
    }, []);

    const onDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      },
      [disabled, handleFiles],
    );

    const onClick = React.useCallback(() => {
      if (!disabled) inputRef.current?.click();
    }, [disabled]);

    const onInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(e.target.files);
        e.target.value = '';
      },
      [handleFiles],
    );

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-lg p-8 text-center transition-all',
          'bg-white/5 backdrop-blur-sm',
          'cursor-pointer select-none',
          dragOver
            ? 'scale-[1.02] border-2 border-solid border-brand-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'border-2 border-dashed border-neutral-300',
          error && 'border-danger-500',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        {...props}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={onInputChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
        />

        {children ?? (
          <>
            <svg
              className="h-10 w-10 text-neutral-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
              />
            </svg>
            <p className="text-sm text-neutral-500">
              Drop files here or click to browse
            </p>
          </>
        )}

        {error && (
          <p className="mt-1 text-xs text-danger-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

FileUpload.displayName = 'FileUpload';
