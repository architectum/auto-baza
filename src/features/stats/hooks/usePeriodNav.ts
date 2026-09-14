import { useState, useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { useLanguage } from '@shared/i18n';

export function usePeriodNav() {
  const { t, dateLocale } = useLanguage();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

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

  const navigatePrev = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev - 1);
    } else {
      setMonthOffset(prev => prev - 1);
    }
  };

  const navigateNext = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev + 1);
    } else {
      setMonthOffset(prev => prev + 1);
    }
  };

  const resetOffset = () => {
    if (viewMode === 'week') {
      setWeekOffset(0);
    } else {
      setMonthOffset(0);
    }
  };

  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd MMM', { locale: dateLocale });
    const end = format(currentWeekEnd, 'd MMM yyyy', { locale: dateLocale });
    return `${start} — ${end}`;
  }, [currentWeekStart, currentWeekEnd, dateLocale]);

  const monthLabel = useMemo(() => {
    return format(currentMonthStart, 'LLLL yyyy', { locale: dateLocale });
  }, [currentMonthStart, dateLocale]);

  const periodLabel = viewMode === 'week' ? weekLabel : monthLabel;
  const periodTotal = viewMode === 'week' ? t('stats.visitsPerWeek') : t('stats.visitsPerMonth');
  const isCurrent = viewMode === 'week' ? isCurrentWeek : isCurrentMonth;

  return {
    viewMode,
    setViewMode,
    weekOffset,
    monthOffset,
    currentWeekStart,
    currentWeekEnd,
    currentMonthStart,
    currentMonthEnd,
    periodDays,
    isCurrentWeek,
    isCurrentMonth,
    navigatePrev,
    navigateNext,
    resetOffset,
    periodLabel,
    periodTotal,
    isCurrent,
  };
}
