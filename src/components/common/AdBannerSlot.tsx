import { memo } from 'react';

/**
 * AdSkyscraper — IAB Wide Skyscraper (160×600)
 * Shown in sidebars on wide screens (lg breakpoint and up).
 * Hidden on mobile via CSS.
 */
export const AdSkyscraper = memo(function AdSkyscraper() {
  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center flex-shrink-0"
      style={{
        width: '160px',
        height: '600px',
        background: 'var(--color-bg-card)',
        border: '2px dashed var(--color-border)',
        borderRadius: '16px',
        opacity: 0.5,
      }}
    >
      <span
        className="text-xs uppercase tracking-widest font-bold"
        style={{
          color: 'var(--color-text-muted)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          transform: 'rotate(180deg)',
        }}
      >
        Ad · 160×600
      </span>
    </div>
  );
});

/**
 * AdMobileLeaderboard — IAB Mobile Leaderboard (320×50)
 * Shown fixed at the bottom of the screen on mobile (below lg).
 * Hidden on wide screens.
 */
export const AdMobileLeaderboard = memo(function AdMobileLeaderboard({ isKeyboardOpen }: { isKeyboardOpen?: boolean }) {
  return (
    <div
      className={`mobile-ad-banner lg:hidden fixed left-0 right-0 z-[999] flex items-center justify-center transition-all duration-300 ${isKeyboardOpen ? 'top-0' : 'bottom-0'}`}
      style={{
        height: '60px',
        background: 'var(--color-bg-card)',
        borderBottom: isKeyboardOpen ? '1px solid var(--color-border)' : 'none',
        borderTop: !isKeyboardOpen ? '1px solid var(--color-border)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: '320px',
          height: '50px',
          border: '2px dashed var(--color-border)',
          borderRadius: '8px',
          opacity: 0.5,
        }}
      >
        <span
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Ad · 320×50
        </span>
      </div>
    </div>
  );
});

/**
 * AdInlineRectangle — IAB Medium Rectangle (300×250)
 * Intended for inline placement between logical sections of a page.
 */
export const AdInlineRectangle = memo(function AdInlineRectangle() {
  return (
    <div className="w-full flex justify-center items-center my-6">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '300px',
          height: '250px',
          background: 'var(--color-bg-card)',
          border: '2px dashed var(--color-border)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          opacity: 0.6,
        }}
      >
        <span
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Ad · 300×250
        </span>
      </div>
    </div>
  );
});

/**
 * AdBannerSlot — Legacy inline banner kept for backward compatibility.
 * @deprecated Use the new layout-level ad components instead.
 */
export const AdBannerSlot = memo(function AdBannerSlot() {
  return null;
});
