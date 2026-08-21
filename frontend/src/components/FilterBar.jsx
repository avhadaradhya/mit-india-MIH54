import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Sprout, MapPin, Scale, ChevronDown } from 'lucide-react';

export default function FilterBar({ crop, setCrop, yieldQty, setYieldQty, location, setLocation }) {
  const { t } = useLanguage();

  const crops = [
    { value: 'Onion', label: t('onion') },
    { value: 'Tomato', label: t('tomato') },
    { value: 'Wheat', label: t('wheat') },
    { value: 'Soybean', label: t('soybean') }
  ];

  const locations = [
    { value: 'Pune', label: t('pune') },
    { value: 'Solapur', label: t('solapur') },
    { value: 'Nashik', label: t('nashik') },
    { value: 'Ahmednagar', label: t('ahmednagar') }
  ];

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Crop Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-2" htmlFor="crop-select" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Sprout className="w-4 h-4 text-emerald-800" />
            {t('crop')}
          </label>
          <div className="relative">
            <select
              id="crop-select"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none min-h-[44px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {crops.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Farm Yield Input (Stepper) */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-2" htmlFor="yield-input" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Scale className="w-4 h-4 text-emerald-800" />
            {t('yield')}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYieldQty(Math.max(1, yieldQty - 5))}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-extrabold transition-all duration-150 cursor-pointer min-w-[44px] min-h-[44px]"
              aria-label="Decrease yield by 5 quintals"
            >
              -
            </button>
            <input
              id="yield-input"
              type="number"
              min="1"
              value={yieldQty}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1) {
                  setYieldQty(val);
                } else if (e.target.value === '') {
                  setYieldQty('');
                }
              }}
              onBlur={() => {
                if (yieldQty === '' || yieldQty < 1) {
                  setYieldQty(50);
                }
              }}
              className="flex-1 h-12 text-center rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent min-h-[44px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
            <button
              type="button"
              onClick={() => setYieldQty((yieldQty || 0) + 5)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#143D2B] border border-[#143D2B] hover:bg-[#1c4e38] text-white font-extrabold transition-all duration-150 cursor-pointer min-w-[44px] min-h-[44px]"
              aria-label="Increase yield by 5 quintals"
            >
              +
            </button>
          </div>
        </div>

        {/* Current Location Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-600 flex items-center gap-2" htmlFor="location-select" style={{ fontFamily: 'Inter, sans-serif' }}>
            <MapPin className="w-4 h-4 text-emerald-800" />
            {t('location')}
          </label>
          <div className="relative">
            <select
              id="location-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-12 pl-4 pr-10 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all duration-200 cursor-pointer appearance-none min-h-[44px]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {locations.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
