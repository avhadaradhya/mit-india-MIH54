import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { AlertCircle, TrendingUp, TrendingDown, Clock, ShieldAlert, Activity, BellRing, Target, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import ModelMetrics from './ModelMetrics';

const CROP_THEME = {
  Onion: '#d97706',
  Potato: '#ca8a04',
  Tomato: '#e11d48',
  Wheat: '#b45309',
  Rice: '#059669',
};

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function CalloutLabel({ viewBox, text, tone }) {
  if (!viewBox || viewBox.x == null || viewBox.y == null) return null;
  const width = Math.min(220, Math.max(132, text.length * 6.6));
  const x = viewBox.x - width / 2;
  const y = tone === 'peak' ? viewBox.y - 32 : viewBox.y + 10;
  const fill = tone === 'peak' ? '#fef3c7' : '#fee2e2';
  const stroke = tone === 'peak' ? '#d97706' : '#dc2626';
  const textFill = tone === 'peak' ? '#92400e' : '#991b1b';
  return (
    <g>
      <rect x={x} y={y} width={width} height={22} rx={8} fill={fill} stroke={stroke} strokeWidth={1} />
      <text x={viewBox.x} y={y + 15} textAnchor="middle" fontSize={10} fontWeight={700} fill={textFill}>
        {text}
      </text>
    </g>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-md text-sm">
      <p className="text-xs font-bold text-slate-500 mb-1">{label}</p>
      {row.observed != null && (
        <p className="text-slate-800">Observed: <span className="font-bold">₹{Number(row.observed).toFixed(0)}</span></p>
      )}
      {row.forecast != null && row.observed == null && (
        <p className="text-slate-800">Forecast: <span className="font-bold">₹{Number(row.forecast).toFixed(0)}</span></p>
      )}
      {row.lower != null && row.upper != null && row.observed == null && (
        <p className="text-xs text-slate-500 mt-1">Band ₹{Number(row.lower).toFixed(0)} – ₹{Number(row.upper).toFixed(0)}</p>
      )}
    </div>
  );
}

const AlertSubscribe = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-6 mt-6 border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
      <div className="flex items-start gap-4">
        <div className="bg-emerald-100 p-3 rounded-2xl flex-shrink-0 text-emerald-600 shadow-inner">
          <BellRing size={24} />
        </div>
        <div>
          <h4 className="text-emerald-900 font-bold mb-1 font-sans text-lg">Smart Price Alerts</h4>
          <p className="text-emerald-700/80 text-sm font-sans max-w-md">Get WhatsApp notifications when prices hit your target or prediction confidence drops.</p>
        </div>
      </div>
      <button className="w-full md:w-auto bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition flex items-center justify-center gap-2 whitespace-nowrap">
        <Target size={18} />
        Set Alert
      </button>
    </div>
  );
};

