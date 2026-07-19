import { useCallback, useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { getNotificationCount, getNotifications, type NotificationItem } from '@/lib/postiz';
import { fromNow, stripHtml } from '@/lib/format';
import { Spinner } from './ui';

export function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (document.hidden) return; // paused while the tab is hidden
    try {
      const r = await getNotificationCount();
      setCount(r?.total ?? 0);
    } catch {
      /* notifications are non-critical; ignore polling errors */
    }
  }, []);

  // Poll the unread count every 60s; skip while hidden, refresh when it returns.
  useEffect(() => {
    void fetchCount();
    const id = window.setInterval(() => void fetchCount(), 60000);
    const onVisible = () => {
      if (!document.hidden) void fetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchCount]);

  async function openBell() {
    setOpen(true);
    setLoading(true);
    try {
      const r = await getNotifications(); // marks all read on the server
      setItems(r?.notifications ?? []);
      setCount(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openBell}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        className="flex h-8 w-8 shrink-0 items-center justify-center text-newTableText transition-colors hover:text-newTextColor"
      >
        <BellIcon showDot={count > 0} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-16"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-newBorder bg-newBgColorInner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-newBorder p-4">
              <h2 className="text-base font-bold text-newTextColor">Notifications</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-newTableText hover:bg-boxHover"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <Spinner label="Loading" />
              ) : items.length === 0 ? (
                <p className="p-6 text-center text-sm text-newTableText">
                  No notifications yet.
                </p>
              ) : (
                <ul className="divide-y divide-newBorder">
                  {items.map((n, i) => (
                    <li key={i} className="p-3.5">
                      <p className="text-sm leading-relaxed text-newTextColor">
                        {stripHtml(n.content, 100000)}
                      </p>
                      <p className="mt-1 text-[11px] text-newTableText">{fromNow(n.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// The exact bell from the Postiz desktop UI (AGPL-3.0). The unread dot uses the
// page background for its ring so it reads the same as on desktop.
function BellIcon({ showDot }: { showDot: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 21H10M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDot && (
        <circle cx="17.0625" cy="5" r="4" fill="#FF3EA2" stroke="var(--new-bgColor)" strokeWidth="2" />
      )}
    </svg>
  );
}
