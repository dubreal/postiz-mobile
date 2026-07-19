import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Image as ImageIcon,
  X,
  CaretDown,
  FloppyDisk,
  Trash,
} from '@phosphor-icons/react';
import {
  getIntegrations,
  createPost,
  getSets,
  getDrafts,
  saveSet,
  deleteSet,
  deletePost,
  parseSetContent,
  getPostForEdit,
  getSignatures,
  type CreatePostChannel,
  type PostizSet,
  type EditPostData,
  type Signature,
} from '@/lib/postiz';
import { useAsync } from '@/lib/useAsync';
import {
  PROVIDER_FIELDS,
  defaultSettings,
  providerLabel,
  settingsToFields,
  fieldsToSettings,
  type ProviderFieldSpec,
} from '@/lib/providers';
import { defaultScheduleLocal, localInputToUtcISO, stripHtml, toLocal } from '@/lib/format';
import { getLastSetId, setLastSetId } from '@/lib/prefs';
import { friendlyError } from '@/lib/errors';
import { Button, ConfirmModal, ErrorBanner, ErrorState, Select, Spinner } from '@/components/ui';
import { MediaThumb } from '@/components/MediaGrid';
import { MediaViewer } from '@/components/MediaViewer';
import { ChannelAvatar as Avatar } from '@/components/PostBits';
import { MediaPicker } from '@/components/MediaPicker';
import { ChannelPickerSheet } from '@/components/ChannelPickerSheet';
import type { CalendarPost, Integration, MediaItem } from '@/lib/types';

type FieldValues = Record<string, Record<string, string>>; // integrationId -> key -> value

const inputClass =
  'w-full rounded-[10px] border border-newBorder bg-newBgColorInner p-2.5 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40';

