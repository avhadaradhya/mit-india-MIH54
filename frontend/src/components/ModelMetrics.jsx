import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { ChevronDown, ChevronUp, Activity, BarChart2 } from 'lucide-react';

export default function ModelMetrics({ metrics }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (!metrics) return null;

  const {
    arima_order, aic, bic, hqic, log_likelihood, 
    rmse, mae, mape, smape, ljung_box_pvalue, 
    training_window_days, training_date_range
  } = metrics;

  return (
    <div className="mt-6 border border-emerald-100 rounded-2xl bg-white/60 backdrop-blur-sm overflow-hidden font-sans-custom">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <Activity className="w-5 h-5 text-emerald-600" />
          <span>{t('model_diagnostics') || 'Forecasting Model Diagnostics'}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5 text-emerald-600" />}
      </button>

      {isOpen && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80">
          
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" />
              Model Info
            </h4>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">ARIMA Order</span>
                <span className="font-bold text-slate-700">{arima_order}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Training Days</span>
                <span className="font-bold text-slate-700">{training_window_days}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Date Range</span>
                <span className="font-bold text-slate-700 text-xs mt-0.5">{training_date_range}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              Error Metrics
            </h4>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">RMSE</span>
                <span className="font-bold text-slate-700">{rmse?.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">MAE</span>
                <span className="font-bold text-slate-700">{mae?.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">MAPE</span>
                <span className="font-bold text-slate-700">{mape?.toFixed(2)}%</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400">sMAPE</span>
                <span className="font-bold text-slate-700">{smape?.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Goodness of Fit</h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex-1 min-w-[120px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">AIC</span>
                <span className="font-bold text-slate-700">{aic?.toFixed(1)}</span>
              </div>
              <div className="flex-1 min-w-[120px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">BIC</span>
                <span className="font-bold text-slate-700">{bic?.toFixed(1)}</span>
              </div>
              <div className="flex-1 min-w-[120px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Log Likelihood</span>
                <span className="font-bold text-slate-700">{log_likelihood?.toFixed(1)}</span>
              </div>
              <div className="flex-1 min-w-[120px] bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Ljung-Box p-val</span>
                <span className="font-bold text-slate-700">{ljung_box_pvalue?.toFixed(3)}</span>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
