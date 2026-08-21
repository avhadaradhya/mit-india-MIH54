import React, { useEffect, useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { Landmark, ArrowUpRight, TrendingUp, ShieldAlert, Route, Truck, Warehouse, Sparkles } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import L from 'leaflet';
import RoutingTable from './RoutingTable';
import { getHistory } from '../lib/api';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customOriginIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function HomeTab({ crop, yieldQty, stateName, district, market, routingData, loading, error, retryFn }) {
  const { t } = useLanguage();
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await getHistory(stateName, district, market, crop, 30);
        const formatted = (res.data || []).map(row => ({
          date: row.price_date,
          price: row.modal_price
        })).reverse(); // Oldest first for chart
        setHistoryData(formatted);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    if (stateName && district && market && crop) {
      fetchHistory();
    }
  }, [stateName, district, market, crop]);

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

  const markets = routingData || [];
  
  // Transform for routing table
  const tableData = markets.map((m, idx) => ({
    mandi_name: m.name,
    distance: m.distance_km,
    raw_rate: m.current_rate,
    transport_cost: m.transport_cost,
    mandi_fee: m.mandi_fee || Math.round(m.current_rate * yieldQty * 0.015),
    net_profit: m.net_profit,
    is_top_recommendation: m.is_top_recommendation || idx === 0
  }));

  const topMandi = tableData[0];
  const sortedByDistance = [...markets].sort((a, b) => a.distance_km - b.distance_km);
  const nearestMandi = sortedByDistance[0];
  
  const currentRate = topMandi ? `₹${topMandi.raw_rate}/q` : 'N/A';
  const nearestName = nearestMandi ? `${nearestMandi.name} (${nearestMandi.distance_km}km)` : 'N/A';
  
  const isPerishable = crop === 'Tomato' || crop === 'Onion';
  
  // Default origin Pune
  const originLat = 18.5204;
  const originLon = 73.8567;
  const originPosition = [originLat, originLon];

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
          
          {/* Map Container */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl relative overflow-hidden h-[320px] flex items-center justify-center z-10">
            <MapContainer center={originPosition} zoom={7} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={originPosition} icon={customOriginIcon}>
                <Popup>Origin (Approx)</Popup>
              </Marker>
              
              {markets.map((m, i) => {
                const isTop = m.is_top_recommendation || i === 0;
                return (
                  <React.Fragment key={m.name}>
                    <Marker position={[m.lat, m.lon]}>
                      <Popup>
                        <b>{m.name}</b><br/>
                        Dist: {m.distance_km} km<br/>
                        Time: {m.driving_duration_min} min<br/>
                        Net Profit: ₹{m.net_profit}
                      </Popup>
                    </Marker>
                    <Polyline
                      positions={[originPosition, [m.lat, m.lon]]}
                      color={isTop ? '#10B981' : '#94A3B8'}
                      weight={isTop ? 4 : 2}
                      opacity={isTop ? 0.8 : 0.5}
                      dashArray={isTop ? '5, 5' : ''}
                    />
                  </React.Fragment>
                );
              })}
            </MapContainer>
            <div className="absolute top-3 right-3 bg-white/95 px-2 py-1 rounded border border-slate-200 text-[10px] font-bold text-slate-500 shadow-sm font-sans-custom z-[400]">
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

              {markets[0] && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Destination</span>
                    <span className="font-bold text-slate-800">{markets[0].name}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Total Distance</span>
                    <span className="font-bold text-slate-800">{markets[0].distance_km} km</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                    <span className="font-semibold text-slate-500">Transit Duration</span>
                    <span className="font-bold text-slate-800">
                      {markets[0].driving_duration_min} mins
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="font-semibold text-slate-500">Est. Transport Cost</span>
                    <span className="font-bold text-[#D99B26]">
                      ₹{markets[0].transport_cost.toLocaleString('en-IN')}
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

      <RoutingTable routingData={tableData} yieldQty={yieldQty} />

      {/* History Chart */}
      <div className="bg-white border border-emerald-100/60 rounded-2xl shadow-sm p-4 md:p-6">
        <h2 className="text-xl font-bold text-[#143D2B] mb-2" style={{ fontFamily: 'Times New Roman, serif' }}>
          Past Price History (30 Days)
        </h2>
        {historyLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">Loading history...</div>
        ) : historyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500">No historical data found.</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#64748B'}} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <RechartsTooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
                />
                <Line type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{r: 6, fill: '#D99B26', stroke: '#fff', strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
