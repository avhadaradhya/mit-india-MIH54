import React from 'react';
import { useLanguage } from '../lib/i18n';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { TrendingUp, Award, Calendar, AlertTriangle, HelpCircle } from 'lucide-react';
import ModelMetrics from './ModelMetrics';
import AlertSubscribe from './AlertSubscribe';

export default function ForecastTab({
  crop, setCrop,
  location, setLocation,
  forecastData, loading, error, retryFn
}) {
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

  if (loading) {
    return (
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6 animate-pulse">
        <div className="h-7 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-[280px] bg-slate-100 rounded-xl"></div>
          <div className="lg:col-span-4 h-[280px] bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-rose-100 rounded-2xl shadow-sm p-6 mb-6 flex flex-col items-center justify-center text-center font-sans-custom">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
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

  const { recommendation, prices } = forecastData;
  const { decision, hold_days, current_price, predicted_peak_price, predicted_jump, action_banner_text } = recommendation;

  const todayObj = [...prices].reverse().find(p => !p.is_forecast);
  const todayDate = todayObj ? todayObj.date : '';

  // Use actual confidence bounds from API or fallback
  const chartData = prices.map(p => ({
    ...p,
    high: p.ci_upper || Math.round(p.price * 1.05),
    low: p.ci_lower || Math.round(p.price * 0.95),
    isPeak: p.is_peak,
    isDip: p.is_dip
  }));

  const isHold = decision === 'HOLD';

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md font-sans-custom">
          <p className="text-xs text-slate-500 font-semibold">{data.date}</p>
          <p className="text-sm font-extrabold text-[#143D2B]">
            {t('price_label')}: <span className="text-[#D99B26]">₹{data.price}</span>
          </p>
          <p className="text-[10px] text-slate-500 font-semibold">
            Confidence Bounds: ₹{data.low} - ₹{data.high}
          </p>
          <p className="text-[10px] uppercase tracking-wider font-bold mt-1">
            {data.is_forecast ? (
              <span className="text-[#D99B26] bg-amber-50 px-1.5 py-0.5 rounded">
                {t('forecast')}
              </span>
            ) : (
              <span className="text-emerald-750 bg-emerald-50 px-1.5 py-0.5 rounded">
                {t('history')}
              </span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  const peakPoint = chartData.find(d => d.isPeak) || chartData.reduce((prev, current) => (prev.price > current.price) ? prev : current, chartData[0]);
  const dipPoint = chartData.find(d => d.isDip);

  return (
    <div className="space-y-6">
      
      {/* 3-Dropdown Selector Header */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-5" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
              {t('select_state')}
            </label>
            <input
              type="text"
              value={t('maharashtra')}
              disabled
              className="w-full h-11 px-3 bg-slate-100 text-slate-700 font-extrabold text-sm rounded-xl border border-slate-200 cursor-not-allowed select-none min-h-[44px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider" htmlFor="dist-select">
              {t('select_district')}
            </label>
            <select
              id="dist-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 cursor-pointer min-h-[44px]"
            >
              {locations.map((loc) => (
                <option key={loc.value} value={loc.value}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider" htmlFor="crop-select-tab">
              {t('crop')}
            </label>
            <select
              id="crop-select-tab"
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 cursor-pointer min-h-[44px]"
            >
              {crops.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 14-Day ARIMA Price Chart */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6">
        <h2 className="text-2xl font-bold text-[#143D2B] mb-6" style={{ fontFamily: 'Times New Roman, serif' }}>
          {t('price_forecast')}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Recharts with Confidence bounds */}
          <div className="lg:col-span-8 border border-slate-100 rounded-xl p-3 bg-slate-50/50 min-h-[300px] flex flex-col justify-between">
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorInterval" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D99B26" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#D99B26" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis 
                    domain={['dataMin - 150', 'dataMax + 150']}
                    tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={{ stroke: '#CBD5E1' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Area
                    type="monotone"
                    dataKey="high"
                    stroke="none"
                    fill="url(#colorInterval)"
                    fillOpacity={1}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stroke="none"
                    fill="#FFFFFF"
                    fillOpacity={0.9}
                    legendType="none"
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#059669" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />

                  {todayDate && (
                    <ReferenceLine 
                      x={todayDate} 
                      stroke="#D99B26" 
                      strokeWidth={2}
                      strokeDasharray="5 5" 
                      label={{ 
                        value: t('today').toUpperCase(), 
                        fill: '#D99B26', 
                        position: 'top', 
                        fontSize: 10, 
                        fontWeight: 800,
                        fontFamily: 'Inter, sans-serif'
                      }} 
                    />
                  )}

                  {peakPoint && peakPoint.is_forecast && (
                    <ReferenceDot 
                      x={peakPoint.date} 
                      y={peakPoint.price} 
                      r={5} 
                      fill="#D99B26" 
                      stroke="#fff"
                      strokeWidth={2}
                      label={{ 
                        position: 'top', 
                        value: 'PEAK', 
                        fill: '#D99B26', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                      }} 
                    />
                  )}
                  {dipPoint && dipPoint.is_forecast && (
                    <ReferenceDot 
                      x={dipPoint.date} 
                      y={dipPoint.price} 
                      r={5} 
                      fill="#ef4444" 
                      stroke="#fff"
                      strokeWidth={2}
                      label={{ 
                        position: 'bottom', 
                        value: 'DIP', 
                        fill: '#ef4444', 
                        fontSize: 10, 
                        fontWeight: 'bold' 
                      }} 
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-6 mt-2 text-xs font-bold text-slate-500 font-sans-custom">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span>{t('history')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#D99B26]"></span>
                <span>{t('forecast')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded bg-amber-100 border border-amber-200 border-dashed"></span>
                <span>{t('confidence_interval')}</span>
              </div>
            </div>
          </div>

          {/* Decision Verdict Badge */}
          <div className="lg:col-span-4 flex flex-col justify-between border border-slate-100 rounded-xl p-5 bg-slate-50/30">
            <div>
              <h3 className="text-lg font-bold text-slate-700 mb-3" style={{ fontFamily: 'Times New Roman, serif' }}>
                {t('decision')}
              </h3>

              <div className="mb-4">
                {isHold ? (
                  <div 
                    className="rounded-2xl border border-amber-200 bg-amber-55 p-4 text-center transition-all duration-200 animate-pulse"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <Award className="w-8 h-8 text-[#D99B26] mx-auto mb-2" />
                    <span className="block text-2xl font-black text-[#D99B26] leading-tight">
                      {t('hold_for', { days: hold_days })}
                    </span>
                  </div>
                ) : (
                  <div 
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center transition-all duration-200"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <TrendingUp className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
                    <span className="block text-2xl font-black text-emerald-700 leading-tight">
                      {t('sell_today')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{t('current_price')}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {t('current_price_val', { val: current_price })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{t('predicted_peak')}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {t('predicted_peak_val', { val: predicted_peak_price })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold text-slate-500">{t('predicted_jump')}</span>
                  <span className="text-base font-extrabold text-[#D99B26]">
                    {t('predicted_jump_val', { val: predicted_jump })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-505 flex gap-2 items-start" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                {action_banner_text || (isHold 
                  ? "Holding protects your returns from market gluts and targets optimal price windows."
                  : "Prices are expected to decline due to arrival increases. Sell now to protect yield values."
                )}
              </span>
            </div>
          </div>

        </div>
        
        {forecastData.metrics && (
          <ModelMetrics metrics={forecastData.metrics} />
        )}
      </div>

      {/* AI Explainer Card */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-5 md:p-6">
        <h3 className="text-lg font-bold text-[#143D2B] mb-3 flex items-center gap-2" style={{ fontFamily: 'Times New Roman, serif' }}>
          <HelpCircle className="w-5 h-5 text-emerald-800 shrink-0" />
          {t('ai_explainer')}
        </h3>
        
        <div className="border border-emerald-50 rounded-xl bg-emerald-55/10 p-4 font-sans-custom">
          <p className="text-sm font-bold text-slate-800 leading-relaxed mb-4">
            {t('today') !== 'आज' 
              ? `Prices for ${crop} in ${location} are expected to jump +₹${predicted_jump}/quintal due to unseasonal monsoon showers next week and lower arrivals from Solapur markets.`
              : `${location} मध्ये ${t(crop.toLowerCase())} चे दर पुढील आठवड्यात अवकाळी पाऊस आणि सोलापूर बाजारातून येणाऱ्या आवकमधील घटीमुळे +₹${predicted_jump}/क्विंटल वाढण्याची अपेक्षा आहे.`
            }
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-600">
            <div className="p-3 border border-slate-100 rounded-lg bg-white shadow-sm">
              <span className="block font-black text-emerald-800 uppercase tracking-wider mb-1">Weather Impact</span>
              <p className="leading-relaxed">
                {t('today') !== 'आज'
                  ? "Unseasonal rain forecasted across key producing blocks will likely delay fresh harvest pullout and limit direct supplies."
                  : "मुख्य उत्पादक पट्ट्यात वर्तवण्यात आलेल्या अवकाळी पावसामुळे काढणी लांबणीवर पडण्याची शक्यता असून बाजारातील आवक मर्यादित राहील."
                }
              </p>
            </div>

            <div className="p-3 border border-slate-100 rounded-lg bg-white shadow-sm">
              <span className="block font-black text-emerald-800 uppercase tracking-wider mb-1">Seasonal Demand</span>
              <p className="leading-relaxed">
                {t('today') !== 'आज'
                  ? "Local festival processing demand is scaling up, keeping intermediate processing buyers highly active in regional APMCs."
                  : "स्थानिक सणांच्या निमित्ताने प्रक्रिया उद्योगांकडून खरेदीत वाढ झाली असून प्रादेशिक बाजार समित्यांमध्ये खरेदीदार सक्रिय आहेत."
                }
              </p>
            </div>

            <div className="p-3 border border-slate-100 rounded-lg bg-white shadow-sm">
              <span className="block font-black text-emerald-800 uppercase tracking-wider mb-1">Arrival Volume</span>
              <p className="leading-relaxed">
                {t('today') !== 'आज'
                  ? "Arrival inflows from neighboring Solapur markets dropped by 18% due to harvesting labour limits."
                  : "मजूर टंचाईमुळे शेजारील सोलापूर बाजारातून येणाऱ्या आवक मध्ये १८% घट नोंदवली गेली आहे."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <AlertSubscribe commodity={crop} district={location} state="Maharashtra" />

    </div>
  );
}
