import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Home, TrendingUp, Calculator, Compass, User } from 'lucide-react';

export default function BottomDock({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  const menuItems = [
    { id: 'home', icon: Home, label: t('tab_home') },
    { id: 'forecast', icon: TrendingUp, label: t('tab_forecast') },
    { id: 'calculate', icon: Calculator, label: t('tab_calculate') },
    { id: 'roadmap', icon: Compass, label: t('tab_roadmap') },
    { id: 'profile', icon: User, label: t('tab_profile') }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-2xl rounded-full px-3 py-2 flex items-center gap-2 max-w-[95vw] sm:max-w-md transition-all duration-300">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full transition-all duration-300 cursor-pointer min-h-[44px] ${
              isActive
                ? 'bg-[#143D2B] text-white font-extrabold shadow-md scale-105'
                : 'text-slate-500 hover:text-[#143D2B] hover:bg-slate-100/50'
            }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
            aria-label={item.label}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className={`text-xs select-none transition-all duration-300 ${
              isActive ? 'block' : 'hidden sm:block'
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
