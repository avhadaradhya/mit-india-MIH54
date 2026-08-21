import React from 'react';
import { useLanguage } from '../lib/i18n';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Award, Calendar } from 'lucide-react';

export default function ForecastCard({ forecastData }) {
  const { t } = useLanguage();

  if (!forecastData) return null;

  const { recommendation, prices } = forecastData;
  const { decision, hold_days, current_price, predicted_peak_price, predicted_jump } = recommendation;

  // Find "Today" boundary (last historical price object)
  const todayObj = [...prices].reverse().find(p => !p.is_forecast);
  const todayDate = todayObj ? todayObj.date : '';

  // Custom tooltips with clear language mappings
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md font-sans-custom">
          <p className="text-xs text-slate-500 font-semibold">{data.date}</p>
          <p className="text-sm font-extrabold text-[#143D2B]">
            {t('price_label')}: <span className="text-[#D99B26]">₹{data.price}</span>
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

  const isHold = decision === 'HOLD';

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-[#143D2B] mb-6" style={{ fontFamily: 'Times New Roman, serif' }}>
        {t('price_forecast')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Chart Section */}
        <div className="lg:col-span-8 border border-slate-100 rounded-xl p-3 bg-slate-50/50 min-h-[300px] flex flex-col justify-between">
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={prices}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
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
                  domain={['dataMin - 100', 'dataMax + 100']}
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 500 }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  tickLine={{ stroke: '#CBD5E1' }}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#059669" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />

                {/* Vertical Reference Line marking Today */}
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
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex justify-center items-center gap-6 mt-2 text-xs font-bold text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>{t('history')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#D99B26]"></span>
              <span>{t('forecast')}</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between border border-slate-100 rounded-xl p-5 bg-slate-50/30">
          
          <div>
            <h3 className="text-lg font-bold text-slate-700 mb-3" style={{ fontFamily: 'Times New Roman, serif' }}>
              {t('decision')}
            </h3>

            {/* Decision Badge */}
            <div className="mb-4">
              {isHold ? (
                <div 
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center transition-all duration-200"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <Award className="w-8 h-8 text-[#D99B26] mx-auto mb-2" />
                  <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                    {t('hold_for', { days: hold_days }).split(' ')[0]}
                  </span>
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
                  <span className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-1">
                    {t('sell_today').split(' ')[0]}
                  </span>
                  <span className="block text-2xl font-black text-emerald-750 leading-tight">
                    {t('sell_today')}
                  </span>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-3.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-500">{t('current_price')}</span>
                <span className="text-base font-bold text-slate-800">
                  {t('current_price_val', { val: current_price })}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-500">{t('predicted_peak')}</span>
                <span className="text-base font-bold text-slate-800">
                  {t('predicted_peak_val', { val: predicted_peak_price })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-semibold text-slate-500">{t('predicted_jump')}</span>
                <span className="text-lg font-extrabold text-[#D99B26]">
                  {t('predicted_jump_val', { val: predicted_jump })}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex gap-2 items-start" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Calendar className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              {isHold 
                ? "Holding allows you to beat the seasonal crop glut and sell during the peak pricing interval."
                : "Prices are anticipated to trend downward due to high arrivals. Selling now secures maximum value."
              }
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}
