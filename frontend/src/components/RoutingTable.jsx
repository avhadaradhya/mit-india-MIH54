import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Landmark, Route, ShieldCheck } from 'lucide-react';

export default function RoutingTable({ routingData, yieldQty }) {
  const { t } = useLanguage();

  if (!routingData || routingData.length === 0) return null;

  return (
    <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6 mb-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#143D2B] flex items-center gap-2" style={{ fontFamily: 'Times New Roman, serif' }}>
            <Landmark className="w-6 h-6 text-emerald-800 shrink-0" />
            {t('mandi_routing')}
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            {t('mandi_caption')}
          </p>
        </div>
        <div 
          className="bg-emerald-50 text-[#143D2B] text-xs font-bold px-3 py-1.5 rounded-full shrink-0 self-start md:self-center border border-emerald-100"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {yieldQty} Quintals • Live Optimization
        </div>
      </div>

      {/* Responsive Table/Card Layout */}
      <div className="overflow-x-auto -mx-4 md:mx-0">
        <div className="inline-block min-w-full align-middle p-4 md:p-0">
          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="min-w-full divide-y divide-slate-100" style={{ fontFamily: 'Inter, sans-serif' }}>
              <thead className="bg-[#F8FAF9]">
                <tr>
                  <th scope="col" className="px-4 py-3.5 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('mandi_name')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('distance')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('raw_rate')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('transport_cost')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('mandi_fee')}
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    {t('net_profit')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {routingData.map((mandi) => {
                  const isTop = mandi.is_top_recommendation;
                  return (
                    <tr 
                      key={mandi.mandi_name}
                      className={`transition-all duration-150 ${
                        isTop 
                          ? 'bg-amber-50/40 border-l-4 border-l-[#D99B26]' 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Mandi Name */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-900">
                        <div className="flex items-center gap-2">
                          {isTop && (
                            <ShieldCheck className="w-5 h-5 text-[#D99B26] shrink-0" aria-hidden="true" />
                          )}
                          <span className={`text-sm ${isTop ? 'font-black text-[#143D2B]' : 'font-medium text-slate-700'}`}>
                            {mandi.mandi_name}
                          </span>
                          {isTop && (
                            <span className="hidden sm:inline bg-amber-100 text-[#D99B26] text-[10px] font-black px-1.5 py-0.5 rounded tracking-wider">
                              {t('top_recommendation')}
                            </span>
                          )}
                        </div>
                        {isTop && (
                          <div className="sm:hidden mt-1">
                            <span className="bg-amber-100 text-[#D99B26] text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider">
                              {t('top_recommendation')}
                            </span>
                          </div>
                        )}
                      </td>
                      
                      {/* Distance */}
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-600 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <Route className="w-3.5 h-3.5 text-slate-400" />
                          {mandi.distance} km
                        </span>
                      </td>

                      {/* Raw Rate */}
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-600 font-semibold">
                        ₹{mandi.raw_rate}/q
                      </td>

                      {/* Transport Cost */}
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                        -₹{mandi.transport_cost.toLocaleString('en-IN')}
                      </td>

                      {/* Mandi Fee */}
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                        -₹{mandi.mandi_fee.toLocaleString('en-IN')}
                      </td>

                      {/* Net Profit */}
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <span className={`text-base font-extrabold ${isTop ? 'text-emerald-700 text-lg' : 'text-slate-800'}`}>
                          ₹{mandi.net_profit.toLocaleString('en-IN')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
