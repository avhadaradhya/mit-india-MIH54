import React, { useState, useEffect } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Sprout, CloudSun, Warehouse, TrendingUp, Sparkles, AlertTriangle, Truck } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { getExplanation, getCropRecommendation } from '../lib/api';

const ICON_MAP = {
  Sprout: Sprout,
  CloudSun: CloudSun,
  Warehouse: Warehouse,
  TrendingUp: TrendingUp,
  Truck: Truck
};

const StepAccordion = ({ step, index, isOpen, toggle }) => {
  const Icon = ICON_MAP[step.icon] || Sprout;
  
  return (
    <div className={`rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden mb-4 ${isOpen ? 'bg-white/90 border-emerald-200/60 shadow-lg shadow-emerald-900/5' : 'bg-white/60 border-white/60 hover:bg-white/80'}`}>
      <button 
        onClick={() => toggle(index)}
        className="w-full p-6 flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl shadow-inner transition-colors duration-300 ${isOpen ? 'bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-slate-100 text-slate-500'}`}>
            <Icon size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 block mb-1">Phase {index + 1} • {step.phase}</span>
            <h4 className="text-lg font-bold text-slate-800">{step.title}</h4>
          </div>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'text-emerald-500 rotate-180' : 'text-slate-400'}`}>
          <ChevronDown size={24} />
        </div>
      </button>
      
      <div className={`transition-all duration-300 ease-in-out origin-top overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 pt-2">
          <div className="pl-[76px]">
            <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed">{step.summary}</p>
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed">{step.details}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RoadmapTab({ crop, district, market, roadmapData, recommendation, loading, error, retryFn, yieldQty }) {
  const { language } = useLanguage();
  const [openIndex, setOpenIndex] = useState(0);
  const [aiNarrative, setAiNarrative] = useState(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [cropRec, setCropRec] = useState(null);
  const [cropRecLoading, setCropRecLoading] = useState(false);

  useEffect(() => {
    async function fetchNarrative() {
      if (recommendation) {
        setNarrativeLoading(true);
        try {
          const text = await getExplanation(recommendation, language);
          setAiNarrative(text);
        } catch (err) {
          console.error("Failed to fetch narrative", err);
          setAiNarrative("Strategic timeline optimization based on market conditions.");
        } finally {
          setNarrativeLoading(false);
        }
      }
    }
    fetchNarrative();
  }, [recommendation, language]);

  useEffect(() => {
    async function fetchCropRec() {
      if (district) {
        setCropRecLoading(true);
        try {
          const res = await getCropRecommendation(district, yieldQty, language);
          setCropRec(res);
        } catch (err) {
          console.error("Failed to fetch crop recommendation", err);
        } finally {
          setCropRecLoading(false);
        }
      }
    }
    fetchCropRec();
  }, [district, yieldQty, language]);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-32 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-24 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-24 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-24 bg-white/50 rounded-3xl w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2 font-serif">Unable to load roadmap</h3>
        <p className="text-sm text-slate-500 mb-6 font-sans">{error}</p>
        <button 
          onClick={retryFn}
          className="bg-[#143D2B] text-white px-6 py-2.5 rounded-xl font-medium shadow-sm hover:bg-[#1a4f38] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!roadmapData) return null;

  const steps = roadmapData.steps || [];
  const isPerishable = roadmapData.perishable;

  return (
    <div className="p-4 bg-transparent pb-24 max-w-4xl mx-auto">
      
      <header className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-3xl font-serif text-slate-900 tracking-tight font-medium">Strategic Roadmap</h2>
          {isPerishable ? (
            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-100/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-200/50">
              <AlertTriangle size={12} className="mr-1.5" /> Perishable
            </span>
          ) : (
            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-700 bg-blue-100/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-blue-200/50">
              <Warehouse size={12} className="mr-1.5" /> Storable
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 font-sans">
          Lifecycle plan for {yieldQty}q of {crop} in {district}, targeting {market}
        </p>
      </header>

      {/* AI Narrative Section */}
      <div className="bg-gradient-to-br from-[#143D2B] to-[#1a4f38] rounded-3xl p-6 md:p-8 text-white mb-8 shadow-xl shadow-emerald-900/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 text-white/5 pointer-events-none">
          <Sparkles size={200} />
        </div>
        
        <div className="flex-1 relative z-10 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold tracking-widest text-emerald-200 uppercase mb-4 border border-white/10">
            <Sparkles size={14} className="text-amber-400" />
            AI Execution Strategy
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-3">{roadmapData.crop}</h2>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-emerald-100/90 mb-6 font-sans">
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5"><AlertTriangle size={16} className="text-amber-400"/> {roadmapData.perishable ? 'Perishable' : 'Non-Perishable'}</span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">📍 {district}</span>
            <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">🎯 {market}</span>
          </div>

          <div className="bg-black/20 p-5 rounded-2xl border border-white/10 backdrop-blur-sm max-w-2xl font-sans">
            <p className="leading-relaxed text-emerald-50">
              {narrativeLoading ? (
                <span className="animate-pulse">Analyzing optimal execution windows...</span>
              ) : (
                aiNarrative || roadmapData.expectation
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Card */}
      {!cropRecLoading && cropRec && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-6 mb-8 shadow-xl shadow-emerald-900/5">
          <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Crop Pivot Recommendation
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line">
                {cropRec.reasoning}
              </p>
              <div className="inline-block px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-sm">
                Recommended: {cropRec.recommended_crop}
              </div>
            </div>
            <div className="space-y-3">
              {cropRec.crops_data.map(c => (
                <div key={c.crop} className={`flex justify-between items-center p-3 rounded-xl border ${c.crop === cropRec.recommended_crop ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="font-semibold text-slate-700">{c.crop}</span>
                  <span className="font-bold text-emerald-600">,1{c.net_profit.toLocaleString('en-IN')} net</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline/Steps */}
      <div className="space-y-2 relative before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
        {steps.map((step, index) => (
          <StepAccordion 
            key={index} 
            step={step} 
            index={index} 
            isOpen={openIndex === index} 
            toggle={toggleAccordion} 
          />
        ))}
      </div>

    </div>
  );
}
