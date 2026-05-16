import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { HistoryEntry } from '../types';
import { ArrowLeft, BarChart3, ChevronLeft, ChevronRight, AlertCircle, Wrench, Clock, TrendingUp } from './Icons';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  isSameDay,
  isToday,
  eachDayOfInterval,
} from 'date-fns';
import { uk } from 'date-fns/locale';

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

interface Props {
  userId: string;
  onBack: () => void;
}

/**
 * Format resolution time.
 * If > 24h: Xд Yг Zхв
 * Otherwise: Yг Zхв
 */
function formatResolutionTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${days}д ${hours}г ${minutes}хв`;
  }
  return `${totalHours}г ${minutes}хв`;
}

export function Statistics({ userId, onBack }: Props) {
  const [allHistory, setAllHistory] = useState<(HistoryEntry & { carId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week

  // Fetch all history entries for all cars of this user
  useEffect(() => {
    // First get all car IDs for this user
    const carsQuery = query(
      collection(db, 'cars'),
      where('ownerId', '==', userId)
    );

    let historySubs: (() => void)[] = [];

    const carsSub = onSnapshot(carsQuery, carsSnap => {
      // Clean up old history subscriptions
      historySubs.forEach(unsub => unsub());
      historySubs = [];

      const carIds = carsSnap.docs.map(d => d.id);
      if (carIds.length === 0) {
        setAllHistory([]);
        setLoading(false);
        return;
      }

      const historyMap = new Map<string, (HistoryEntry & { carId: string })[]>();
      let loadedCount = 0;

      carIds.forEach(carId => {
        const histQ = query(collection(db, 'cars', carId, 'history'));
        const unsub = onSnapshot(histQ, snap => {
          const entries = snap.docs.map(d => ({
            ...(d.data() as HistoryEntry),
            id: d.id,
            carId,
          }));
          historyMap.set(carId, entries);
          loadedCount++;

          // Merge all entries
          const merged: (HistoryEntry & { carId: string })[] = [];
          historyMap.forEach(arr => merged.push(...arr));
          setAllHistory(merged);
          if (loadedCount >= carIds.length) setLoading(false);
        });
        historySubs.push(unsub);
      });
    });

    return () => {
      carsSub();
      historySubs.forEach(unsub => unsub());
    };
  }, [userId]);

  // Current week range
  const currentWeekStart = useMemo(() => {
    const base = new Date();
    const shifted = weekOffset === 0 ? base : addWeeks(base, weekOffset);
    return startOfWeek(shifted, { weekStartsOn: 1 });
  }, [weekOffset]);

  const currentWeekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart]
  );

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd }),
    [currentWeekStart, currentWeekEnd]
  );

  const isCurrentWeek = weekOffset === 0;

  // Problems only
  const problems = useMemo(
    () => allHistory.filter(e => e.type === 'problem'),
    [allHistory]
  );

  // Weekly stats: count problems per day
  const weeklyData = useMemo(() => {
    return weekDays.map(day => {
      const count = problems.filter(p =>
        isSameDay(new Date(p.createdAt), day)
      ).length;
      return { day, count };
    });
  }, [weekDays, problems]);

  const maxCount = useMemo(
    () => Math.max(...weeklyData.map(d => d.count), 1),
    [weeklyData]
  );

  const weekTotal = useMemo(
    () => weeklyData.reduce((sum, d) => sum + d.count, 0),
    [weeklyData]
  );

  // Solutions
  const solutions = useMemo(
    () => allHistory.filter(e => e.type === 'solution'),
    [allHistory]
  );

  // Weekly costs: sum of costs per day
  const weeklyCostData = useMemo(() => {
    return weekDays.map(day => {
      const dailySolutions = solutions.filter(s =>
        isSameDay(new Date(s.createdAt), day)
      );
      const totalCost = dailySolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
      return { day, totalCost };
    });
  }, [weekDays, solutions]);

  const maxCost = useMemo(
    () => Math.max(...weeklyCostData.map(d => d.totalCost), 1),
    [weeklyCostData]
  );

  const weekTotalCost = useMemo(
    () => weeklyCostData.reduce((sum, d) => sum + d.totalCost, 0),
    [weeklyCostData]
  );

  // Resolution time stats (problems that have linked solutions)
  const resolutionStats = useMemo(() => {
    const resolvedProblems = problems
      .filter(p => p.linkedSolutionId)
      .map(p => {
        const solution = solutions.find(s => s.id === p.linkedSolutionId);
        if (!solution) return null;
        const problemTime = new Date(p.createdAt).getTime();
        const solutionTime = new Date(solution.createdAt).getTime();
        const diff = Math.abs(solutionTime - problemTime);
        return { problem: p, solution, durationMs: diff };
      })
      .filter(Boolean) as { problem: HistoryEntry; solution: HistoryEntry; durationMs: number }[];

    if (resolvedProblems.length === 0) return null;

    const totalMs = resolvedProblems.reduce((s, r) => s + r.durationMs, 0);
    const avgMs = totalMs / resolvedProblems.length;
    const minMs = Math.min(...resolvedProblems.map(r => r.durationMs));
    const maxMs = Math.max(...resolvedProblems.map(r => r.durationMs));

    return {
      total: resolvedProblems.length,
      avgMs,
      minMs,
      maxMs,
    };
  }, [allHistory, problems]);

  // Month-level aggregation
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = format(d, 'LLLL yyyy', { locale: uk });
      const count = problems.filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label: monthLabel, count });
    }
    return months;
  }, [problems]);

  const monthMax = useMemo(
    () => Math.max(...monthlyStats.map(m => m.count), 1),
    [monthlyStats]
  );

  // Week label
  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd MMM', { locale: uk });
    const end = format(currentWeekEnd, 'd MMM yyyy', { locale: uk });
    return `${start} — ${end}`;
  }, [currentWeekStart, currentWeekEnd]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--t-surface-bg)' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--t-border-default)', borderTopColor: 'var(--t-accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 safe-top glass border-b"
        style={{ background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)', borderColor: 'var(--t-border-default)' }}
      >
        <div className="flex items-center justify-between px-3 py-3 gap-3">
          <button id="stats-back-btn" onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--t-text-primary)' }}>Статистика</h1>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5">
        {/* === WEEKLY CHART === */}
        <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))' }} />

          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-0">
              <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Звернення клієнтів</h3>
              <p className="text-xs font-medium capitalize mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{weekLabel}</p>
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              disabled={isCurrentWeek}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-30"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week total */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-3xl font-bold" style={{ color: 'var(--t-text-primary)' }}>{weekTotal}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>звернень за тиждень</span>
          </div>

          {/* Bar chart */}
          <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
            {weeklyData.map((d, i) => {
              const today = isToday(d.day);
              const barHeight = d.count > 0 ? Math.max(((d.count / maxCount) * 100), 8) : 4;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {/* Count label */}
                  <span
                    className="text-xs font-bold tabular-nums transition-colors"
                    style={{ color: today ? 'var(--t-accent-primary)' : d.count > 0 ? 'var(--t-text-primary)' : 'var(--t-text-muted)' }}
                  >
                    {d.count}
                  </span>
                  {/* Bar */}
                  <div
                    className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${barHeight}%`,
                      background: today
                        ? 'linear-gradient(to top, var(--t-accent-gradient-from), var(--t-accent-gradient-to))'
                        : d.count > 0
                          ? 'var(--t-accent-primary-muted)'
                          : 'var(--t-surface-elevated)',
                      boxShadow: today && d.count > 0 ? '0 -4px 16px -4px var(--t-accent-shadow)' : 'none',
                    }}
                  />
                  {/* Day name */}
                  <span
                    className="text-xs font-semibold mt-1"
                    style={{
                      color: today ? 'var(--t-accent-primary)' : 'var(--t-text-muted)',
                    }}
                  >
                    {DAY_NAMES_SHORT[i]}
                  </span>
                  {/* Date number */}
                  <span
                    className="text-[10px] font-mono"
                    style={{
                      color: today ? 'var(--t-accent-primary)' : 'var(--t-text-muted)',
                      opacity: today ? 1 : 0.7,
                    }}
                  >
                    {format(d.day, 'd')}
                  </span>
                  {/* Today indicator dot */}
                  {today && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: 'var(--t-accent-primary)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* === WEEKLY COST CHART === */}
        <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, #fef08a, #ca8a04)' }} />

          {/* Week navigation (reuse same offset) */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-0">
              <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Фінанси</h3>
              <p className="text-xs font-medium capitalize mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{weekLabel}</p>
            </div>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              disabled={isCurrentWeek}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-30"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week total */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-3xl font-bold" style={{ color: '#ca8a04' }}>{weekTotalCost.toLocaleString()}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>грн за тиждень</span>
          </div>

          {/* Bar chart */}
          <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
            {weeklyCostData.map((d, i) => {
              const today = isToday(d.day);
              const barHeight = d.totalCost > 0 ? Math.max(((d.totalCost / maxCost) * 100), 8) : 4;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {/* Cost label */}
                  <span
                    className="text-[10px] font-bold tabular-nums transition-colors"
                    style={{ color: today ? '#ca8a04' : d.totalCost > 0 ? 'var(--t-text-primary)' : 'var(--t-text-muted)' }}
                  >
                    {d.totalCost > 0 ? (d.totalCost >= 1000 ? (d.totalCost / 1000).toFixed(1) + 'k' : d.totalCost) : 0}
                  </span>
                  {/* Bar */}
                  <div
                    className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${barHeight}%`,
                      background: today
                        ? 'linear-gradient(to top, #fef08a, #eab308)'
                        : d.totalCost > 0
                          ? '#fef08a'
                          : 'var(--t-surface-elevated)',
                      boxShadow: today && d.totalCost > 0 ? '0 -4px 16px -4px rgba(234, 179, 8, 0.4)' : 'none',
                    }}
                  />
                  {/* Day name */}
                  <span
                    className="text-xs font-semibold mt-1"
                    style={{
                      color: today ? '#ca8a04' : 'var(--t-text-muted)',
                    }}
                  >
                    {DAY_NAMES_SHORT[i]}
                  </span>
                  {/* Date number */}
                  <span
                    className="text-[10px] font-mono"
                    style={{
                      color: today ? '#ca8a04' : 'var(--t-text-muted)',
                      opacity: today ? 1 : 0.7,
                    }}
                  >
                    {format(d.day, 'd')}
                  </span>
                  {/* Today indicator dot */}
                  {today && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: '#ca8a04' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* === RESOLUTION TIME STATS === */}
        {resolutionStats && (
          <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-status-solution), var(--t-accent-gradient-to))' }} />

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}>
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Час вирішення проблем</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Resolved count */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--t-status-solution)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Вирішено</span>
                </div>
                <span className="text-xl font-bold" style={{ color: 'var(--t-text-primary)' }}>{resolutionStats.total}</span>
              </div>

              {/* Average */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--t-accent-primary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Середній</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-text-primary)' }}>{formatResolutionTime(resolutionStats.avgMs)}</span>
              </div>

              {/* Min */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs" style={{ color: 'var(--t-status-solution)' }}>▼</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Найшвидше</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-status-solution)' }}>{formatResolutionTime(resolutionStats.minMs)}</span>
              </div>

              {/* Max */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs" style={{ color: 'var(--t-status-problem)' }}>▲</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>Найдовше</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-status-problem)' }}>{formatResolutionTime(resolutionStats.maxMs)}</span>
              </div>
            </div>
          </section>
        )}

        {/* === MONTHLY OVERVIEW === */}
        <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-via), var(--t-accent-gradient-to))' }} />

          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>По місяцях (звернення)</h3>
          </div>

          <div className="space-y-3">
            {monthlyStats.map((m, i) => {
              const barWidth = m.count > 0 ? Math.max((m.count / monthMax) * 100, 6) : 0;
              const isCurrent = i === 0;
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <span
                    className="text-xs font-medium w-24 shrink-0 capitalize truncate"
                    style={{ color: isCurrent ? 'var(--t-text-primary)' : 'var(--t-text-muted)' }}
                  >
                    {m.label}
                  </span>
                  <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        minWidth: m.count > 0 ? '28px' : '0',
                        background: isCurrent
                          ? 'linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))'
                          : 'var(--t-accent-primary-muted)',
                      }}
                    >
                      {m.count > 0 && (
                        <span
                          className="text-xs font-bold"
                          style={{
                            color: isCurrent ? 'var(--t-text-on-accent)' : 'var(--t-text-accent)',
                          }}
                        >
                          {m.count}
                        </span>
                      )}
                    </div>
                  </div>
                  {m.count === 0 && (
                    <span className="text-xs font-medium" style={{ color: 'var(--t-text-muted)' }}>0</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Summary card */}
        <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Загальна статистика</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-text-primary)' }}>
                {problems.length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>Всього звернень</div>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-status-problem)' }}>
                {problems.filter(p => !p.linkedSolutionId).length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>Відкритих</div>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-status-solution)' }}>
                {problems.filter(p => p.linkedSolutionId).length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>Вирішених</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
