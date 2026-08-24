import { useState, useCallback } from 'react';
import type { AppView } from '@/types/appView';
import { useTheme } from '@/hooks/useTheme';
import { AppProvider } from '@/context/AppContext';

// Layout chrome
import { GlobalMenu } from '@/components/layout/GlobalMenu';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AdSkyscraper } from '@/components/common/AdBannerSlot';

// Views
import { HomeView } from '@/views/HomeView';

// Flows
import { PalabrasFlow } from '@/views/palabras/PalabrasFlow';
import { StopFlow } from '@/views/stop/StopFlow';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const { isDark, toggleTheme } = useTheme();

  const navigate = useCallback((view: AppView) => {
    setCurrentView(view);
  }, []);

  const goHome = useCallback(() => {
    setCurrentView('home');
  }, []);

  return (
    <AppProvider value={{ currentView, navigate, goHome }}>
      {/* The `dark` class activates CSS dark mode tokens */}
      <div className={isDark ? 'dark' : ''}>
        <div
          className="min-h-screen"
          style={{ background: 'var(--gradient-bg)', color: 'var(--color-text-main)' }}
        >
          {/* ── Fixed chrome ──────────────────────────── */}
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          <GlobalMenu onGoHome={goHome} />

          {/* ── Mobile banner ad — fixed at bottom, pushes content up ── */}
          {/* Only visible below lg breakpoint. 60px bar height reserves space. */}
          {/* <AdMobileLeaderboard /> */}

          {/*
           * ── Page layout: Sidebar-Ad | Main content | Sidebar-Ad ──
           *
           * On large screens (lg+):
           *   • Two 160×600 skyscraper sidebars flank the centered game card.
           *   • Total: sidebar(160) + gap(32) + main(448) + gap(32) + sidebar(160) = 832px
           *
           * On small screens (< lg):
           *   • Sidebars are hidden (display:none via Tailwind hidden/lg:flex).
           *   • Main card takes full width up to max-w-md.
           *   • A 60px padding-bottom reserves space for the fixed mobile banner.
           */}
          <div className="min-h-screen w-full max-w-screen-2xl mx-auto flex flex-row justify-center lg:justify-between items-stretch px-4 md:px-8">
            {/* Left skyscraper — desktop only */}
            <div className="hidden lg:block w-[160px] flex-shrink-0">
              <div className="sticky top-8 pt-12">
                <AdSkyscraper />
              </div>
            </div>

            {/* ── Central game area ── */}
            <main
              className="flex-1 w-full max-w-md mx-auto flex flex-col pt-8 pb-[140px] lg:pb-12 min-h-[100dvh]"
            >
              {/* Top safe-center spacer */}
              <div className="flex-[1_1_auto] min-h-0 lg:min-h-[2rem]"></div>
              
              <div className="w-full flex-none flex flex-col items-center">
                {currentView === 'home' && <HomeView />}
                {currentView.startsWith('palabras-') && <PalabrasFlow view={currentView} />}
                {currentView.startsWith('stop-') && <StopFlow view={currentView} />}
              </div>

              {/* Bottom safe-center spacer */}
              <div className="flex-[1_1_auto] min-h-0 lg:min-h-[2rem]"></div>
            </main>

            {/* Right skyscraper — desktop only */}
            <div className="hidden lg:block w-[160px] flex-shrink-0">
              <div className="sticky top-8 pt-12">
                <AdSkyscraper />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
