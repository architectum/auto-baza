import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { HistoryEntry } from '@types';
import { robotoRegularBase64, robotoBoldBase64 } from './pdfFonts';

export interface ExportPdfOptions {
  viewMode: 'week' | 'month';
  periodLabel: string;
  selectedMakes: string[];
  carsById: Map<string, any>;
  filteredHistory: HistoryEntry[];
  problems: HistoryEntry[];
  solutions: HistoryEntry[];
  totalRevenue: number;
  prevRevenue: number;
  avgCheck: number;
  prevAvgCheck: number;
  requestCount: number;
  prevRequestCount: number;
  kpiAvgRate: number;
  kpiPrevAvgRate: number;
  requestsData: { day: Date; count: number }[];
  requestsMax: number;
  financeData: { day: Date; totalCost: number }[];
  financeMax: number;
  costVsTimeData: { cost: number; hours: number; rate: number; date: string }[];
  resolutionStats: { total: number; avgMs: number; minMs: number; maxMs: number } | null;
  difficultyVsRate: { level: number; label: string; rate: number; avgCost: number; count: number }[];
  weekdayEfficiency: { day: string; rate: number; count: number }[];
  weekdayProfit: { day: string; totalCost: number; count: number }[];
  costDistribution: { label: string; count: number }[];
  weeklyTrend: { label: string; avgCost: number; count: number }[];
  cumulativeRevenue: { label: string; cumulative: number; monthly: number }[];
  topCars: { carId: string; label: string; subtitle: string; totalCost: number }[];
  topMakesByRevenue: { make: string; totalCost: number; problemCount: number; solutionCount: number }[];
  makeProfitability: { make: string; avgCheck: number; rate: number; count: number }[];
  mileageBuckets: { label: string; count: number; avgCheck: number }[];
  mileageDiffBuckets: { label: string; count: number }[];
  heatmapData: { grid: number[][]; max: number; total: number; peakDay: number; peakHour: number; peakVal: number };
  agingBuckets: { label: string; count: number }[];
  agingStale: number;
  difficultyDistribution: { counts: number[]; total: number };
  difficultyVsTime: { level: number; avgHours: number; count: number }[];
  difficultyByMake: { make: string; counts: number[]; total: number }[];
  funnelData: { label: string; value: number; color: string; colorTo: string }[];
  seasonalityByMonth: { label: string; problemCount: number; revenue: number }[];
}

