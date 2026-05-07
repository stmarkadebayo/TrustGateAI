import type { ReactNode } from "react";

export function ProductPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-stone-300 bg-[#fffdf7] p-5 shadow-sm sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-800">
      {children}
    </div>
  );
}

export function InlineBadge({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md bg-stone-100 px-2 py-1 text-xs uppercase tracking-wide text-stone-600">
      {children}
    </div>
  );
}

export function UploadDropzone({
  id,
  label,
  title,
  description,
  action = "Choose files",
  accept,
  onFiles,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  action?: string;
  accept: string;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <>
      <label
        htmlFor={id}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFiles(event.dataTransfer.files);
        }}
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center border border-dashed border-stone-400 bg-[#f7f5ef] px-6 py-8 text-center hover:border-emerald-800 hover:bg-white"
      >
        <span className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
          {label}
        </span>
        <span className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
          {title}
        </span>
        <span className="mt-2 max-w-md text-sm leading-6 text-stone-600">
          {description}
        </span>
        <span className="mt-5 rounded-md bg-stone-950 px-4 py-2 text-sm font-semibold text-white">
          {action}
        </span>
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        multiple
        onChange={(event) => onFiles(event.target.files)}
        className="sr-only"
      />
    </>
  );
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
