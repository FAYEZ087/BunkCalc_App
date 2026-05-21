import { useEffect, useState, useCallback } from 'react';
import { useSettings } from './store/useSettings';
import { useSubjects } from './store/useSubjects';
import { useAttendance } from './store/useAttendance';
import { migrateStorageIfNeeded } from './lib/storage';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Settings from './pages/Settings';
import Today from './pages/Today';
import Statistics from './pages/Statistics';
import SubjectDetail from './pages/SubjectDetail';
import GlobalHistory from './pages/GlobalHistory';
import BottomNav from './components/BottomNav';
import OnboardingCarousel from './components/OnboardingCarousel';
import SplashScreen from './components/SplashScreen';
import type { TabType } from './components/BottomNav';
import type { Subject } from './lib/types';

import { scheduleDailyClassReminders } from './lib/notifications';

function App() {
  const { loadSettings, loadArchivedSemesters } = useSettings();
  const { loadSubjects, subjects } = useSubjects();
  const { loadRecords } = useAttendance();

  // Splash & load state
  const [showSplash, setShowSplash] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [homeVisible, setHomeVisible] = useState(false);     // controls fade-in opacity

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── Back button handler ──
  useEffect(() => {
    let backButtonListener: any = null;

    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        backButtonListener = await CapApp.addListener('backButton', () => {
          if (showSplash) return;          // ignore during splash
          if (selectedSubject) {
            setSelectedSubject(null);
          } else if (showHistory) {
            setShowHistory(false);
          } else if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
          } else {
            CapApp.exitApp();
          }
        });
      } catch (err) {
        console.warn('Native backButton listener not supported:', err);
      }
    };

    setupBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [selectedSubject, showHistory, activeTab, showSplash]);

  // ── Load data in parallel with splash animation ──
  useEffect(() => {
    const init = async () => {
      await migrateStorageIfNeeded();
      await Promise.all([
        loadSettings(),
        loadSubjects(),
        loadRecords(),
        loadArchivedSemesters(),
      ]);

      // Schedule reminders after loading
      const currentSubjects = useSubjects.getState().subjects;
      const currentSettings = useSettings.getState().settings;
      if (currentSubjects.length > 0) {
        await scheduleDailyClassReminders(currentSubjects, currentSettings);
      }

      if (currentSubjects.length === 0) {
        setShowOnboarding(true);
      }

      setDataReady(true);
    };
    init();
  }, [loadSettings, loadSubjects, loadRecords, loadArchivedSemesters]);

  // ── Splash complete callback ──
  // When splash video finishes → detect theme → fade in home
  const handleSplashComplete = useCallback(() => {
    // Theme is already applied by loadSettings() → applyTheme().
    // Hide the splash layer
    setShowSplash(false);
    // Trigger the home fade-in after a micro-tick so the browser registers opacity: 0 first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHomeVisible(true);
      });
    });
  }, []);

  // ── Render: splash is always on top while active ──

  // If data hasn't loaded yet AND splash finished, show a minimal loader
  if (!dataReady && !showSplash) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white gap-6 p-8">
        <div className="text-2xl font-bold animate-pulse italic text-blue-500">BunkCalc</div>
      </div>
    );
  }

  return (
    <>
      {/* Splash overlay – sits above everything */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Main app content – starts hidden, fades in over 300ms */}
      {dataReady && (
        <div
          style={{
            opacity: homeVisible ? 1 : 0,
            transition: 'opacity 300ms ease-in',
          }}
          className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300"
        >
          {showOnboarding && subjects.length === 0 ? (
            <OnboardingCarousel onComplete={() => setShowOnboarding(false)} />
          ) : subjects.length === 0 ? (
            <Setup />
          ) : (
            <>
              {renderMainContent()}
              {!selectedSubject && !showHistory && (
                <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
              )}
            </>
          )}
        </div>
      )}
    </>
  );

  function renderMainContent() {
    if (selectedSubject) {
      return (
        <SubjectDetail
          subject={selectedSubject}
          onBack={() => setSelectedSubject(null)}
        />
      );
    }

    if (showHistory) {
      return <GlobalHistory onBack={() => setShowHistory(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} />;
      case 'today':
        return <Today />;
      case 'stats':
        return <Statistics onOpenHistory={() => setShowHistory(true)} />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} />;
    }
  }
}

export default App;
