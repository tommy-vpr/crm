"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useGlobalSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);
  const { data, isLoading } = useGlobalSearch(debouncedQuery);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Focus input on open
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  // Build flat results list
  const results: { type: string; id: string; label: string; sub: string; href: string }[] = [];
  if (data) {
    for (const c of data.contacts ?? []) {
      results.push({
        type: "contact",
        id: c.id,
        label: `${c.firstName} ${c.lastName}`,
        sub: c.email ?? c.company?.name ?? "",
        href: `/contacts/${c.id}`,
      });
    }
    for (const c of data.companies ?? []) {
      results.push({
        type: "company",
        id: c.id,
        label: c.name,
        sub: c.domain ?? `${c._count?.contacts ?? 0} contacts`,
        href: `/companies/${c.id}`,
      });
    }
    for (const d of data.deals ?? []) {
      results.push({
        type: "deal",
        id: d.id,
        label: d.title,
        sub: [d.stage?.name, d.company?.name, d.value ? `$${d.value.toLocaleString()}` : ""].filter(Boolean).join(" · "),
        href: `/deals/${d.id}`,
      });
    }
  }

  // Keyboard navigation
  const navigate = useCallback(
    (href: string) => {
      setCommandPaletteOpen(false);
      router.push(href);
    },
    [router, setCommandPaletteOpen]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex].href);
    }
  };

  if (!commandPaletteOpen) return null;

  const typeIcons: Record<string, string> = {
    contact: "👤",
    company: "🏢",
    deal: "💰",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-2xl">
        {/* Input */}
        <div className="flex items-center border-b px-4">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 border-0 bg-transparent px-3 py-4 text-sm outline-none placeholder:text-slate-400"
            placeholder="Search contacts, companies, deals..."
          />
          <kbd className="hidden rounded border bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Type at least 2 characters to search...
            </div>
          ) : isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-2">
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => navigate(r.href)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition",
                    i === selectedIndex ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="text-base">{typeIcons[r.type] ?? "📄"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.label}</p>
                    {r.sub && <p className="truncate text-xs text-slate-400">{r.sub}</p>}
                  </div>
                  <span className="text-[10px] uppercase text-slate-400">{r.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t bg-slate-50 px-4 py-2 text-[10px] text-slate-400">
          <span><kbd className="rounded border bg-white px-1">↑↓</kbd> navigate</span>
          <span><kbd className="rounded border bg-white px-1">↵</kbd> open</span>
          <span><kbd className="rounded border bg-white px-1">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
