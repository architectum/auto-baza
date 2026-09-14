import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryEntry } from '@types';
import {
  ArrowLeft, BarChart3, ChevronLeft, ChevronRight, AlertCircle,
  Wrench, Clock, TrendingUp, DollarSign, Target, Trophy, PieChart, Zap, Layers,
  Car as CarIcon, Calendar, Activity, Sparkles, Download,
} from '@shared/icons/Icons';

import { useLanguage } from '@shared/i18n';
import { useCurrency } from '@shared/context/CurrencyContext';
import { useStatsData } from './hooks/useStatsData';
import { usePeriodNav } from './hooks/usePeriodNav';
import { PeriodNavigator } from './components/PeriodNavigator';
import { ChartCard } from './components/ChartCard';
import { StatsDashboard } from './components/StatsDashboard';
import { FilterBar } from './components/FilterBar';
import { ForecastChart } from './charts/ForecastChart';
import { generateCSV, downloadFile } from '@shared/lib/math';
import { exportPdfReport } from './utils/exportPdfReport';


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

/**
 * Default difficulty level for solutions that don't have a `difficulty` field set
 * (legacy entries created before the field was introduced). Treated as middle of
 * the 1–5 scale for analytics purposes so they don't artificially skew the lowest
 * bucket.
 */
const DEFAULT_DIFFICULTY = 3;

/** Shared difficulty color ramp (level 1 → 5, low → high) */
const DIFFICULTY_COLORS = ['#fde68a', '#fdba74', '#fb923c', '#f97316', '#ea580c'] as const;

