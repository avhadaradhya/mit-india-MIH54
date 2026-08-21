import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { subscribAlerts } from '../lib/api';

export default function AlertSubscribe({ commodity, district, state = 'Maharashtra' }) {
  const { t, language } = useLanguage();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setStatus('error');
      setErrorMessage(t('invalid_phone') || 'Please enter a valid 10-digit phone number.');
      return;
    }

    setStatus('loading');
    try {
      await subscribAlerts(phone, state, district, commodity, language);
      setStatus('success');
      setPhone('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(t('subscribe_error') || 'Failed to subscribe. Please try again later.');
    }
  };

  return (
    <div className="mt-6 bg-[#143D2B]/5 border border-[#143D2B]/10 rounded-2xl p-5 md:p-6 shadow-sm relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-[#D99B26]/10 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-bold text-[#143D2B] flex items-center gap-2 font-serif-custom">
            <Bell className="w-5 h-5 text-[#D99B26]" />
            {t('get_whatsapp_alerts') || 'Get WhatsApp Price Alerts'}
          </h3>
          <p className="text-sm font-medium text-slate-600 font-sans-custom">
            {t('subscribe_desc') || `Receive weekly forecasting updates and price drops for ${commodity} in ${district}.`}
          </p>
        </div>

        <div className="w-full md:w-auto flex-shrink-0">
          {status === 'success' ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100 font-semibold text-sm animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-5 h-5" />
              {t('subscribed_successfully') || 'Subscribed successfully!'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className={`w-full pl-10 pr-4 py-2.5 h-11 bg-white border ${status === 'error' ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-emerald-800'} rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 shadow-sm`}
                  disabled={status === 'loading'}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="h-11 px-6 bg-[#143D2B] hover:bg-[#1a4f38] text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center min-w-[120px]"
              >
                {status === 'loading' ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  t('subscribe') || 'Subscribe'
                )}
              </button>
            </form>
          )}
          
          {status === 'error' && (
            <p className="text-xs font-semibold text-rose-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
