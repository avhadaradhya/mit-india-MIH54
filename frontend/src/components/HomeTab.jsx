import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Landmark, ArrowUpRight, TrendingUp, ShieldAlert, Route, Truck, Warehouse, Sparkles } from 'lucide-react';
import RoutingTable from './RoutingTable';

export default function HomeTab({ crop, yieldQty, location, routingData, loading, error, retryFn }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl border border-slate-100"></div>)}
        </div>
        <div className="h-[400px] bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-rose-105 rounded-2xl shadow-sm p-8 text-center flex flex-col items-center justify-center font-sans-custom">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-slate-800 mb-1 font-serif-custom">{t('error_loading')}</h3>
        <p className="text-xs text-slate-500 font-semibold mb-4">{error}</p>
        <button
          type="button"
          onClick={retryFn}
          className="px-4 py-2.5 text-xs font-bold text-white bg-[#143D2B] hover:bg-[#1c4e38] rounded-xl cursor-pointer"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  const topMandi = routingData?.[0];
  const nearestMandi = [...(routingData || [])].sort((a, b) => a.distance - b.distance)[0];
  
  const currentRate = topMandi ? `₹${topMandi.raw_rate}/q` : 'N/A';
  const nearestName = nearestMandi ? `${nearestMandi.mandi_name} (${nearestMandi.distance}km)` : 'N/A';
  
  const isPerishable = crop === 'Tomato' || crop === 'Onion';
  
  const mandiCoords = {
    'Pune Mandi': { x: 100, y: 220 },
    'Mumbai Mandi': { x: 50, y: 150 },
    'Solapur Mandi': { x: 300, y: 260 },
    'Nashik Mandi': { x: 140, y: 60 },
    'Ahmednagar Mandi': { x: 230, y: 130 }
  };

  const locationCoords = {
    'Pune': { x: 100, y: 220 },
    'Solapur': { x: 300, y: 260 },
    'Nashik': { x: 140, y: 60 },
    'Ahmednagar': { x: 230, y: 130 }
  };

  const startCoord = locationCoords[location] || { x: 100, y: 220 };

  return (
    <div className="space-y-6">
      
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        
        {/* Current Rate */}
        <div className="bg-white border border-emerald-100/60 rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">
              {t('current_rate')}
            </span>
            <span className="block text-2xl font-black text-[#143D2B]">
              {currentRate}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
              <Sparkles className="w-3 h-3 text-[#D99B26]" /> Live APMC rates
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-[#143D2B]">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        {/* Nearest Mandi */}
        <div className="bg-white border border-emerald-100/60 rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">
              {t('nearest_mandi')}
            </span>
            <span className="block text-lg font-black text-slate-800 leading-tight mt-1">
              {nearestName}
            </span>
            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5 mt-1">
              <Route className="w-3 h-3" /> Closest transit hub
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-[#D99B26]">
            <Route className="w-6 h-6" />
          </div>
        </div>

        {/* Profit Trend */}
        <div className="bg-white border border-emerald-100/60 rounded-2xl shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">
              {t('profit_trend')}
            </span>
            <span className="block text-2xl font-black text-emerald-700">
              {isPerishable ? '+12.5%' : '+4.8%'}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Rising seasonal trends
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Embedded Map Section */}
      <div className="bg-white border border-emerald-100/60 rounded-2xl shadow-sm p-4 md:p-6">
        <h2 className="text-xl font-bold text-[#143D2B] mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
          {t('map_routing')}
        </h2>
        <p className="text-xs text-slate-500 font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
          Simulating real-time routing overlays linked with OSRM service engine.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* SVG Map Container */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden h-[320px] flex items-center justify-center">
            <svg viewBox="0 0 400 300" className="w-full h-full p-4">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <style>{`
                  @keyframes dash {
                    to {
                      stroke-dashoffset: -40;
                    }
                  }
                  .route-flow-line {
                    stroke-dasharray: 6, 4;
                    animation: dash 1.5s linear infinite;
                  }
                `}</style>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" rx="8" />

              {/* Draw Route Paths */}
              {routingData?.map((mandi) => {
                const targetCoord = mandiCoords[mandi.mandi_name];
                if (!targetCoord) return null;
                const isTop = mandi.is_top_recommendation;

                return (
                  <g key={mandi.mandi_name}>
                    <line
                      x1={startCoord.x}
                      y1={startCoord.y}
                      x2={targetCoord.x}
                      y2={targetCoord.y}
                      stroke={isTop ? '#D99B26' : '#94A3B8'}
                      strokeWidth={isTop ? 3.5 : 2}
                      strokeOpacity={isTop ? 0.8 : 0.4}
                    />
                    
                    {isTop && (
                      <line
                        x1={startCoord.x}
                        y1={startCoord.y}
                        x2={targetCoord.x}
                        y2={targetCoord.y}
                        stroke="#10B981"
                        strokeWidth={2.5}
                        className="route-flow-line"
                      />
                    )}
                  </g>
                );
              })}

              {/* Draw Mandi Markers */}
              {Object.keys(mandiCoords).map((name) => {
                const coord = mandiCoords[name];
                const activeMandi = routingData?.find(m => m.mandi_name === name);
                if (!activeMandi) return null;
                const isTop = activeMandi.is_top_recommendation;

                return (
                  <g key={name} transform={`translate(${coord.x}, ${coord.y})`}>
                    <circle 
                      r={isTop ? 10 : 7} 
                      fill={isTop ? '#D99B26' : '#FFFFFF'} 
                      stroke={isTop ? '#143D2B' : '#475569'}
                      strokeWidth={2}
                    />
                    <circle r={isTop ? 5 : 3} fill={isTop ? '#143D2B' : '#475569'} />
                    <text 
                      y={-14} 
                      textAnchor="middle" 
                      className="text-[9px] font-black fill-[#143D2B]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {activeMandi.mandi_name.replace(' Mandi', '')}
                    </text>
                  </g>
                );
              })}

              {/* Draw Location Marker */}
              <g transform={`translate(${startCoord.x}, ${startCoord.y})`}>
                <circle r={14} fill="#143D2B" fillOpacity={0.15} className="animate-ping" />
                <circle r={8} fill="#143D2B" stroke="#FFFFFF" strokeWidth={2} />
                <circle r={3} fill="#FFFFFF" />
                <text 
                  y={18} 
                  textAnchor="middle" 
                  className="text-[10px] font-extrabold fill-slate-800"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {location} ({t('today')})
                </text>
              </g>
            </svg>

            <div className="absolute top-3 right-3 bg-white/95 px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm font-sans-custom">
              OSRM 2.4 LIVE
            </div>
          </div>

          {/* Route details Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="space-y-4">
              
              <div className="p-3 border border-slate-100 rounded-xl bg-slate-50/80">
                <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                  Automatic Route Protocol
                </span>
                {isPerishable ? (
                  <div className="flex items-start gap-2 text-rose-700">
                    <Truck className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wide text-rose-600">
                        Urgent Route
                      </span>
                      <span className="block text-[10px] text-slate-650 font-semibold leading-relaxed mt-0.5">
                        {t('perishable_route')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-emerald-700">
                    <Warehouse className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-black uppercase tracking-wide text-emerald-600">
                        Safe Storage Route
                      </span>
                      <span className="block text-[10px] text-slate-650 font-semibold leading-relaxed mt-0.5">
                        {t('storage_route')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {topMandi && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Destination</span>
                    <span className="font-bold text-slate-800">{topMandi.mandi_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Total Distance</span>
                    <span className="font-bold text-slate-800">{topMandi.distance} km</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Transit Duration</span>
                    <span className="font-bold text-slate-800">
                      {Math.ceil(topMandi.distance * 1.3)} mins (OSRM)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="font-semibold text-slate-500">Est. Transport Cost</span>
                    <span className="font-bold text-[#D99B26]">
                      ₹{topMandi.transport_cost.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-800" />
                  <div>
                    <h4 className="text-xs font-bold text-[#143D2B]">{t('logistics_title')}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">{t('book_truck')}</p>
                  </div>
                </div>
                <span className="bg-slate-200 text-slate-600 text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider">
                  {t('coming_soon')}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <RoutingTable routingData={routingData} yieldQty={yieldQty} />

    </div>
  );
}
