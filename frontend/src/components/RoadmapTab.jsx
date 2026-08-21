import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { Sprout, CloudSun, Warehouse, TrendingUp, ChevronDown, ChevronUp, CheckCircle2, ShieldAlert } from 'lucide-react';

const IconMap = {
  Sprout: Sprout,
  CloudSun: CloudSun,
  Warehouse: Warehouse,
  TrendingUp: TrendingUp
};

export default function RoadmapTab({ crop, location, roadmapData, loading, error, retryFn }) {
  const { t } = useLanguage();
  const [expandedSteps, setExpandedSteps] = useState({
    0: true,
    1: false,
    2: false,
    3: false
  });

  if (loading) {
    return (
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6 animate-pulse font-sans-custom">
        <div className="h-7 w-44 bg-slate-200 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded"></div>
                <div className="h-10 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-rose-100 rounded-2xl shadow-sm p-6 mb-6 flex flex-col items-center justify-center text-center font-sans-custom">
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

  if (!roadmapData || !roadmapData.steps) return null;

  const { perishable, steps } = roadmapData;

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
      
      <h2 className="text-2xl font-bold text-[#143D2B] mb-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        {t('lifecycle_roadmap')}
      </h2>

      <div className="space-y-4 font-sans-custom">
        {steps.map((step, index) => {
          const StepIcon = IconMap[step.icon] || Sprout;
          const isExpanded = expandedSteps[index];
          const isStorageStep = index === 2; 

          let labelText = '';
          if (index === 0) labelText = t('soil_breed');
          else if (index === 1) labelText = t('sowing_weather');
          else if (index === 2) labelText = t('holding_strategy');
          else if (index === 3) labelText = t('peak_selling');

          return (
            <div 
              key={step.phase}
              className={`border border-slate-100 rounded-xl overflow-hidden transition-all duration-200 ${
                isExpanded ? 'shadow-sm ring-1 ring-emerald-800/10' : ''
              }`}
            >
              
              {/* Trigger */}
              <button
                type="button"
                onClick={() => toggleStep(index)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-100/50 transition-colors cursor-pointer text-left min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 ${
                      isExpanded 
                        ? 'bg-[#143D2B] text-white border-[#143D2B]' 
                        : 'bg-white text-emerald-800 border-emerald-100'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      {labelText}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">
                      {step.phase}: {step.title}
                    </h3>
                  </div>
                </div>

                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Content */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                  
                  <p className="text-xs font-bold text-[#143D2B] leading-relaxed">
                    {step.summary}
                  </p>

                  {/* Branching (Step 3: Holding Strategy) */}
                  {isStorageStep && (
                    <div>
                      {perishable ? (
                        <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-extrabold px-2.5 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                          Perishable: Immediate APMC Direct Sell Advised (Shelf life is under 10 days)
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Non-Perishable: Storage Buffer OK. WDRA Registered Warehouse Holding recommended.
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                    {step.details}
                  </p>

                  {/* Extra OpenWeather / Soil details */}
                  {index === 1 && (
                    <div className="mt-3 p-3 bg-blue-50/40 border border-blue-100/50 rounded-lg text-[11px] text-slate-600 font-semibold leading-relaxed">
                      <strong>OpenWeather Advisory:</strong> Temperature forecast is 24°C - 31°C with 65% humidity. Pre-transplant soil hydration recommended before planting seedlings.
                    </div>
                  )}

                  {index === 0 && (
                    <div className="mt-3 p-3 bg-amber-50/40 border border-amber-100/50 rounded-lg text-[11px] text-slate-600 font-semibold leading-relaxed">
                      <strong>Soil Recommendation:</strong> Black clayey loam soil observed in {location}. Seed varieties listed are tested by MPKV Rahuri for high drought tolerance.
                    </div>
                  )}

                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
