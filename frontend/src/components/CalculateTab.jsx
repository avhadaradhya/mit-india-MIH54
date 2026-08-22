import React, { useState, useEffect } from 'react';
import { AlertCircle, Truck, Sparkles, ChevronRight, Leaf, Fuel, TrendingUp, RotateCcw, AlertTriangle, MapPin } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

const INVESTMENT_RANGES = {
  'Wheat':  { min: 900,  default: 1800, max: 4500, step: 100 },
  'Onion':  { min: 450,  default: 900,  max: 2200, step: 50 },
  'Tomato': { min: 350,  default: 700,  max: 1750, step: 50 },
  'Potato': { min: 500,  default: 1000, max: 2500, step: 50 },
  'Rice':   { min: 800,  default: 1600, max: 4000, step: 100 },
};

export default function CalculateTab({ crop, yieldQty, routingData, loading, error, retryFn }) {
  const { t } = useLanguage();
  
  // Local states for overrides
  const [cultivationCost, setCultivationCost] = useState(1500); // per quintal approx
  const [distanceOverride, setDistanceOverride] = useState(null);
  const [fuelCost, setFuelCost] = useState(40); // ₹ per km
  const [vehicleRent, setVehicleRent] = useState(14); // ₹ per km
  const [cropSwitchMsg, setCropSwitchMsg] = useState("");

  useEffect(() => {
    if (crop && INVESTMENT_RANGES[crop]) {
      const range = INVESTMENT_RANGES[crop];
      setCultivationCost(range.default);
      setCropSwitchMsg(`Switched to ${crop} — investment range updated to ₹${range.min}–₹${range.max}/Qtl`);
      const timer = setTimeout(() => setCropSwitchMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [crop]);

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-48 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-48 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-64 bg-white/50 rounded-3xl w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-800 mb-2 font-serif">Calculation Failed</h3>
        <p className="text-sm text-gray-500 mb-6 font-sans">{error}</p>
        <button 
          onClick={retryFn}
          className="bg-[#143D2B] text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:bg-[#1a4f38] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!routingData) return null;

  const originalMarkets = routingData?.markets || [];
  
  // Recalculate based on overrides
  const markets = originalMarkets.map(m => {
    const dist = distanceOverride || m.distance_km;
    const diesel_cost = dist * fuelCost;
    const freight_base = dist * vehicleRent;
    const transit_cost = dist * (fuelCost + vehicleRent);
    
    const gross = m.raw_rate * yieldQty;
    const net_profit = gross - transit_cost - m.mandi_fee - m.spoilage_loss;
    const true_net = net_profit - (cultivationCost * yieldQty); // after cultivation
    
    return {
      ...m,
      calc_dist: dist,
      calc_transit: transit_cost,
      calc_net: net_profit,
      calc_true_net: true_net
    };
  });

  const sortedMarkets = [...markets].sort((a, b) => b.calc_net - a.calc_net);
  const nearestReal = [...markets].sort((a, b) => a.distance_km - b.distance_km)[0];
  const currentRange = (crop && INVESTMENT_RANGES[crop]) ? INVESTMENT_RANGES[crop] : { min: 500, default: 1500, max: 5000, step: 50 };
  const isPerishable = ['Onion', 'Tomato', 'Potato'].includes(crop);

  return (
    <div className="p-4 pb-8 max-w-6xl mx-auto space-y-6">
      
      {cropSwitchMsg && (
        <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <Leaf size={16} />
          {cropSwitchMsg}
        </div>
      )}

      {/* Top Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Card 1: Crop & Production Inputs */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-emerald-900/5 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Leaf size={16} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Crop & Production</h3>
          </div>
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                <span>Yield (Quintals)</span>
                <span className="text-slate-900 font-semibold">{yieldQty} Qtl</span>
              </label>
              <p className="text-xs text-slate-400">Driven by global control bar.</p>
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                <span>Cost of Cultivation (₹/Qtl)</span>
                <span className="text-slate-900 font-semibold">₹{cultivationCost}</span>
              </label>
              <input 
                type="range" 
                min={currentRange.min} max={currentRange.max} step={currentRange.step}
                value={cultivationCost}
                onChange={(e) => setCultivationCost(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>₹{currentRange.min}</span>
                <span>₹{currentRange.max}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Transport & Fuel */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-emerald-900/5 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Fuel size={16} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">What-If Transport Cost</h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-6">Recalculates profit using a hypothetical distance — does not change real market distances.</p>
          
          <div className="space-y-6">
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                <span>Custom Distance (km)</span>
                <span className="text-slate-900 font-semibold">{distanceOverride || 'Auto (OSRM)'}</span>
              </label>
              <input 
                type="range" 
                min="0.5" max="300" step="0.5"
                value={distanceOverride || 50}
                onChange={(e) => setDistanceOverride(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1 mb-2">
                <span><button onClick={() => setDistanceOverride(null)} className="text-blue-600 underline flex items-center gap-1"><RotateCcw size={12}/> Reset to Auto</button></span>
                <span>300 km</span>
              </div>
              
              {isPerishable && distanceOverride > 150 && (
                <div className="mt-2 text-amber-700 bg-amber-50 p-2 rounded-lg text-xs flex items-center gap-2 border border-amber-200">
                  <AlertTriangle size={14} />
                  ⚠️ Long-distance — consider cold storage for perishable crops
                </div>
              )}
            </div>
            
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                <span>Fuel Cost (₹/km)</span>
                <span className="text-slate-900 font-semibold">₹{fuelCost.toFixed(1)}</span>
              </label>
              <input 
                type="range" 
                min="5" max="80" step="1"
                value={fuelCost}
                onChange={(e) => setFuelCost(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span><button onClick={() => setFuelCost(40)} className="text-blue-600 underline flex items-center gap-1"><RotateCcw size={12}/> Reset</button></span>
                <span>₹80</span>
              </div>
            </div>
            
            <div>
              <label className="flex justify-between text-sm font-medium text-slate-600 mb-2">
                <span>Vehicle Rent (₹/km)</span>
                <span className="text-slate-900 font-semibold">₹{vehicleRent.toFixed(1)}</span>
              </label>
              <input 
                type="range" 
                min="2" max="50" step="1"
                value={vehicleRent}
                onChange={(e) => setVehicleRent(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span><button onClick={() => setVehicleRent(14)} className="text-blue-600 underline flex items-center gap-1"><RotateCcw size={12}/> Reset</button></span>
                <span>₹50</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Card 3: Arbitrage Matrix */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-emerald-900/5 rounded-3xl p-6 overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <TrendingUp size={16} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Arbitrage Matrix</h3>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">APMC</th>
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross</th>
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transit</th>
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mandi Fee</th>
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</th>
                <th className="pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">True Net (In-Pocket)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMarkets.map((m, idx) => (
                <tr key={idx} className={`transition-colors ${idx === 0 ? 'bg-emerald-50/50' : ''}`}>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{m.name}</p>
                        {distanceOverride ? (
                          <>
                            <p className="text-[11px] text-slate-500">{m.distance_km} km (real)</p>
                            <p className="text-[11px] text-blue-600 font-medium">{distanceOverride} km (what-if)</p>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-500">{m.distance_km} km</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <p className="text-sm font-medium text-slate-700">₹{m.gross_revenue ? m.gross_revenue.toLocaleString() : (m.raw_rate * yieldQty).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">@ ₹{m.raw_rate}/q</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm text-red-500 font-medium">-₹{Math.round(m.calc_transit).toLocaleString()}</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm text-amber-600 font-medium">-₹{Math.round(m.mandi_fee).toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400">{(m.cess_pct * 100).toFixed(1)}%</p>
                  </td>
                  <td className="py-4">
                    <p className="text-sm font-bold text-emerald-600">₹{Math.round(m.calc_net).toLocaleString()}</p>
                  </td>
                  <td className="py-4 text-right">
                    <div className="inline-block px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                      <p className={`text-sm font-bold ${m.calc_true_net > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        ₹{Math.round(m.calc_true_net).toLocaleString()}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 4: Nearest Real Market Suggestion */}
      {nearestReal && (
        <div className="bg-blue-50/80 border border-blue-200/60 rounded-3xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <MapPin size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Nearest Real Market Insight</h4>
            <p className="text-sm text-blue-800">
              Did you know <span className="font-semibold">{nearestReal.name}</span> is only <span className="font-semibold">{nearestReal.distance_km} km</span> away with a net profit of <span className="font-semibold text-emerald-700">₹{Math.round(nearestReal.calc_net).toLocaleString()}</span>? Compare before committing to a farther market.
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
}