/** True if the channel has any required field that is still empty. */
function requiredUnset(identifier: string, vals: Record<string, string> = {}): boolean {
  return (PROVIDER_FIELDS[identifier] ?? []).some(
    (f) => f.required && !(vals[f.key] ?? '').trim(),
  );
}

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
  // Full per-channel settings from an applied Set, loaded draft, or edited post,
  // including values the field UI does not expose (thumbnail, audio). Merged
  // UNDER the coerced field values at submit so live edits still win.
  const [baseSettings, setBaseSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [scheduleLocal, setScheduleLocal] = useState(defaultScheduleLocal());
  const [asDraft, setAsDraft] = useState(false);
  const [postNow, setPostNow] = useState(false);
  // Which channel-option cards are expanded. Cards with a required-but-unset
  // field are auto-expanded so the user cannot miss a mandatory choice.
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [showChannels, setShowChannels] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [sets, setSets] = useState<PostizSet[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [drafts, setDrafts] = useState<CalendarPost[]>([]);
  const [setId, setSetId] = useState('');
  const [draftId, setDraftId] = useState('');
  const [showSaveSet, setShowSaveSet] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const [overrideSetId, setOverrideSetId] = useState('');
  const [savingSet, setSavingSet] = useState(false);

  // Unsaved-changes tracking, so switching Set/draft warns before discarding.
  const [dirty, setDirty] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<{ kind: 'set' | 'draft'; id: string } | null>(null);
  const [confirmDeleteDraft, setConfirmDeleteDraft] = useState(false);
  const markDirty = () => setDirty(true);

  // Guard against leaving with unsaved changes. Active only while dirty and not
  // in the middle of a successful submit (which navigates away on purpose).
  const guardOn = dirty && !submitting && !done;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      guardOn && currentLocation.pathname !== nextLocation.pathname,
  );

  // Also warn on tab close / refresh / hard navigation (outside the SPA router).
  useEffect(() => {
    if (!guardOn) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [guardOn]);

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
        const vals = intg ? settingsToFields(intg.identifier, d.settings) : {};
        setFieldValues({ [d.integrationId]: vals });
        setBaseSettings({ [d.integrationId]: d.settings });
        setOpenCards({
          [d.integrationId]: intg ? requiredUnset(intg.identifier, vals) : false,
        });
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

  useEffect(() => {
    getSignatures()
      .then(setSignatures)
      .catch(() => {
        /* signatures are optional */
      });
  }, []);

  function insertSignature(id: string) {
    const s = signatures.find((x) => x.id === id);
    if (!s) return;
    const text = stripHtml(s.content, 100000);
    if (!text) return;
    setCaption((c) => (c.trim() ? `${c.trimEnd()}\n\n${text}` : text));
    markDirty();
  }

  // Saved drafts, offered as a quick-load dropdown (not while editing one).
  const loadDrafts = useCallback(async () => {
    try {
      setDrafts(await getDrafts());
    } catch {
      /* drafts are optional */
    }
  }, []);

  useEffect(() => {
    if (editId) return;
    void loadDrafts();
  }, [editId, loadDrafts]);

  const applySet = useCallback(
    (set: PostizSet) => {
      try {
        const p = parseSetContent(set.content);
        setSelectedIds(new Set(p.channelIds));
        // Desktop-saved Sets store the caption as HTML (<p>…</p>); flatten so the
        // tags don't leak into the submitted description.
        setCaption(stripHtml(p.caption, 100000));
        setAttached(p.media.map((m) => ({ id: m.id, path: m.path, name: '' })));
        const fv: FieldValues = {};
        const oc: Record<string, boolean> = {};
        for (const id of p.channelIds) {
          const intg = (channels ?? []).find((c) => c.id === id);
          fv[id] = intg ? settingsToFields(intg.identifier, p.settingsById[id]) : {};
          oc[id] = intg ? requiredUnset(intg.identifier, fv[id]) : false;
        }
        setFieldValues(fv);
        setBaseSettings(p.settingsById);
        setOpenCards(oc);
        setFormError(null);
      } catch {
        setFormError('Could not load that set.');
      }
    },
    [channels],
  );

  const loadDraft = useCallback(
    async (id: string) => {
      try {
        const d = await getPostForEdit(id);
        setSelectedIds(new Set([d.integrationId]));
        setCaption(stripHtml(d.content, 100000));
        setAttached(d.image.map((m) => ({ id: m.id, path: m.path, name: '' })));
        const intg = (channels ?? []).find((c) => c.id === d.integrationId);
        const vals = intg ? settingsToFields(intg.identifier, d.settings) : {};
        setFieldValues({ [d.integrationId]: vals });
        setBaseSettings({ [d.integrationId]: d.settings });
        setOpenCards({
          [d.integrationId]: intg ? requiredUnset(intg.identifier, vals) : false,
        });
        setScheduleLocal(toLocal(d.publishDate).format('YYYY-MM-DDTHH:mm'));
        setFormError(null);
      } catch {
        setFormError('Could not load that draft.');
      }
    },
    [channels],
  );

  // Reopen the Compose screen on the Set last used, applied automatically once.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (editId || autoAppliedRef.current || sets.length === 0) return;
    autoAppliedRef.current = true;
    const last = getLastSetId();
    const s = last ? sets.find((x) => x.id === last) : undefined;
    if (s) {
      setSetId(s.id);
      applySet(s);
    }
  }, [sets, editId, applySet]);

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
        settings: {
          ...defaultSettings(intg.identifier),
          ...(baseSettings[intg.id] ?? {}),
          ...fieldsToSettings(intg.identifier, fieldValues[intg.id]),
        },
      })),
    [active, caption, attached, fieldValues, baseSettings, editData],
  );

  function resetComposer() {
    setSelectedIds(new Set());
    setCaption('');
    setAttached([]);
    setFieldValues({});
    setBaseSettings({});
    setOpenCards({});
    setScheduleLocal(defaultScheduleLocal());
    setFormError(null);
  }

  // Apply a Set or draft selection. Sets and drafts are mutually exclusive
  // sources; picking one clears the other. Empty id resets to a blank compose.
  function doSwitch(kind: 'set' | 'draft', id: string) {
    if (kind === 'set') {
      setDraftId('');
      setSetId(id);
      setLastSetId(id);
      if (!id) resetComposer();
      else {
        const s = sets.find((x) => x.id === id);
        if (s) applySet(s);
      }
    } else {
      setSetId('');
      setLastSetId('');
      setDraftId(id);
      if (!id) resetComposer();
      else void loadDraft(id);
    }
    setDirty(false);
  }

  function requestSwitch(kind: 'set' | 'draft', id: string) {
    if (dirty) setPendingSwitch({ kind, id });
    else doSwitch(kind, id);
  }

  async function onSaveSet() {
    if (active.length === 0) {
      setFormError('Pick at least one channel before saving a set.');
      return;
    }
    const name = overrideSetId
      ? (sets.find((s) => s.id === overrideSetId)?.name ?? '')
      : saveSetName.trim();
    if (!name) return;
    setSavingSet(true);
    try {
      // Postiz has no update-set endpoint; overriding replaces the old one.
      if (overrideSetId) await deleteSet(overrideSetId);
      await saveSet(name, {
        type: 'schedule',
        dateISO: localInputToUtcISO(scheduleLocal),
        channels: currentChannels(),
      });
      cancelSaveSet();
      await loadSets();
    } catch (err) {
      setFormError(friendlyError(err, 'Could not save the set.'));
    } finally {
      setSavingSet(false);
    }
  }

  function cancelSaveSet() {
    setSaveSetName('');
    setOverrideSetId('');
    setShowSaveSet(false);
  }

  async function onDeleteDraft() {
    const id = draftId;
    setConfirmDeleteDraft(false);
    if (!id) return;
    try {
      await deletePost(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setDraftId('');
      resetComposer();
      setDirty(false);
    } catch {
      setFormError('Could not delete the draft.');
    }
  }

  function toggleChannel(intg: Integration) {
    markDirty();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(intg.id)) next.delete(intg.id);
      else {
        next.add(intg.id);
        // seed default field values so selects/toggles are valid up-front
        const seeded = settingsToFields(intg.identifier);
        setFieldValues((fv) => ({
          ...fv,
          [intg.id]: { ...seeded, ...fv[intg.id] },
        }));
        // auto-expand a newly added channel if it needs a required choice
        setOpenCards((oc) => ({
          ...oc,
          [intg.id]: requiredUnset(intg.identifier, seeded),
        }));
      }
      return next;
    });
  }

  function selectAllChannels() {
    (channels ?? []).forEach((intg) => {
      if (!intg.disabled && !selectedIds.has(intg.id)) toggleChannel(intg);
    });
  }

  function clearChannels() {
    markDirty();
    setSelectedIds(new Set());
  }

  function setField(id: string, key: string, value: string) {
    markDirty();
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
        type: editData ? 'update' : postNow ? 'now' : asDraft ? 'draft' : 'schedule',
        dateISO: localInputToUtcISO(scheduleLocal),
        channels: currentChannels(),
      });
      setDone(true);
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      setFormError(friendlyError(err, 'Could not schedule the post.'));
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
          {editData
            ? 'Post updated'
            : postNow
              ? 'Post published'
              : asDraft
                ? 'Saved as draft'
                : 'Post scheduled'}
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

      {/* Quick-load: continue a draft, or start from a saved Set */}
      {!editData && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-newTextColor">Draft</span>
            <div className="flex gap-1.5">
              <Select
                wrapperClassName="min-w-0 flex-1"
                value={draftId}
                onChange={(e) => requestSwitch('draft', e.target.value)}
                disabled={drafts.length === 0}
              >
                <option value="">
                  {drafts.length === 0 ? 'No drafts' : 'No draft'}
                </option>
                {drafts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {draftLabel(d)}
                  </option>
                ))}
              </Select>
              {draftId && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteDraft(true)}
                  aria-label="Delete this draft"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-newBorder text-newTableText hover:text-[#ff6b6b]"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-newTextColor">Set</span>
            <Select value={setId} onChange={(e) => requestSwitch('set', e.target.value)}>
              <option value="">No Set</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}

      {/* Channels — locked to the post's channel while editing */}
      <Field label={editData ? 'Channel' : 'Channels'}>
        {(channels ?? []).length === 0 ? (
          <p className="text-sm text-newTableText">
            No channels connected in Postiz yet.
          </p>
        ) : editData ? (
          <div className="flex flex-wrap gap-2">
            {active.map((intg) => (
              <span
                key={intg.id}
                className="flex items-center gap-2 rounded-full border border-btnPrimary bg-btnPrimary/15 py-1.5 pl-1.5 pr-3 text-sm font-medium text-btnPrimary"
              >
                <Avatar picture={intg.picture} identifier={intg.identifier} size={22} />
                {intg.name}
              </span>
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowChannels(true)}
            className="flex w-full items-center gap-3 rounded-[10px] border border-newBorder bg-newBgColorInner p-3 text-left"
          >
            {active.length === 0 ? (
              <span className="flex-1 text-sm text-newTableText">Select channels</span>
            ) : (
              <>
                <span className="flex -space-x-2">
                  {active.slice(0, 5).map((intg) => (
                    <Avatar
                      key={intg.id}
                      picture={intg.picture}
                      identifier={intg.identifier}
                      size={26}
                    />
                  ))}
                </span>
                <span className="flex-1 text-sm font-medium text-newTextColor">
                  {active.length} selected
                </span>
              </>
            )}
            <CaretDown size={16} className="shrink-0 text-newTableText" />
          </button>
        )}
      </Field>

      {/* Caption */}
      <Field label="Caption">
        <textarea
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            markDirty();
          }}
          rows={4}
          placeholder="What do you want to say?"
          className="w-full resize-y rounded-[10px] border border-newBorder bg-newBgColorInner p-3 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40"
        />
        {signatures.length > 0 && (
          <Select
            value=""
            onChange={(e) => e.target.value && insertSignature(e.target.value)}
            wrapperClassName="mt-1"
          >
            <option value="">Insert signature…</option>
            {signatures.map((s) => (
              <option key={s.id} value={s.id}>
                {stripHtml(s.content, 40) || '(empty)'}
              </option>
            ))}
          </Select>
        )}
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
                  onClick={() => {
                    setAttached((prev) => prev.filter((x) => x.id !== m.id));
                    markDirty();
                  }}
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
          <MediaPicker
            selected={attached}
            onChange={(m) => {
              setAttached(m);
              markDirty();
            }}
          />
        ) : (
          <Button variant="ghost" onClick={() => setShowMedia(true)}>
            <ImageIcon size={18} /> Add media
          </Button>
        )}
      </Field>

      {/* Per-channel options — collapsed cards, one per selected channel */}
      {active.length > 0 && (
        <Field label="Channel options">
          <div className="flex flex-col gap-2.5">
            {active.map((intg) => {
              const fields = PROVIDER_FIELDS[intg.identifier] ?? [];
              return (
                <details
                  key={intg.id}
                  open={!!openCards[intg.id]}
                  onToggle={(e) =>
                    setOpenCards((oc) => ({
                      ...oc,
                      [intg.id]: (e.target as HTMLDetailsElement).open,
                    }))
                  }
                  className="group overflow-hidden rounded-[10px] border border-newBorder bg-newBgColorInner"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3 [&::-webkit-details-marker]:hidden">
                    <Avatar picture={intg.picture} identifier={intg.identifier} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-newTextColor">
                        {intg.name}
                      </span>
                      <span className="block text-[11px] text-newTableText">
                        {providerLabel(intg.identifier)}
                      </span>
                    </span>
                    <CaretDown
                      size={16}
                      className="text-newTableText transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-newBorder p-3">
                    {fields.length === 0 ? (
                      <p className="text-xs text-newTableText">
                        No extra options for {providerLabel(intg.identifier)}.
                      </p>
                    ) : (
                      fields.map((f) => (
                        <FieldInput
                          key={f.key}
                          spec={f}
                          value={fieldValues[intg.id]?.[f.key] ?? ''}
                          onChange={(v) => setField(intg.id, f.key, v)}
                        />
                      ))
                    )}
                  </div>
                </details>
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
          onChange={(e) => {
            setScheduleLocal(e.target.value);
            markDirty();
          }}
          disabled={asDraft || postNow}
          className="w-full rounded-[10px] border border-newBorder bg-newBgColorInner p-3 text-[16px] text-newTextColor focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40 disabled:opacity-50"
        />
        {!editData && (
          <div className="mt-2 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-newTableText">
              <input
                type="checkbox"
                checked={asDraft}
                onChange={(e) => {
                  setAsDraft(e.target.checked);
                  if (e.target.checked) setPostNow(false);
                  markDirty();
                }}
                className="h-4 w-4 accent-btnPrimary"
              />
              Save as draft instead of scheduling
            </label>
            <label className="flex items-center gap-2 text-sm text-newTableText">
              <input
                type="checkbox"
                checked={postNow}
                onChange={(e) => {
                  setPostNow(e.target.checked);
                  if (e.target.checked) setAsDraft(false);
                  markDirty();
                }}
                className="h-4 w-4 accent-[#D82D7E]"
              />
              Post immediately
            </label>
          </div>
        )}
      </Field>

      {/* Save as set — capture the current post config for reuse */}
      {!editData && (
        <details
          open={showSaveSet}
          onToggle={(e) => setShowSaveSet((e.target as HTMLDetailsElement).open)}
          className="group overflow-hidden rounded-[12px] border border-newBorder bg-newBgColorInner"
        >
          <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3 text-sm font-semibold text-newTextColor [&::-webkit-details-marker]:hidden">
            <FloppyDisk size={16} weight="bold" /> Save as set
            <CaretDown
              size={16}
              className="ml-auto text-newTableText transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="flex flex-col gap-2 border-t border-newBorder p-3">
            <Select
              value={overrideSetId}
              onChange={(e) => setOverrideSetId(e.target.value)}
            >
              <option value="">New set…</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  Override: {s.name}
                </option>
              ))}
            </Select>
            {!overrideSetId && (
              <input
                type="text"
                value={saveSetName}
                onChange={(e) => setSaveSetName(e.target.value)}
                placeholder="Set name"
                className={inputClass}
              />
            )}
            <div className="flex gap-2">
              <Button
                onClick={onSaveSet}
                loading={savingSet}
                disabled={!overrideSetId && !saveSetName.trim()}
                className="flex-1"
              >
                {overrideSetId ? 'Override set' : 'Save set'}
              </Button>
              <Button variant="ghost" onClick={cancelSaveSet} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </details>
      )}

      {formError && <ErrorBanner message={formError} />}

      <div className="flex gap-2">
        <Button
          onClick={submit}
          loading={submitting}
          variant={!editData && postNow ? 'now' : 'primary'}
          className="flex-1"
        >
          {editData
            ? 'Update post'
            : postNow
              ? 'Post now'
              : asDraft
                ? 'Save draft'
                : 'Schedule post'}
        </Button>
        <Button variant="ghost" onClick={() => navigate('/')} className="flex-1">
          Cancel
        </Button>
      </div>

      {showChannels && (
        <ChannelPickerSheet
          channels={channels ?? []}
          selected={selectedIds}
          onToggle={toggleChannel}
          onSelectAll={selectAllChannels}
          onClear={clearChannels}
          onClose={() => setShowChannels(false)}
        />
      )}

      {viewingMedia && (
        <MediaViewer item={viewingMedia} onClose={() => setViewingMedia(null)} />
      )}

      {blocker.state === 'blocked' && (
        <ConfirmModal
          title="Leave without saving?"
          message="You have unsaved changes to this post. If you leave, they will be lost."
          confirmLabel="Leave"
          cancelLabel="Stay"
          danger
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        />
      )}

      {pendingSwitch && (
        <ConfirmModal
          title="Discard unsaved changes?"
          message="Switching will discard the changes you have made to this post."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          danger
          onConfirm={() => {
            doSwitch(pendingSwitch.kind, pendingSwitch.id);
            setPendingSwitch(null);
          }}
          onCancel={() => setPendingSwitch(null)}
        />
      )}

      {confirmDeleteDraft && (
        <ConfirmModal
          title="Delete this draft?"
          message="This permanently removes the draft from Postiz."
          confirmLabel="Delete"
          cancelLabel="Keep draft"
          danger
          onConfirm={onDeleteDraft}
          onCancel={() => setConfirmDeleteDraft(false)}
        />
      )}
    </section>
  );
}

function draftLabel(d: CalendarPost): string {
  const text = stripHtml(d.content, 32);
  return `${d.integration.name}: ${text || 'Untitled'}`;
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
    'w-full rounded-[10px] border border-newBorder bg-newBgColor p-2.5 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40';

  // Toggle renders as a full-width checkbox row, no floating label.
  if (spec.type === 'toggle') {
    return (
      <label className="flex items-center gap-2 text-sm text-newTextColor">
        <input
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          className="h-4 w-4 accent-btnPrimary"
        />
        {spec.label}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-newTableText">
        {spec.label}
        {spec.required && <span className="text-[#ff6b6b]"> *</span>}
      </span>
      {spec.type === 'select' ? (
        <Select bg="base" value={value} onChange={(e) => onChange(e.target.value)}>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
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
