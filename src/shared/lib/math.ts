/**
 * Simple linear regression: finds the best-fit line y = slope * x + intercept
 * for a set of (x, y) points using the least-squares method.
 */
export function linearRegression(points: [number, number][]): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.[1] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Generate CSV content from array of objects.
 * Returns a string ready for Blob creation.
 */
export function generateCSV(
  headers: { key: string; label: string }[],
  rows: Record<string, any>[]
): string {
  const headerLine = headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(';');
  const dataLines = rows.map(row =>
    headers.map(h => {
      const val = row[h.key];
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(';')
  );
  // BOM for Excel to read UTF-8 correctly with semicolon delimiter
  return '\uFEFF' + [headerLine, ...dataLines].join('\n');
}

/**
 * Trigger a file download from a string content.
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
