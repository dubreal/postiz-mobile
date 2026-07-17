import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Image as ImageIcon,
  X,
  Stack,
  FloppyDisk,
  Trash,
} from '@phosphor-icons/react';
import {
  getIntegrations,
  createPost,
  getSets,
  saveSet,
  deleteSet,
  parseSetContent,
  getPostForEdit,
  type CreatePostChannel,
  type PostizSet,
  type EditPostData,
} from '@/lib/postiz';
import { useAsync } from '@/lib/useAsync';
import {
  PROVIDER_FIELDS,
  defaultSettings,
  providerLabel,
  type ProviderFieldSpec,
} from '@/lib/providers';
import { defaultScheduleLocal, localInputToUtcISO, stripHtml, toLocal } from '@/lib/format';
import { Button, ConfirmModal, ErrorState, Spinner, cx } from '@/components/ui';
import { MediaThumb } from '@/components/MediaGrid';
import { MediaViewer } from '@/components/MediaViewer';
import { ChannelAvatar as Avatar } from '@/components/PostBits';
import { MediaPicker } from '@/components/MediaPicker';
import type { Integration, MediaItem } from '@/lib/types';

type FieldValues = Record<string, Record<string, string>>; // integrationId -> key -> value

export function ComposeScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { data: channels, loading, error, reload } = useAsync(getIntegrations, []);

  const [editData, setEditData] = useState<EditPostData | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState('');
  const [attached, setAttached] = useState<MediaItem[]>([]);
  const [showMedia, setShowMedia] = useState(false);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [scheduleLocal, setScheduleLocal] = useState(defaultScheduleLocal());
  const [asDraft, setAsDraft] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [sets, setSets] = useState<PostizSet[]>([]);
  const [showSaveSet, setShowSaveSet] = useState(false);
  const [setName, setSetName] = useState('');
  const [savingSet, setSavingSet] = useState(false);

  const active = useMemo(
    () => (channels ?? []).filter((c) => selectedIds.has(c.id)),
    [channels, selectedIds],
  );

  // Edit mode: load the existing post once channels are available, then prefill.
  useEffect(() => {
    if (!editId || !channels) return;
    let alive = true;
    setLoadingEdit(true);
    getPostForEdit(editId)
      .then((d) => {
        if (!alive) return;
        setEditData(d);
        setSelectedIds(new Set([d.integrationId]));
        setCaption(stripHtml(d.content, 100000));
        setAttached(d.image.map((m) => ({ id: m.id, path: m.path, name: '' })));
        const intg = channels.find((c) => c.id === d.integrationId);
        const seeded = intg ? seedFields(intg.identifier) : {};
        const strs: Record<string, string> = {};
        for (const [k, v] of Object.entries(d.settings)) {
          if (typeof v === 'string') strs[k] = v;
        }
        setFieldValues({ [d.integrationId]: { ...seeded, ...strs } });
        setScheduleLocal(toLocal(d.publishDate).format('YYYY-MM-DDTHH:mm'));
      })
      .catch(() => alive && setFormError('Could not load the post to edit.'))
      .finally(() => alive && setLoadingEdit(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, channels]);

  const loadSets = useCallback(async () => {
    try {
      setSets(await getSets());
    } catch {
      /* sets are optional; ignore load errors */
    }
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  /** Current composer state as post channels (shared by submit and save-as-set). */
  const currentChannels = useCallback(
    (): CreatePostChannel[] =>
      active.map((intg) => ({
        integrationId: intg.id,
        value: [
          {
            content: caption,
            image: attached.map((m) => ({ id: m.id, path: m.path })),
            // In edit mode, carry the post row id so the update edits in place.
            ...(editData && intg.id === editData.integrationId
              ? { id: editData.postId }
              : {}),
          },
        ],
        settings: { ...defaultSettings(intg.identifier), ...fieldValues[intg.id] },
      })),
    [active, caption, attached, fieldValues, editData],
  );

  function applySet(set: PostizSet) {
    try {
      const p = parseSetContent(set.content);
      setSelectedIds(new Set(p.channelIds));
      setCaption(p.caption);
      setAttached(p.media.map((m) => ({ id: m.id, path: m.path, name: '' })));
      const fv: FieldValues = {};
      for (const [id, settings] of Object.entries(p.settingsById)) {
        const intg = (channels ?? []).find((c) => c.id === id);
        const seeded = intg ? seedFields(intg.identifier) : {};
        const strs: Record<string, string> = {};
        for (const [k, v] of Object.entries(settings)) {
          if (typeof v === 'string') strs[k] = v;
        }
        fv[id] = { ...seeded, ...strs };
      }
      setFieldValues(fv);
      setFormError(null);
    } catch {
      setFormError('Could not load that set.');
    }
  }

  async function onSaveSet() {
    if (active.length === 0) {
      setFormError('Pick at least one channel before saving a set.');
      return;
    }
    if (!setName.trim()) return;
    setSavingSet(true);
    try {
      await saveSet(setName.trim(), {
        type: 'schedule',
        dateISO: localInputToUtcISO(scheduleLocal),
        channels: currentChannels(),
      });
      setSetName('');
      setShowSaveSet(false);
      await loadSets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the set.');
    } finally {
      setSavingSet(false);
    }
  }

  async function onDeleteSet(id: string) {
    try {
      await deleteSet(id);
      await loadSets();
    } catch {
      /* ignore */
    }
  }

  function toggleChannel(intg: Integration) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(intg.id)) next.delete(intg.id);
      else {
        next.add(intg.id);
        // seed default field values so selects/toggles are valid up-front
        setFieldValues((fv) => ({
          ...fv,
          [intg.id]: { ...seedFields(intg.identifier), ...fv[intg.id] },
        }));
      }
      return next;
    });
  }

  function setField(id: string, key: string, value: string) {
    setFieldValues((fv) => ({ ...fv, [id]: { ...fv[id], [key]: value } }));
  }

  function validate(): string | null {
    if (active.length === 0) return 'Pick at least one channel.';
    if (!caption.trim() && attached.length === 0)
      return 'Write a caption or attach media.';
    for (const intg of active) {
      for (const f of PROVIDER_FIELDS[intg.identifier] ?? []) {
        if (f.required && !(fieldValues[intg.id]?.[f.key] ?? '').trim()) {
          return `${providerLabel(intg.identifier)}: ${f.label} is required.`;
        }
      }
    }
    return null;
  }

  async function submit() {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await createPost({
        type: editData ? 'update' : asDraft ? 'draft' : 'schedule',
        dateISO: localInputToUtcISO(scheduleLocal),
        channels: currentChannels(),
      });
      setDone(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not schedule the post.',
      );
      setSubmitting(false);
    }
  }

  if (loading || loadingEdit) return <Spinner label="Loading" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <CheckCircle size={48} weight="fill" className="text-[#5fbd8b]" />
        <p className="text-base font-semibold text-newTextColor">
          {editData ? 'Post updated' : asDraft ? 'Saved as draft' : 'Post scheduled'}
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold text-newTextColor">
          {editData ? 'Edit post' : 'Compose'}
        </h1>
      </header>

      {/* Sets — saved channel + content templates (not shown while editing) */}
      {!editData && (
      <div className="flex flex-col gap-2 rounded-[12px] border border-newBorder bg-newBgColorInner p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-newTextColor">
            <Stack size={16} weight="bold" /> Sets
          </span>
          <button
            type="button"
            onClick={() => setShowSaveSet((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-btnPrimary"
          >
            <FloppyDisk size={14} weight="bold" /> Save current
          </button>
        </div>

        {sets.length === 0 ? (
          <p className="text-xs text-newTableText">
            No sets yet. Build a post, then Save current to reuse it.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sets.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 rounded-full border border-newBorder bg-newBgColor py-1 pl-3 pr-1.5 text-sm text-newTextColor"
              >
                <button type="button" onClick={() => applySet(s)} className="font-medium">
                  {s.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSet(s.id)}
                  aria-label={`Delete set ${s.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-newTableText hover:text-[#ff6b6b]"
                >
                  <Trash size={13} />
                </button>
              </span>
            ))}
          </div>
        )}

        {showSaveSet && (
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="Set name"
              className="min-w-0 flex-1 rounded-[10px] border border-newBorder bg-newBgColor px-3 py-2 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none"
            />
            <Button
              onClick={onSaveSet}
              loading={savingSet}
              className="h-11 min-h-0 shrink-0 px-4"
            >
              Save
            </Button>
          </div>
        )}
      </div>
      )}

      {/* Channels — locked to the post's channel while editing */}
      <Field label={editData ? 'Channel' : 'Channels'}>
        {(channels ?? []).length === 0 ? (
          <p className="text-sm text-newTableText">
            No channels connected in Postiz yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(channels ?? []).map((intg) => {
              const on = selectedIds.has(intg.id);
              if (editData && !on) return null; // in edit mode, show only the post's channel
              return (
                <button
                  key={intg.id}
                  type="button"
                  disabled={intg.disabled || !!editData}
                  onClick={() => !editData && toggleChannel(intg)}
                  className={cx(
                    'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors',
                    on
                      ? 'border-btnPrimary bg-btnPrimary/15 text-btnPrimary'
                      : 'border-newBorder text-newTableText hover:bg-boxHover',
                    intg.disabled && 'opacity-40',
                  )}
                >
                  <Avatar picture={intg.picture} identifier={intg.identifier} size={22} />
                  {intg.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      {/* Caption */}
      <Field label="Caption">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          placeholder="What do you want to say?"
          className="w-full resize-y rounded-[10px] border border-newBorder bg-newBgColorInner p-3 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40"
        />
      </Field>

      {/* Media */}
      <Field label="Media">
        {attached.length > 0 && (
          <ul className="mb-3 grid grid-cols-4 gap-2">
            {attached.map((m) => (
              <li key={m.id} className="relative aspect-square overflow-hidden rounded-[10px] border border-newBorder">
                <button
                  type="button"
                  onClick={() => setViewingMedia(m)}
                  aria-label="View media"
                  className="h-full w-full"
                >
                  <MediaThumb item={m} />
                </button>
                <button
                  type="button"
                  onClick={() => setAttached((prev) => prev.filter((x) => x.id !== m.id))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Remove"
                >
                  <X size={14} weight="bold" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {showMedia ? (
          <MediaPicker selected={attached} onChange={setAttached} />
        ) : (
          <Button variant="ghost" onClick={() => setShowMedia(true)}>
            <ImageIcon size={18} /> Add media
          </Button>
        )}
      </Field>

      {/* Per-channel required settings */}
      {active.some((c) => (PROVIDER_FIELDS[c.identifier] ?? []).length > 0) && (
        <Field label="Channel options">
          <div className="flex flex-col gap-4">
            {active.map((intg) => {
              const fields = PROVIDER_FIELDS[intg.identifier] ?? [];
              if (fields.length === 0) return null;
              return (
                <div
                  key={intg.id}
                  className="rounded-[10px] border border-newBorder bg-newBgColorInner p-3"
                >
                  <p className="mb-2 text-sm font-semibold text-newTextColor">
                    {intg.name}
                  </p>
                  <div className="flex flex-col gap-3">
                    {fields.map((f) => (
                      <FieldInput
                        key={f.key}
                        spec={f}
                        value={fieldValues[intg.id]?.[f.key] ?? ''}
                        onChange={(v) => setField(intg.id, f.key, v)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Field>
      )}

      {/* Schedule */}
      <Field label="When">
        <input
          type="datetime-local"
          value={scheduleLocal}
          onChange={(e) => setScheduleLocal(e.target.value)}
          disabled={asDraft}
          className="w-full rounded-[10px] border border-newBorder bg-newBgColorInner p-3 text-[16px] text-newTextColor focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40 disabled:opacity-50"
        />
        {!editData && (
          <label className="mt-2 flex items-center gap-2 text-sm text-newTableText">
            <input
              type="checkbox"
              checked={asDraft}
              onChange={(e) => setAsDraft(e.target.checked)}
              className="h-4 w-4 accent-btnPrimary"
            />
            Save as draft instead of scheduling
          </label>
        )}
      </Field>

      {formError && (
        <p role="alert" className="rounded-[10px] bg-[#ff6b6b]/10 px-3 py-2 text-sm text-[#ff6b6b]">
          {formError}
        </p>
      )}

      {editData ? (
        <div className="flex gap-2">
          <Button onClick={submit} loading={submitting} className="flex-1">
            Update post
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirmCancel(true)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button onClick={submit} loading={submitting} className="w-full">
          {asDraft ? 'Save draft' : 'Schedule post'}
        </Button>
      )}

      {viewingMedia && (
        <MediaViewer item={viewingMedia} onClose={() => setViewingMedia(null)} />
      )}

      {confirmCancel && (
        <ConfirmModal
          title="Discard changes?"
          message="Your edits to this post will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onConfirm={() => navigate('/')}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-newTextColor">{label}</p>
      {children}
    </div>
  );
}

function FieldInput({
  spec,
  value,
  onChange,
}: {
  spec: ProviderFieldSpec;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    'w-full rounded-[10px] border border-newBorder bg-newBgColor p-2.5 text-[16px] text-newTextColor focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40';
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-newTableText">
        {spec.label}
        {spec.required && <span className="text-[#ff6b6b]"> *</span>}
      </span>
      {spec.type === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={base}>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
      {spec.help && <span className="text-[11px] text-newTableText">{spec.help}</span>}
    </label>
  );
}

function seedFields(identifier: string): Record<string, string> {
  const base = defaultSettings(identifier);
  const out: Record<string, string> = {};
  for (const f of PROVIDER_FIELDS[identifier] ?? []) {
    const v = base[f.key];
    if (typeof v === 'string') out[f.key] = v;
    else if (f.type === 'select' && f.options?.[0]) out[f.key] = f.options[0].value;
  }
  return out;
}
