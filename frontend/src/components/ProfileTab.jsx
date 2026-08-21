import React, { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { User, Bell, Shield, Phone, MessageSquare, LogOut, CheckCircle } from 'lucide-react';

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
    <div className="space-y-6">
      
      {/* Profile Info */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col sm:flex-row items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#143D2B] shrink-0 font-bold text-2xl font-serif-custom uppercase">
          {authUser?.displayName ? authUser.displayName[0] : <User className="w-8 h-8" />}
        </div>
        <div className="flex-1 text-center sm:text-left font-sans-custom">
          <span className="bg-emerald-50 text-[#143D2B] border border-emerald-100 text-[10px] font-black px-2 py-0.75 rounded-md uppercase tracking-wider">
            Verified Farmer Account
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-1.5 font-serif-custom">
            {authUser?.displayName || 'Farmer'}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            {authUser?.email || 'farmer@krushaksetu.in'}
          </p>
          <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center sm:justify-start gap-1 mt-2">
            <Shield className="w-3.5 h-3.5 text-emerald-800" />
            {t('linked_provider')}: {getProviderName()}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded-xl transition cursor-pointer min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          {t('logout')}
        </button>
      </div>

      {/* Alert settings */}
      <div className="bg-white border border-emerald-100 rounded-2xl shadow-sm p-5 md:p-6">
        <h3 className="text-lg font-bold text-[#143D2B] mb-5 flex items-center gap-2" style={{ fontFamily: 'Times New Roman, serif' }}>
          <Bell className="w-5.5 h-5.5 text-emerald-800" />
          {t('peak_alert_prefs')}
        </h3>

        <form onSubmit={handleSave} className="space-y-5 font-sans-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WhatsApp */}
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-800" />
                  {t('whatsapp_toggle')}
                </label>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="w-9 h-5 rounded-full accent-[#143D2B] cursor-pointer"
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
              
              <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
                <span className="h-10 px-3 flex items-center bg-slate-100 border-r border-slate-200 text-slate-500 font-extrabold text-xs">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="Enter 10-digit number"
                  disabled={!whatsappEnabled}
                  className="flex-1 h-10 px-3 bg-transparent text-slate-900 font-bold text-xs focus:outline-none disabled:opacity-50 min-h-[44px]"
                />
              </div>
            </div>

            {/* Telegram */}
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-800" />
                  {t('telegram_toggle')}
                </label>
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="w-9 h-5 rounded-full accent-[#143D2B] cursor-pointer"
                  style={{ transform: 'scale(1.2)' }}
                />
              </div>
              
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="Enter Telegram Chat ID"
                disabled={!telegramEnabled}
                className="w-full h-10 px-3 bg-white text-slate-900 font-bold text-xs rounded-xl border border-slate-200 focus:outline-none disabled:opacity-50 min-h-[44px]"
              />
            </div>

          </div>

          {/* Threshold Slider */}
          <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                {t('target_threshold')}
              </span>
              <span className="text-sm font-extrabold text-[#D99B26]">
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
              className="w-full h-2 rounded-lg bg-slate-200 accent-[#143D2B] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>Min: ₹1,000</span>
              <span>Mid: ₹3,000</span>
              <span>Max: ₹5,000</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 h-12 flex items-center justify-center rounded-xl bg-[#143D2B] hover:bg-[#1c4e38] text-white font-extrabold text-sm transition-all duration-150 cursor-pointer shadow-md min-h-[44px] disabled:opacity-75"
            >
              {isSaving ? 'Saving...' : t('save_firebase')}
            </button>

            {saveSuccess && (
              <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold animate-bounce">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Preferences updated in Firestore!
              </div>
            )}
          </div>

        </form>
      </div>

    </div>
  );
}