/** JS getDay: 0=Sun => map to Mon=0..Sun=6 */
function getMondayBasedDay(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

export function Statistics() {
  const navigate = useNavigate();
  const { t, language, dateLocale, formatResolutionTime, formatProblemsCount } = useLanguage();
  const { currency, currencySymbol, formatMoney, formatRate, formatCompact } = useCurrency();
  const DAY_NAMES_SHORT = language === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
  const pluralOpen = (n: number) => (language === 'en' ? 'open' : n % 10 === 1 && n % 100 !== 11 ? 'відкрита' : 'відкриті');
  const { allHistory, loading, carsById } = useStatsData();
  const {
    viewMode,
    setViewMode,
    periodDays,
    periodLabel,
    periodTotal,
    isCurrent,
    navigatePrev,
    navigateNext,
    resetOffset,
    currentWeekStart,
    currentWeekEnd,
    currentMonthStart,
    currentMonthEnd,
    isCurrentWeek,
    isCurrentMonth,
  } = usePeriodNav();

  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const availableMakes = useMemo(() => {
    const makes = new Set<string>();
    carsById.forEach(car => {
      if (car.make) makes.add(car.make);
    });
    return Array.from(makes).sort();
  }, [carsById]);

  const filteredHistory = useMemo(() => {
    if (selectedMakes.length === 0) return allHistory;
    return allHistory.filter(e => {
      const car = carsById.get(e.carId);
      return car && car.make && selectedMakes.includes(car.make);
    });
  }, [allHistory, selectedMakes, carsById]);

  // ─── Filtered data ───
  const problems = useMemo(
    () => filteredHistory.filter(e => e.type === 'problem'),
    [filteredHistory]
  );

  const solutions = useMemo(
    () => filteredHistory.filter(e => e.type === 'solution'),
    [filteredHistory]
  );

  // ─── Period-specific filtered data for KPI dashboard ───
  const currentProblems = useMemo(() => {
    const start = viewMode === 'week' ? currentWeekStart : currentMonthStart;
    const end = viewMode === 'week' ? currentWeekEnd : currentMonthEnd;
    return problems.filter(p => {
      const d = new Date(p.createdAt);
      return d >= start && d <= end;
    });
  }, [viewMode, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd, problems]);

  const currentSolutions = useMemo(() => {
    const start = viewMode === 'week' ? currentWeekStart : currentMonthStart;
    const end = viewMode === 'week' ? currentWeekEnd : currentMonthEnd;
    return solutions.filter(s => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });
  }, [viewMode, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd, solutions]);

  const prevProblems = useMemo(() => {
    const start = viewMode === 'week' ? addWeeks(currentWeekStart, -1) : addMonths(currentMonthStart, -1);
    const end = viewMode === 'week' ? addWeeks(currentWeekEnd, -1) : addMonths(currentMonthEnd, -1);
    return problems.filter(p => {
      const d = new Date(p.createdAt);
      return d >= start && d <= end;
    });
  }, [viewMode, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd, problems]);

  const prevSolutions = useMemo(() => {
    const start = viewMode === 'week' ? addWeeks(currentWeekStart, -1) : addMonths(currentMonthStart, -1);
    const end = viewMode === 'week' ? addWeeks(currentWeekEnd, -1) : addMonths(currentMonthEnd, -1);
    return solutions.filter(s => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });
  }, [viewMode, currentWeekStart, currentWeekEnd, currentMonthStart, currentMonthEnd, solutions]);

  // Current period metrics
  const totalRevenue = useMemo(() => {
    return currentSolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
  }, [currentSolutions]);

  const avgCheck = useMemo(() => {
    const paid = currentSolutions.filter(s => (s.cost || 0) > 0);
    return paid.length > 0 ? totalRevenue / paid.length : 0;
  }, [currentSolutions, totalRevenue]);

  const requestCount = currentProblems.length;

  const kpiAvgRate = useMemo(() => {
    const withHours = currentSolutions.filter(s => (s.spentHours || 0) > 0);
    const totalCost = withHours.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalHours = withHours.reduce((sum, s) => sum + (s.spentHours || 0), 0);
    return totalHours > 0 ? totalCost / totalHours : 0;
  }, [currentSolutions]);

  // Previous period metrics
  const prevRevenue = useMemo(() => {
    return prevSolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
  }, [prevSolutions]);

  const prevAvgCheck = useMemo(() => {
    const paid = prevSolutions.filter(s => (s.cost || 0) > 0);
    const revenue = prevSolutions.reduce((sum, s) => sum + (s.cost || 0), 0);
    return paid.length > 0 ? revenue / paid.length : 0;
  }, [prevSolutions]);

  const prevRequestCount = prevProblems.length;

  const kpiPrevAvgRate = useMemo(() => {
    const withHours = prevSolutions.filter(s => (s.spentHours || 0) > 0);
    const totalCost = withHours.reduce((sum, s) => sum + (s.cost || 0), 0);
    const totalHours = withHours.reduce((sum, s) => sum + (s.spentHours || 0), 0);
    return totalHours > 0 ? totalCost / totalHours : 0;
  }, [prevSolutions]);

  const handleExportCSV = () => {
    const headers = [
      { key: 'date', label: t('stats.csvHeaders.date') },
      { key: 'carPlate', label: t('stats.csvHeaders.carPlate') },
      { key: 'carModel', label: t('stats.csvHeaders.carModel') },
      { key: 'clientName', label: t('stats.csvHeaders.clientName') },
      { key: 'clientPhone', label: t('stats.csvHeaders.clientPhone') },
      { key: 'type', label: t('stats.csvHeaders.type') },
      { key: 'text', label: t('stats.csvHeaders.text') },
      { key: 'mileage', label: t('stats.csvHeaders.mileage') },
      { key: 'cost', label: `${t('stats.csvHeaders.cost')} (${currencySymbol})` },
      { key: 'hours', label: t('stats.csvHeaders.hours') },
      { key: 'difficulty', label: t('stats.csvHeaders.difficulty') },
    ];

    const typeLabels: Record<string, string> = {
      problem: t('stats.csvTypes.problem'),
      solution: t('stats.csvTypes.solution'),
      note: t('stats.csvTypes.note'),
      mileage: t('stats.csvTypes.mileage'),
      reminder: t('stats.csvTypes.reminder'),
    };

    const rows = filteredHistory.map(e => {
      const car = carsById.get(e.carId);
      let dateStr = '';
      try {
        if (e.createdAt) {
          dateStr = format(new Date(e.createdAt), 'yyyy-MM-dd HH:mm');
        }
      } catch {
        dateStr = e.createdAt || '';
      }

      return {
        date: dateStr,
        carPlate: car?.plate || '',
        carModel: car ? `${car.make || ''} ${car.model || ''}`.trim() : '',
        clientName: car?.clientName || '',
        clientPhone: car?.clientPhone || '',
        type: typeLabels[e.type] || e.type,
        text: e.text || '',
        mileage: e.runtimeMileage || '',
        cost: e.cost !== undefined ? e.cost : '',
        hours: e.spentHours !== undefined ? e.spentHours : '',
        difficulty: e.difficulty !== undefined ? e.difficulty : '',
      };
    });

    const csvContent = generateCSV(headers, rows);
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    downloadFile(csvContent, `autobaza-stats-${viewMode}-${dateStr}.csv`);
  };

  const handleExportPDF = () => {
    exportPdfReport({
      currency,
      viewMode,
      periodLabel,
      selectedMakes,
      carsById,
      filteredHistory,
      problems,
      solutions,
      totalRevenue,
      prevRevenue,
      avgCheck,
      prevAvgCheck,
      requestCount,
      prevRequestCount,
      kpiAvgRate,
      kpiPrevAvgRate,
      requestsData,
      requestsMax,
      financeData,
      financeMax,
      rateData,
      rateMax,
      avgRate,
      costVsTimeData,
      resolutionStats,
      difficultyVsRate,
      weekdayEfficiency,
      weekdayProfit,
      costDistribution,
      weeklyTrend,
      cumulativeRevenue,
      topCars,
      topMakesByRevenue,
      makeProfitability,
      mileageBuckets,
      mileageDiffBuckets,
      heatmapData,
      agingBuckets,
      agingStale,
      difficultyDistribution,
      difficultyVsTime,
      difficultyByMake,
      funnelData,
      seasonalityByMonth,
      monthlyStats,
    });
  };


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
        date: format(new Date(s.createdAt), 'd MMM', { locale: dateLocale }),
      }));
  }, [solutions, dateLocale]);

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
        // Legacy entries without difficulty fall back to DEFAULT_DIFFICULTY
        const diff = s.difficulty ?? DEFAULT_DIFFICULTY;
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
        const car = carsById.get(carId);
        const label = car ? `${car.plate}` : carId.slice(0, 8);
        const subtitle = car ? `${car.make} ${car.model}` : '';
        return { carId, label, subtitle, totalCost };
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [solutions, carsById]);

  const topCarMax = useMemo(
    () => Math.max(...topCars.map(c => c.totalCost), 1),
    [topCars]
  );

  // ─── CHART 5c: Cost distribution histogram ───
  const costDistribution = useMemo(() => {
    const ranges = language === 'en' ? [
      { label: '0–500', min: 0, max: 500 },
      { label: '500–1k', min: 500, max: 1000 },
      { label: '1k–2k', min: 1000, max: 2000 },
      { label: '2k–5k', min: 2000, max: 5000 },
      { label: '5k+', min: 5000, max: Infinity },
    ] : [
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
  }, [solutions, language]);

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
        label: format(ws, 'd.MM', { locale: dateLocale }),
        avgCost: Math.round(avg),
        count: weekSolutions.length,
      });
    }
    return result;
  }, [solutions, dateLocale]);

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
      const monthLabel = format(d, 'LLLL yyyy', { locale: dateLocale });
      const count = problems.filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ label: monthLabel, count });
    }
    return months;
  }, [problems, dateLocale]);

  const monthMax = useMemo(
    () => Math.max(...monthlyStats.map(m => m.count), 1),
    [monthlyStats]
  );

  // ─── CHART: Profitability by make (avg check + rate) ───
  const makeProfitability = useMemo(() => {
    const map = new Map<string, { totalCost: number; totalHours: number; count: number }>();
    solutions.forEach(s => {
      if ((s.cost || 0) <= 0) return;
      const car = carsById.get(s.carId);
      const make = (car?.make || '').trim() || '—';
      const entry = map.get(make) || { totalCost: 0, totalHours: 0, count: 0 };
      entry.totalCost += s.cost || 0;
      entry.totalHours += s.spentHours || 0;
      entry.count++;
      map.set(make, entry);
    });
    return Array.from(map.entries())
      .map(([make, e]) => ({
        make,
        avgCheck: e.count > 0 ? e.totalCost / e.count : 0,
        rate: e.totalHours > 0 ? e.totalCost / e.totalHours : 0,
        count: e.count,
      }))
      .filter(m => m.count > 0)
      .sort((a, b) => b.avgCheck - a.avgCheck)
      .slice(0, 8);
  }, [solutions, carsById]);

  const makeAvgCheckMax = useMemo(
    () => Math.max(...makeProfitability.map(m => m.avgCheck), 1),
    [makeProfitability]
  );

  const makeRateMax = useMemo(
    () => Math.max(...makeProfitability.map(m => m.rate), 1),
    [makeProfitability]
  );

  // ─── CHART: Mileage buckets vs avg check / visits ───
  const mileageBuckets = useMemo(() => {
    const ranges = [
      { label: '<50k', min: 0, max: 50000 },
      { label: '50-100k', min: 50000, max: 100000 },
      { label: '100-200k', min: 100000, max: 200000 },
      { label: '200-300k', min: 200000, max: 300000 },
      { label: '300k+', min: 300000, max: Infinity },
    ];
    return ranges.map(r => {
      const matching = solutions.filter(s => {
        const m = s.runtimeMileage || 0;
        return m > 0 && m >= r.min && m < r.max;
      });
      const totalCost = matching.reduce((sum, s) => sum + (s.cost || 0), 0);
      return {
        label: r.label,
        count: matching.length,
        avgCheck: matching.length > 0 ? totalCost / matching.length : 0,
      };
    });
  }, [solutions]);

  const mileageBucketCountMax = useMemo(
    () => Math.max(...mileageBuckets.map(b => b.count), 1),
    [mileageBuckets]
  );

  const mileageBucketAvgMax = useMemo(
    () => Math.max(...mileageBuckets.map(b => b.avgCheck), 1),
    [mileageBuckets]
  );

  // ─── CHART: Interval between visits (mileageDiff distribution) ───
  const mileageDiffBuckets = useMemo(() => {
    const ranges = [
      { label: '<1k', min: 0, max: 1000 },
      { label: '1-5k', min: 1000, max: 5000 },
      { label: '5-10k', min: 5000, max: 10000 },
      { label: '10-20k', min: 10000, max: 20000 },
      { label: '20k+', min: 20000, max: Infinity },
    ];
    return ranges.map(r => ({
      label: r.label,
      count: allHistory.filter(h => {
        const d = h.mileageDiff || 0;
        return d > 0 && d >= r.min && d < r.max;
      }).length,
    }));
  }, [allHistory]);

  const mileageDiffMax = useMemo(
    () => Math.max(...mileageDiffBuckets.map(b => b.count), 1),
    [mileageDiffBuckets]
  );

  // ─── CHART: Heatmap day × hour for problems ───
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    problems.forEach(p => {
      const d = new Date(p.createdAt);
      const dayIdx = getMondayBasedDay(d);
      const hour = d.getHours();
      grid[dayIdx][hour]++;
    });
    const flat = grid.flat();
    const max = Math.max(...flat, 1);
    const total = flat.reduce((s, v) => s + v, 0);
    // Find peak slot
    let peakDay = 0, peakHour = 0, peakVal = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (grid[d][h] > peakVal) {
          peakVal = grid[d][h];
          peakDay = d;
          peakHour = h;
        }
      }
    }
    return { grid, max, total, peakDay, peakHour, peakVal };
  }, [problems]);

  // ─── CHART: Aging of open problems ───
  const agingBuckets = useMemo(() => {
    const open = problems.filter(p => !p.linkedSolutionId);
    const now = Date.now();
    const daySuffix = t('stats.agingDays');
    const ranges = [
      { label: `1-3 ${daySuffix}`, min: 0, max: 3 },
      { label: `4-7 ${daySuffix}`, min: 4, max: 7 },
      { label: `8-14 ${daySuffix}`, min: 8, max: 14 },
      { label: `15-30 ${daySuffix}`, min: 15, max: 30 },
      { label: `30+ ${daySuffix}`, min: 31, max: Infinity },
    ];
    return ranges.map(r => ({
      label: r.label,
      count: open.filter(p => {
        const days = Math.floor((now - new Date(p.createdAt).getTime()) / 86400000);
        return days >= r.min && days <= r.max;
      }).length,
    }));
  }, [problems, t]);

  const agingMax = useMemo(
    () => Math.max(...agingBuckets.map(b => b.count), 1),
    [agingBuckets]
  );

  const agingStale = useMemo(
    () => agingBuckets.slice(2).reduce((s, b) => s + b.count, 0),
    [agingBuckets]
  );

  // ─── CHART: Difficulty distribution (donut) ───
  const difficultyDistribution = useMemo(() => {
    const counts = Array.from({ length: 5 }, () => 0);
    solutions.forEach(s => {
      const diff = s.difficulty ?? DEFAULT_DIFFICULTY;
      const idx = Math.max(0, Math.min(4, diff - 1));
      counts[idx]++;
    });
    const total = counts.reduce((s, c) => s + c, 0);
    return { counts, total };
  }, [solutions]);

  // ─── CHART: Difficulty vs avg time ───
  const difficultyVsTime = useMemo(() => {
    const data = Array.from({ length: 5 }, () => ({ totalHours: 0, count: 0 }));
    solutions.forEach(s => {
      if ((s.spentHours || 0) <= 0) return;
      const diff = s.difficulty ?? DEFAULT_DIFFICULTY;
      const idx = Math.max(0, Math.min(4, diff - 1));
      data[idx].totalHours += s.spentHours || 0;
      data[idx].count++;
    });
    return data.map((d, i) => ({
      level: i + 1,
      avgHours: d.count > 0 ? d.totalHours / d.count : 0,
      count: d.count,
    }));
  }, [solutions]);

  const difficultyHoursMax = useMemo(
    () => Math.max(...difficultyVsTime.map(d => d.avgHours), 1),
    [difficultyVsTime]
  );

  // ─── CHART: Difficulty × make (stacked) ───
  const difficultyByMake = useMemo(() => {
    const map = new Map<string, number[]>();
    solutions.forEach(s => {
      const car = carsById.get(s.carId);
      const make = (car?.make || '').trim() || '—';
      const diff = s.difficulty ?? DEFAULT_DIFFICULTY;
      const idx = Math.max(0, Math.min(4, diff - 1));
      const arr = map.get(make) || [0, 0, 0, 0, 0];
      arr[idx]++;
      map.set(make, arr);
    });
    return Array.from(map.entries())
      .map(([make, counts]) => ({
        make,
        counts,
        total: counts.reduce((s, c) => s + c, 0),
      }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [solutions, carsById]);

  const difficultyByMakeTotalMax = useMemo(
    () => Math.max(...difficultyByMake.map(m => m.total), 1),
    [difficultyByMake]
  );

  // ─── CHART: Funnel problems → solution → paid ───
  const funnelData = useMemo(() => {
    const totalProblems = problems.length;
    const withSolution = problems.filter(p => p.linkedSolutionId).length;
    const withPaidSolution = problems.filter(p => {
      if (!p.linkedSolutionId) return false;
      const s = solutions.find(x => x.id === p.linkedSolutionId);
      return s && (s.cost || 0) > 0;
    }).length;
    return [
      { label: t('stats.funnelCreated'), value: totalProblems, color: '#60a5fa', colorTo: '#2563eb' },
      { label: t('stats.funnelWithSolution'), value: withSolution, color: '#a78bfa', colorTo: '#7c3aed' },
      { label: t('stats.funnelPaid'), value: withPaidSolution, color: '#34d399', colorTo: '#059669' },
    ];
  }, [problems, solutions, t]);

  // ─── CHART: Bubble chart cost × hours × difficulty × make ───
  const bubbleData = useMemo(() => {
    const palette = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#fb923c', '#e879f9'];
    const makesUsed: string[] = [];
    const makeColor = (m: string) => {
      let idx = makesUsed.indexOf(m);
      if (idx < 0) { makesUsed.push(m); idx = makesUsed.length - 1; }
      return palette[idx % palette.length];
    };
    const points = solutions
      .filter(s => (s.cost || 0) > 0 && (s.spentHours || 0) > 0)
      .map(s => {
        const car = carsById.get(s.carId);
        const make = (car?.make || '').trim() || '—';
        return {
          cost: s.cost || 0,
          hours: s.spentHours || 0,
          difficulty: s.difficulty ?? DEFAULT_DIFFICULTY,
          make,
        };
      });

    // Limit to top 8 makes for legend clarity, rest go to "Other"
    const makeCounts = new Map<string, number>();
    points.forEach(p => makeCounts.set(p.make, (makeCounts.get(p.make) || 0) + 1));
    const topMakes = Array.from(makeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(e => e[0]);

    const normalizedPoints = points.map(p => {
      const make = topMakes.includes(p.make) ? p.make : t('stats.other');
      return { ...p, make, color: makeColor(make) };
    });

    const legend = Array.from(new Set(normalizedPoints.map(p => p.make)))
      .map(make => ({ make, color: makeColor(make) }));

    const maxCost = Math.max(...normalizedPoints.map(p => p.cost), 1);
    const maxHours = Math.max(...normalizedPoints.map(p => p.hours), 1);

    return { points: normalizedPoints, legend, maxCost, maxHours };
  }, [solutions, carsById, t]);

  // ─── CHART: Top makes by revenue & problem count ───
  const topMakesByRevenue = useMemo(() => {
    const map = new Map<string, { totalCost: number; problemCount: number; solutionCount: number }>();
    solutions.forEach(s => {
      if ((s.cost || 0) <= 0) return;
      const car = carsById.get(s.carId);
      const make = (car?.make || '').trim() || '—';
      const entry = map.get(make) || { totalCost: 0, problemCount: 0, solutionCount: 0 };
      entry.totalCost += s.cost || 0;
      entry.solutionCount++;
      map.set(make, entry);
    });
    problems.forEach(p => {
      const car = carsById.get(p.carId);
      const make = (car?.make || '').trim() || '—';
      if (!map.has(make)) map.set(make, { totalCost: 0, problemCount: 0, solutionCount: 0 });
      map.get(make)!.problemCount++;
    });
    return Array.from(map.entries())
      .map(([make, e]) => ({ make, ...e }))
      .filter(m => m.totalCost > 0 || m.problemCount > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 8);
  }, [solutions, problems, carsById]);

  const topMakeRevenueMax = useMemo(
    () => Math.max(...topMakesByRevenue.map(m => m.totalCost), 1),
    [topMakesByRevenue]
  );

  // ─── CHART: Seasonality by month (12 months, problems + revenue) ───
  const seasonalityByMonth = useMemo(() => {
    const now = new Date();
    const result: { label: string; problemCount: number; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = format(d, 'LLL yy', { locale: dateLocale });
      const problemCount = problems.filter(p => {
        const pd = new Date(p.createdAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      }).length;
      const revenue = solutions
        .filter(s => {
          const sd = new Date(s.createdAt);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear() && (s.cost || 0) > 0;
        })
        .reduce((sum, s) => sum + (s.cost || 0), 0);
      result.push({ label: monthLabel, problemCount, revenue });
    }
    return result;
  }, [problems, solutions, dateLocale]);

  const seasonalityProblemMax = useMemo(
    () => Math.max(...seasonalityByMonth.map(d => d.problemCount), 1),
    [seasonalityByMonth]
  );

  const seasonalityRevenueMax = useMemo(
    () => Math.max(...seasonalityByMonth.map(d => d.revenue), 1),
    [seasonalityByMonth]
  );

  // ─── CHART: Seasonality by body type (month × bodyType heatmap) ───
  const seasonalityByBodyType = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    const matrix = new Map<string, number[]>();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(format(d, 'LLL', { locale: dateLocale }));
      const monthIdx = 11 - i;

      problems.forEach(p => {
        const pd = new Date(p.createdAt);
        if (pd.getMonth() !== d.getMonth() || pd.getFullYear() !== d.getFullYear()) return;
        const car = carsById.get(p.carId);
        const bodyType = (car?.bodyType || '').trim() || t('stats.other');
        if (!matrix.has(bodyType)) matrix.set(bodyType, Array(12).fill(0));
        matrix.get(bodyType)![monthIdx]++;
      });
    }

    const data = Array.from(matrix.entries())
      .map(([bodyType, counts]) => ({
        bodyType,
        counts,
        total: counts.reduce((s, c) => s + c, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const maxVal = Math.max(...data.flatMap(d => d.counts), 1);
    return { months, data, maxVal };
  }, [problems, carsById, dateLocale, t]);

  // ─── CHART: Cumulative revenue from start of year ───
  const cumulativeRevenue = useMemo(() => {
    const now = new Date();
    const result: { label: string; cumulative: number; monthly: number }[] = [];
    let cumulative = 0;

    for (let m = 0; m <= now.getMonth(); m++) {
      const d = new Date(now.getFullYear(), m, 1);
      const monthLabel = format(d, 'LLL', { locale: dateLocale });
      const monthRevenue = solutions
        .filter(s => {
          const sd = new Date(s.createdAt);
          return sd.getFullYear() === now.getFullYear() && sd.getMonth() === m && (s.cost || 0) > 0;
        })
        .reduce((sum, s) => sum + (s.cost || 0), 0);
      cumulative += monthRevenue;
      result.push({ label: monthLabel, cumulative, monthly: monthRevenue });
    }
    return result;
  }, [solutions, dateLocale]);

  const cumulativeMax = useMemo(
    () => Math.max(...cumulativeRevenue.map(d => d.cumulative), 1),
    [cumulativeRevenue]
  );

  const cumulativeMonthlyMax = useMemo(
    () => Math.max(...cumulativeRevenue.map(d => d.monthly), 1),
    [cumulativeRevenue]
  );

  // ─── CHART: Total profit by weekday (absolute, not rate) ───
  const weekdayProfit = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ totalCost: 0, count: 0 }));
    solutions.forEach(s => {
      if ((s.cost || 0) > 0) {
        const dayIdx = getMondayBasedDay(new Date(s.createdAt));
        buckets[dayIdx].totalCost += s.cost || 0;
        buckets[dayIdx].count++;
      }
    });
    return buckets.map((b, i) => ({
      day: DAY_NAMES_SHORT[i],
      totalCost: b.totalCost,
      count: b.count,
    }));
  }, [solutions]);

  const weekdayProfitMax = useMemo(
    () => Math.max(...weekdayProfit.map(d => d.totalCost), 1),
    [weekdayProfit]
  );


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



  return (
    <div className="flex flex-col min-h-dvh max-w-lg mx-auto" style={{ background: 'var(--t-surface-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 safe-top glass border-b"
        style={{ background: 'color-mix(in srgb, var(--t-surface-card) 85%, transparent)', borderColor: 'var(--t-border-default)' }}
      >
        <div className="flex items-center justify-between px-3 py-3 gap-3">
          <button id="stats-back-btn" onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
            style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--t-text-primary)' }}>{t('stats.title')}</h1>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer"
              style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-secondary)' }}
            >
              <Download className="w-5 h-5" />
            </button>
            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl border shadow-xl z-50 py-1"
                style={{ background: 'var(--t-surface-card)', borderColor: 'var(--t-border-default)' }}
              >
                <button
                  onClick={() => { setShowExportMenu(false); handleExportCSV(); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--t-text-primary)' }}
                >
                  {t('stats.exportCsv')}
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); handleExportPDF(); }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer border-t hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ color: 'var(--t-text-primary)', borderColor: 'var(--t-border-subtle)' }}
                >
                  {t('stats.exportPdf')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 space-y-5">
        {/* ═══ FILTER BAR ═══ */}
        <FilterBar
          availableMakes={availableMakes}
          selectedMakes={selectedMakes}
          onChangeFilter={setSelectedMakes}
        />

        {/* ═══ KPI DASHBOARD ═══ */}
        <StatsDashboard
          totalRevenue={totalRevenue}
          prevRevenue={prevRevenue}
          avgCheck={avgCheck}
          prevAvgCheck={prevAvgCheck}
          requestCount={requestCount}
          prevRequestCount={prevRequestCount}
          avgRate={kpiAvgRate}
          prevAvgRate={kpiPrevAvgRate}
        />

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
            {t('stats.week')}
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
            {t('stats.month')}
          </button>
        </div>

        {/* ═══ CHART 1: CLIENT REQUESTS ═══ */}
         <ChartCard gradient="linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))">
          <PeriodNavigator title={t('stats.requestsTrend')} periodLabel={periodLabel} onPrev={navigatePrev} onNext={navigateNext} isCurrent={isCurrent} />

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
        </ChartCard>

        {/* ═══ CHART 2: FINANCES ═══ */}
         <ChartCard gradient="linear-gradient(90deg, #fef08a, #ca8a04)">
          <PeriodNavigator title={t('stats.financeStats')} periodLabel={periodLabel} onPrev={navigatePrev} onNext={navigateNext} isCurrent={isCurrent} />

          {/* Total */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="text-3xl font-bold" style={{ color: '#ca8a04' }}>{formatMoney(financeTotal, { round: true })}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>
              {viewMode === 'week' ? t('stats.perWeek') : t('stats.perMonth')}
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
        </ChartCard>

        {/* ═══ CHART 2b: FORECAST CHART ═══ */}
        <ForecastChart solutions={solutions} />

        {/* ═══ CHART 3: RATE (UAH/HR) + SOLUTIONS COUNT ═══ */}
         <ChartCard gradient="linear-gradient(90deg, #34d399, #059669)">
          <PeriodNavigator title={t('stats.hourlyRateSolutions')} periodLabel={periodLabel} onPrev={navigatePrev} onNext={navigateNext} isCurrent={isCurrent} />

          {/* Average rate */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5" style={{ color: '#059669' }} />
            <span className="text-3xl font-bold" style={{ color: '#059669' }}>
              {avgRate > 0 ? formatRate(avgRate) : '—'}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>
              {t('stats.avgRate')}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: '#34d399' }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.rate')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.5 }} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.solutions')}</span>
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
        </ChartCard>

        {/* ═══ CHART 4: COST VS TIME (Top 10) ═══ */}
        {costVsTimeData.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #c084fc, #7c3aed)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #7c3aed 15%, transparent)', color: '#7c3aed' }}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.costVsTime')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.last10Solutions')}</p>
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
                          {formatMoney(d.cost, { round: true })}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>
                          {d.hours}{t('common.hrs')}
                        </span>
                      </div>
                    </div>
                    {/* Rate badge */}
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: `color-mix(in srgb, ${rateColor} 15%, transparent)`, color: rateColor }}
                    >
                      {formatRate(d.rate, t('common.hrs'))}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ RESOLUTION TIME STATS ═══ */}
        {resolutionStats && (
           <ChartCard gradient="linear-gradient(90deg, var(--t-status-solution), var(--t-accent-gradient-to))">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-solution-bg)', color: 'var(--t-status-solution)' }}>
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.resolutionTime')}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Resolved count */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--t-status-solution)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{t('stats.solved')}</span>
                </div>
                <span className="text-xl font-bold" style={{ color: 'var(--t-text-primary)' }}>{resolutionStats.total}</span>
              </div>

              {/* Average */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--t-accent-primary)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{t('stats.average')}</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-text-primary)' }}>{formatResolutionTime(resolutionStats.avgMs)}</span>
              </div>

              {/* Min */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs" style={{ color: 'var(--t-status-solution)' }}>▼</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{t('stats.fastest')}</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-status-solution)' }}>{formatResolutionTime(resolutionStats.minMs)}</span>
              </div>

              {/* Max */}
              <div className="p-3.5 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs" style={{ color: 'var(--t-status-problem)' }}>▲</span>
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>{t('stats.longest')}</span>
                </div>
                <span className="text-base font-bold font-mono" style={{ color: 'var(--t-status-problem)' }}>{formatResolutionTime(resolutionStats.maxMs)}</span>
              </div>
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: DIFFICULTY VS RATE ═══ */}
        {difficultyVsRate.some(d => d.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #fb923c, #dc2626)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #dc2626 15%, transparent)', color: '#dc2626' }}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.difficultyVsRate')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.difficultyVsRateDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#fb923c' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.rateLegend', { cur: currencySymbol })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.4 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.solutionsCount')}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {difficultyVsRate.map((d, i) => {
                const barWidth = d.rate > 0 ? Math.max((d.rate / diffRateMax) * 100, 8) : 0;
                const isBest = d.rate === Math.max(...difficultyVsRate.filter(x => x.count > 0).map(x => x.rate)) && d.count > 0;
                const intensityColors = DIFFICULTY_COLORS;
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
                            {formatRate(d.rate, t('common.hrs'))}
                          </span>
                        )}
                        {d.count > 0 && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>
                            ~{formatMoney(d.avgCost, { round: true })}
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
                    {t('stats.bestDifficultyInsight', { level: String(bestLevel.level), rate: formatRate(bestLevel.rate), avgCost: formatMoney(bestLevel.avgCost, { round: true }) })}
                  </p>
                </div>
              );
            })()}
          </ChartCard>
        )}


        {/* ═══ CHART 5a: EFFICIENCY BY WEEKDAY ═══ */}
        {weekdayEfficiency.some(d => d.rate > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #f97316, #ea580c)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #f97316 15%, transparent)', color: '#f97316' }}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.weekdayEfficiency')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.weekdayEfficiencyDesc', { cur: currencySymbol })}</p>
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
                            {formatRate(d.rate, t('common.hrs'))}
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
          </ChartCard>
        )}

        {/* ═══ CHART: TOTAL PROFIT BY WEEKDAY ═══ */}
        {weekdayProfit.some(d => d.totalCost > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #22d3ee, #0891b2)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #0891b2 15%, transparent)', color: '#0891b2' }}>
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.weekdayProfit')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.weekdayProfitDesc')}</p>
              </div>
            </div>

            <div className="space-y-2">
              {weekdayProfit.map((d, i) => {
                const barWidth = d.totalCost > 0 ? Math.max((d.totalCost / weekdayProfitMax) * 100, 6) : 0;
                const isBest = d.totalCost === Math.max(...weekdayProfit.map(e => e.totalCost)) && d.totalCost > 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-6 shrink-0"
                      style={{ color: isBest ? '#0891b2' : 'var(--t-text-muted)' }}
                    >
                      {d.day}
                    </span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          minWidth: d.totalCost > 0 ? '50px' : '0',
                          background: isBest
                            ? 'linear-gradient(90deg, #67e8f9, #0891b2)'
                            : 'color-mix(in srgb, #0891b2 30%, transparent)',
                        }}
                      >
                        {d.totalCost > 0 && (
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: isBest ? '#fff' : '#0891b2' }}
                          >
                            {d.totalCost >= 1000
                              ? formatCompact(d.totalCost)
                              : formatMoney(d.totalCost, { round: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      {d.count > 0 ? `×${d.count}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Insight */}
            {(() => {
              const best = weekdayProfit.reduce((a, b) => b.totalCost > a.totalCost ? b : a);
              const withData = weekdayProfit.filter(d => d.totalCost > 0);
              const worst = withData.length > 0 ? withData.reduce((a, b) => b.totalCost < a.totalCost ? b : a) : best;
              if (best.totalCost <= 0) return null;
              return (
                <div className="mt-4 p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                    {t('stats.bestDayInsight', { day: best.day, total: formatMoney(best.totalCost, { round: true }) })}
                    {worst.day !== best.day && <>{t('stats.worstDayInsight', { day: worst.day, total: formatMoney(worst.totalCost, { round: true }) })}</>}
                  </p>
                </div>
              );
            })()}
          </ChartCard>
        )}

        {/* ═══ CHART 5c: COST DISTRIBUTION ═══ */}
        {costDistribution.some(d => d.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #60a5fa, #2563eb)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #2563eb 15%, transparent)', color: '#2563eb' }}>
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.costDistribution')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.costDistributionDesc')}</p>
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
          </ChartCard>
        )}

        {/* ═══ CHART 5d: WEEKLY TREND (avg check + count) ═══ */}
        {weeklyTrend.some(d => d.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #a78bfa, #6d28d9)">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #6d28d9 15%, transparent)', color: '#6d28d9' }}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.avgCheckTrend')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.avgCheckTrendDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#a78bfa' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.avgCheck')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.4 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.solutionsCount')}</span>
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
          </ChartCard>
        )}

        {/* ═══ CHART: CUMULATIVE REVENUE (YTD) ═══ */}
        {cumulativeRevenue.some(d => d.monthly > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #34d399, #059669)">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #059669 15%, transparent)', color: '#059669' }}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.cumulativeRevenueYear', { year: String(new Date().getFullYear()) })}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.cumulativeRevenueDesc')}</p>
              </div>
            </div>

            {/* Total YTD */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-bold" style={{ color: '#059669' }}>
                {cumulativeRevenue.length > 0 ? formatMoney(cumulativeRevenue[cumulativeRevenue.length - 1].cumulative, { round: true }) : formatMoney(0, { round: true })}
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.currencyPerYear')}</span>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#059669' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.cumulative')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.3 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.monthly')}</span>
              </div>
            </div>

            {/* SVG Line Chart */}
            {(() => {
              const W = 320;
              const H = 180;
              const padL = 40;
              const padR = 8;
              const padT = 12;
              const padB = 28;
              const plotW = W - padL - padR;
              const plotH = H - padT - padB;
              const n = cumulativeRevenue.length;
              if (n === 0) return null;

              const xStep = n > 1 ? plotW / (n - 1) : plotW;
              const barW = Math.min(plotW / n * 0.6, 20);

              const points = cumulativeRevenue.map((d, i) => {
                const x = padL + (n > 1 ? i * xStep : plotW / 2);
                const y = padT + plotH - (d.cumulative / cumulativeMax) * plotH;
                return { x, y };
              });
              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
              const areaPath = `${linePath} L${points[points.length - 1].x},${padT + plotH} L${points[0].x},${padT + plotH} Z`;

              return (
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: '100%' }}>
                  {/* Y grid */}
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = padT + (plotH / 4) * i;
                    const val = cumulativeMax - (cumulativeMax / 4) * i;
                    return (
                      <g key={`yg-${i}`}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--t-border-subtle)" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="7" fill="var(--t-text-muted)">
                          {val >= 1000 ? (val / 1000).toFixed(0) + 'k' : Math.round(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Monthly bars */}
                  {cumulativeRevenue.map((d, i) => {
                    const x = padL + (n > 1 ? i * xStep : plotW / 2);
                    const barH = d.monthly > 0 ? Math.max((d.monthly / cumulativeMonthlyMax) * (plotH * 0.4), 2) : 0;
                    return (
                      <rect
                        key={`bar-${i}`}
                        x={x - barW / 2}
                        y={padT + plotH - barH}
                        width={barW}
                        height={barH}
                        rx={2}
                        fill="var(--t-text-muted)"
                        fillOpacity="0.15"
                      />
                    );
                  })}

                  {/* Area fill */}
                  <path d={areaPath} fill="#059669" fillOpacity="0.1" />

                  {/* Line */}
                  <path d={linePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Dots */}
                  {points.map((p, i) => (
                    <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="#059669" stroke="var(--t-surface-card)" strokeWidth="1.5" />
                  ))}

                  {/* Last value label */}
                  {points.length > 0 && (
                    <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#059669">
                      {cumulativeRevenue[cumulativeRevenue.length - 1].cumulative >= 1000
                        ? (cumulativeRevenue[cumulativeRevenue.length - 1].cumulative / 1000).toFixed(1) + 'k'
                        : cumulativeRevenue[cumulativeRevenue.length - 1].cumulative}
                    </text>
                  )}

                  {/* X labels */}
                  {cumulativeRevenue.map((d, i) => {
                    const x = padL + (n > 1 ? i * xStep : plotW / 2);
                    const show = n <= 6 || i % 2 === 0 || i === n - 1;
                    if (!show) return null;
                    return (
                      <text key={`xl-${i}`} x={x} y={H - padB + 14} textAnchor="middle" fontSize="8" fill="var(--t-text-muted)" fontWeight="600">
                        {d.label}
                      </text>
                    );
                  })}
                </svg>
              );
            })()}
          </ChartCard>
        )}

        {/* ═══ CHART 5b: TOP CARS ═══ */}
        {topCars.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #fbbf24, #d97706)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #d97706 15%, transparent)', color: '#d97706' }}>
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.topCars')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.topCarsDesc')}</p>
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
                          {formatMoney(c.totalCost, { round: true })}
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
          </ChartCard>
        )}

        {/* ═══ CHART: TOP MAKES BY REVENUE ═══ */}
        {topMakesByRevenue.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #a78bfa, #4f46e5)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #4f46e5 15%, transparent)', color: '#4f46e5' }}>
                <CarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.topMakes')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.topMakesDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#4f46e5' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.revenueCurrency', { cur: currencySymbol })}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.visits')}</span>
              </div>
            </div>

            <div className="space-y-3">
              {topMakesByRevenue.map((m, i) => {
                const revenueWidth = m.totalCost > 0 ? Math.max((m.totalCost / topMakeRevenueMax) * 100, 8) : 0;
                const isFirst = i === 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate" style={{ color: 'var(--t-text-primary)' }}>
                        {m.make}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#d97706' }}>
                          {m.problemCount} {t('stats.visitsShort')}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, #34d399 15%, transparent)', color: '#059669' }}>
                          {m.solutionCount} {t('stats.solutionsShort')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-5 rounded overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${revenueWidth}%`,
                            background: isFirst
                              ? 'linear-gradient(90deg, #a78bfa, #4f46e5)'
                              : 'color-mix(in srgb, #4f46e5 40%, transparent)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold font-mono w-16 text-right shrink-0" style={{ color: isFirst ? '#4f46e5' : 'var(--t-text-secondary)' }}>
                        {m.totalCost >= 1000
                          ? formatCompact(m.totalCost)
                          : formatMoney(m.totalCost, { round: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: PROFITABILITY BY MAKE ═══ */}
        {makeProfitability.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #38bdf8, #0284c7)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #0284c7 15%, transparent)', color: '#0284c7' }}>
                <CarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.makeProfitability')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.makeProfitabilityDesc', { cur: currencySymbol })}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#0284c7' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.avgCheck')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#34d399' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.rateLegend', { cur: currencySymbol })}</span>
              </div>
            </div>

            <div className="space-y-3">
              {makeProfitability.map((m, i) => {
                const avgWidth = m.avgCheck > 0 ? Math.max((m.avgCheck / makeAvgCheckMax) * 100, 8) : 0;
                const rateWidth = m.rate > 0 ? Math.max((m.rate / makeRateMax) * 100, 8) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate" style={{ color: 'var(--t-text-primary)' }}>
                        {m.make}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--t-text-muted)' }}>×{m.count}</span>
                    </div>
                    {/* Avg check bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${avgWidth}%`,
                            background: 'linear-gradient(90deg, #7dd3fc, #0284c7)',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold font-mono w-16 text-right shrink-0" style={{ color: '#0284c7' }}>
                        {formatMoney(m.avgCheck, { round: true })}
                      </span>
                    </div>
                    {/* Rate bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{
                            width: `${rateWidth}%`,
                            background: m.rate > 0 ? 'linear-gradient(90deg, #6ee7b7, #059669)' : 'transparent',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold font-mono w-16 text-right shrink-0" style={{ color: '#059669' }}>
                        {m.rate > 0 ? formatRate(m.rate, t('common.hrs')) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: MILEAGE BUCKETS ═══ */}
        {mileageBuckets.some(b => b.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #fcd34d, #b45309)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #b45309 15%, transparent)', color: '#b45309' }}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.mileageVsAvgCheck')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.mileageVsAvgCheckDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#b45309' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.visitsCount')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: 'var(--t-text-muted)', opacity: 0.5 }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.avgCheck')}</span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2" style={{ height: '160px' }}>
              {mileageBuckets.map((b, i) => {
                const countH = b.count > 0 ? Math.max((b.count / mileageBucketCountMax) * 100, 6) : 4;
                const avgH = b.avgCheck > 0 ? Math.max((b.avgCheck / mileageBucketAvgMax) * 50, 4) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[9px] font-bold tabular-nums" style={{ color: b.count > 0 ? '#b45309' : 'var(--t-text-muted)' }}>
                      {b.count}
                    </span>
                    {b.avgCheck > 0 && (
                      <div
                        className="w-2 rounded-t"
                        style={{
                          height: `${avgH}px`,
                          background: 'var(--t-text-muted)',
                          opacity: 0.4,
                        }}
                      />
                    )}
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${countH}%`,
                        background: b.count > 0
                          ? 'linear-gradient(to top, #fcd34d, #b45309)'
                          : 'var(--t-surface-elevated)',
                      }}
                    />
                    <span className="text-[10px] font-semibold mt-1" style={{ color: 'var(--t-text-muted)' }}>
                      {b.label}
                    </span>
                    <span className="text-[8px] font-mono" style={{ color: 'var(--t-text-muted)', opacity: 0.7 }}>
                      {b.avgCheck > 0 ? `~${formatMoney(b.avgCheck, { round: true })}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Insight */}
            {(() => {
              const best = mileageBuckets.reduce((a, b) => b.avgCheck > a.avgCheck ? b : a);
              if (best.avgCheck <= 0) return null;
              return (
                <div className="mt-4 p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                    {t('stats.bestMileageInsight', { range: best.label, amount: formatMoney(best.avgCheck, { round: true }) })}
                  </p>
                </div>
              );
            })()}
          </ChartCard>
        )}

        {/* ═══ CHART: INTERVAL BETWEEN VISITS (mileageDiff) ═══ */}
        {mileageDiffBuckets.some(b => b.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #4ade80, #15803d)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #15803d 15%, transparent)', color: '#15803d' }}>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.visitInterval')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.visitIntervalDesc')}</p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3" style={{ height: '140px' }}>
              {mileageDiffBuckets.map((b, i) => {
                const h = b.count > 0 ? Math.max((b.count / mileageDiffMax) * 100, 8) : 4;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-xs font-bold tabular-nums" style={{ color: b.count > 0 ? '#15803d' : 'var(--t-text-muted)' }}>
                      {b.count}
                    </span>
                    <div
                      className="w-full rounded-t-lg transition-all duration-300"
                      style={{
                        height: `${h}%`,
                        background: b.count > 0
                          ? 'linear-gradient(to top, #4ade80, #15803d)'
                          : 'var(--t-surface-elevated)',
                      }}
                    />
                    <span className="text-[10px] font-semibold mt-1" style={{ color: 'var(--t-text-muted)' }}>
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: HEATMAP DAY × HOUR ═══ */}
        {heatmapData.total > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #f472b6, #be185d)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #be185d 15%, transparent)', color: '#be185d' }}>
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.heatmap')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.heatmapDesc')}</p>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 px-2">
              <div className="inline-block min-w-full">
                {/* Hour scale */}
                <div className="flex items-center gap-px mb-1 pl-6">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="flex-1 text-center" style={{ minWidth: '10px' }}>
                      {h % 6 === 0 && (
                        <span className="text-[8px] font-mono" style={{ color: 'var(--t-text-muted)' }}>{h}</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Grid */}
                {heatmapData.grid.map((row, d) => (
                  <div key={d} className="flex items-center gap-px mb-px">
                    <span className="w-5 text-[9px] font-bold shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                      {DAY_NAMES_SHORT[d]}
                    </span>
                    <div className="flex items-center gap-px flex-1">
                      {row.map((val, h) => {
                        const intensity = val / heatmapData.max;
                        const isPeak = d === heatmapData.peakDay && h === heatmapData.peakHour && val > 0;
                        return (
                          <div
                            key={h}
                            className="flex-1 aspect-square rounded-sm transition-all"
                            style={{
                              minWidth: '10px',
                              background: val === 0
                                ? 'var(--t-surface-elevated)'
                                : `color-mix(in srgb, #be185d ${Math.max(15, intensity * 100)}%, transparent)`,
                              outline: isPeak ? '1.5px solid #f472b6' : 'none',
                              outlineOffset: '-1px',
                            }}
                            title={t('stats.heatmapTooltip', { day: DAY_NAMES_SHORT[d], hour: String(h), count: String(val) })}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {heatmapData.peakVal > 0 && (
              <div className="mt-4 p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  {t('stats.heatmapPeak', { day: DAY_NAMES_SHORT[heatmapData.peakDay], hour: String(heatmapData.peakHour), count: String(heatmapData.peakVal) })}
                </p>
              </div>
            )}
          </ChartCard>
        )}

        {/* ═══ CHART: AGING OF OPEN PROBLEMS ═══ */}
        {agingBuckets.some(b => b.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #fca5a5, #b91c1c)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #b91c1c 15%, transparent)', color: '#b91c1c' }}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.agingProblems')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.agingProblemsDesc')}</p>
              </div>
            </div>

            <div className="space-y-2">
              {agingBuckets.map((b, i) => {
                const w = b.count > 0 ? Math.max((b.count / agingMax) * 100, 8) : 0;
                const palette = ['#fcd34d', '#fb923c', '#f87171', '#ef4444', '#b91c1c'];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-semibold w-16 shrink-0" style={{ color: 'var(--t-text-muted)' }}>
                      {b.label}
                    </span>
                    <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${w}%`,
                          minWidth: b.count > 0 ? '32px' : '0',
                          background: b.count > 0
                            ? `linear-gradient(90deg, color-mix(in srgb, ${palette[i]} 60%, transparent), ${palette[i]})`
                            : 'transparent',
                        }}
                      >
                        {b.count > 0 && (
                          <span className="text-[11px] font-bold" style={{ color: '#fff' }}>
                            {b.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {agingStale > 0 && (
              <div className="mt-4 p-3 rounded-xl border" style={{ background: 'color-mix(in srgb, #b91c1c 8%, transparent)', borderColor: 'color-mix(in srgb, #b91c1c 25%, transparent)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                  {t('stats.agingStaleAlert', { count: String(agingStale), problems: formatProblemsCount(agingStale), open: pluralOpen(agingStale) })}
                </p>
              </div>
            )}
          </ChartCard>
        )}

        {/* ═══ CHART: DIFFICULTY DISTRIBUTION (DONUT) ═══ */}
        {difficultyDistribution.total > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #fde68a, #f97316)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #f97316 15%, transparent)', color: '#f97316' }}>
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.difficultyDist')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.difficultyDistDesc')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Donut SVG */}
              {(() => {
                const colors = DIFFICULTY_COLORS;
                const size = 140;
                const radius = 56;
                const stroke = 22;
                const cx = size / 2;
                const cy = size / 2;
                const circ = 2 * Math.PI * radius;
                let offset = 0;
                const segments = difficultyDistribution.counts.map((count, i) => {
                  if (count === 0 || difficultyDistribution.total === 0) return null;
                  const pct = count / difficultyDistribution.total;
                  const dash = pct * circ;
                  const rot = (offset / circ) * 360 - 90;
                  offset += dash;
                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill="none"
                      stroke={colors[i]}
                      strokeWidth={stroke}
                      strokeDasharray={`${dash} ${circ - dash}`}
                      transform={`rotate(${rot} ${cx} ${cy})`}
                    />
                  );
                });
                return (
                  <svg width={size} height={size} className="shrink-0">
                    <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--t-surface-elevated)" strokeWidth={stroke} />
                    {segments}
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="bold" fill="var(--t-text-primary)">
                      {difficultyDistribution.total}
                    </text>
                    <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="var(--t-text-muted)">
                      {t('stats.solutions')}
                    </text>
                  </svg>
                );
              })()}

              {/* Legend */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {difficultyDistribution.counts.map((count, i) => {
                  const colors = DIFFICULTY_COLORS;
                  const pct = difficultyDistribution.total > 0 ? (count / difficultyDistribution.total) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded shrink-0" style={{ background: colors[i] }} />
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--t-text-secondary)' }}>
                        {t('stats.level', { level: String(i + 1) })}
                      </span>
                      <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--t-text-muted)' }}>
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: DIFFICULTY × AVG TIME ═══ */}
        {difficultyVsTime.some(d => d.count > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #c4b5fd, #5b21b6)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #5b21b6 15%, transparent)', color: '#5b21b6' }}>
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.difficultyVsTime')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.difficultyVsTimeDesc')}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {difficultyVsTime.map((d, i) => {
                const w = d.avgHours > 0 ? Math.max((d.avgHours / difficultyHoursMax) * 100, 8) : 0;
                const intensityColors = ['#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#5b21b6'];
                return (
                  <div key={i} className="flex items-center gap-2.5">
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
                    <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div
                        className="h-full rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                        style={{
                          width: `${w}%`,
                          minWidth: d.avgHours > 0 ? '50px' : '0',
                          background: d.avgHours > 0
                            ? `linear-gradient(90deg, color-mix(in srgb, ${intensityColors[i]} 50%, transparent), ${intensityColors[i]})`
                            : 'transparent',
                        }}
                      >
                        {d.avgHours > 0 && (
                          <span className="text-[10px] font-bold" style={{ color: i >= 3 ? '#fff' : '#5b21b6' }}>
                            {d.avgHours.toFixed(1)}{t('common.hrs')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      {d.count > 0 ? `×${d.count}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: DIFFICULTY × MAKE (STACKED) ═══ */}
        {difficultyByMake.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #fdba74, #c2410c)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #c2410c 15%, transparent)', color: '#c2410c' }}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.difficultyByMake')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.difficultyByMakeDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              {[1, 2, 3, 4, 5].map(lv => {
                const colors = DIFFICULTY_COLORS;
                return (
                  <div key={lv} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{ background: colors[lv - 1] }} />
                    <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.levelShort', { level: String(lv) })}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              {difficultyByMake.map((m, i) => {
                const colors = DIFFICULTY_COLORS;
                const totalWidth = Math.max((m.total / difficultyByMakeTotalMax) * 100, 12);
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="text-xs font-bold w-16 shrink-0 truncate" style={{ color: 'var(--t-text-primary)' }}>
                      {m.make}
                    </span>
                    <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                      <div className="h-full flex rounded-lg overflow-hidden" style={{ width: `${totalWidth}%` }}>
                        {m.counts.map((c, idx) => {
                          if (c === 0) return null;
                          const segPct = (c / m.total) * 100;
                          return (
                            <div
                              key={idx}
                              className="h-full flex items-center justify-center"
                              style={{ width: `${segPct}%`, background: colors[idx] }}
                              title={`${t('stats.level', { level: String(idx + 1) })}: ${c}`}
                            >
                              {segPct > 15 && (
                                <span className="text-[9px] font-bold" style={{ color: idx >= 3 ? '#fff' : '#7c2d12' }}>
                                  {c}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono w-8 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      ×{m.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: FUNNEL ═══ */}
        {funnelData[0].value > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #60a5fa, #34d399)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #2563eb 15%, transparent)', color: '#2563eb' }}>
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.serviceFunnel')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.serviceFunnelDesc')}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {funnelData.map((step, i) => {
                const maxVal = funnelData[0].value || 1;
                const w = Math.max((step.value / maxVal) * 100, 12);
                const prevVal = i > 0 ? funnelData[i - 1].value : 0;
                const conversion = i > 0 && prevVal > 0 ? (step.value / prevVal) * 100 : null;
                const fromTotal = funnelData[0].value > 0 ? (step.value / funnelData[0].value) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold w-20 shrink-0" style={{ color: 'var(--t-text-primary)' }}>
                        {step.label}
                      </span>
                      <div className="flex-1 h-10 rounded-lg overflow-hidden" style={{ background: 'var(--t-surface-elevated)' }}>
                        <div
                          className="h-full rounded-lg flex items-center justify-between px-3 transition-all duration-500"
                          style={{
                            width: `${w}%`,
                            minWidth: '60px',
                            background: `linear-gradient(90deg, ${step.color}, ${step.colorTo})`,
                          }}
                        >
                          <span className="text-sm font-bold" style={{ color: '#fff' }}>
                            {step.value}
                          </span>
                          <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {fromTotal.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    {conversion !== null && (
                      <div className="flex justify-center mt-1 mb-0.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{
                            background: conversion >= 70 ? 'color-mix(in srgb, #34d399 15%, transparent)' : 'color-mix(in srgb, #f87171 15%, transparent)',
                            color: conversion >= 70 ? '#059669' : '#dc2626',
                          }}
                        >
                          ↓ {conversion.toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ChartCard>
        )}

        {/* ═══ CHART: BUBBLE — COST × HOURS × DIFFICULTY × MAKE ═══ */}
        {bubbleData.points.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #22d3ee, #8b5cf6)">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6' }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.bubbleChart')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.bubbleChartDesc')}</p>
              </div>
            </div>

            {/* Bubble chart SVG */}
            {(() => {
              const W = 320;
              const H = 220;
              const padL = 36;
              const padR = 8;
              const padT = 8;
              const padB = 24;
              const plotW = W - padL - padR;
              const plotH = H - padT - padB;
              // Add headroom so largest bubbles don't clip the plot bounds
              const xMax = bubbleData.maxHours * 1.15;
              const yMax = bubbleData.maxCost * 1.15;
              const xScale = (x: number) => padL + (x / xMax) * plotW;
              const yScale = (y: number) => padT + plotH - (y / yMax) * plotH;
              const rScale = (diff: number) => 3 + diff * 2;

              const yTicks = 4;
              const xTicks = 4;

              return (
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: '100%' }}>
                  {/* Grid */}
                  {Array.from({ length: yTicks + 1 }, (_, i) => {
                    const y = padT + (plotH / yTicks) * i;
                    const val = yMax - (yMax / yTicks) * i;
                    return (
                      <g key={`yt-${i}`}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--t-border-subtle)" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="8" fill="var(--t-text-muted)">
                          {val >= 1000 ? (val / 1000).toFixed(1) + 'k' : Math.round(val)}
                        </text>
                      </g>
                    );
                  })}
                  {Array.from({ length: xTicks + 1 }, (_, i) => {
                    const x = padL + (plotW / xTicks) * i;
                    const val = (xMax / xTicks) * i;
                    return (
                      <g key={`xt-${i}`}>
                        <text x={x} y={H - padB + 12} textAnchor="middle" fontSize="8" fill="var(--t-text-muted)">
                          {val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Axes labels */}
                  <text x={padL} y={padT - 1} fontSize="8" fill="var(--t-text-muted)" fontWeight="600">{currencySymbol}</text>
                  <text x={W - padR} y={H - padB + 12} textAnchor="end" fontSize="8" fill="var(--t-text-muted)" fontWeight="600">{t('stats.hoursAxis')}</text>

                  {/* Points */}
                  {bubbleData.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={xScale(p.hours)}
                      cy={yScale(p.cost)}
                      r={rScale(p.difficulty)}
                      fill={p.color}
                      fillOpacity="0.55"
                      stroke={p.color}
                      strokeWidth="1"
                    >
                      <title>{`${p.make} — ${formatMoney(p.cost, { round: true })} / ${p.hours}${t('common.hrs')} / ${t('stats.levelShort', { level: String(p.difficulty) })}`}</title>
                    </circle>
                  ))}
                </svg>
              );
            })()}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-3">
              {bubbleData.legend.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: l.color, opacity: 0.7 }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--t-text-secondary)' }}>{l.make}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* ═══ MONTHLY OVERVIEW (existing) ═══ */}
         <ChartCard gradient="linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-via), var(--t-accent-gradient-to))">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-accent-primary-muted)', color: 'var(--t-text-accent)' }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.byMonthsVisits')}</h3>
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
        </ChartCard>

        {/* ═══ CHART: SEASONALITY BY MONTH (12 MONTHS) ═══ */}
        {seasonalityByMonth.some(d => d.problemCount > 0 || d.revenue > 0) && (
           <ChartCard gradient="linear-gradient(90deg, #f472b6, #7c3aed)">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #7c3aed 15%, transparent)', color: '#7c3aed' }}>
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.seasonality')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.seasonalityDesc')}</p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#7c3aed' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.visits')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ background: '#f59e0b' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.revenue')}</span>
              </div>
            </div>

            {/* SVG Combo Chart */}
            {(() => {
              const W = 320;
              const H = 200;
              const padL = 32;
              const padR = 36;
              const padT = 12;
              const padB = 28;
              const plotW = W - padL - padR;
              const plotH = H - padT - padB;
              const n = seasonalityByMonth.length;
              const barW = Math.min(plotW / n * 0.55, 16);

              return (
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: '100%' }}>
                  {/* Y grid (problems, left axis) */}
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = padT + (plotH / 4) * i;
                    const val = seasonalityProblemMax - (seasonalityProblemMax / 4) * i;
                    return (
                      <g key={`yg-${i}`}>
                        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--t-border-subtle)" strokeWidth="0.5" strokeDasharray="2 2" />
                        <text x={padL - 4} y={y + 3} textAnchor="end" fontSize="7" fill="#7c3aed">
                          {Math.round(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Right Y axis labels (revenue) */}
                  {Array.from({ length: 5 }, (_, i) => {
                    const y = padT + (plotH / 4) * i;
                    const val = seasonalityRevenueMax - (seasonalityRevenueMax / 4) * i;
                    return (
                      <text key={`yr-${i}`} x={W - padR + 4} y={y + 3} textAnchor="start" fontSize="7" fill="#d97706">
                        {val >= 1000 ? (val / 1000).toFixed(0) + 'k' : Math.round(val)}
                      </text>
                    );
                  })}

                  {/* Problem bars */}
                  {seasonalityByMonth.map((d, i) => {
                    const x = padL + (plotW / n) * (i + 0.5);
                    const barH = d.problemCount > 0 ? Math.max((d.problemCount / seasonalityProblemMax) * plotH, 3) : 0;
                    return (
                      <rect
                        key={`pb-${i}`}
                        x={x - barW / 2}
                        y={padT + plotH - barH}
                        width={barW}
                        height={barH}
                        rx={2}
                        fill={i === n - 1 ? '#7c3aed' : 'color-mix(in srgb, #7c3aed 40%, transparent)'}
                      />
                    );
                  })}

                  {/* Revenue line */}
                  {(() => {
                    const pts = seasonalityByMonth.map((d, i) => {
                      const x = padL + (plotW / n) * (i + 0.5);
                      const y = d.revenue > 0 ? padT + plotH - (d.revenue / seasonalityRevenueMax) * plotH : padT + plotH;
                      return { x, y };
                    });
                    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                    return (
                      <>
                        <path d={path} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => seasonalityByMonth[i].revenue > 0 ? (
                          <circle key={`rd-${i}`} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 2} fill="#f59e0b" stroke="var(--t-surface-card)" strokeWidth="1" />
                        ) : null)}
                      </>
                    );
                  })()}

                  {/* X labels */}
                  {seasonalityByMonth.map((d, i) => {
                    const x = padL + (plotW / n) * (i + 0.5);
                    const show = n <= 6 || i % 2 === 0 || i === n - 1;
                    if (!show) return null;
                    return (
                      <text key={`xl-${i}`} x={x} y={H - padB + 14} textAnchor="middle" fontSize="7" fill="var(--t-text-muted)">
                        {d.label}
                      </text>
                    );
                  })}
                </svg>
              );
            })()}

            {/* Insight */}
            {(() => {
              const bestMonth = seasonalityByMonth.reduce((a, b) => b.revenue > a.revenue ? b : a);
              const withData = seasonalityByMonth.filter(d => d.revenue > 0);
              const worstMonth = withData.length > 0 ? withData.reduce((a, b) => b.revenue < a.revenue ? b : a) : bestMonth;
              if (bestMonth.revenue <= 0) return null;
              return (
                <div className="mt-4 p-3 rounded-xl border" style={{ background: 'var(--t-surface-input)', borderColor: 'var(--t-border-subtle)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--t-text-secondary)' }}>
                    {t('stats.peakRevenueInsight', { month: bestMonth.label, rev: formatMoney(bestMonth.revenue, { round: true }) })}
                    {worstMonth.label !== bestMonth.label && <>{t('stats.minRevenueInsight', { month: worstMonth.label, rev: formatMoney(worstMonth.revenue, { round: true }) })}</>}
                  </p>
                </div>
              );
            })()}
          </ChartCard>
        )}

        {/* ═══ CHART: SEASONALITY BY BODY TYPE ═══ */}
        {seasonalityByBodyType.data.length > 0 && (
           <ChartCard gradient="linear-gradient(90deg, #fb923c, #dc2626)">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #dc2626 15%, transparent)', color: '#dc2626' }}>
                <CarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.seasonalityBodyTypes')}</h3>
                <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.seasonalityBodyTypesDesc')}</p>
              </div>
            </div>

            <div className="overflow-x-auto -mx-2 px-2">
              <div className="inline-block min-w-full">
                {/* Month headers */}
                <div className="flex items-center gap-px mb-1 pl-16">
                  {seasonalityByBodyType.months.map((m, i) => (
                    <div key={i} className="flex-1 text-center" style={{ minWidth: '18px' }}>
                      {i % 2 === 0 && (
                        <span className="text-[7px] font-semibold capitalize" style={{ color: 'var(--t-text-muted)' }}>{m}</span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {seasonalityByBodyType.data.map((bt, di) => (
                  <div key={di} className="flex items-center gap-px mb-px">
                    <span className="w-14 text-[9px] font-bold shrink-0 truncate pr-1" style={{ color: 'var(--t-text-muted)' }}>
                      {bt.bodyType}
                    </span>
                    <div className="flex items-center gap-px flex-1">
                      {bt.counts.map((val, mi) => {
                        const intensity = val / seasonalityByBodyType.maxVal;
                        return (
                          <div
                            key={mi}
                            className="flex-1 rounded-sm transition-all flex items-center justify-center"
                            style={{
                              minWidth: '18px',
                              height: '20px',
                              background: val === 0
                                ? 'var(--t-surface-elevated)'
                                : `color-mix(in srgb, #dc2626 ${Math.max(15, intensity * 100)}%, transparent)`,
                            }}
                            title={`${bt.bodyType} × ${seasonalityByBodyType.months[mi]} — ${val}`}
                          >
                            {val > 0 && (
                              <span className="text-[8px] font-bold" style={{ color: intensity > 0.5 ? '#fff' : '#dc2626' }}>
                                {val}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <span className="text-[9px] font-mono w-6 shrink-0 text-right" style={{ color: 'var(--t-text-muted)' }}>
                      {bt.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        )}

        {/* Summary card */}
         <ChartCard gradient="linear-gradient(90deg, var(--t-status-problem), var(--t-status-solution))">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--t-status-problem-bg)', color: 'var(--t-status-problem)' }}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.generalStats')}</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-text-primary)' }}>
                {problems.length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>{t('stats.totalVisits')}</div>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-status-problem)' }}>
                {problems.filter(p => !p.linkedSolutionId).length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>{t('stats.openVisits')}</div>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'var(--t-surface-input)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--t-status-solution)' }}>
                {problems.filter(p => p.linkedSolutionId).length}
              </div>
              <div className="text-xs font-medium mt-1" style={{ color: 'var(--t-text-muted)' }}>{t('stats.resolvedVisits')}</div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
