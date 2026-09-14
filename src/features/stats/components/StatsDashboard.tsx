import { TrendingUp, DollarSign, AlertCircle, Clock } from '@shared/icons/Icons';
import { useLanguage } from '@shared/i18n';
import { useCurrency } from '@shared/context/CurrencyContext';

interface KPI {
  label: string;
  value: string;
  delta: number | null; // percentage change vs previous period
  icon: React.ReactNode;
  accent: string;
}

interface StatsDashboardProps {
  totalRevenue: number;
  prevRevenue: number;
  avgCheck: number;
  prevAvgCheck: number;
  requestCount: number;
  prevRequestCount: number;
  avgRate: number;
  prevAvgRate: number;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(0);
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function StatsDashboard({
  totalRevenue, prevRevenue,
  avgCheck, prevAvgCheck,
  requestCount, prevRequestCount,
  avgRate, prevAvgRate,
}: StatsDashboardProps) {
  const { t } = useLanguage();
  const { currency } = useCurrency();

  const formatWithCurrency = (n: number) => {
    const formatted = formatNum(n);
    switch (currency) {
      case 'USD': return `$${formatted}`;
      case 'EUR': return `€${formatted}`;
      case 'UAH': default: return `${formatted} ₴`;
    }
  };

  const formatRateWithCurrency = (n: number) => {
    const formatted = formatNum(n);
    switch (currency) {
      case 'USD': return `$${formatted}/${t('common.hrs')}`;
      case 'EUR': return `€${formatted}/${t('common.hrs')}`;
      case 'UAH': default: return `${formatted} ₴/${t('common.hrs')}`;
    }
  };

  const kpis: KPI[] = [
    {
      label: t('stats.revenue'),
      value: formatWithCurrency(totalRevenue),
      delta: calcDelta(totalRevenue, prevRevenue),
      icon: <DollarSign className="w-4 h-4" />,
      accent: 'var(--t-status-solution)',
    },
    {
      label: t('stats.avgCheck'),
      value: formatWithCurrency(avgCheck),
      delta: calcDelta(avgCheck, prevAvgCheck),
      icon: <TrendingUp className="w-4 h-4" />,
      accent: 'var(--t-accent-primary)',
    },
    {
      label: t('stats.visits'),
      value: String(requestCount),
      delta: calcDelta(requestCount, prevRequestCount),
      icon: <AlertCircle className="w-4 h-4" />,
      accent: 'var(--t-status-problem)',
    },
    {
      label: t('stats.rate'),
      value: formatRateWithCurrency(avgRate),
      delta: calcDelta(avgRate, prevAvgRate),
      icon: <Clock className="w-4 h-4" />,
      accent: 'var(--t-status-mileage)',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 mb-5">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="p-3.5 rounded-2xl border transition-all"
          style={{
            background: 'var(--t-surface-card)',
            borderColor: 'var(--t-border-subtle)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in srgb, ${kpi.accent} 14%, transparent)`, color: kpi.accent }}
            >
              {kpi.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-muted)' }}>
              {kpi.label}
            </span>
          </div>
          <div className="text-xl font-bold font-mono" style={{ color: 'var(--t-text-primary)' }}>
            {kpi.value}
          </div>
          {kpi.delta !== null && (
            <div
              className="text-xs font-bold font-mono mt-1 flex items-center gap-1"
              style={{ color: kpi.delta >= 0 ? 'var(--t-status-solution)' : 'var(--t-status-problem)' }}
            >
              {kpi.delta >= 0 ? '↑' : '↓'} {Math.abs(kpi.delta).toFixed(1)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
