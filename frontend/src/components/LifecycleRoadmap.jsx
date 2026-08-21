import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { Sprout, CloudSun, Warehouse, TrendingUp, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

const IconMap = {
  Sprout: Sprout,
  CloudSun: CloudSun,
  Warehouse: Warehouse,
  TrendingUp: TrendingUp
};

export default function LifecycleRoadmap({ roadmapData }) {
  const { t } = useLanguage();
  const [expandedSteps, setExpandedSteps] = useState({
    0: false,
    1: false,
    2: false,
    3: false
  });

  if (!roadmapData || !roadmapData.steps) return null;

  const { perishable, steps } = roadmapData;

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStep(index);
    }
  };

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-[#143D2B] mb-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        {t('lifecycle_roadmap')}
      </h2>

      {/* Stepper Container: Grid-based responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        
        {/* Connection line for Desktop horizontal view */}
        <div className="hidden md:block absolute top-7 left-12 right-12 h-0.5 bg-emerald-100 z-0"></div>

        {steps.map((step, index) => {
          const StepIcon = IconMap[step.icon] || Sprout;
          const isExpanded = expandedSteps[index];
          const isStorageStep = index === 2; // Step 3 (0-indexed)

          return (
            <div 
              key={step.phase} 
              className={`flex flex-col relative z-10 bg-slate-50/50 md:bg-transparent p-4 md:p-0 rounded-xl border border-slate-100 md:border-0 ${
                isExpanded ? 'ring-1 ring-emerald-600/20 shadow-sm' : ''
              }`}
            >
              
              {/* Icon & Connection lines */}
              <div className="flex md:flex-col items-center gap-4 md:gap-2 mb-3">
                <div 
                  className={`w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-sm shrink-0 transition-all duration-200 ${
                    isExpanded 
                      ? 'bg-[#143D2B] text-white border-[#143D2B]' 
                      : 'bg-white text-emerald-800 border-emerald-100'
                  }`}
                >
                  <StepIcon className="w-6 h-6" />
                </div>
                
                <div className="flex flex-col md:items-center">
                  <span 
                    className="text-[10px] font-black uppercase tracking-wider text-emerald-850"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {t('today') !== 'आज' ? `Step ${index + 1}` : `पायरी ${index + 1}`}
                  </span>
                  <h3 
                    className="text-base font-bold text-slate-800 text-left md:text-center" 
                    style={{ fontFamily: 'Times New Roman, serif' }}
                  >
                    {step.phase}
                  </h3>
                </div>
              </div>

              {/* Card Content */}
              <div className="flex-1 flex flex-col justify-between bg-white md:bg-slate-50/40 border border-slate-100 hover:border-emerald-250 rounded-xl p-4 transition-all duration-200 font-sans-custom">
                
                <div>
                  <h4 className="text-sm font-bold text-[#143D2B] mb-1.5">
                    {step.title}
                  </h4>

                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">
                    {step.summary}
                  </p>

                  {/* Branching indicator (Only for Step 3: Storage Strategy) */}
                  {isStorageStep && (
                    <div className="mb-3">
                      {perishable ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-150 text-[10px] font-extrabold px-2 py-0.75 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                          {t('quick_sell')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-extrabold px-2 py-0.75 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {t('storage_buffer')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Full details (Collapsible) */}
                  <div 
                    id={`step-details-${index}`}
                    aria-hidden={!isExpanded}
                    className={`transition-all duration-200 overflow-hidden text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-2 mt-2 ${
                      isExpanded ? 'max-h-[250px] opacity-100' : 'max-h-0 opacity-0 border-none pt-0 mt-0'
                    }`}
                  >
                    {step.details}
                  </div>
                </div>

                {/* Read More Toggle button */}
                <button
                  type="button"
                  onClick={() => toggleStep(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  aria-expanded={isExpanded}
                  aria-controls={`step-details-${index}`}
                  className="mt-3 w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold text-slate-500 hover:text-[#143D2B] hover:bg-slate-150 rounded transition-all duration-150 cursor-pointer min-h-[36px]"
                >
                  <span>{isExpanded ? t('read_less') : t('read_more')}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}
