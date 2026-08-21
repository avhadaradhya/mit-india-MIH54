import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';
import { getForecast, getRouting, getRoadmap } from '../lib/api';
import LanguageToggle from '../components/LanguageToggle';
import BottomDock from '../components/BottomDock';
import HomeTab from '../components/HomeTab';
import ForecastTab from '../components/ForecastTab';
import CalculateTab from '../components/CalculateTab';
import RoadmapTab from '../components/RoadmapTab';
import ProfileTab from '../components/ProfileTab';
import { LayoutDashboard, Bell } from 'lucide-react';

export default function Dashboard({ authUser, handleLogout }) {
  const { t } = useLanguage();
  
  // Shared filters state as single source of truth
  const [crop, setCrop] = useState('Onion');
  const [yieldQty, setYieldQty] = useState(50);
  const [location, setLocation] = useState('Pune');

  // activeTab State for Apple-dock router
  const [activeTab, setActiveTab] = useState('home');

  // Independent fetching states
  const [forecast, setForecast] = useState({ data: null, loading: true, error: null });
  const [routing, setRouting] = useState({ data: null, loading: true, error: null });
  const [roadmap, setRoadmap] = useState({ data: null, loading: true, error: null });

  const fetchForecast = async () => {
    setForecast(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getForecast(crop, 'Pune Mandi');
      setForecast({ data, loading: false, error: null });
    } catch (err) {
      console.error(err);
      setForecast({ data: null, loading: false, error: err.message || 'Failed to fetch forecast.' });
    }
  };

  const fetchRouting = async () => {
    setRouting(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRouting(crop, yieldQty, location);
      setRouting({ data, loading: false, error: null });
    } catch (err) {
      console.error(err);
      setRouting({ data: null, loading: false, error: err.message || 'Failed to fetch routing rates.' });
    }
  };

  const fetchRoadmap = async () => {
    setRoadmap(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRoadmap(crop, location);
      setRoadmap({ data, loading: false, error: null });
    } catch (err) {
      console.error(err);
      setRoadmap({ data: null, loading: false, error: err.message || 'Failed to fetch roadmap.' });
    }
  };

  useEffect(() => {
    fetchForecast();
    fetchRoadmap();
  }, [crop, location]);

  useEffect(() => {
    fetchRouting();
  }, [crop, yieldQty, location]);

  // Tab views rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            crop={crop}
            yieldQty={yieldQty}
            location={location}
            routingData={routing.data}
            loading={routing.loading}
            error={routing.error}
            retryFn={fetchRouting}
          />
        );
      case 'forecast':
        return (
          <ForecastTab
            crop={crop}
            setCrop={setCrop}
            location={location}
            setLocation={setLocation}
            forecastData={forecast.data}
            loading={forecast.loading}
            error={forecast.error}
            retryFn={fetchForecast}
          />
        );
      case 'calculate':
        return (
          <CalculateTab
            crop={crop}
            initialYield={yieldQty}
            initialLocation={location}
          />
        );
      case 'roadmap':
        return (
          <RoadmapTab
            crop={crop}
            location={location}
            roadmapData={roadmap.data}
            loading={roadmap.loading}
            error={roadmap.error}
            retryFn={fetchRoadmap}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            authUser={authUser}
            handleLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col font-sans-custom pb-32">
      
      {/* Persistent Top Header */}
      <header className="sticky top-0 z-30 bg-[#143D2B] text-white shadow-md border-b border-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shrink-0">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide" style={{ fontFamily: 'Times New Roman, serif' }}>
                {t('app_title')}
              </h1>
              <p className="text-[9px] sm:text-[10px] text-emerald-200 tracking-wide font-semibold">
                {t('app_slogan')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              className="relative p-2.5 hover:bg-emerald-800/50 rounded-xl transition cursor-pointer text-white shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="View notifications"
              onClick={() => alert(t('today') !== 'आज' ? "System notifications: 3 updates available." : "सिस्टम सूचना: ३ नवीन माहिती उपलब्ध.")}
            >
              <Bell className="w-5.5 h-5.5" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#D99B26] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                3
              </span>
            </button>

            {/* Language Toggle */}
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main Tab Render Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </main>

      {/* Floating Bottom Menu */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </div>
  );
}
