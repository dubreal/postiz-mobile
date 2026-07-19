import { useMemo, useState } from 'react';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  SortAscending,
  SortDescending,
} from '@phosphor-icons/react';
import dayjs, { type Dayjs } from 'dayjs';
import { getCalendar } from '@/lib/postiz';
import { useAsync } from '@/lib/useAsync';
import { dayHeading, dayKey, stripHtml, timeLabel } from '@/lib/format';
import {
  getCalendarPrefs,
  setCalendarPrefs,
  type CalendarSort,
  type CalendarView,
} from '@/lib/prefs';
import { EmptyState, ErrorState, Skeleton, cx } from '@/components/ui';
import { ChannelAvatar, StateBadge } from '@/components/PostBits';
import { PostDetailSheet } from '@/components/PostDetailSheet';
import { HeaderActions } from '@/components/HeaderActions';
import type { CalendarPost } from '@/lib/types';

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'list', label: 'List' },
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

export function CalendarScreen() {
  const initial = getCalendarPrefs();
  const [view, setViewState] = useState<CalendarView>(initial.view);
  const [sort, setSortState] = useState<CalendarSort>(initial.sort);
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const [rangeFrom, setRangeFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [rangeTo, setRangeTo] = useState(dayjs().add(45, 'day').format('YYYY-MM-DD'));
  const [monthDay, setMonthDay] = useState<string | null>(null); // selected day key in month view
  const [selected, setSelected] = useState<CalendarPost | null>(null);

  function setView(v: CalendarView) {
    setViewState(v);
    setCalendarPrefs({ view: v, sort });
    setMonthDay(null);
  }
  function setSort(s: CalendarSort) {
    setSortState(s);
    setCalendarPrefs({ view, sort: s });
  }

  // Fetch window depends on the view.
  const range = useMemo(() => {
    if (view === 'list') {
      return {
        startISO: dayjs(rangeFrom).startOf('day').toISOString(),
        endISO: dayjs(rangeTo).endOf('day').toISOString(),
      };
    }
    if (view === 'day') {
      return { startISO: anchor.startOf('day').toISOString(), endISO: anchor.endOf('day').toISOString() };
    }
    if (view === 'week') {
      return {
        startISO: anchor.startOf('week').toISOString(),
        endISO: anchor.endOf('week').toISOString(),
      };
    }
    return {
      startISO: anchor.startOf('month').toISOString(),
      endISO: anchor.endOf('month').toISOString(),
    };
  }, [view, anchor, rangeFrom, rangeTo]);

  const { data, loading, error, reload } = useAsync(
    () => getCalendar(range.startISO, range.endISO),
    [range.startISO, range.endISO],
  );

  const posts = data ?? [];

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-newTextColor">Calendar</h1>
        <HeaderActions />
      </header>

      {/* View + sort controls */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-1 rounded-[10px] border border-newBorder bg-newBgColorInner p-1">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={cx(
                'flex-1 rounded-[7px] py-1.5 text-sm font-medium transition-colors',
                view === v.key
                  ? 'bg-btnPrimary text-white'
                  : 'text-newTableText hover:text-newTextColor',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <ContextNav
            view={view}
            anchor={anchor}
            setAnchor={setAnchor}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            setRangeFrom={setRangeFrom}
            setRangeTo={setRangeTo}
          />
          <button
            onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')}
            className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-newBorder px-3 py-2 text-xs font-medium text-newTableText"
          >
            {sort === 'desc' ? <SortDescending size={16} /> : <SortAscending size={16} />}
            {sort === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {loading && <CalendarSkeleton />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          {view === 'month' ? (
            <MonthView
              anchor={anchor}
              posts={posts}
              sort={sort}
              selectedDay={monthDay}
              onSelectDay={setMonthDay}
              onPost={setSelected}
            />
          ) : (
            <Agenda posts={posts} sort={sort} onPost={setSelected} />
          )}
        </>
      )}

      {selected && (
        <PostDetailSheet
          post={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function ContextNav({
  view,
  anchor,
  setAnchor,
  rangeFrom,
  rangeTo,
  setRangeFrom,
  setRangeTo,
}: {
  view: CalendarView;
  anchor: Dayjs;
  setAnchor: (d: Dayjs) => void;
  rangeFrom: string;
  rangeTo: string;
  setRangeFrom: (v: string) => void;
  setRangeTo: (v: string) => void;
}) {
  if (view === 'list') {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <input
          type="date"
          value={rangeFrom}
          onChange={(e) => setRangeFrom(e.target.value)}
          className="min-w-0 flex-1 rounded-[10px] border border-newBorder bg-newBgColorInner px-2 py-2 text-xs text-newTextColor"
        />
        <span className="text-xs text-newTableText">to</span>
        <input
          type="date"
          value={rangeTo}
          onChange={(e) => setRangeTo(e.target.value)}
          className="min-w-0 flex-1 rounded-[10px] border border-newBorder bg-newBgColorInner px-2 py-2 text-xs text-newTextColor"
        />
      </div>
    );
  }
  const unit = view === 'day' ? 'day' : view === 'week' ? 'week' : 'month';
  const label =
    view === 'day'
      ? anchor.format('ddd, MMM D')
      : view === 'week'
        ? `Week of ${anchor.startOf('week').format('MMM D')}`
        : anchor.format('MMMM YYYY');
  return (
    <div className="flex flex-1 items-center justify-between rounded-[10px] border border-newBorder bg-newBgColorInner px-1 py-1">
      <button
        onClick={() => setAnchor(anchor.subtract(1, unit))}
        aria-label="Previous"
        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-newTableText hover:bg-boxHover"
      >
        <CaretLeft size={16} weight="bold" />
      </button>
      <button
        onClick={() => setAnchor(dayjs())}
        className="text-sm font-semibold text-newTextColor"
      >
        {label}
      </button>
      <button
        onClick={() => setAnchor(anchor.add(1, unit))}
        aria-label="Next"
        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-newTableText hover:bg-boxHover"
      >
        <CaretRight size={16} weight="bold" />
      </button>
    </div>
  );
}

function Agenda({
  posts,
  sort,
  onPost,
}: {
  posts: CalendarPost[];
  sort: CalendarSort;
  onPost: (p: CalendarPost) => void;
}) {
  const groups = useMemo(() => groupByDay(posts, sort), [posts, sort]);
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<CalendarBlank size={40} />}
        title="Nothing here"
        hint="No posts in this range. Use Compose to schedule one."
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <div key={g.key}>
          <h2 className="mb-2 text-sm font-semibold text-newTableText">
            {dayHeading(g.posts[0].publishDate)}
          </h2>
          <ul className="flex flex-col gap-2">
            {g.posts.map((p) => (
              <PostRow key={`${p.id}-${p.publishDate}`} post={p} onClick={() => onPost(p)} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MonthView({
  anchor,
  posts,
  sort,
  selectedDay,
  onSelectDay,
  onPost,
}: {
  anchor: Dayjs;
  posts: CalendarPost[];
  sort: CalendarSort;
  selectedDay: string | null;
  onSelectDay: (k: string | null) => void;
  onPost: (p: CalendarPost) => void;
}) {
  const countByDay = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) m.set(dayKey(p.publishDate), (m.get(dayKey(p.publishDate)) ?? 0) + 1);
    return m;
  }, [posts]);

  const cells = useMemo(() => {
    const start = anchor.startOf('month');
    const lead = start.day(); // 0=Sun
    const days = anchor.daysInMonth();
    const out: (Dayjs | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= days; d++) out.push(start.date(d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [anchor]);

  const dayPosts = useMemo(
    () => (selectedDay ? posts.filter((p) => dayKey(p.publishDate) === selectedDay) : []),
    [posts, selectedDay],
  );
  const dayPostsSorted = useMemo(
    () =>
      [...dayPosts].sort((a, b) =>
        sort === 'asc'
          ? a.publishDate.localeCompare(b.publishDate)
          : b.publishDate.localeCompare(a.publishDate),
      ),
    [dayPosts, sort],
  );

  const todayKey = dayjs().format('YYYY-MM-DD');

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="pb-1 text-[11px] font-semibold text-newTableText">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const k = c.format('YYYY-MM-DD');
          const count = countByDay.get(k) ?? 0;
          const isToday = k === todayKey;
          const isSel = k === selectedDay;
          return (
            <button
              key={i}
              onClick={() => onSelectDay(isSel ? null : k)}
              className={cx(
                'flex aspect-square flex-col items-center justify-center rounded-[8px] text-sm',
                isSel
                  ? 'bg-btnPrimary text-white'
                  : isToday
                    ? 'bg-boxHover text-newTextColor'
                    : 'text-newTextColor hover:bg-boxHover',
              )}
            >
              <span>{c.date()}</span>
              {count > 0 && (
                <span
                  className={cx(
                    'mt-0.5 h-1.5 w-1.5 rounded-full',
                    isSel ? 'bg-white' : 'bg-btnPrimary',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-newTableText">
            {dayjs(selectedDay).format('dddd, MMM D')}
          </h2>
          {dayPostsSorted.length === 0 ? (
            <p className="text-sm text-newTableText">No posts this day.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dayPostsSorted.map((p) => (
                <PostRow key={`${p.id}-${p.publishDate}`} post={p} onClick={() => onPost(p)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PostRow({ post, onClick }: { post: CalendarPost; onClick: () => void }) {
  const preview = stripHtml(post.content);
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full gap-3 rounded-[12px] border border-newBorder bg-newBgColorInner p-3 text-left transition-colors hover:bg-boxHover"
      >
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
      </button>
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

function groupByDay(
  posts: CalendarPost[],
  sort: CalendarSort,
): { key: string; posts: CalendarPost[] }[] {
  const map = new Map<string, CalendarPost[]>();
  for (const p of posts) {
    const key = dayKey(p.publishDate);
    const arr = map.get(key);
    if (arr) arr.push(p);
    else map.set(key, [p]);
  }
  const dir = sort === 'asc' ? 1 : -1;
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]) * dir)
    .map(([key, ps]) => ({
      key,
      posts: ps.sort((a, b) => a.publishDate.localeCompare(b.publishDate) * dir),
    }));
}
