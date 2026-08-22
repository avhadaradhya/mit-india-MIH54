import React from 'react';
import { useLanguage } from '../lib/i18n';
import { LayoutDashboard, TrendingUp, Calculator, Milestone, UserCheck } from 'lucide-react';

export default function BottomDock({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'home', icon: LayoutDashboard, label: t('tab_home') },
    { id: 'forecast', icon: TrendingUp, label: t('tab_forecast') },
    { id: 'calculate', icon: Calculator, label: t('tab_calculate') },
    { id: 'roadmap', icon: Milestone, label: t('tab_roadmap') },
    { id: 'profile', icon: UserCheck, label: t('tab_profile') },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/85 text-white backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full px-4 py-2.5 flex items-center gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        if (isActive) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="bg-emerald-600 text-white shadow-lg shadow-emerald-600/40 rounded-full px-4 py-1.5 transition-all duration-300 scale-105 flex items-center gap-2 font-medium text-sm"
              aria-label={tab.label}
            >
              <Icon size={18} strokeWidth={2.5} />
              <span>{tab.label}</span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-full p-2.5 transition-all duration-200"
            aria-label={tab.label}
          >
            <Icon size={20} strokeWidth={1.8} />
          </button>
        );
      })}
    </nav>
  );
}
