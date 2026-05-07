import Link from "next/link";
import type { ReactNode } from "react";

type ToolPageProps = {
  label: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  children,
  maxWidth = "max-w-3xl",
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-stone-950 sm:px-8">
      <div className={`mx-auto flex w-full ${maxWidth} flex-col gap-8`}>
        {children}
      </div>
    </main>
  );
}

export function ToolPage({ label, title, description, children }: ToolPageProps) {
  return (
    <AppShell>
      <div className="flex flex-col gap-4 border-b border-stone-300/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
            {label}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-950">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="w-fit shrink-0 rounded-md border border-stone-400 px-3 py-2 text-sm font-semibold text-stone-900 hover:border-stone-700"
        >
          Back to modules
        </Link>
      </div>
      {children}
    </AppShell>
  );
}
