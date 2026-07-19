import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LockSimple, ArrowSquareOut, Trash, PencilSimple } from '@phosphor-icons/react';
import { deletePost } from '@/lib/postiz';
import { isPostLocked, stripHtml, toLocal } from '@/lib/format';
import { Button, ErrorBanner } from './ui';
import { ChannelAvatar, StateBadge } from './PostBits';
import { providerLabel } from '@/lib/providers';
import { friendlyError } from '@/lib/errors';
import type { CalendarPost } from '@/lib/types';

export function PostDetailSheet({
  post,
  onClose,
  onDeleted,
}: {
  post: CalendarPost;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const locked = isPostLocked(post.state, post.publishDate);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deletePost(post.id);
      onDeleted();
    } catch (err) {
      setError(friendlyError(err, 'Could not delete the post.'));
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-newBorder bg-newBgColorInner p-5 pb-8"
        style={{ paddingBottom: 'calc(2rem + var(--safe-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-newTextColor">Post details</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-newTableText hover:bg-boxHover"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <ChannelAvatar
            picture={post.integration.picture}
            identifier={post.integration.providerIdentifier}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-newTextColor">
              {post.integration.name}
            </p>
            <p className="text-xs text-newTableText">
              {providerLabel(post.integration.providerIdentifier)}
            </p>
          </div>
          <StateBadge state={post.state} />
        </div>

        <div className="mb-4 rounded-[10px] border border-newBorder bg-newBgColor p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-newTableText">
            {toLocal(post.publishDate).format('dddd, MMM D, YYYY [at] h:mm A')}
          </p>
          <p className="whitespace-pre-wrap text-sm text-newTextColor">
            {stripHtml(post.content, 1000) || (
              <span className="italic text-newTableText">No caption</span>
            )}
          </p>
        </div>

        {post.releaseURL && (
          <a
            href={post.releaseURL}
            target="_blank"
            rel="noreferrer"
            className="mb-4 flex items-center gap-2 text-sm font-medium text-btnPrimary"
          >
            <ArrowSquareOut size={16} weight="bold" /> View published post
          </a>
        )}

        {locked ? (
          <div className="flex items-start gap-2 rounded-[10px] bg-boxHover p-3">
            <LockSimple size={18} className="mt-0.5 shrink-0 text-newTableText" />
            <p className="text-sm text-newTableText">
              This post has already been published or is publishing now, so it
              can&apos;t be changed.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-newTableText">
              This post is scheduled and hasn&apos;t published yet.
            </p>
            {error && <ErrorBanner message={error} />}
            <Button onClick={() => navigate(`/compose?edit=${post.id}`)}>
              <PencilSimple size={16} weight="bold" /> Edit post
            </Button>
            {confirming ? (
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  onClick={onDelete}
                  loading={deleting}
                  className="flex-1"
                >
                  <Trash size={16} weight="bold" /> Confirm delete
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setConfirming(false)}
                  className="flex-1"
                >
                  Keep
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirming(true)}>
                <Trash size={16} weight="bold" /> Cancel / delete this post
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
