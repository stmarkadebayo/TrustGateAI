"use client";

type Props = {
  json: string;
  markdown: string;
  baseName: string;
};

function triggerDownload(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DownloadButtons({ json, markdown, baseName }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-400"
        onClick={() => triggerDownload(json, `${baseName}.json`, "application/json")}
      >
        Download JSON
      </button>
      <button
        type="button"
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-800 hover:border-zinc-400"
        onClick={() => triggerDownload(markdown, `${baseName}.md`, "text/markdown")}
      >
        Download Markdown
      </button>
    </div>
  );
}
