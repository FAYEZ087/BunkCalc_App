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
import type { Subject, AttendanceStatus } from './lib/types';
import { scheduleDailyClassReminders, initNotificationActionTypes } from './lib/notifications';
import { useUpdateStore } from './store/useUpdateStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { v4 as uuidv4 } from 'uuid';

// Lazy loaded views
const Setup = lazy(() => import('./pages/Setup'));
const Settings = lazy(() => import('./pages/Settings'));
const Today = lazy(() => import('./pages/Today'));
const Statistics = lazy(() => import('./pages/Statistics'));
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'));
const GlobalHistory = lazy(() => import('./pages/GlobalHistory'));
const OnboardingCarousel = lazy(() => import('./components/OnboardingCarousel'));
const CalendarView = lazy(() => import('./pages/CalendarView'));
import { TimetableShareModal } from './components/TimetableShareModal';
import { WhatsNewFlashCard } from './components/WhatsNewFlashCard';
import { APP_VERSION_NAME } from './lib/constants';

function App() {
  const { loadSettings, loadArchivedSemesters } = useSettings();
  const { loadSubjects, subjects } = useSubjects();
  const { loadRecords } = useAttendance();

  // Splash & load state
  const [showSplash, setShowSplash] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [homeVisible, setHomeVisible] = useState(false);     // controls fade-in opacity
  const [showWhatsNewFlashCard, setShowWhatsNewFlashCard] = useState(false);

  const [autoImportCode, setAutoImportCode] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('import');
    } catch {
      return null;
    }
  });

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'today' || tabParam === 'stats' || tabParam === 'settings') {
        return tabParam;
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
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

      // Initialize notification action types (1-tap Present / Absent / Cancelled)
      await initNotificationActionTypes();

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

    // Listen for 1-tap notification action clicks
    let actionListener: any = null;
    const setupActionListener = async () => {
      try {
        actionListener = await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
          const actionId = action.actionId;
          const subjectId = action.notification.extra?.subjectId;
          
          if (subjectId && (actionId === 'mark_present' || actionId === 'mark_absent' || actionId === 'mark_cancelled')) {
            const status: AttendanceStatus = actionId === 'mark_present' ? 'present' : actionId === 'mark_absent' ? 'absent' : 'cancelled';
            const todayStr = new Date().toLocaleDateString('en-CA');
            await useAttendance.getState().markAttendance({
              id: uuidv4(),
              subjectId,
              date: todayStr,
              status,
            });
          }
        });
      } catch (err) {
        console.warn('LocalNotification action listener not supported:', err);
      }
    };
    setupActionListener();

    return () => {
      if (actionListener) actionListener.remove();
    };
  }, [loadSettings, loadSubjects, loadRecords, loadArchivedSemesters]);

  // ── Splash complete callback ──
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setHomeVisible(true);
        // Show What's New flash card ONLY ONCE after user updates app
        try {
          const lastSeen = localStorage.getItem('bunkcalc_last_seen_version');
          const currentSubjects = useSubjects.getState().subjects;
          if (lastSeen !== APP_VERSION_NAME && currentSubjects.length > 0) {
            setShowWhatsNewFlashCard(true);
          }
        } catch {
          // ignore
        }
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

        {autoImportCode && (
          <TimetableShareModal
            isOpen={true}
            initialTab="import"
            initialImportCode={autoImportCode}
            onClose={() => {
              setAutoImportCode(null);
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch {
                // ignore
              }
            }}
          />
        )}

        {/* What's New Flash Card - Appears only once after app update */}
        {showWhatsNewFlashCard && (
          <WhatsNewFlashCard
            isOpen={true}
            onClose={() => {
              try {
                localStorage.setItem('bunkcalc_last_seen_version', APP_VERSION_NAME);
              } catch {
                // ignore
              }
              setShowWhatsNewFlashCard(false);
            }}
          />
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
