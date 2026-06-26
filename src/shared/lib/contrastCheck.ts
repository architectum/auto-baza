/**
 * WCAG AA Contrast Check Utility
 * Minimum ratios: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
 */

/**
 * Parse a hex color to [r, g, b] values
 */
export function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

/**
 * Calculate relative luminance of a color (WCAG 2.0)
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.0)
 * Returns a number >= 1
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a foreground/background pair passes WCAG AA
 */
export function contrastCheck(
  bg: string,
  fg: string,
  isLargeText: boolean = false
): { ratio: number; passes: boolean; level: 'fail' | 'AA' | 'AAA' } {
  const ratio = contrastRatio(bg, fg);
  const aaThreshold = isLargeText ? 3 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7;

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= aaThreshold,
    level: ratio >= aaaThreshold ? 'AAA' : ratio >= aaThreshold ? 'AA' : 'fail',
  };
}
