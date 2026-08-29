import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon?: React.FC<{ className?: string }>;
  keywords?: string;
  onSelect: () => void;
}

/** Strip Vietnamese diacritics + lowercase so "can ho" matches "Căn Hộ". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** 0 = no match, 1 = subsequence, 2 = substring (better). */
function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (!q) return 2;
  if (t.includes(q)) return 2;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 1 : 0;
}

/** Global ⌘K / Ctrl+K listener toggling palette visibility. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return { open, setOpen };
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return commands;
    return commands
      .map((c) => ({
        c,
        score: fuzzyScore(query, `${c.label} ${c.keywords ?? ''} ${c.hint ?? ''}`),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [query, commands]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const select = (item?: CommandItem) => {
    if (!item) return;
    item.onSelect();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border">
          <svg
            className="w-5 h-5 text-ink-faint flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm trang, thao tác..."
            className="flex-1 bg-transparent outline-none text-ink placeholder-ink-faint text-sm"
          />
          <kbd className="text-[10px] text-ink-soft border border-brand-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-soft">Không tìm thấy kết quả</div>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              const isActive = i === active;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                    isActive ? 'bg-accent/10' : 'hover:bg-surface-alt'
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-ink-soft'}`}
                    />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-ink truncate">{item.label}</span>
                    {item.hint && (
                      <span className="block text-[11px] text-ink-soft truncate">{item.hint}</span>
                    )}
                  </span>
                  {isActive && <span className="text-[10px] text-ink-faint font-mono">↵</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-brand-border text-[11px] text-ink-soft flex items-center gap-4">
          <span>
            <kbd className="font-mono border border-brand-border rounded px-1">↑↓</kbd> di chuyển
          </span>
          <span>
            <kbd className="font-mono border border-brand-border rounded px-1">↵</kbd> chọn
          </span>
          <span>
            <kbd className="font-mono border border-brand-border rounded px-1">esc</kbd> đóng
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
