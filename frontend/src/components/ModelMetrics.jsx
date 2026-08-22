import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, ChevronUp, Activity, AlertTriangle } from 'lucide-react';

function fmt(value, digits = 2, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function r2Gloss(r2) {
  if (r2 === null || r2 === undefined) return 'R² was not computed — the holdout window was too short.';
  if (r2 < 0) {
    return `R² of ${Number(r2).toFixed(2)} — on the holdout, predicting the average price would have been better.`;
  }
  return `R² of ${Number(r2).toFixed(2)} — the model explains ${Math.round(Number(r2) * 100)}% of past price variation.`;
}

function mapeGloss(mape) {
  if (mape === null || mape === undefined) return 'MAPE needs a completed 14-day backtest.';
  return `MAPE of ${Number(mape).toFixed(1)}% — typical error is about ${Number(mape).toFixed(1)}% of the true price.`;
}

function rmseGloss(rmse) {
  if (rmse === null || rmse === undefined) return 'RMSE needs a completed 14-day backtest.';
  return `RMSE of ₹${Number(rmse).toFixed(0)} — a typical miss on the holdout is about ₹${Number(rmse).toFixed(0)}/quintal.`;
}

function accGloss(acc) {
  if (acc === null || acc === undefined) return 'Accuracy is 100 minus MAPE on the holdout, not on the training set.';
  return `Accuracy ${Number(acc).toFixed(1)}% — 100 minus MAPE on the last 14 days the model did not train on.`;
}

export default function ModelMetrics({ metrics, lowConfidence, lowConfidenceReason }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!metrics) return null;

  const order = metrics.order || metrics.arima_order;
  const seasonal = metrics.seasonal_order_tuple || metrics.seasonal_order;
  const orderLabel = Array.isArray(order)
    ? `(${order.join(',')})${Array.isArray(seasonal) ? `(${seasonal.join(',')})` : ''}`
    : `${order || '—'} ${seasonal || ''}`;

  const backtest = metrics.backtest || [];
  const flagged = Boolean(lowConfidence ?? metrics.low_confidence);
  const reason = lowConfidenceReason || metrics.low_confidence_reason;

  return (
    <div className="mt-6 border border-emerald-100 rounded-2xl bg-white/60 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <Activity className="w-5 h-5 text-emerald-600" />
          <span>Model Details</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5 text-emerald-600" />}
      </button>

      {isOpen && (
        <div className="p-5 space-y-5 bg-white/80">
          {flagged && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                <span className="font-bold">Lower confidence. </span>
                {reason || 'Holdout error is high for this crop and district.'}
                {' '}The forecast is still shown, but it should not be read as equally certain as a well-backed series.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Order (p,d,q)(P,D,Q,s)</p>
              <p className="font-bold text-slate-800 mt-1">{orderLabel}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">AIC</p>
              <p className="font-bold text-slate-800 mt-1">{fmt(metrics.aic, 1)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">BIC</p>
              <p className="font-bold text-slate-800 mt-1">{fmt(metrics.bic, 1)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Backtest window</p>
              <p className="font-bold text-slate-800 mt-1">Last {metrics.backtest_horizon_days || 14} days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: 'RMSE', value: metrics.rmse, text: rmseGloss(metrics.rmse), display: metrics.rmse != null ? `₹${Number(metrics.rmse).toFixed(1)}` : '—' },
              { label: 'MAPE', value: metrics.mape, text: mapeGloss(metrics.mape), display: fmt(metrics.mape, 2, '%') },
              { label: 'R²', value: metrics.r2_score, text: r2Gloss(metrics.r2_score), display: fmt(metrics.r2_score, 2) },
              { label: 'Accuracy', value: metrics.accuracy_pct, text: accGloss(metrics.accuracy_pct), display: fmt(metrics.accuracy_pct, 1, '%') },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{item.label}</span>
                  <span className="text-lg font-bold text-slate-800">{item.display}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Backtest: last 14 days
            </p>
            {backtest.length ? (
              <div className="h-28 w-full rounded-2xl border border-slate-100 bg-white px-1 py-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={backtest} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
                      formatter={(value, name) => [`₹${Number(value).toFixed(0)}`, name === 'actual' ? 'Actual' : 'Predicted']}
                    />
                    <Line type="monotone" dataKey="actual" name="actual" stroke="#143D2B" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="predicted" name="predicted" stroke="#d97706" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {reason || 'Not enough history to run a 14-day holdout.'}
              </p>
            )}
            <div className="flex gap-4 mt-2 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#143D2B] inline-block" /> Actual</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#d97706] inline-block border-t border-dashed" /> Predicted (unseen)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
