import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useSettings } from '../store/useSettings';
import ThemedIcon, { type IconName } from './ThemedIcon';

export type TabType = 'dashboard' | 'today' | 'stats' | 'settings';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const BottomNav: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const { settings } = useSettings();

  const tabs: { id: TabType; label: string; icon: IconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'today', label: 'Today', icon: 'history' },
    { id: 'stats', label: 'Stats', icon: 'chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleTabClick = async (id: TabType) => {
    if (settings.hapticsEnabled) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics fallback on web
      }
    }
    setActiveTab(id);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around py-3 px-2 z-40 pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] dark:shadow-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              isActive ? 'text-blue-600 dark:text-blue-500 scale-105' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            <ThemedIcon
              name={tab.icon}
              size={22}
              color={isActive ? undefined : 'currentColor'}
              className={isActive ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}
            />
            <span className="text-[10px] font-extrabold uppercase tracking-tighter">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
