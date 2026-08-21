import React, { useState, useEffect } from 'react';
import { useLanguage } from '../lib/i18n';
import { getForecast, getRouting, getRoadmap, getFilters } from '../lib/api';
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

  const [stateName, setStateName] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [market, setMarket] = useState('Pune');
  const [filters, setFilters] = useState(null);

  // activeTab State for Apple-dock router
  const [activeTab, setActiveTab] = useState('home');

  // Independent fetching states
  const [forecast, setForecast] = useState({ data: null, loading: true, error: null });
  const [routing, setRouting] = useState({ data: null, loading: true, error: null });
  const [roadmap, setRoadmap] = useState({ data: null, loading: true, error: null });

  const fetchForecast = async () => {
    setForecast(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getForecast(crop, district, market);
      setForecast({ data, loading: false, error: null });
    } catch (err) {
      console.error(err);
      setForecast({ data: null, loading: false, error: err.message || 'Failed to fetch forecast.' });
    }
  };

  const fetchRouting = async () => {
    setRouting(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Hardcode default lat/lon for origin as requested
      const lat = 18.5204;
      const lon = 73.8567;
      const data = await getRouting(lat, lon, crop, yieldQty);
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
    async function loadFilters() {
      try {
        const data = await getFilters();
        setFilters(data);
      } catch (err) {
        console.error('Failed to load filters:', err);
      }
    }
    loadFilters();
  }, []);

  useEffect(() => {
    fetchForecast();
    fetchRoadmap();
  }, [crop, district, market]);

  useEffect(() => {
    fetchRouting();
  }, [crop, yieldQty, district, market]);

  // Tab views rendering
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            crop={crop}
            yieldQty={yieldQty}
            stateName={stateName}
            district={district}
            market={market}
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
            recommendation={forecast.data?.recommendation}
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

      {/* Filter Bar */}
      <div className="bg-white border-b border-emerald-950/10 shadow-sm z-20 sticky top-18 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-4">
        {filters && (
          <>
            <select
              className="bg-emerald-50 border border-emerald-200 text-[#143D2B] text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#D99B26] outline-none"
              value={stateName}
              onChange={(e) => {
                setStateName(e.target.value);
                const firstDistrict = filters.districts.find(d => d.state === e.target.value)?.district || '';
                setDistrict(firstDistrict);
                const firstMarket = filters.markets.find(m => m.district === firstDistrict)?.market || '';
                setMarket(firstMarket);
              }}
            >
              {filters.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              className="bg-emerald-50 border border-emerald-200 text-[#143D2B] text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#D99B26] outline-none"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                const firstMarket = filters.markets.find(m => m.district === e.target.value)?.market || '';
                setMarket(firstMarket);
              }}
            >
              {filters.districts.filter(d => d.state === stateName).map(d => <option key={d.district} value={d.district}>{d.district}</option>)}
            </select>
            <select
              className="bg-emerald-50 border border-emerald-200 text-[#143D2B] text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#D99B26] outline-none"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
            >
              {filters.markets.filter(m => m.district === district).map(m => <option key={m.market} value={m.market}>{m.market}</option>)}
            </select>
            <select
              className="bg-emerald-50 border border-emerald-200 text-[#143D2B] text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#D99B26] outline-none"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
            >
              {filters.commodities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <span className="text-sm text-[#143D2B]">Qty (q):</span>
              <input
                type="number"
                className="w-16 bg-transparent text-[#143D2B] text-sm outline-none"
                value={yieldQty}
                onChange={(e) => setYieldQty(Number(e.target.value))}
                min="1"
              />
            </div>
          </>
        )}
        {stateName !== 'Maharashtra' && (
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
            Historical data only
          </span>
        )}
      </div>

      {/* Main Tab Render Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </main>

      {/* Floating Bottom Menu */}
      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
      
    </div>
  );
}
