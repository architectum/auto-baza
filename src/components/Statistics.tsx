import { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { HistoryEntry, Car } from '../types';
import {
  ArrowLeft, BarChart3, ChevronLeft, ChevronRight, AlertCircle,
  Wrench, Clock, TrendingUp, DollarSign, Target, Trophy, PieChart, Zap, Layers,
} from './Icons';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  format,
  isSameDay,
  isToday,
  eachDayOfInterval,
  getDay,
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

/** JS getDay: 0=Sun => map to Mon=0..Sun=6 */
function getMondayBasedDay(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

export function Statistics({ userId, onBack }: Props) {
  const [allHistory, setAllHistory] = useState<(HistoryEntry & { carId: string })[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Fetch cars
  useEffect(() => {
    const carsQuery = query(collection(db, 'cars'), where('ownerId', '==', userId));
    const unsub = onSnapshot(carsQuery, snap => {
      setCars(snap.docs.map(d => ({ ...(d.data() as Car), id: d.id })));
    });
    return unsub;
  }, [userId]);

  // Fetch all history entries for all cars of this user
  useEffect(() => {
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

  // ─── Period calculations ───
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

  const currentMonthStart = useMemo(() => {
    const base = new Date();
    const shifted = monthOffset === 0 ? base : addMonths(base, monthOffset);
    return startOfMonth(shifted);
  }, [monthOffset]);

  const currentMonthEnd = useMemo(
    () => endOfMonth(currentMonthStart),
    [currentMonthStart]
  );

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd }),
    [currentMonthStart, currentMonthEnd]
  );

  const isCurrentWeek = weekOffset === 0;
  const isCurrentMonth = monthOffset === 0;

  const periodDays = viewMode === 'week' ? weekDays : monthDays;

  // ─── Filtered data ───
  const problems = useMemo(
    () => allHistory.filter(e => e.type === 'problem'),
    [allHistory]
  );

  const solutions = useMemo(
    () => allHistory.filter(e => e.type === 'solution'),
    [allHistory]
  );

  // ─── CHART 1: Client Requests (problems per day) ───
  const requestsData = useMemo(() => {
    return periodDays.map(day => {
      const count = problems.filter(p =>
        isSameDay(new Date(p.createdAt), day)
      ).length;
      return { day, count };
    });
  }, [periodDays, problems]);

  const requestsMax = useMemo(
    () => Math.max(...requestsData.map(d => d.count), 1),
    [requestsData]
  );

  const requestsTotal = useMemo(
    () => requestsData.reduce((sum, d) => sum + d.count, 0),
    [requestsData]
  );

  // ─── CHART 2: Finances (cost per day) ───
  const financeData = useMemo(() => {
    return periodDays.map(day => {
      const dailySolutions = solutions.filter(s =>
        isSameDay(new Date(s.createdAt), day)
      );
      const totalCost = dailySolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
      return { day, totalCost };
    });
  }, [periodDays, solutions]);

  const financeMax = useMemo(
    () => Math.max(...financeData.map(d => d.totalCost), 1),
    [financeData]
  );

  const financeTotal = useMemo(
    () => financeData.reduce((sum, d) => sum + d.totalCost, 0),
    [financeData]
  );

  // ─── CHART 3: Rate (UAH/hr) + solution count per day ───
  const rateData = useMemo(() => {
    return periodDays.map(day => {
      const dailySolutions = solutions.filter(s =>
        isSameDay(new Date(s.createdAt), day)
      );
      const totalCost = dailySolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
      const totalHours = dailySolutions.reduce((sum, s) => sum + (s.spentHours || 0), 0);
      const rate = totalHours > 0 ? totalCost / totalHours : 0;
      return { day, rate, solutionCount: dailySolutions.length, totalHours };
    });
  }, [periodDays, solutions]);

  const rateMax = useMemo(
    () => Math.max(...rateData.map(d => d.rate), 1),
    [rateData]
  );

  const rateSolMax = useMemo(
    () => Math.max(...rateData.map(d => d.solutionCount), 1),
    [rateData]
  );

  const avgRate = useMemo(() => {
    const withRate = rateData.filter(d => d.rate > 0);
    if (withRate.length === 0) return 0;
    return withRate.reduce((s, d) => s + d.rate, 0) / withRate.length;
  }, [rateData]);

  // ─── CHART 4: Cost vs Time (top 10 recent solutions) ───
  const costVsTimeData = useMemo(() => {
    return solutions
      .filter(s => (s.cost || 0) > 0 && (s.spentHours || 0) > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(s => ({
        cost: s.cost || 0,
        hours: s.spentHours || 0,
        rate: (s.cost || 0) / (s.spentHours || 1),
        date: format(new Date(s.createdAt), 'd MMM', { locale: uk }),
      }));
  }, [solutions]);

  const cvtMaxCost = useMemo(
    () => Math.max(...costVsTimeData.map(d => d.cost), 1),
    [costVsTimeData]
  );

  const cvtMaxHours = useMemo(
    () => Math.max(...costVsTimeData.map(d => d.hours), 1),
    [costVsTimeData]
  );

  // ─── Resolution time stats ───
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

    return { total: resolvedProblems.length, avgMs, minMs, maxMs };
  }, [allHistory, problems]);

  // ─── CHART 5a: Efficiency by weekday (all-time) ───
  const weekdayEfficiency = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ totalCost: 0, totalHours: 0, count: 0 }));
    solutions.forEach(s => {
      if ((s.cost || 0) > 0 && (s.spentHours || 0) > 0) {
        const dayIdx = getMondayBasedDay(new Date(s.createdAt));
        buckets[dayIdx].totalCost += s.cost || 0;
        buckets[dayIdx].totalHours += s.spentHours || 0;
        buckets[dayIdx].count++;
      }
    });
    return buckets.map((b, i) => ({
      day: DAY_NAMES_SHORT[i],
      rate: b.totalHours > 0 ? b.totalCost / b.totalHours : 0,
      count: b.count,
    }));
  }, [solutions]);

  const weekdayRateMax = useMemo(
    () => Math.max(...weekdayEfficiency.map(d => d.rate), 1),
    [weekdayEfficiency]
  );

  // ─── CHART: Difficulty vs Rate correlation ───
  const difficultyVsRate = useMemo(() => {
    const buckets = Array.from({ length: 5 }, () => ({ totalCost: 0, totalHours: 0, count: 0 }));
    solutions.forEach(s => {
      if ((s.cost || 0) > 0 && (s.spentHours || 0) > 0) {
        // Old solutions without difficulty → treat as 3
        const diff = s.difficulty !== undefined ? s.difficulty : 3;
        const idx = Math.max(0, Math.min(4, diff - 1));
        buckets[idx].totalCost += s.cost || 0;
        buckets[idx].totalHours += s.spentHours || 0;
        buckets[idx].count++;
      }
    });
    return buckets.map((b, i) => ({
      level: i + 1,
      label: `${i + 1}`,
      rate: b.totalHours > 0 ? b.totalCost / b.totalHours : 0,
      avgCost: b.count > 0 ? b.totalCost / b.count : 0,
      count: b.count,
    }));
  }, [solutions]);

  const diffRateMax = useMemo(
    () => Math.max(...difficultyVsRate.map(d => d.rate), 1),
    [difficultyVsRate]
  );

  // ─── CHART 5b: Top cars by solution cost ───
  const topCars = useMemo(() => {
    const carCosts = new Map<string, number>();
    solutions.forEach(s => {
      if ((s.cost || 0) > 0) {
        carCosts.set(s.carId, (carCosts.get(s.carId) || 0) + (s.cost || 0));
      }
    });
    return Array.from(carCosts.entries())
      .map(([carId, totalCost]) => {
        const car = cars.find(c => c.id === carId);
        const label = car ? `${car.plate}` : carId.slice(0, 8);
        const subtitle = car ? `${car.make} ${car.model}` : '';
        return { carId, label, subtitle, totalCost };
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [solutions, cars]);

  const topCarMax = useMemo(
    () => Math.max(...topCars.map(c => c.totalCost), 1),
    [topCars]
  );

  // ─── CHART 5c: Cost distribution histogram ───
  const costDistribution = useMemo(() => {
    const ranges = [
      { label: '0–500', min: 0, max: 500 },
      { label: '500–1к', min: 500, max: 1000 },
      { label: '1к–2к', min: 1000, max: 2000 },
      { label: '2к–5к', min: 2000, max: 5000 },
      { label: '5к+', min: 5000, max: Infinity },
    ];
    return ranges.map(r => ({
      label: r.label,
      count: solutions.filter(s => {
        const c = s.cost || 0;
        return c > 0 && c >= r.min && c < r.max;
      }).length,
    }));
  }, [solutions]);

  const costDistMax = useMemo(
    () => Math.max(...costDistribution.map(d => d.count), 1),
    [costDistribution]
  );

  // ─── CHART 5d: Average check trend (last 8 weeks) ───
  const weeklyTrend = useMemo(() => {
    const result: { label: string; avgCost: number; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const ws = startOfWeek(addWeeks(now, -i), { weekStartsOn: 1 });
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const weekSolutions = solutions.filter(s => {
        const d = new Date(s.createdAt);
        return d >= ws && d <= we && (s.cost || 0) > 0;
      });
      const totalCost = weekSolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
      const avg = weekSolutions.length > 0 ? totalCost / weekSolutions.length : 0;
      result.push({
        label: format(ws, 'd.MM', { locale: uk }),
        avgCost: Math.round(avg),
        count: weekSolutions.length,
      });
    }
    return result;
  }, [solutions]);

  const trendMaxAvg = useMemo(
    () => Math.max(...weeklyTrend.map(d => d.avgCost), 1),
    [weeklyTrend]
  );

  const trendMaxCount = useMemo(
    () => Math.max(...weeklyTrend.map(d => d.count), 1),
    [weeklyTrend]
  );

  // ─── Month-level aggregation (existing) ───
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

  // ─── Labels ───
  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd MMM', { locale: uk });
    const end = format(currentWeekEnd, 'd MMM yyyy', { locale: uk });
    return `${start} — ${end}`;
  }, [currentWeekStart, currentWeekEnd]);

  const monthLabel = useMemo(() => {
    return format(currentMonthStart, 'LLLL yyyy', { locale: uk });
  }, [currentMonthStart]);

  const periodLabel = viewMode === 'week' ? weekLabel : monthLabel;
  const periodTotal = viewMode === 'week' ? `звернень за тиждень` : `звернень за місяць`;
  const isCurrent = viewMode === 'week' ? isCurrentWeek : isCurrentMonth;

  const navigateBack = () => {
    if (viewMode === 'week') setWeekOffset(w => w - 1);
    else setMonthOffset(m => m - 1);
  };

  const navigateForward = () => {
    if (viewMode === 'week') setWeekOffset(w => w + 1);
    else setMonthOffset(m => m + 1);
  };

  // ─── Helpers for compact bar labels ───
  function formatDayLabel(day: Date, index: number, total: number): string {
    if (total <= 7) return DAY_NAMES_SHORT[getMondayBasedDay(day)];
    // For monthly: show date number, skip every other for readability
    return format(day, 'd');
  }

  function shouldShowLabel(index: number, total: number): boolean {
    if (total <= 10) return true;
    if (total <= 20) return index % 2 === 0;
    return index % 3 === 0;
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--t-surface-bg)' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--t-border-default)', borderTopColor: 'var(--t-accent-primary)' }} />
      </div>
    );
  }

  // ─── Shared bar chart renderer ───
  function renderBarChart(options: {
    data: { day: Date; value: number; secondaryValue?: number }[];
    maxValue: number;
    maxSecondary?: number;
    color: string;
    colorGradient: string;
    secondaryColor?: string;
    formatValue: (v: number) => string;
    formatSecondary?: (v: number) => string;
    showSecondary?: boolean;
    height?: string;
  }) {
    const {
      data, maxValue, maxSecondary = 1, color, colorGradient,
      secondaryColor, formatValue, formatSecondary,
      showSecondary = false, height = '160px',
    } = options;
    const total = data.length;
    const isMonthly = total > 7;

    return (
      <div className="flex items-end justify-between" style={{ height, gap: isMonthly ? '1px' : '8px' }}>
        {data.map((d, i) => {
          const today = isToday(d.day);
          const barHeight = d.value > 0 ? Math.max(((d.value / maxValue) * 100), 8) : 4;
          const show = shouldShowLabel(i, total);

          return (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end" style={{ gap: isMonthly ? '1px' : '6px', minWidth: 0 }}>
              {/* Value label */}
              {show && (
                <span
                  className="font-bold tabular-nums transition-colors truncate"
                  style={{
                    fontSize: isMonthly ? '7px' : '10px',
                    color: today ? color : d.value > 0 ? 'var(--t-text-primary)' : 'var(--t-text-muted)',
                  }}
                >
                  {formatValue(d.value)}
                </span>
              )}

              {/* Secondary bar (solutions count overlay) */}
              {showSecondary && d.secondaryValue !== undefined && d.secondaryValue > 0 && (
                <div className="w-full flex justify-center" style={{ position: 'relative' }}>
                  <div
                    className="rounded-t"
                    style={{
                      width: isMonthly ? '3px' : '6px',
                      height: `${Math.max((d.secondaryValue / maxSecondary) * 40, 4)}px`,
                      background: secondaryColor || 'var(--t-text-muted)',
                      opacity: 0.5,
                    }}
                  />
                </div>
              )}

              {/* Primary bar */}
              <div
                className="w-full transition-all duration-300"
                style={{
                  height: `${barHeight}%`,
                  borderRadius: isMonthly ? '2px 2px 0 0' : '6px 6px 0 0',
                  background: today
                    ? colorGradient
                    : d.value > 0
                      ? `color-mix(in srgb, ${color} 40%, transparent)`
                      : 'var(--t-surface-elevated)',
                  boxShadow: today && d.value > 0 ? `0 -4px 16px -4px color-mix(in srgb, ${color} 40%, transparent)` : 'none',
                }}
              />

              {/* Day label */}
              {show && (
                <span
                  className="font-semibold truncate"
                  style={{
                    fontSize: isMonthly ? '7px' : '11px',
                    marginTop: isMonthly ? '1px' : '4px',
                    color: today ? color : 'var(--t-text-muted)',
                  }}
                >
                  {formatDayLabel(d.day, i, total)}
                </span>
              )}

              {/* Today dot */}
              {today && (
                <div
                  className="rounded-full"
                  style={{
                    width: isMonthly ? '3px' : '6px',
                    height: isMonthly ? '3px' : '6px',
                    background: color,
                    marginTop: '1px',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Shared section wrapper ───
  function Section({ children, gradient }: { children: React.ReactNode; gradient: string }) {
    return (
      <section className="rounded-2xl border p-5 relative overflow-hidden" style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: gradient }} />
        {children}
      </section>
    );
  }

  // ─── Period navigation header ───
  function PeriodNav({ title }: { title: string }) {
    return (
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={navigateBack}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center min-w-0">
          <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{title}</h3>
          <p className="text-xs font-medium capitalize mt-0.5" style={{ color: 'var(--t-text-muted)' }}>{periodLabel}</p>
        </div>
        <button
          onClick={navigateForward}
          disabled={isCurrent}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-30"
          style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
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

        {/* ═══ VIEW MODE TOGGLE ═══ */}
        <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--t-border-default)' }}>
          <button
            id="stats-mode-week"
            onClick={() => setViewMode('week')}
            className="flex-1 py-2.5 text-sm font-bold transition-all"
            style={{
              background: viewMode === 'week' ? 'var(--t-accent-primary)' : 'var(--t-surface-card)',
              color: viewMode === 'week' ? 'var(--t-text-on-accent)' : 'var(--t-text-muted)',
            }}
          >
            Тиждень
          </button>
          <button
            id="stats-mode-month"
            onClick={() => setViewMode('month')}
            className="flex-1 py-2.5 text-sm font-bold transition-all"
            style={{
              background: viewMode === 'month' ? 'var(--t-accent-primary)' : 'var(--t-surface-card)',
              color: viewMode === 'month' ? 'var(--t-text-on-accent)' : 'var(--t-text-muted)',
            }}
          >
            Місяць
          </button>
        </div>

        {/* ═══ CHART 1: CLIENT REQUESTS ═══ */}
        <Section gradient="linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))">
          <PeriodNav title="Звернення клієнтів" />

          {/* Total */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-3xl font-bold" style={{ color: 'var(--t-text-primary)' }}>{requestsTotal}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>{periodTotal}</span>
          </div>

          {/* Bar chart */}
          {renderBarChart({
            data: requestsData.map(d => ({ day: d.day, value: d.count })),
            maxValue: requestsMax,
            color: 'var(--t-accent-primary)',
            colorGradient: 'linear-gradient(to top, var(--t-accent-gradient-from), var(--t-accent-gradient-to))',
            formatValue: (v) => String(v),
          })}
        </Section>

        {/* ═══ CHART 2: FINANCES ═══ */}
        <Section gradient="linear-gradient(90deg, #fef08a, #ca8a04)">
          <PeriodNav title="Фінанси" />

          {/* Total */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-3xl font-bold" style={{ color: '#ca8a04' }}>{financeTotal.toLocaleString()}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>
              грн за {viewMode === 'week' ? 'тиждень' : 'місяць'}
            </span>
          </div>

          {/* Bar chart */}
          {renderBarChart({
            data: financeData.map(d => ({ day: d.day, value: d.totalCost })),
            maxValue: financeMax,
            color: '#ca8a04',
            colorGradient: 'linear-gradient(to top, #fef08a, #eab308)',
            formatValue: (v) => v > 0 ? (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(v)) : '0',
          })}
        </Section>

        {/* ═══ CHART 3: RATE (UAH/HR) + SOLUTIONS COUNT ═══ */}
        <Section gradient="linear-gradient(90deg, #34d399, #059669)">
          <PeriodNav title="Рейт (грн/год)" />

          {/* Average rate */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#059669' }} />
            <span className="text-3xl font-bold" style={{ color: '#059669' }}>
              {avgRate > 0 ? Math.round(avgRate).toLocaleString() : '—'}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>
              грн/год (середній)
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: '#34d399' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Рейт</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.5 }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Рішення</span>
            </div>
          </div>

          {/* Bar chart */}
          {renderBarChart({
            data: rateData.map(d => ({ day: d.day, value: d.rate, secondaryValue: d.solutionCount })),
            maxValue: rateMax,
            maxSecondary: rateSolMax,
            color: '#059669',
            colorGradient: 'linear-gradient(to top, #34d399, #059669)',
            secondaryColor: 'var(--t-text-muted)',
            formatValue: (v) => v > 0 ? Math.round(v).toLocaleString() : '0',
            showSecondary: true,
          })}
        </Section>

        {/* ═══ CHART 4: COST VS TIME (Top 10) ═══ */}
        {costVsTimeData.length > 0 && (
          <Section gradient="linear-gradient(90deg, #c084fc, #7c3aed)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #7c3aed 15%, transparent)', color: '#7c3aed' }}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Вартість vs Час</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Останні 10 рішень</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {costVsTimeData.map((d, i) => {
                const costWidth = Math.max((d.cost / cvtMaxCost) * 100, 8);
                const rateColor = d.rate >= (avgRate || 500) ? '#34d399' : '#f87171';
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono w-12 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>{d.date}</span>
                    <div className="flex-1 h-8 rounded-lg overflow-hidden relative" style={{ background: 'var(--t-surface-elevated)' }}>
                      {/* Cost bar */}
                      <div
                        className="h-full rounded-lg flex items-center justify-between px-2 transition-all duration-500"
                        style={{
                          width: `${costWidth}%`,
                          minWidth: '60px',
                          background: `linear-gradient(90deg, color-mix(in srgb, #7c3aed 30%, transparent), color-mix(in srgb, #7c3aed 60%, transparent))`,
                        }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: '#c084fc' }}>
                          {d.cost.toLocaleString()}₴
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>
                          {d.hours}г
                        </span>
                      </div>
                    </div>
                    {/* Rate badge */}
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: `color-mix(in srgb, ${rateColor} 15%, transparent)`, color: rateColor }}
                    >
                      {Math.round(d.rate)}₴/г
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ RESOLUTION TIME STATS ═══ */}
        {resolutionStats && (
          <Section gradient="linear-gradient(90deg, var(--t-status-solution), var(--t-accent-gradient-to))">
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
          </Section>
        )}

        {/* ═══ CHART: DIFFICULTY VS RATE ═══ */}
        {difficultyVsRate.some(d => d.count > 0) && (
          <Section gradient="linear-gradient(90deg, #fb923c, #dc2626)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #dc2626 15%, transparent)', color: '#dc2626' }}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Складність vs Рейт</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Чи складніші роботи оплачуються краще?</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#fb923c' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Рейт ₴/год</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.4 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>К-сть рішень</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {difficultyVsRate.map((d, i) => {
                const barWidth = d.rate > 0 ? Math.max((d.rate / diffRateMax) * 100, 8) : 0;
                const isBest = d.rate === Math.max(...difficultyVsRate.filter(x => x.count > 0).map(x => x.rate)) && d.count > 0;
                const intensityColors = ['#fde68a', '#fdba74', '#fb923c', '#f97316', '#ea580c'];
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    {/* Difficulty level */}
                    <div className="flex items-center gap-0.5 w-16 shrink-0">
                      {[1, 2, 3, 4, 5].map(star => (
                        <div
                          key={star}
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{
                            background: star <= d.level ? intensityColors[d.level - 1] : 'var(--t-surface-elevated)',
                          }}
                        />
                      ))}
                    </div>
                    {/* Rate bar */}
                    <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div
                        className="h-full rounded-lg flex items-center justify-between px-2.5 transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          minWidth: d.rate > 0 ? '50px' : '0',
                          background: isBest
                            ? `linear-gradient(90deg, ${intensityColors[i]}, ${intensityColors[Math.min(4, i + 1)]})`
                            : `color-mix(in srgb, ${intensityColors[i]} 40%, transparent)`,
                        }}
                      >
                        {d.rate > 0 && (
                          <span className="text-[10px] font-bold" style={{ color: isBest ? '#fff' : intensityColors[i] }}>
                            {Math.round(d.rate)}₴/г
                          </span>
                        )}
                        {d.count > 0 && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>
                            ~{Math.round(d.avgCost)}₴
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Count */}
                    <span className="text-[10px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      {d.count > 0 ? `×${d.count}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Insight summary */}
            {(() => {
              const withData = difficultyVsRate.filter(d => d.count > 0);
              if (withData.length < 2) return null;
              const bestLevel = withData.reduce((best, d) => d.rate > best.rate ? d : best);
              return (
                <div className="mt-4 p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                    💡 Найвигідніша складність: <strong style={{ color: '#f97316' }}>рівень {bestLevel.level}</strong> — {Math.round(bestLevel.rate)} ₴/год (середній чек ~{Math.round(bestLevel.avgCost)}₴)
                  </p>
                </div>
              );
            })()}
          </Section>
        )}


        {/* ═══ CHART 5a: EFFICIENCY BY WEEKDAY ═══ */}
        {weekdayEfficiency.some(d => d.rate > 0) && (
          <Section gradient="linear-gradient(90deg, #f97316, #ea580c)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #f97316 15%, transparent)', color: '#f97316' }}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Ефективність по дням тижня</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Середній рейт грн/год за весь час</p>
              </div>
            </div>

            <div className="space-y-2">
              {weekdayEfficiency.map((d, i) => {
                const barWidth = d.rate > 0 ? Math.max((d.rate / weekdayRateMax) * 100, 6) : 0;
                const isBest = d.rate === Math.max(...weekdayEfficiency.map(e => e.rate)) && d.rate > 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-6 shrink-0"
                      style={{ color: isBest ? '#f97316' : 'var(--t-text-muted)' }}
                    >
                      {d.day}
                    </span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          minWidth: d.rate > 0 ? '40px' : '0',
                          background: isBest
                            ? 'linear-gradient(90deg, #fdba74, #f97316)'
                            : 'color-mix(in srgb, #f97316 30%, transparent)',
                        }}
                      >
                        {d.rate > 0 && (
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: isBest ? '#fff' : '#f97316' }}
                          >
                            {Math.round(d.rate)}₴/г
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono w-6 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      {d.count > 0 ? `×${d.count}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ CHART 5c: COST DISTRIBUTION ═══ */}
        {costDistribution.some(d => d.count > 0) && (
          <Section gradient="linear-gradient(90deg, #60a5fa, #2563eb)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #2563eb 15%, transparent)', color: '#2563eb' }}>
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Розподіл вартості рішень</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Кількість рішень за ціновим діапазоном</p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3" style={{ height: '140px' }}>
              {costDistribution.map((d, i) => {
                const barHeight = d.count > 0 ? Math.max((d.count / costDistMax) * 100, 8) : 4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: d.count > 0 ? '#2563eb' : 'var(--t-text-muted)' }}
                    >
                      {d.count}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${barHeight}%`,
                        background: d.count > 0
                          ? `linear-gradient(to top, color-mix(in srgb, #60a5fa 50%, transparent), #2563eb)`
                          : 'var(--t-surface-elevated)',
                      }}
                    />
                    <span className="text-[10px] font-semibold mt-1" style={{ color: 'var(--t-text-muted)' }}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ CHART 5d: WEEKLY TREND (avg check + count) ═══ */}
        {weeklyTrend.some(d => d.count > 0) && (
          <Section gradient="linear-gradient(90deg, #a78bfa, #6d28d9)">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #6d28d9 15%, transparent)', color: '#6d28d9' }}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Тренд середнього чеку</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Останні 8 тижнів</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#a78bfa' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>Середній чек</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.4 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>К-сть рішень</span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
              {weeklyTrend.map((d, i) => {
                const avgHeight = d.avgCost > 0 ? Math.max((d.avgCost / trendMaxAvg) * 100, 8) : 4;
                const countHeight = d.count > 0 ? Math.max((d.count / trendMaxCount) * 50, 6) : 0;
                const isLast = i === weeklyTrend.length - 1;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {/* Avg cost label */}
                    <span
                      className="text-[9px] font-bold tabular-nums"
                      style={{ color: isLast ? '#a78bfa' : d.avgCost > 0 ? 'var(--t-text-primary)' : 'var(--t-text-muted)' }}
                    >
                      {d.avgCost > 0 ? (d.avgCost >= 1000 ? (d.avgCost / 1000).toFixed(1) + 'k' : d.avgCost) : '—'}
                    </span>

                    {/* Count mini-bar (behind) */}
                    {d.count > 0 && (
                      <div
                        className="w-2 rounded-t"
                        style={{
                          height: `${countHeight}px`,
                          background: 'var(--t-text-muted)',
                          opacity: 0.25,
                        }}
                      />
                    )}

                    {/* Avg cost bar */}
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${avgHeight}%`,
                        background: isLast
                          ? 'linear-gradient(to top, #a78bfa, #6d28d9)'
                          : d.avgCost > 0
                            ? 'color-mix(in srgb, #a78bfa 40%, transparent)'
                            : 'var(--t-surface-elevated)',
                        boxShadow: isLast && d.avgCost > 0 ? '0 -4px 16px -4px rgba(109, 40, 217, 0.3)' : 'none',
                      }}
                    />

                    {/* Week label */}
                    <span
                      className="text-[9px] font-semibold mt-1"
                      style={{ color: isLast ? '#a78bfa' : 'var(--t-text-muted)' }}
                    >
                      {d.label}
                    </span>

                    {/* Count badge */}
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: 'var(--t-text-muted)', opacity: 0.7 }}
                    >
                      ×{d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ CHART 5b: TOP CARS ═══ */}
        {topCars.length > 0 && (
          <Section gradient="linear-gradient(90deg, #fbbf24, #d97706)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #d97706 15%, transparent)', color: '#d97706' }}>
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>Топ авто за вартістю рішень</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>За весь час</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {topCars.map((c, i) => {
                const barWidth = Math.max((c.totalCost / topCarMax) * 100, 10);
                const isFirst = i === 0;
                const medals = ['🥇', '🥈', '🥉', '4', '5'];
                return (
                  <div key={c.carId} className="flex items-center gap-2.5">
                    <span className="text-sm w-5 text-center shrink-0">{medals[i]}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="min-w-0">
                          <span className="text-xs font-bold truncate block" style={{ color: 'var(--t-text-primary)' }}>
                            {c.label}
                          </span>
                          {c.subtitle && (
                            <span className="text-[10px] font-medium truncate block" style={{ color: 'var(--t-text-muted)' }}>
                              {c.subtitle}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold shrink-0 ml-2" style={{ color: isFirst ? '#d97706' : 'var(--t-text-secondary)' }}>
                          {c.totalCost.toLocaleString()}₴
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: isFirst
                              ? 'linear-gradient(90deg, #fbbf24, #d97706)'
                              : 'color-mix(in srgb, #fbbf24 40%, transparent)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ═══ MONTHLY OVERVIEW (existing) ═══ */}
        <Section gradient="linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-via), var(--t-accent-gradient-to))">
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
        </Section>

        {/* Summary card */}
        <Section gradient="linear-gradient(90deg, var(--t-status-problem), var(--t-status-solution))">
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
        </Section>
      </div>
    </div>
  );
}
