import { useState } from 'react';
import { MagnifyingGlass, X, Check } from '@phosphor-icons/react';
import { ChannelAvatar as Avatar } from './PostBits';
import { providerLabel } from '@/lib/providers';
import { Button, cx } from './ui';
import type { Integration } from '@/lib/types';

// Bottom-sheet multi-select for channels. Scales past a wall of pills: search,
// checkbox rows, and a compact "N selected" summary on the trigger (in Compose).
export function ChannelPickerSheet({
  channels,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  onClose,
}: {
  channels: Integration[];
  selected: Set<string>;
  onToggle: (intg: Integration) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const filtered = query
    ? channels.filter((c) =>
        `${c.name} ${providerLabel(c.identifier)}`.toLowerCase().includes(query),
      )
    : channels;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] flex-col rounded-t-2xl border border-newBorder bg-newBgColorInner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-base font-bold text-newTextColor">Select channels</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-newTableText hover:bg-boxHover"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="px-4">
          <div className="relative">
            <MagnifyingGlass
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-newTableText"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search channels"
              className="w-full rounded-[10px] border border-newBorder bg-newBgColor py-2.5 pl-9 pr-3 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none"
            />
          </div>
          <div className="mt-2 flex gap-4 text-xs font-medium">
            <button type="button" onClick={onSelectAll} className="text-btnPrimary">
              Select all
            </button>
            <button type="button" onClick={onClear} className="text-newTableText">
              Clear
            </button>
          </div>
        </div>

        <ul className="mt-2 flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 ? (
            <li className="p-4 text-sm text-newTableText">No channels match.</li>
          ) : (
            filtered.map((intg) => {
              const on = selected.has(intg.id);
              return (
                <li key={intg.id}>
                  <button
                    type="button"
                    disabled={intg.disabled}
                    onClick={() => onToggle(intg)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-[10px] p-2.5 text-left hover:bg-boxHover',
                      intg.disabled && 'opacity-40',
                    )}
                  >
                    <Avatar picture={intg.picture} identifier={intg.identifier} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-newTextColor">
                        {intg.name}
                      </span>
                      <span className="block text-[11px] text-newTableText">
                        {providerLabel(intg.identifier)}
                      </span>
                    </span>
                    <span
                      className={cx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border',
                        on ? 'border-btnPrimary bg-btnPrimary text-white' : 'border-newBorder',
                      )}
                    >
                      {on && <Check size={13} weight="bold" />}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="border-t border-newBorder p-3">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