export default function ForecastTab({ crop, district, market, forecastData, recommendation, loading, error, retryFn, horizon, setHorizon }) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse max-w-6xl mx-auto">
        <div className="h-40 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-96 bg-white/50 rounded-3xl w-full"></div>
        <div className="h-32 bg-white/50 rounded-3xl w-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2 font-serif">Unable to load forecast</h3>
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

  if (!forecastData && !recommendation) {
    return null;
  }

  const history = forecastData?.history || [];
  const forecast = forecastData?.forecast || [];
  const rec = recommendation || forecastData?.recommendation || null;
  const theme = CROP_THEME[crop] || '#059669';
  const metrics = forecastData?.metrics || {};
  const lowConfidence = Boolean(forecastData?.low_confidence || metrics.low_confidence);
  const lowReason = forecastData?.low_confidence_reason || metrics.low_confidence_reason;

  const peakDay = rec?.peak_day_offset ?? forecastData?.peak_day_offset;
  const dipDay = rec?.dip_day_offset ?? forecastData?.dip_day_offset;
  const peakPrice = rec?.peak_price ?? forecastData?.peak_price;
  const dipPrice = rec?.dip_price ?? forecastData?.dip_price;

  const lastHistory = history.length ? history[history.length - 1] : null;
  const todayDate = lastHistory?.date || (forecast[0] ? forecast[0].date : null);

  const chartRows = [
    ...history.map((item) => ({
      date: item.date,
      observed: item.price,
      forecast: null,
      lower: null,
      upper: null,
      ciBase: null,
      ciWidth: null,
    })),
  ];

  if (lastHistory) {
    const last = chartRows[chartRows.length - 1];
    last.forecast = lastHistory.price;
  }

  forecast.forEach((item) => {
    const lower = item.lower ?? item.ci_lower;
    const upper = item.upper ?? item.ci_upper;
    chartRows.push({
      date: item.date,
      observed: null,
      forecast: item.price,
      lower,
      upper,
      ciBase: lower,
      ciWidth: upper != null && lower != null ? upper - lower : null,
    });
  });

  const peakPoint = peakDay && forecast[peakDay - 1] ? forecast[peakDay - 1] : null;
  const dipPoint = dipDay && forecast[dipDay - 1] ? forecast[dipDay - 1] : null;
  const sameCallout = peakPoint && dipPoint && peakPoint.date === dipPoint.date;

  const isHold = rec?.action === 'HOLD';

  return (
    <div className="p-4 pb-24 max-w-6xl mx-auto space-y-6">

      {rec && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 overflow-hidden flex flex-col md:flex-row">
          <div className={`p-8 md:w-2/5 flex flex-col justify-center items-start text-white relative overflow-hidden ${isHold ? 'bg-gradient-to-br from-[#103527] to-[#1a4f3b]' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
            <div className="absolute top-0 right-0 opacity-10">
              <Activity size={120} className="-mt-4 -mr-4" />
            </div>
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border border-white/10">
                AI Action Plan
              </span>
              <h3 className="text-4xl font-serif font-medium leading-tight mb-3">
                {isHold ? `Hold ${rec.hold_days} Days` : 'Sell Today'}
              </h3>
              <p className="text-white/80 text-sm font-sans leading-relaxed max-w-sm">
                {rec.confidence_note || (isHold ? 'Wait for the predicted peak to maximize returns.' : 'Optimal selling window approaches. Prices expected to dip.')}
              </p>
            </div>
          </div>

          <div className="p-8 md:w-3/5 grid grid-cols-2 gap-6 bg-white/40">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 block">Current Rate</span>
              <p className="text-3xl font-bold text-slate-800">₹{rec.current_price}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 block">Predicted Peak</span>
              <p className="text-3xl font-bold text-slate-800">₹{rec.peak_price}</p>
            </div>
            <div className="col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-slate-800 font-bold block mb-1">Expected Growth Target</span>
                <span className="text-slate-500 text-sm">If held until peak date</span>
              </div>
              <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-lg font-bold ${isHold ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                {isHold ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {Math.max(0, (((rec.peak_price - rec.current_price) / Math.max(rec.current_price, 1)) * 100)).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {lowConfidence && (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">This forecast is flagged as lower confidence</p>
            <p className="text-sm mt-1 text-amber-900/80">{lowReason || 'Holdout error is high for this series.'}</p>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: theme }} />
              SARIMAX Price Forecast
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Observed history plus weather-conditioned forecast for {crop} · {market}
            </p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {[14, 30, 60, 90].map((h) => (
              <button
                key={h}
                onClick={() => setHorizon && setHorizon(h)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${horizon === h ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {h} Days
              </button>
            ))}
          </div>
        </div>

        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartRows} margin={{ top: 28, right: 16, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                dy={10}
                tickFormatter={(val) => {
                  if (!val) return '';
                  const date = new Date(val);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<ChartTooltip />} />

              <Area
                type="monotone"
                dataKey="ciBase"
                stackId="ci"
                stroke="none"
                fill="transparent"
                connectNulls={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="ciWidth"
                stackId="ci"
                stroke="none"
                fill={hexToRgba(theme, 0.18)}
                connectNulls={false}
                isAnimationActive={false}
                name="Confidence band"
              />

              <Line
                type="monotone"
                dataKey="observed"
                name="Observed"
                stroke="#143D2B"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke={theme}
                strokeWidth={2.25}
                strokeDasharray="6 4"
                connectNulls
                dot={{ r: 3, fill: theme, stroke: '#fff', strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
              />

              {todayDate && (
                <ReferenceLine
                  x={todayDate}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    position: 'insideTopLeft',
                    value: t('today') || 'Today',
                    fill: '#94a3b8',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              {peakPoint && peakPrice != null && (
                <ReferenceDot
                  x={peakPoint.date}
                  y={peakPoint.price}
                  r={5}
                  fill="#eab308"
                  stroke="#fff"
                  strokeWidth={2}
                  label={
                    <CalloutLabel
                      tone="peak"
                      text={`▲ PEAK: ₹${Number(peakPrice).toFixed(0)} (Day ${peakDay})`}
                    />
                  }
                />
              )}
              {dipPoint && dipPrice != null && !sameCallout && (
                <ReferenceDot
                  x={dipPoint.date}
                  y={dipPoint.price}
                  r={5}
                  fill="#ef4444"
                  stroke="#fff"
                  strokeWidth={2}
                  label={
                    <CalloutLabel
                      tone="dip"
                      text={`▼ DIP: ₹${Number(dipPrice).toFixed(0)} (Day ${dipDay})`}
                    />
                  }
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap justify-center gap-5 mt-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-[#143D2B] inline-block" /> Observed</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed inline-block" style={{ borderColor: theme }} /> Forecast</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: hexToRgba(theme, 0.18) }} /> 90% band
          </span>
        </div>
      </div>

      <ModelMetrics
        metrics={metrics}
        lowConfidence={lowConfidence}
        lowConfidenceReason={lowReason}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 flex flex-col gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 font-sans">Seasonal Timing</h4>
            <p className="text-sm text-slate-500 font-sans leading-relaxed">Historical data indicates a typical 15% price surge for {crop} in {market} during this month due to festive demand.</p>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl shadow-emerald-900/5 border border-white/60 flex flex-col gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2 font-sans">Risk Assessment</h4>
            <p className="text-sm text-slate-500 font-sans leading-relaxed">Forecast relies on continuous supply. Sudden weather disruptions or local mandi strikes may widen the confidence band.</p>
          </div>
        </div>
      </div>

      <AlertSubscribe />

    </div>
  );
}
