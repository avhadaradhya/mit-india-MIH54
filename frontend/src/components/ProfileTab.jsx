import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { User, Bell, Shield, Phone, MessageSquare, LogOut, CheckCircle, Clock } from 'lucide-react';
import AlertSubscribe from './AlertSubscribe';

export default function ProfileTab({ authUser, handleLogout }) {
  const { t } = useLanguage();

  const [phone, setPhone] = useState(authUser?.phoneNumber || '9876543210');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [telegramId, setTelegramId] = useState('123456789');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [priceThreshold, setPriceThreshold] = useState(2500);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      console.log('Firebase Save Alert Preferences:', {
        userId: authUser?.uid || 'guest_user',
        phone: `+91${phone.replace(/\D/g, '')}`,
        whatsappEnabled,
        telegramId,
        telegramEnabled,
        priceThreshold,
        timestamp: new Date().toISOString()
      });
      setIsSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 1500);
  };

  const getProviderName = () => {
    if (!authUser) return 'Guest';
    const providerId = authUser.providerData?.[0]?.providerId;
    if (providerId === 'google.com') return 'Google';
    if (providerId === 'github.com') return 'GitHub';
    return 'Email / Password';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 pb-24">
      
      {/* Profile Info */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-emerald-900/5 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/50 flex items-center justify-center text-emerald-800 shrink-0 font-bold text-3xl font-serif-custom uppercase shadow-inner">
          {authUser?.displayName ? authUser.displayName[0] : <User className="w-10 h-10" />}
        </div>
        <div className="flex-1 text-center sm:text-left font-sans-custom">
          <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200/50 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
            Verified Farmer Account
          </span>
          <h3 className="text-2xl font-bold text-slate-800 font-serif-custom">
            {authUser?.displayName || 'Farmer'}
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {authUser?.email || 'farmer@krushaksetu.in'}
          </p>
          <p className="text-xs text-slate-400 font-semibold flex items-center justify-center sm:justify-start gap-1.5 mt-3">
            <Shield className="w-4 h-4 text-emerald-600" />
            {t('linked_provider')}: {getProviderName()}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-6 py-3 flex items-center justify-center gap-2 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          {t('logout')}
        </button>
      </div>

      {/* Alert settings */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-emerald-900/5 p-6 md:p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 font-serif-custom">
          <Bell className="w-6 h-6 text-emerald-600" />
          {t('peak_alert_prefs')}
        </h3>

        <form onSubmit={handleSave} className="space-y-6 font-sans-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WhatsApp */}
            <div className="p-5 border border-slate-200/60 rounded-2xl bg-white/50 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  {t('whatsapp_toggle')}
                </label>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="w-10 h-5 rounded-full accent-emerald-600 cursor-pointer"
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
              
              <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <span className="h-12 px-4 flex items-center bg-slate-50 border-r border-slate-200 text-slate-500 font-bold text-sm">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit number"
                  disabled={!whatsappEnabled}
                  className="flex-1 h-12 px-4 bg-transparent text-slate-900 font-semibold text-sm focus:outline-none disabled:opacity-50 min-h-[44px]"
                />
              </div>
            </div>

            {/* Telegram */}
            <div className="p-5 border border-slate-200/60 rounded-2xl bg-white/50 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  {t('telegram_toggle')}
                </label>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="w-10 h-5 rounded-full accent-emerald-600 cursor-pointer"
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
              
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="Enter Telegram Chat ID"
                disabled={!telegramEnabled}
                className="w-full h-12 px-4 bg-white text-slate-900 font-semibold text-sm rounded-xl border border-slate-200 focus:outline-none disabled:opacity-50 shadow-sm"
              />
            </div>

          </div>

          {/* Threshold Slider */}
          <div className="p-6 border border-slate-200/60 rounded-2xl bg-slate-50/50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                {t('target_threshold')}
              </span>
              <span className="text-lg font-bold text-emerald-600">
                ₹{priceThreshold}/quintal
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="50"
              value={priceThreshold}
              onChange={(e) => setPriceThreshold(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg bg-slate-200 accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
              <span>Min: ₹1,000</span>
              <span>Mid: ₹3,000</span>
              <span>Max: ₹5,000</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none px-8 py-3.5 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all duration-150 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-75"
            >
              {isSaving ? 'Saving...' : t('save_firebase')}
            </button>

            {saveSuccess && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-left-4 duration-300">
                <CheckCircle className="w-5 h-5" />
                Preferences updated!
              </div>
            )}
          </div>

        </form>
      </div>

      {/* New Component: Alert Subscribe */}
      <AlertSubscribe commodity="Onion" district="Pune" state="Maharashtra" prefilledPhone={authUser?.phoneNumber || phone} />

      {/* Recent Alerts (Mock) */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-emerald-900/5 p-6 md:p-8 font-sans-custom">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 font-serif-custom">
          <Clock className="w-6 h-6 text-emerald-600" />
          Recent Alerts
        </h3>
        <div className="space-y-4">
          <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-start gap-4 transition-transform hover:scale-[1.01]">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Price Spike Detected: Onion in Pune</p>
              <p className="text-sm text-slate-500 mt-1">Current rate crossed your threshold of ₹{priceThreshold}. Peak predicted tomorrow.</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">2 hours ago</p>
            </div>
          </div>
          <div className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm flex items-start gap-4 transition-transform hover:scale-[1.01]">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Weather Warning: Heavy Rain</p>
              <p className="text-sm text-slate-500 mt-1">Unexpected rainfall in Nashik might delay your Tomato harvest.</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">1 day ago</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
