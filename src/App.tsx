import { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { useSettings } from './store/useSettings';
import { useSubjects } from './store/useSubjects';
import { useAttendance } from './store/useAttendance';
import { migrateStorageIfNeeded } from './lib/storage';
import Home from './pages/Home';
import BottomNav from './components/BottomNav';
import SplashScreen from './components/SplashScreen';
import SkeletonLoader from './components/SkeletonLoader';
import ErrorBoundary from './components/ErrorBoundary';
import type { TabType } from './components/BottomNav';
import type { Subject } from './lib/types';
import { scheduleDailyClassReminders } from './lib/notifications';
import { useUpdateStore } from './store/useUpdateStore';

// Lazy loaded views
const Setup = lazy(() => import('./pages/Setup'));
const Settings = lazy(() => import('./pages/Settings'));
const Today = lazy(() => import('./pages/Today'));
const Statistics = lazy(() => import('./pages/Statistics'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const GlobalHistory = lazy(() => import('./pages/GlobalHistory'));
const OnboardingCarousel = lazy(() => import('./components/OnboardingCarousel'));
const CalendarView = lazy(() => import('./pages/CalendarView'));

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
  const [showCalendar, setShowCalendar] = useState(false);

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
          } else if (showCalendar) {
            setShowCalendar(false);
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
  }, [selectedSubject, showHistory, showCalendar, activeTab, showSplash]);

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
      const currentRecords = useAttendance.getState().records;
      if (currentSubjects.length > 0) {
        await scheduleDailyClassReminders(currentSubjects, currentSettings, currentRecords);
      }

      if (currentSubjects.length === 0) {
        setShowOnboarding(true);
      }

      // Silent version update check
      useUpdateStore.getState().checkForUpdates();

      setDataReady(true);
    };
    init();
  }, [loadSettings, loadSubjects, loadRecords, loadArchivedSemesters]);

  // ── Splash complete callback ──
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHomeVisible(true);
      });
    });
  }, []);

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
      <ErrorBoundary>
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
            <Suspense fallback={<div className="p-6"><SkeletonLoader height="h-64" /></div>}>
              {showOnboarding && subjects.length === 0 ? (
                <OnboardingCarousel onComplete={() => setShowOnboarding(false)} />
              ) : subjects.length === 0 ? (
                <Setup />
              ) : (
                <>
                  {renderMainContent()}
                  {!selectedSubject && !showHistory && !showCalendar && (
                    <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
                  )}
                </>
              )}
            </Suspense>
          </div>
        )}
      </ErrorBoundary>
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

    if (showCalendar) {
      return <CalendarView onBack={() => setShowCalendar(false)} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} onOpenCalendar={() => setShowCalendar(true)} />;
      case 'today':
        return <Today />;
      case 'stats':
        return <Statistics onOpenHistory={() => setShowHistory(true)} />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onSelectSubject={(s) => setSelectedSubject(s)} onOpenCalendar={() => setShowCalendar(true)} />;
    }
  }
}

export default App;
