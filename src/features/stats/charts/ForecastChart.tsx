import { useMemo } from 'react';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { linearRegression } from '@shared/lib/math';
import { ChartCard } from '../components/ChartCard';
import { Sparkles } from '@shared/icons/Icons';
import { useLanguage } from '@shared/i18n';

interface ForecastChartProps {
  solutions: { createdAt: string; cost?: number }[];
}

export function ForecastChart({ solutions }: ForecastChartProps) {
  const { t, dateLocale } = useLanguage();
  const { actual, forecast, maxVal } = useMemo(() => {
    const now = new Date();
    const historyWeeks = 8;
    const forecastWeeks = 3;

    // Build actual weekly revenue
    const actual: { label: string; value: number }[] = [];
    const regressionPoints: [number, number][] = [];

    for (let i = historyWeeks - 1; i >= 0; i--) {
      const ws = startOfWeek(addWeeks(now, -i), { weekStartsOn: 1 });
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      const weekRevenue = solutions
        .filter(s => {
          const d = new Date(s.createdAt);
          return d >= ws && d <= we && (s.cost || 0) > 0;
        })
        .reduce((sum, s) => sum + (s.cost || 0), 0);

      actual.push({
        label: format(ws, 'd.MM', { locale: dateLocale }),
        value: weekRevenue,
      });
      regressionPoints.push([historyWeeks - 1 - i, weekRevenue]);
    }

    // Calculate forecast via linear regression
    const { slope, intercept } = linearRegression(regressionPoints);

    const forecast: { label: string; value: number }[] = [];
    for (let i = 1; i <= forecastWeeks; i++) {
      const ws = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const predicted = Math.max(0, Math.round(slope * (historyWeeks - 1 + i) + intercept));
      forecast.push({
        label: format(ws, 'd.MM', { locale: dateLocale }),
        value: predicted,
      });
    }

    const allValues = [...actual.map(a => a.value), ...forecast.map(f => f.value)];
    const maxVal = Math.max(...allValues, 1);

    return { actual, forecast, maxVal };
  }, [solutions, dateLocale]);

  const allBars = [...actual, ...forecast];
  const actualCount = actual.length;

  return (
    <ChartCard gradient="linear-gradient(90deg, var(--t-accent-gradient-from), var(--t-accent-gradient-to))">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--t-accent-primary) 15%, transparent)', color: 'var(--t-accent-primary)' }}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--t-text-primary)' }}>{t('stats.revenueForecast')}</h3>
          <p className="text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>{t('stats.linearRegression')}</p>
        </div>
      </div>
      <div className="flex items-end gap-1 h-28">
        {allBars.map((bar, idx) => {
          const isForecast = idx >= actualCount;
          const heightPct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[9px] font-mono font-bold" style={{ color: 'var(--t-text-muted)' }}>
                {bar.value > 0 ? `${(bar.value / 1000).toFixed(1)}k` : ''}
              </span>
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${Math.max(heightPct, 2)}%`,
                  background: isForecast ? 'transparent' : 'var(--t-accent-primary)',
                  border: isForecast ? '2px dashed var(--t-accent-primary)' : 'none',
                  opacity: isForecast ? 0.6 : 1,
                }}
              />
              <span className="text-[8px] font-medium truncate w-full text-center" style={{ color: 'var(--t-text-muted)' }}>
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
      {forecast.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'var(--t-text-muted)' }}>
          <Sparkles className="w-3 h-3" style={{ color: 'var(--t-accent-primary)' }} />
          {t('stats.linearRegression')}
        </div>
      )}
    </ChartCard>
  );
}
