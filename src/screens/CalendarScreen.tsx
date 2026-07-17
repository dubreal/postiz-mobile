import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarBlank, PlusCircle } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { getCalendar } from '@/lib/postiz';
import { useAsync } from '@/lib/useAsync';
import { dayHeading, dayKey, stripHtml, timeLabel } from '@/lib/format';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { ChannelAvatar, StateBadge } from '@/components/PostBits';
import type { CalendarPost } from '@/lib/types';

export function CalendarScreen() {
  // Window: start of last week through +45 days, covering scheduled posts.
  const range = useMemo(() => {
    const start = dayjs().startOf('day').subtract(7, 'day');
    const end = dayjs().startOf('day').add(45, 'day');
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, []);

  const { data, loading, error, reload } = useAsync(
    () => getCalendar(range.startISO, range.endISO),
    [range.startISO, range.endISO],
  );

  const groups = useMemo(() => groupByDay(data ?? []), [data]);

  return (
    <section>
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-newTextColor">Calendar</h1>
        <Link to="/compose">
          <Button className="h-10 min-h-0 px-3 text-sm">
            <PlusCircle size={18} weight="bold" /> New
          </Button>
        </Link>
      </header>

      {loading && <CalendarSkeleton />}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && groups.length === 0 && (
        <EmptyState
          icon={<CalendarBlank size={40} />}
          title="Nothing scheduled"
          hint="Posts you schedule will show up here, grouped by day."
          action={
            <Link to="/compose">
              <Button className="mt-1">Schedule a post</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.key}>
              <h2 className="mb-2 text-sm font-semibold text-newTableText">
                {dayHeading(g.posts[0].publishDate)}
              </h2>
              <ul className="flex flex-col gap-2">
                {g.posts.map((p) => (
                  <PostRow key={`${p.id}-${p.publishDate}`} post={p} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PostRow({ post }: { post: CalendarPost }) {
  const preview = stripHtml(post.content);
  return (
    <li className="flex gap-3 rounded-[12px] border border-newBorder bg-newBgColorInner p-3">
      <ChannelAvatar
        picture={post.integration.picture}
        identifier={post.integration.providerIdentifier}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-newTextColor">
            {timeLabel(post.publishDate)}
          </span>
          <StateBadge state={post.state} />
        </div>
        <p className="line-clamp-2 text-sm text-newTableText">
          {preview || <span className="italic">No caption</span>}
        </p>
      </div>
    </li>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Skeleton className="mb-2 h-4 w-28" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

function groupByDay(posts: CalendarPost[]): { key: string; posts: CalendarPost[] }[] {
  const map = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    const key = dayKey(p.publishDate);
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, ps]) => ({ key, posts: ps }));
}
