import React, { useEffect, useMemo, useState } from 'react';
import { Bell, MapPin, Sprout, Warehouse, Scale } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import HomeTab from '../components/HomeTab';
import ForecastTab from '../components/ForecastTab';
import CalculateTab from '../components/CalculateTab';
import RoadmapTab from '../components/RoadmapTab';
import ProfileTab from '../components/ProfileTab';
import BottomDock from '../components/BottomDock';
import LanguageToggle from '../components/LanguageToggle';
import { 
  getForecast, 
  getRouting, 
  getRoadmap, 
  getFilters, 
  getRecommendation 
} from '../lib/api';

export default function Dashboard({ authUser, handleLogout }) {
  const { t } = useLanguage();

  const [crop, setCrop] = useState('Onion');
  const [yieldQty, setYieldQty] = useState(50);
  const [district, setDistrict] = useState('Pune');
  const [market, setMarket] = useState('Pune');
  
  // Strict scope arrays based on PRD
  const allowedCrops = ['Onion', 'Potato', 'Tomato', 'Wheat', 'Rice'];
  const allowedDistricts = ['Ahilyanagar', 'Pune', 'Nashik'];
  
  const [filters, setFilters] = useState(null);
  const [horizon, setHorizon] = useState(14);
  const [activeTab, setActiveTab] = useState('home');
  const [forecast, setForecast] = useState({ data: null, loading: true, error: null });
  const [routing, setRouting] = useState({ data: null, loading: true, error: null });
  const [roadmap, setRoadmap] = useState({ data: null, loading: true, error: null });
  const [recommendation, setRecommendation] = useState({ data: null, loading: false, error: null });

  const fetchForecast = async (h = horizon) => {
    setForecast(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getForecast(crop, district, market, h);
      setForecast({ data, loading: false, error: null });
    } catch (error) {
      setForecast({ data: null, loading: false, error: error.message || 'Failed to fetch forecast' });
    }
  };

  const fetchRouting = async () => {
    setRouting(prev => ({ ...prev, loading: true, error: null }));
    try {
      const districtCoords = {
        'Ahilyanagar': { lat: 19.0952, lon: 74.7496 },
        'Pune': { lat: 18.5204, lon: 73.8567 },
        'Nashik': { lat: 19.9975, lon: 73.7898 }
      };
      
      const mandiCoords = {
        "Ahilyanagar APMC": { lat: 19.1120, lon: 74.7180 },
        "Rahata": { lat: 19.6880, lon: 74.4920 },
        "Pune Gultekdi": { lat: 18.4980, lon: 73.8680 },
        "Khed APMC": { lat: 18.8450, lon: 73.9040 },
        "Nashik APMC": { lat: 20.0120, lon: 73.8050 },
        "Lasalgaon": { lat: 20.1480, lon: 74.2280 }
      };

      // Use APMC Mandi location if selected, otherwise district center
      const loc = (market && mandiCoords[market]) ? mandiCoords[market] : (districtCoords[district] || districtCoords['Pune']);
      
      const data = await getRouting(loc.lat, loc.lon, crop, Number(yieldQty) || 0);
      setRouting({ data, loading: false, error: null });
    } catch (error) {
      setRouting({ data: null, loading: false, error: error.message || 'Failed to fetch routing' });
    }
  };

  const fetchRoadmap = async () => {
    setRoadmap(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params = new URLSearchParams({
        crop,
        location: district,
        market,
        quantity: String(Number(yieldQty) || 0),
      });
      const response = await fetch(`http://127.0.0.1:8000/api/routing/roadmap?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch roadmap');
      }
      const data = await response.json();
      setRoadmap({ data, loading: false, error: null });
    } catch (error) {
      setRoadmap({ data: null, loading: false, error: error.message || 'Failed to fetch roadmap' });
    }
  };

  const fetchRecommendation = async () => {
    setRecommendation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getRecommendation(crop, district, market);
      setRecommendation({ data, loading: false, error: null });
    } catch (error) {
      setRecommendation({ data: null, loading: false, error: error.message || 'Failed to fetch recommendation' });
    }
  };

  const loadFilters = async () => {
    try {
      const data = await getFilters();
      setFilters(data);
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
  };

  // Effects
  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    fetchForecast(horizon);
    fetchRoadmap();
    fetchRecommendation();
  }, [crop, district, market, yieldQty, horizon]);

  useEffect(() => {
    fetchRouting();
  }, [crop, yieldQty, district]);

  useEffect(() => {
    if (!filters || !district) return;
    const districtMarkets = filters.markets
      ?.filter((item) => item.district === district)
      .map((item) => item.market) || [];

    if (!districtMarkets.includes(market) && districtMarkets.length) {
      // Prioritize known mandis
      const known = districtMarkets.find(m => ['Ahilyanagar Apmc', 'Rahata', 'Pune', 'Khed Apmc', 'Nasik', 'Lasalgaon'].includes(m));
      setMarket(known || districtMarkets[0]);
    }
  }, [filters, district, market]);

  const districtMarkets = useMemo(
    () => filters?.markets?.filter((item) => item.district === district).map((item) => item.market) || [],
    [filters, district]
  );

  const showGlobalFilters = activeTab !== 'profile';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f6f1e4_0%,#edf6f1_38%,#f7faf9_100%)] flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-white/60 bg-[#103527]/90 backdrop-blur-xl text-white px-4 py-4 flex justify-between items-center shadow-lg shadow-[#103527]/10">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#e0a53a] to-[#cf7f1b] rounded-2xl flex items-center justify-center font-bold text-white shadow-sm">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" onError={(e) => e.target.style.display = 'none'} />
            <span className="absolute">K</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-wide">KrushakSetu</h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageToggle />
          <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#143D2B]"></span>
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24 overflow-y-auto">
        {showGlobalFilters && (
          <section className="px-4 pt-4">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/60 bg-white/80 shadow-xl shadow-emerald-950/5 backdrop-blur-xl">
              <div className="bg-[linear-gradient(135deg,#123827_0%,#1d5a42_55%,#dca248_160%)] px-5 py-5 text-white">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/80">Decision cockpit</p>
                    <h2 className="mt-1 text-2xl font-semibold">Plan by crop, market, and quantity</h2>
                    <p className="mt-1 max-w-2xl text-sm text-emerald-50/85">
                      One control bar feeds every page so the forecast, routing, and roadmap stay aligned.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2 text-emerald-50">
                      <Warehouse className="h-4 w-4" />
                      <span>{t(crop.toLowerCase()) || crop} in {t(district.toLowerCase()) || district}</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-100/75">Target market: {market} • Qty: {yieldQty} qtl</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 px-5 py-5 md:grid-cols-4">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <MapPin className="h-4 w-4 text-[#1d5a42]" />
                    {t('district')}
                  </span>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1d5a42] focus:bg-white"
                  >
                    {allowedDistricts.map((item) => (
                      <option key={item} value={item} style={{color:'#334155',backgroundColor:'#fff'}}>{t(item.toLowerCase()) || item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Warehouse className="h-4 w-4 text-[#1d5a42]" />
                    {t('mandi_name')}
                  </span>
                  <select
                    value={market}
                    onChange={(e) => setMarket(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1d5a42] focus:bg-white appearance-auto"
                  >
                    {districtMarkets.length === 0 && (
                      <option value="" style={{color:'#334155',backgroundColor:'#fff'}}>Loading markets...</option>
                    )}
                    {districtMarkets.map((item) => (
                      <option key={item} value={item} style={{color:'#334155',backgroundColor:'#fff'}}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Sprout className="h-4 w-4 text-[#1d5a42]" />
                    {t('crop')}
                  </span>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1d5a42] focus:bg-white"
                  >
                    {allowedCrops.map((item) => (
                      <option key={item} value={item} style={{color:'#334155',backgroundColor:'#fff'}}>{t(item.toLowerCase()) || item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <Scale className="h-4 w-4 text-[#1d5a42]" />
                    {t('yield')}
                    {yieldQty > 500 && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg normal-case tracking-normal">Unusually large quantity</span>}
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={yieldQty}
                    onChange={(e) => setYieldQty(Math.max(1, Math.min(2000, Number(e.target.value) || 1)))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1d5a42] focus:bg-white"
                  />
                </label>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'home' && (
          <HomeTab
            crop={crop}
            yieldQty={yieldQty}
            district={district}
            market={market}
            routingData={routing.data}
            loading={routing.loading}
            error={routing.error}
            retryFn={fetchRouting}
            recommendation={recommendation.data}
          />
        )}
        
        {activeTab === 'forecast' && (
          <ForecastTab
            crop={crop}
            district={district}
            market={market}
            forecastData={forecast.data}
            recommendation={recommendation.data}
            loading={forecast.loading}
            error={forecast.error}
            retryFn={() => fetchForecast(horizon)}
            horizon={horizon}
            setHorizon={setHorizon}
          />
        )}
        
        {activeTab === 'calculate' && (
          <CalculateTab
            crop={crop}
            yieldQty={yieldQty}
            district={district}
            routingData={routing.data}
            loading={routing.loading}
            error={routing.error}
            retryFn={fetchRouting}
          />
        )}
        
        {activeTab === 'roadmap' && (
          <RoadmapTab
            crop={crop}
            district={district}
            market={market}
            roadmapData={roadmap.data}
            recommendation={recommendation.data}
            loading={roadmap.loading}
            error={roadmap.error}
            retryFn={fetchRoadmap}
            yieldQty={yieldQty}
          />
        )}
        
        {activeTab === 'profile' && (
          <ProfileTab
            authUser={authUser}
            handleLogout={handleLogout}
            crop={crop}
            district={district}
          />
        )}
      </main>

      <BottomDock activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