function formatMs(ms: number): string {
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

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function exportPdfReport(options: ExportPdfOptions) {
  const {
    viewMode,
    periodLabel,
    selectedMakes,
    carsById,
    filteredHistory,
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
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register Cyrillic TTF fonts directly from embedded base64 strings
  doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

  doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

  doc.setFont('Roboto', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const darkNavy = [15, 23, 42];      // #0f172a
  const textDark = [30, 41, 59];      // #1e293b
  const textGray = [100, 116, 139];   // #64748b
  const bgLight = [248, 250, 252];    // #f8fafc
  const bgCard = [255, 255, 255];
  const borderGray = [226, 232, 240]; // #e2e8f0
  const primaryBlue = [37, 99, 235];  // #2563eb
  const accentGreen = [5, 150, 105];  // #059669
  const accentOrange = [217, 119, 6]; // #d97706
  const accentPurple = [124, 58, 237]; // #7c3aed
  const accentRed = [220, 38, 38];    // #dc2626

  let y = 0;

  const renderHeader = (isFirstPage: boolean) => {
    // Header background banner
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Title
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('ЗВІТ З АНАЛІТИКИ ТА СТАТИСТИКИ АВТОСЕРВІСУ', margin, 13);

    // Period badge
    const badgeText = viewMode === 'week' ? 'ТИЖНЕВИЙ ЗВІТ' : 'МІСЯЧНИЙ ЗВІТ';
    doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
    doc.roundedRect(pageWidth - margin - 34, 7, 34, 7, 1.5, 1.5, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(badgeText, pageWidth - margin - 17, 11.8, { align: 'center' });

    // Subtitle info
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    const genDate = format(new Date(), 'dd.MM.yyyy HH:mm');
    doc.text(`Згенеровано: ${genDate}`, margin, 21);

    const filterStr = selectedMakes.length > 0 ? `Фільтр марок: ${selectedMakes.join(', ')}` : 'Всі автомобілі';
    doc.text(`Період: ${periodLabel}   |   ${filterStr}`, margin, 27);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      renderHeader(false);
      y = 42;
    }
  };

  const renderSectionHeader = (title: string, color: number[] = primaryBlue) => {
    checkPageBreak(12);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, 3, 7, 'F');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(title, margin + 5, y + 5.5);
    y += 10;
  };

  const renderInsightBox = (text: string, type: 'info' | 'warning' | 'tip' = 'tip') => {
    checkPageBreak(12);
    let bg = [239, 246, 255]; // blue
    let border = [191, 219, 254];
    let icon = '💡';
    let textColor = [30, 64, 175];

    if (type === 'warning') {
      bg = [254, 242, 242]; // red
      border = [254, 202, 202];
      icon = '⚠️';
      textColor = [153, 27, 27];
    } else if (type === 'info') {
      bg = [245, 243, 255]; // purple
      border = [221, 214, 254];
      icon = '📊';
      textColor = [91, 33, 182];
    }

    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.5, 1.5, 'FD');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${icon} ${text}`, margin + 3, y + 5.8);

    y += 12;
  };

  // Start rendering page 1
  renderHeader(true);
  y = 42;

  // ════════════════════════════════════════════════════════════════════
  // 1. KPI DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('1. КЛЮЧОВІ ПОКАЗНИКИ (KPI)');

  const kpiCardW = (contentWidth - 9) / 4;
  const kpiCardH = 22;

  const kpis = [
    { label: 'ДОХІД ЗА ПЕРІОД', value: `${totalRevenue.toLocaleString()} грн`, prev: prevRevenue, curr: totalRevenue },
    { label: 'СЕРЕДНІЙ ЧЕК', value: `${Math.round(avgCheck).toLocaleString()} грн`, prev: prevAvgCheck, curr: avgCheck },
    { label: 'ЗВЕРНЕННЯ', value: String(requestCount), prev: prevRequestCount, curr: requestCount },
    { label: 'СЕРЕДНІЙ РЕЙТ', value: `${Math.round(kpiAvgRate).toLocaleString()} грн/г`, prev: kpiPrevAvgRate, curr: kpiAvgRate },
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + idx * (kpiCardW + 3);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(cx, y, kpiCardW, kpiCardH, 1.5, 1.5, 'FD');

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(kpi.label, cx + 3, y + 4.5);

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(kpi.value, cx + 3, y + 11.5);

    const delta = kpi.prev === 0 ? (kpi.curr > 0 ? 100 : 0) : ((kpi.curr - kpi.prev) / kpi.prev) * 100;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(6.8);

    if (delta >= 0) {
      doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
      doc.text(`+${delta.toFixed(1)}% vs попер.`, cx + 3, y + 17.5);
    } else {
      doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
      doc.text(`${delta.toFixed(1)}% vs попер.`, cx + 3, y + 17.5);
    }
  });

  y += kpiCardH + 7;

  // ════════════════════════════════════════════════════════════════════
  // 2. FINANCES, FORECAST & TRENDS
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('2. ФІНАНСОВІ ТРЕНДИ ТА ПРОГНОЗ', accentOrange);

  // Daily finances chart (bar chart)
  if (financeData.length > 0) {
    checkPageBreak(32);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Динаміка виручки по днях:', margin, y);
    y += 4;

    const chartH = 20;
    const barGap = financeData.length > 10 ? 1 : 2;
    const itemW = (contentWidth - (financeData.length - 1) * barGap) / financeData.length;

    financeData.forEach((d, i) => {
      const bx = margin + i * (itemW + barGap);
      const bHeight = d.totalCost > 0 ? Math.max((d.totalCost / financeMax) * chartH, 2) : 1;
      const by = y + chartH - bHeight;

      if (d.totalCost > 0) {
        doc.setFillColor(accentOrange[0], accentOrange[1], accentOrange[2]);
        doc.rect(bx, by, itemW, bHeight, 'F');

        doc.setFont('Roboto', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        const valStr = d.totalCost >= 1000 ? `${(d.totalCost / 1000).toFixed(1)}k` : `${d.totalCost}`;
        doc.text(valStr, bx + itemW / 2, by - 1, { align: 'center' });
      } else {
        doc.setFillColor(borderGray[0], borderGray[1], borderGray[2]);
        doc.rect(bx, y + chartH - 1, itemW, 1, 'F');
      }

      if (financeData.length <= 10 || i % 2 === 0 || i === financeData.length - 1) {
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(textGray[0], textGray[1], textGray[2]);
        const dateLabel = format(d.day, 'd.MM');
        doc.text(dateLabel, bx + itemW / 2, y + chartH + 3.5, { align: 'center' });
      }
    });

    y += chartH + 7;
  }

  // Cost vs Time (Top recent solutions)
  if (costVsTimeData.length > 0) {
    checkPageBreak(38);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Останні роботи (Вартість vs Час виконання):', margin, y);
    y += 4;

    const cvtMaxCost = Math.max(...costVsTimeData.map(d => d.cost), 1);

    costVsTimeData.slice(0, 6).forEach((item, idx) => {
      const barW = Math.max((item.cost / cvtMaxCost) * (contentWidth - 65), 10);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(item.date, margin, y + 3.5);

      doc.setFillColor(237, 233, 254); // purple light
      doc.rect(margin + 16, y, contentWidth - 65, 4.5, 'F');

      doc.setFillColor(accentPurple[0], accentPurple[1], accentPurple[2]);
      doc.rect(margin + 16, y, barW, 4.5, 'F');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      if (barW > 15) {
        doc.text(`${item.cost.toLocaleString()} грн`, margin + 18, y + 3.3);
      }

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${item.hours} год`, margin + contentWidth - 45, y + 3.5);

      doc.setFont('Roboto', 'bold');
      doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
      doc.text(`${Math.round(item.rate)} грн/г`, margin + contentWidth - 22, y + 3.5, { align: 'right' });

      y += 5.5;
    });

    y += 3;
  }

  // Weekly trend table & Cumulative Revenue YTD
  if (weeklyTrend.length > 0 || cumulativeRevenue.length > 0) {
    checkPageBreak(30);

    const halfW = (contentWidth - 6) / 2;

    // Left half: Weekly trend
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Тренд середього чеку (8 тижнів):', margin, y);

    // Right half: Cumulative YTD
    doc.text(`Кумулятивна виручка ${new Date().getFullYear()}:`, margin + halfW + 6, y);
    y += 4;

    const startY = y;

    // Weekly trend items
    const trendMaxAvg = Math.max(...weeklyTrend.map(d => d.avgCost), 1);
    weeklyTrend.slice(-6).forEach((wt) => {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(wt.label, margin, y + 3);

      const bw = wt.avgCost > 0 ? Math.max((wt.avgCost / trendMaxAvg) * (halfW - 28), 4) : 0;
      doc.setFillColor(224, 231, 255);
      doc.rect(margin + 12, y, halfW - 28, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        doc.rect(margin + 12, y, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${wt.avgCost.toLocaleString()} грн`, margin + halfW, y + 3, { align: 'right' });
      y += 5;
    });

    // Reset Y for Cumulative
    let cumY = startY;
    const cumMax = Math.max(...cumulativeRevenue.map(d => d.cumulative), 1);
    cumulativeRevenue.slice(-6).forEach((cr) => {
      const cx = margin + halfW + 6;
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(cr.label, cx, cumY + 3);

      const bw = cr.cumulative > 0 ? Math.max((cr.cumulative / cumMax) * (halfW - 32), 4) : 0;
      doc.setFillColor(209, 250, 229);
      doc.rect(cx + 12, cumY, halfW - 32, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
        doc.rect(cx + 12, cumY, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${(cr.cumulative / 1000).toFixed(1)}k грн`, cx + halfW, cumY + 3, { align: 'right' });
      cumY += 5;
    });

    y = Math.max(y, cumY) + 4;
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. EFFICIENCY & DIFFICULTY ANALYSIS
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('3. ЕФЕКТИВНІСТЬ ТА СКЛАДНІСТЬ РОБІТ', accentPurple);

  // Difficulty vs Rate
  if (difficultyVsRate.some(d => d.count > 0)) {
    checkPageBreak(35);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Залежність середньої годинної ставки (грн/год) від складності:', margin, y);
    y += 4;

    const diffRateMax = Math.max(...difficultyVsRate.map(d => d.rate), 1);

    difficultyVsRate.forEach((d) => {
      const barW = d.rate > 0 ? Math.max((d.rate / diffRateMax) * (contentWidth - 65), 5) : 0;

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`Рівень ${d.level}`, margin, y + 3.5);

      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(margin + 20, y, contentWidth - 65, 4.5, 'F');

      if (barW > 0) {
        doc.setFillColor(accentPurple[0], accentPurple[1], accentPurple[2]);
        doc.rect(margin + 20, y, barW, 4.5, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(accentPurple[0], accentPurple[1], accentPurple[2]);
      doc.text(`${Math.round(d.rate)} грн/г`, margin + contentWidth - 42, y + 3.5);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(`(чек ~${Math.round(d.avgCost)} грн, ${d.count} робіт)`, margin + contentWidth, y + 3.5, { align: 'right' });

      y += 5.5;
    });

    const bestDiff = difficultyVsRate.filter(d => d.count > 0).reduce((best, cur) => cur.rate > best.rate ? cur : best, difficultyVsRate[0]);
    if (bestDiff && bestDiff.rate > 0) {
      renderInsightBox(`Найвигідніша складність: Рівень ${bestDiff.level} — ${Math.round(bestDiff.rate)} грн/год (середній чек ~${Math.round(bestDiff.avgCost)} грн).`);
    }
  }

  // Weekday efficiency & Profit
  if (weekdayEfficiency.some(d => d.rate > 0) || weekdayProfit.some(d => d.totalCost > 0)) {
    checkPageBreak(38);

    const halfW = (contentWidth - 6) / 2;

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Рейт по днях тижня (грн/год):', margin, y);
    doc.text('Загальний прибуток по днях:', margin + halfW + 6, y);
    y += 4;

    const startY = y;
    const weekRateMax = Math.max(...weekdayEfficiency.map(d => d.rate), 1);
    weekdayEfficiency.forEach((d) => {
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(d.day, margin, y + 3);

      const bw = d.rate > 0 ? Math.max((d.rate / weekRateMax) * (halfW - 28), 4) : 0;
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(margin + 10, y, halfW - 28, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        doc.rect(margin + 10, y, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${Math.round(d.rate)} грн/г`, margin + halfW, y + 3, { align: 'right' });
      y += 5;
    });

    let profitY = startY;
    const weekProfitMax = Math.max(...weekdayProfit.map(d => d.totalCost), 1);
    weekdayProfit.forEach((d) => {
      const cx = margin + halfW + 6;
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(d.day, cx, profitY + 3);

      const bw = d.totalCost > 0 ? Math.max((d.totalCost / weekProfitMax) * (halfW - 30), 4) : 0;
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(cx + 10, profitY, halfW - 30, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
        doc.rect(cx + 10, profitY, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${d.totalCost.toLocaleString()} грн`, cx + halfW, profitY + 3, { align: 'right' });
      profitY += 5;
    });

    y = Math.max(y, profitY) + 2;

    const bestProfitDay = weekdayProfit.reduce((a, b) => b.totalCost > a.totalCost ? b : a, weekdayProfit[0]);
    if (bestProfitDay && bestProfitDay.totalCost > 0) {
      renderInsightBox(`Найбільший прибуток отримано у день: ${bestProfitDay.day} (${bestProfitDay.totalCost.toLocaleString()} грн).`);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. REQUESTS, RESOLUTION TIME & FUNNEL
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('4. ЗВЕРНЕННЯ, ЧАС ВИРІШЕННЯ ТА ВОРОНКА', primaryBlue);

  // Resolution Stats Cards
  if (resolutionStats) {
    checkPageBreak(25);
    const resW = (contentWidth - 9) / 4;

    const resItems = [
      { label: 'ВИРІШЕНО ВСЬОГО', val: String(resolutionStats.total) },
      { label: 'СЕРЕДНІЙ ЧАС', val: formatMs(resolutionStats.avgMs) },
      { label: 'НАЙШВИДШЕ', val: formatMs(resolutionStats.minMs) },
      { label: 'НАЙДОВШЕ', val: formatMs(resolutionStats.maxMs) },
    ];

    resItems.forEach((ri, idx) => {
      const cx = margin + idx * (resW + 3);
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.roundedRect(cx, y, resW, 16, 1.5, 1.5, 'FD');

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(textGray[0], textGray[1], textGray[2]);
      doc.text(ri.label, cx + 3, y + 4.5);

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.text(ri.val, cx + 3, y + 11.5);
    });

    y += 21;
  }

  // Funnel & Cost distribution
  if (funnelData.length > 0 || costDistribution.length > 0) {
    checkPageBreak(32);
    const halfW = (contentWidth - 6) / 2;

    // Funnel
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Воронка обслуговування:', margin, y);

    // Distribution
    doc.text('Розподіл цінових чеків:', margin + halfW + 6, y);
    y += 4;

    const startY = y;
    const funnelMax = funnelData[0]?.value || 1;
    funnelData.forEach((fd, i) => {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(fd.label, margin, y + 3);

      const bw = Math.max((fd.value / funnelMax) * (halfW - 30), 4);
      doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
      doc.rect(margin + 20, y, bw, 4.5, 'F');

      const pct = funnelMax > 0 ? ((fd.value / funnelMax) * 100).toFixed(0) : '0';
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.text(`${fd.value} (${pct}%)`, margin + halfW, y + 3.2, { align: 'right' });

      y += 5.5;
    });

    let distY = startY;
    const distMax = Math.max(...costDistribution.map(d => d.count), 1);
    costDistribution.forEach((cd) => {
      const cx = margin + halfW + 6;
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(cd.label, cx, distY + 3);

      const bw = cd.count > 0 ? Math.max((cd.count / distMax) * (halfW - 28), 3) : 0;
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(cx + 14, distY, halfW - 28, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(accentOrange[0], accentOrange[1], accentOrange[2]);
        doc.rect(cx + 14, distY, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${cd.count} робіт`, cx + halfW, distY + 3, { align: 'right' });

      distY += 5.5;
    });

    y = Math.max(y, distY) + 2;
  }

  // Peak Activity Heatmap Insight & Aging Warning
  if (heatmapData.peakVal > 0) {
    const peakDayName = DAY_NAMES[heatmapData.peakDay] || '';
    renderInsightBox(`Пік активності звернень: ${peakDayName} о ${heatmapData.peakHour}:00 (${heatmapData.peakVal} звернень).`, 'info');
  }

  if (agingStale > 0) {
    renderInsightBox(`${agingStale} проблем залишаються відкритими понад 7 днів — рекомендовано зв'язатися з власниками.`, 'warning');
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. VEHICLES, MAKES & MILEAGE
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('5. ТАБЛИЦІ МАРКИ, ТОП-АВТО ТА ПРОБІГ', accentGreen);

  // Top Vehicles Table
  if (topCars.length > 0) {
    checkPageBreak(30);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('ТОП автомобілів за сумою витрат:', margin, y);
    y += 4.5;

    // Header row
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('№', margin + 2, y + 3.8);
    doc.text('Держномер', margin + 10, y + 3.8);
    doc.text('Марка / Модель', margin + 50, y + 3.8);
    doc.text('Сума витрат (грн)', margin + 140, y + 3.8);
    y += 5.5;

    // Data rows
    topCars.forEach((car, index) => {
      checkPageBreak(6);
      if (index % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
      }
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(String(index + 1), margin + 2, y + 3.8);
      doc.text(car.label, margin + 10, y + 3.8);
      doc.text(car.subtitle, margin + 50, y + 3.8);

      doc.setFont('Roboto', 'bold');
      doc.text(`${car.totalCost.toLocaleString()} грн`, margin + 140, y + 3.8);
      y += 5.5;
    });

    y += 4;
  }

  // Top Makes Summary Table
  if (topMakesByRevenue.length > 0) {
    checkPageBreak(32);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Резюме та дохідність за марками авто:', margin, y);
    y += 4.5;

    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('Марка авто', margin + 2, y + 3.8);
    doc.text('Звернень', margin + 45, y + 3.8);
    doc.text('Рішень', margin + 75, y + 3.8);
    doc.text('Виручка (грн)', margin + 105, y + 3.8);
    doc.text('Середній чек (грн)', margin + 145, y + 3.8);
    y += 5.5;

    topMakesByRevenue.forEach((m, index) => {
      checkPageBreak(6);
      if (index % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(margin, y, contentWidth, 5.5, 'F');
      }
      const makeProf = makeProfitability.find(x => x.make === m.make);
      const avgCh = makeProf ? makeProf.avgCheck : (m.solutionCount > 0 ? m.totalCost / m.solutionCount : 0);

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(m.make, margin + 2, y + 3.8);
      doc.text(String(m.problemCount), margin + 45, y + 3.8);
      doc.text(String(m.solutionCount), margin + 75, y + 3.8);

      doc.setFont('Roboto', 'bold');
      doc.text(`${m.totalCost.toLocaleString()} грн`, margin + 105, y + 3.8);
      doc.text(`${Math.round(avgCh).toLocaleString()} грн`, margin + 145, y + 3.8);
      y += 5.5;
    });

    y += 4;
  }

  // Mileage Buckets & Interval between visits
  if (mileageBuckets.some(b => b.count > 0)) {
    checkPageBreak(28);
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Розподіл за діапазоном пробігу:', margin, y);
    y += 4;

    const mbMax = Math.max(...mileageBuckets.map(b => b.count), 1);
    mileageBuckets.forEach((b) => {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(b.label, margin, y + 3);

      const bw = b.count > 0 ? Math.max((b.count / mbMax) * (contentWidth - 65), 4) : 0;
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(margin + 22, y, contentWidth - 65, 4, 'F');
      if (bw > 0) {
        doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
        doc.rect(margin + 22, y, bw, 4, 'F');
      }

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(`${b.count} візитів (чек ~${Math.round(b.avgCheck)} грн)`, margin + contentWidth, y + 3, { align: 'right' });

      y += 5;
    });

    const bestMB = mileageBuckets.reduce((a, b) => b.avgCheck > a.avgCheck ? b : a, mileageBuckets[0]);
    if (bestMB && bestMB.avgCheck > 0) {
      renderInsightBox(`Найбільший середній чек зафіксовано у діапазоні пробігу: ${bestMB.label} (~${Math.round(bestMB.avgCheck).toLocaleString()} грн).`);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 6. DETAILED SERVICE LOG TABLE
  // ════════════════════════════════════════════════════════════════════
  renderSectionHeader('6. ЖУРНАЛ ОБСЛУГОВУВАННЯ ТА РОБІТ', darkNavy);

  const renderTableHeaders = () => {
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('Дата', margin + 2, y + 4.2);
    doc.text('Авто / Номер', margin + 26, y + 4.2);
    doc.text('Клієнт', margin + 65, y + 4.2);
    doc.text('Тип', margin + 98, y + 4.2);
    doc.text('Опис / Деталі', margin + 116, y + 4.2);
    doc.text('Сума', margin + 165, y + 4.2);
    y += 6;
  };

  if (filteredHistory.length > 0) {
    checkPageBreak(25);
    renderTableHeaders();

    const typeLabels: Record<string, string> = {
      problem: 'Проблема',
      solution: 'Рішення',
      note: 'Нотатка',
      mileage: 'Пробіг',
      reminder: 'Нагадування',
    };

    filteredHistory.forEach((e, idx) => {
      const car = carsById.get(e.carId);
      let dateStr = '';
      try {
        if (e.createdAt) {
          dateStr = format(new Date(e.createdAt), 'dd.MM.yy HH:mm');
        }
      } catch {
        dateStr = e.createdAt || '';
      }

      const carInfo = car ? `${car.make || ''} ${car.model || ''} (${car.plate || ''})`.trim() : '';
      const clientInfo = car?.clientName ? `${car.clientName}` : '-';
      const typeStr = typeLabels[e.type] || e.type;
      const costStr = e.cost !== undefined && e.cost > 0 ? `${e.cost.toLocaleString()} грн` : '-';
      const rawText = (e.text || '').trim();

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);

      const splitDesc = doc.splitTextToSize(rawText, 45);
      const textLines = Array.isArray(splitDesc) ? splitDesc : [splitDesc];
      const rowHeight = Math.max(5.5, textLines.length * 3.5 + 2);

      if (y + rowHeight > pageHeight - 14) {
        doc.addPage();
        renderHeader(false);
        y = 42;
        renderTableHeaders();
      }

      if (idx % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(dateStr, margin + 2, y + 3.8);
      doc.text(carInfo.slice(0, 22), margin + 26, y + 3.8);
      doc.text(clientInfo.slice(0, 18), margin + 65, y + 3.8);

      if (e.type === 'solution') {
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(accentGreen[0], accentGreen[1], accentGreen[2]);
      } else if (e.type === 'problem') {
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
      } else {
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      }
      doc.text(typeStr, margin + 98, y + 3.8);

      doc.setFont('Roboto', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      let ly = y + 3.8;
      textLines.forEach((line: string) => {
        doc.text(line, margin + 116, ly);
        ly += 3.5;
      });

      doc.setFont('Roboto', 'bold');
      doc.text(costStr, margin + 165, y + 3.8);

      y += rowHeight;
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ════════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('АвтоБаза — Розумне управління автосервісом та історією обслуговування', margin, pageHeight - 6.5);
    doc.text(`Сторінка ${i} з ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Dynamic Filename including viewMode (week or month)
  const dateFileStr = format(new Date(), 'yyyy-MM-dd');
  const fileName = `autobaza-analytics-report-${viewMode}-${dateFileStr}.pdf`;
  doc.save(fileName);
}
