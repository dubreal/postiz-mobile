import { useCallback, useEffect, useState } from 'react';
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import {
  getSignatures,
  createSignature,
  updateSignature,
  deleteSignature,
  type Signature,
} from '@/lib/postiz';
import { stripHtml } from '@/lib/format';
import { friendlyError } from '@/lib/errors';
import { Button, ConfirmModal, ErrorBanner, Spinner, cx } from './ui';

type Draft = { id: string | null; content: string; autoAdd: boolean };

export function SignaturesManager() {
  const [items, setItems] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await getSignatures());
      setError(null);
    } catch (err) {
      setError(friendlyError(err, 'Could not load signatures.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!draft || !draft.content.trim()) return;
    setBusy(true);
    try {
      if (draft.id) await updateSignature(draft.id, draft.content.trim(), draft.autoAdd);
      else await createSignature(draft.content.trim(), draft.autoAdd);
      setDraft(null);
      await load();
    } catch (err) {
      setError(friendlyError(err, 'Could not save the signature.'));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const id = confirmDeleteId;
    setConfirmDeleteId('');
    if (!id) return;
    setBusy(true);
    try {
      await deleteSignature(id);
      await load();
    } catch (err) {
      setError(friendlyError(err, 'Could not delete the signature.'));
    } finally {
      setBusy(false);
    }
  }

  const deleting = items.find((s) => s.id === confirmDeleteId);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
          Signatures
        </p>
        {!draft && (
          <Button
            onClick={() => setDraft({ id: null, content: '', autoAdd: items.length === 0 })}
            className="h-9 min-h-0 px-3 text-[13px]"
          >
            <Plus size={16} weight="bold" /> Add
          </Button>
        )}
      </div>

      {draft ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-newBorder bg-newBgColorInner p-3">
          <textarea
            autoFocus
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            rows={3}
            placeholder="Signature text (appended to a post)"
            className="w-full resize-y rounded-[10px] border border-newBorder bg-newBgColor p-2.5 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-newTableText">
            <input
              type="checkbox"
              checked={draft.autoAdd}
              onChange={(e) => setDraft({ ...draft, autoAdd: e.target.checked })}
              className="h-4 w-4 accent-btnPrimary"
            />
            Set as default signature
          </label>
          <div className="flex gap-2">
            <Button onClick={save} loading={busy} disabled={!draft.content.trim()} className="flex-1">
              Save
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      ) : loading ? (
        <Spinner label="Loading signatures" />
      ) : items.length === 0 ? (
        <p className="text-sm text-newTableText">
          No signatures yet. Add one to append it to a post from Compose.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex items-start gap-2 rounded-[10px] border border-newBorder bg-newBgColorInner p-2.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-newTextColor">
                  {stripHtml(s.content, 80) || '(empty)'}
                </span>
                {s.autoAdd && (
                  <span className="mt-0.5 inline-block rounded-full bg-btnPrimary/15 px-2 py-0.5 text-[11px] font-semibold text-btnPrimary">
                    Default
                  </span>
                )}
              </span>
              <button
                type="button"
                aria-label="Edit signature"
                onClick={() => setDraft({ id: s.id, content: stripHtml(s.content, 100000), autoAdd: s.autoAdd })}
                disabled={busy}
                className={cx(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-newBorder text-newTableText hover:bg-boxHover disabled:opacity-40',
                )}
              >
                <PencilSimple size={16} />
              </button>
              <button
                type="button"
                aria-label="Delete signature"
                onClick={() => setConfirmDeleteId(s.id)}
                disabled={busy}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-newBorder text-newTableText hover:text-[#ff6b6b] disabled:opacity-40"
              >
                <Trash size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <ErrorBanner message={error} />}

      {deleting && (
        <ConfirmModal
          title="Delete this signature?"
          message="It will be removed permanently."
          confirmLabel="Delete"
          cancelLabel="Keep"
          danger
          onConfirm={onDelete}
          onCancel={() => setConfirmDeleteId('')}
        />
      )}
    </div>
  );
}
