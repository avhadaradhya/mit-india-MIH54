import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { Calculator, DollarSign, Fuel, Scale, MapPin } from 'lucide-react';

export default function CalculateTab({ crop, initialYield, initialLocation }) {
  const { t } = useLanguage();

  const [calcYield, setCalcYield] = useState(initialYield || 50);
  const [prodCost, setProdCost] = useState(1200); 
  const [distance, setDistance] = useState(45); 
  const [freightRate, setFreightRate] = useState(22); 

  let baseRate = 2200;
  if (crop === 'Tomato') baseRate = 1400;
  else if (crop === 'Wheat') baseRate = 2100;
  else if (crop === 'Soybean') baseRate = 3900;
  else if (crop === 'Onion') baseRate = 2300;

  const compareMandis = [
    { name: 'Pune Mandi', rateOffset: 50, distOffset: 0 },
    { name: 'Mumbai Mandi', rateOffset: 250, distOffset: 105 },
    { name: 'Solapur Mandi', rateOffset: -100, distOffset: 75 }
  ];

  const results = compareMandis.map(mandi => {
    const rawRate = baseRate + mandi.rateOffset;
    const grossRevenue = rawRate * calcYield;
    const actualDist = Math.max(5, distance + mandi.distOffset);
    const transportCost = Math.round(actualDist * freightRate);
    const mandiFee = Math.round(grossRevenue * 0.015);
    const totalProdCost = prodCost * calcYield;
    const netPocket = grossRevenue - transportCost - mandiFee;
    const finalProfit = netPocket - totalProdCost;

    return {
      name: mandi.name,
      distance: actualDist,
      rawRate,
      grossRevenue,
      transportCost,
      mandiFee,
      netPocket,
      finalProfit
    };
  });

  results.sort((a, b) => b.netPocket - a.netPocket);

  const bestMandi = results[0];

  return (
    <div className="space-y-6">
      
      {/* Input Panel */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-5 md:p-6">
        <h2 className="text-xl font-bold text-[#143D2B] mb-5 flex items-center gap-2" style={{ fontFamily: 'Times New Roman, serif' }}>
          <Calculator className="w-6 h-6 text-emerald-800" />
          {t('tab_calculate')}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Yield */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-emerald-800" />
              {t('calc_yield')}
            </label>
            <input
              type="number"
              min="1"
              value={calcYield}
              onChange={(e) => setCalcYield(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-800 min-h-[44px]"
            />
          </div>

          {/* Base Production Cost */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-800" />
              {t('production_cost')}
            </label>
            <input
              type="number"
              min="0"
              value={prodCost}
              onChange={(e) => setProdCost(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-800 min-h-[44px]"
            />
          </div>

          {/* Distance */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-800" />
              {t('distance_label')}
            </label>
            <input
              type="number"
              min="1"
              value={distance}
              onChange={(e) => setDistance(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-800 min-h-[44px]"
            />
          </div>

          {/* Freight Rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
              <Fuel className="w-3.5 h-3.5 text-emerald-800" />
              {t('diesel_rate')}
            </label>
            <input
              type="number"
              min="1"
              value={freightRate}
              onChange={(e) => setFreightRate(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-[#F8FAF9] text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-800 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Outputs */}
      {bestMandi && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          
          <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <span className="block text-xs font-black uppercase text-slate-500 tracking-wider mb-1">
                {t('gross_revenue')} ({bestMandi.name})
              </span>
              <span className="block text-3xl font-black text-slate-800 leading-none">
                ₹{bestMandi.grossRevenue.toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-slate-400 font-semibold mt-2.5">
                Gross sales before deducting fuel transit and licensing APMC fees.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#D99B26] bg-amber-50/15 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="block text-xs font-black uppercase text-[#D99B26] tracking-wider mb-1">
                  {t('net_in_pocket')}
                </span>
                <span className="bg-[#D99B26] text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  Optimal Choice
                </span>
              </div>
              <span className="block text-3xl font-black text-emerald-700 leading-none">
                ₹{bestMandi.netPocket.toLocaleString('en-IN')}
              </span>
              <p className="text-xs text-slate-550 font-semibold mt-2.5">
                Actual money-in-pocket (Gross Revenue minus ₹{bestMandi.transportCost} transport cost and ₹{bestMandi.mandiFee} mandi fee).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Comparison Table */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-4 md:p-6">
        <h3 className="text-lg font-bold text-[#143D2B] mb-4" style={{ fontFamily: 'Times New Roman, serif' }}>
          {t('mandi_comparison')}
        </h3>

        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle p-4 md:p-0">
            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100" style={{ fontFamily: 'Inter, sans-serif' }}>
                <thead className="bg-[#F8FAF9]">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Mandi Name
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Raw Rate
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Transport Cost
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Mandi Fee
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Net Profit (Pocket)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                  {results.map((item, index) => {
                    const isTop = index === 0;
                    return (
                      <tr 
                        key={item.name} 
                        className={`transition-colors ${
                          isTop ? 'bg-amber-50/40 font-semibold border-l-4 border-l-[#D99B26]' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                          <span className="flex items-center gap-1">
                            {item.name}
                            {isTop && (
                              <span className="bg-amber-100 text-[#D99B26] text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase ml-1">
                                Rank 1
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-slate-500">
                          {item.distance} km
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          ₹{item.rawRate}/q
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-red-650">
                          -₹{item.transportCost.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                          -₹{item.mandiFee.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <span className={`text-sm font-black ${isTop ? 'text-emerald-700 text-base' : 'text-slate-800'}`}>
                            ₹{item.netPocket.toLocaleString('en-IN')}
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

        {results.length > 1 && (
          <div className="mt-4 p-3 border border-slate-100 rounded-xl bg-slate-50/50 text-xs text-slate-650 leading-relaxed font-sans-custom">
            <strong>Arbitrage Insight:</strong> Selling at <strong>{results[0].name}</strong> yields an extra <strong>₹{(results[0].netPocket - results[results.length - 1].netPocket).toLocaleString('en-IN')}</strong> in net profit compared to <strong>{results[results.length - 1].name}</strong>, even after accounting for the longer transport distance.
          </div>
        )}

      </div>

    </div>
  );
}
