import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useLanguage } from '../lib/i18n';
import { getHistory } from '../lib/api';
import { TrendingUp, MapPin, Activity, AlertCircle, RefreshCw, Navigation, Truck, Package, ThermometerSun, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

export default function HomeTab({ crop, yieldQty, district, market, routingData, loading, error, retryFn, recommendation }) {
  const { t } = useLanguage();
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Define origin mapping
  const origins = {
    'Ahilyanagar': [19.0952, 74.7496],
    'Pune': [18.5204, 73.8567],
    'Nashik': [19.9975, 73.7898]
  };
  const ORIGIN = origins[district] || origins['Pune'];

  useEffect(() => {
    async function fetchHistory() {
      if (!district || !market || !crop) return;
      try {
        setHistoryLoading(true);
        // Using Maharashtra as fixed state for history
        const data = await getHistory("Maharashtra", district, market, crop, 90);
        const series = Array.isArray(data) ? data : data?.data || data?.history || [];
        const normalized = [...series]
          .map((item) => ({
            ...item,
            date: item.date || item.price_date,
            price: item.price ?? item.modal_price,
          }))
          .filter((item) => item.date && item.price)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        setHistoryData(normalized);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, [district, market, crop]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
        <p className="font-medium">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-500 bg-red-50/50 m-4 rounded-3xl border border-red-100">
        <AlertCircle className="w-10 h-10 mb-4 text-red-400" />
        <p className="font-medium text-center px-4">{error}</p>
        {retryFn && (
          <button onClick={retryFn} className="mt-6 px-6 py-2.5 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors">
            {t('retry') || 'Retry'}
          </button>
        )}
      </div>
    );
  }

  const markets = routingData?.markets || [];
  const bestMarket = markets[0];
  const nearestMandi = [...markets].sort((a, b) => a.distance_km - b.distance_km)[0];
  
  let trend = "N/A";
  let isPositiveTrend = true;
  if (historyData.length >= 2) {
    const last = historyData[historyData.length - 1].modal_price || historyData[historyData.length - 1].price;
    const compareIdx = historyData.length >= 7 ? historyData.length - 7 : 0;
    const prev = historyData[compareIdx].modal_price || historyData[compareIdx].price;
    if (last && prev) {
      const pct = ((last - prev) / prev) * 100;
      trend = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      isPositiveTrend = pct >= 0;
    }
  }

  const isPerishable = ['Onion', 'Tomato', 'Potato'].includes(crop);

  return (
    <div className="pb-24 space-y-6 max-w-6xl mx-auto">
      
      {/* Quick Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 pt-4">
        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">{t('current_rate') || 'Current Rate'}</p>
            <p className="text-2xl font-bold text-slate-900">
              ₹{bestMarket ? bestMarket.current_rate?.toLocaleString('en-IN') : '--'}
              <span className="text-sm font-normal text-slate-400 ml-1">/Qtl</span>
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">{t('nearest_mandi') || 'Nearest Mandi'}</p>
            <p className="text-xl font-bold text-slate-900 line-clamp-1">
              {nearestMandi ? nearestMandi.name : '--'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {nearestMandi ? `${nearestMandi.distance_km?.toFixed(1)} km away` : ''}
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 flex items-center gap-4 relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">{t('seven_day_trend') || '7-Day Trend'}</p>
            <p className={`text-2xl font-bold ${isPositiveTrend ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}
            </p>
          </div>
          {isPerishable && (
            <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
              <ThermometerSun size={12} /> Perishable
            </div>
          )}
        </div>
      </div>

      {/* Logistics Teaser & Routing Map */}
      <div className="grid lg:grid-cols-3 gap-6 px-4">
        
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-500" />
              Live Routing Engine
            </h2>
            <p className="text-sm text-slate-500 mt-1">From {district} ({ORIGIN[0]}, {ORIGIN[1]})</p>
          </div>
          <div className="h-[400px] w-full relative z-0">
            <MapContainer center={ORIGIN} zoom={8} className="h-full w-full">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              />
              <Marker position={ORIGIN}>
                <Popup className="font-semibold">{district} (Origin)</Popup>
              </Marker>
              
              {markets.map((m, idx) => {
                if (!m.lat || !m.lon) return null;
                const pos = [m.lat, m.lon];
                const isBest = idx === 0;
                
                let positions = [ORIGIN, pos];
                // Handle actual road paths with GeoJSON if available from OSRM
                if (m.geometry && m.geometry.coordinates) {
                  // OSRM usually returns GeoJSON [lng, lat], Leaflet wants [lat, lng]
                  positions = m.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                }

                return (
                  <React.Fragment key={m.name + idx}>
                    <Marker position={pos}>
                      <Popup>
                        <div className="text-sm">
                          <strong className="block mb-1">{m.name}</strong>
                          <div>Distance: {m.distance_km?.toFixed(1)} km</div>
                          <div>Rate: ₹{m.current_rate}</div>
                          <div className="font-semibold text-emerald-600">Net: ₹{m.net_profit?.toLocaleString('en-IN')}</div>
                        </div>
                      </Popup>
                    </Marker>
                    <Polyline 
                      positions={positions} 
                      color={isBest ? '#10b981' : '#64748b'} 
                      weight={isBest ? 4 : 2}
                      dashArray={(!m.geometry || !m.geometry.coordinates) ? "6, 8" : ""}
                      opacity={0.8}
                    />
                  </React.Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Logistics Teaser */}
        <div className="bg-gradient-to-br from-[#103527] to-[#1a4f3b] text-white rounded-3xl p-6 shadow-xl shadow-emerald-900/20 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 text-white/5">
            <Truck size={160} />
          </div>
          <div>
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-widest text-emerald-300 uppercase mb-4 border border-white/10">
              Coming Soon
            </div>
            <h3 className="text-2xl font-serif mb-2">Logistics <br/>Management</h3>
            <p className="text-emerald-100/70 text-sm mb-6 leading-relaxed">
              Book shared trucks, plan cold-storage transfers, and execute WDRA warehouse deliveries seamlessly.
            </p>
            
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded-2xl border border-white/10">
                <Package className="w-5 h-5 text-amber-400" />
                <span>Warehouse Storage Route</span>
              </li>
              <li className="flex items-center gap-3 text-sm bg-white/5 p-3 rounded-2xl border border-white/10">
                <Navigation className="w-5 h-5 text-blue-400" />
                <span>Immediate APMC Route</span>
              </li>
            </ul>
          </div>
          
          <button className="w-full mt-6 py-3.5 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-2xl font-semibold text-sm flex justify-center items-center gap-2">
            <Truck size={18} />
            Book Shared Truck
          </button>
        </div>

      </div>

      <div className="px-4 grid lg:grid-cols-2 gap-6">
        
        {markets.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">{t('market_comparison') || 'Market Comparison'}</h2>
              {routingData?.message && <p className="text-xs text-slate-400 mt-1">{routingData.message}</p>}
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 rounded-xl">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-l-xl">Market</th>
                    <th className="px-4 py-3 font-semibold">Dist (km)</th>
                    <th className="px-4 py-3 font-semibold">Rate (₹)</th>
                    <th className="px-4 py-3 font-semibold">Transit (₹)</th>
                    <th className="px-4 py-3 font-semibold">Mandi Fee (₹)</th>
                    <th className="px-4 py-3 font-semibold text-right rounded-r-xl">Net Profit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {markets.map((m, idx) => (
                    <tr key={idx} className={idx === 0 ? "bg-emerald-50/50" : "hover:bg-slate-50/50 transition-colors"}>
                      <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {m.name}
                        {idx === 0 && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-200 text-emerald-800 uppercase tracking-wide">Best</span>}
                      </td>
                      <td className="px-4 py-4 text-slate-500">{m.distance_km?.toFixed(1)}</td>
                      <td className="px-4 py-4 text-slate-500">₹{m.current_rate?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-slate-500">₹{m.transit_cost?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-slate-500">₹{m.mandi_fee?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600">₹{m.net_profit?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!markets.length && routingData?.nearest_out_of_radius && (
          <div className="bg-amber-50/80 backdrop-blur-xl rounded-3xl border border-amber-200/60 p-5 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">No markets within {routingData.radius_km} km</h3>
            </div>
            <p className="text-sm text-amber-700">
              Nearest available: <strong>{routingData.nearest_out_of_radius.name}</strong> at {routingData.nearest_out_of_radius.distance_km} km 
              (₹{routingData.nearest_out_of_radius.net_profit?.toLocaleString('en-IN')} net profit) — shown for reference only, not ranked as "Best".
            </p>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-emerald-900/5 overflow-hidden p-5 flex flex-col">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{t('price_history') || '3-Month Price History'}</h2>
            {historyLoading && <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />}
          </div>
          <div className="flex-1 min-h-[250px] w-full">
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                    interval={Math.max(1, Math.floor(historyData.length / 6))}
                    tickFormatter={(val) => {
                      if (!val) return '';
                      const date = new Date(val);
                      return `${date.getDate()}/${date.getMonth()+1}`;
                    }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={(d) => d.modal_price || d.price} 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                {!historyLoading && (t('no_history_data') || 'No historical data available for this selection.')}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
