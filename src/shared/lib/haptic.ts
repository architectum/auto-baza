/**
 * Triggers a device vibration using navigator.vibrate if supported.
 * Light pattern (e.g. 15ms) is good for light clicks/taps.
 * Success pattern: [30, 40, 30]
 * Error/Warning pattern: [50, 100, 50, 100, 50]
 */
export function vibrate(pattern: number | number[] = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }
}

export const haptic = {
  light: () => vibrate(15),
  medium: () => vibrate(30),
  success: () => vibrate([30, 40, 30]),
  error: () => vibrate([50, 100, 50, 100, 50]),
};
