import { useCallback, useEffect, useState } from 'react';
import { CopySimple, PencilSimple, Plus, Trash, Check, X } from '@phosphor-icons/react';
import {
  getSets,
  createRawSet,
  updateSet,
  deleteSet,
  BLANK_SET_CONTENT,
  type PostizSet,
} from '@/lib/postiz';
import { Button, ConfirmModal, Spinner, cx } from './ui';

const rowInput =
  'min-w-0 flex-1 rounded-[10px] border border-newBorder bg-newBgColor px-3 py-2 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none';

// Rename and duplicate reuse this inline name editor.
function NameEditor({
  initial,
  placeholder,
  onSave,
  onCancel,
  busy,
}: {
  initial: string;
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial);
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={name}
        placeholder={placeholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())}
        className={rowInput}
      />
      <IconBtn
        label="Save"
        onClick={() => name.trim() && onSave(name.trim())}
        disabled={busy || !name.trim()}
        className="text-btnPrimary"
      >
        <Check size={16} weight="bold" />
      </IconBtn>
      <IconBtn label="Cancel" onClick={onCancel} disabled={busy}>
        <X size={16} weight="bold" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-newBorder text-newTableText transition-colors hover:bg-boxHover disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SetsManager() {
  const [sets, setSets] = useState<PostizSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [addName, setAddName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [dupId, setDupId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  const load = useCallback(async () => {
    try {
      setSets(await getSets());
      setError(null);
    } catch {
      setError('Could not load sets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
      setEditingId('');
      setDupId('');
    } catch {
      setError('That action failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const onAdd = () => {
    const name = addName.trim();
    if (!name) return;
    setAddName('');
    void run(() => createRawSet(name, BLANK_SET_CONTENT));
  };

  const deleting = sets.find((s) => s.id === confirmDeleteId);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
        Sets
      </p>

      <div className="flex items-center gap-1.5">
        <input
          value={addName}
          placeholder="New set name"
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          className={rowInput}
        />
        <Button onClick={onAdd} disabled={busy || !addName.trim()} className="h-11 min-h-0 shrink-0 px-3">
          <Plus size={18} weight="bold" /> Add
        </Button>
      </div>

      {loading ? (
        <Spinner label="Loading sets" />
      ) : sets.length === 0 ? (
        <p className="text-sm text-newTableText">
          No sets yet. Add one above, or save one from the Compose screen.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sets.map((s) => (
            <li
              key={s.id}
              className="rounded-[10px] border border-newBorder bg-newBgColorInner p-2.5"
            >
              {editingId === s.id ? (
                <NameEditor
                  initial={s.name}
                  placeholder="Set name"
                  busy={busy}
                  onCancel={() => setEditingId('')}
                  onSave={(name) => run(() => updateSet(s.id, name, s.content))}
                />
              ) : dupId === s.id ? (
                <NameEditor
                  initial={`${s.name} copy`}
                  placeholder="Duplicate name"
                  busy={busy}
                  onCancel={() => setDupId('')}
                  onSave={(name) => run(() => createRawSet(name, s.content))}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-newTextColor">
                    {s.name}
                  </span>
                  <IconBtn label={`Rename ${s.name}`} onClick={() => setEditingId(s.id)} disabled={busy}>
                    <PencilSimple size={16} />
                  </IconBtn>
                  <IconBtn label={`Duplicate ${s.name}`} onClick={() => setDupId(s.id)} disabled={busy}>
                    <CopySimple size={16} />
                  </IconBtn>
                  <IconBtn
                    label={`Delete ${s.name}`}
                    onClick={() => setConfirmDeleteId(s.id)}
                    disabled={busy}
                    className="hover:text-[#ff6b6b]"
                  >
                    <Trash size={16} />
                  </IconBtn>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-[#ff6b6b]">{error}</p>}

      {deleting && (
        <ConfirmModal
          title="Delete this set?"
          message={`"${deleting.name}" will be permanently removed.`}
          confirmLabel="Delete"
          cancelLabel="Keep set"
          danger
          onConfirm={() => {
            setConfirmDeleteId('');
            void run(() => deleteSet(deleting.id));
          }}
          onCancel={() => setConfirmDeleteId('')}
        />
      )}
    </div>
  );
}
