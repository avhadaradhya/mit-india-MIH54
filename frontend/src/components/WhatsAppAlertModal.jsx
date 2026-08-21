import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../lib/i18n';
import { Phone, X, CheckCircle } from 'lucide-react';

export default function WhatsAppAlertModal({ prefilledCrop }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      setErrorMessage(t('today') !== 'आज' ? 'Please enter a valid 10-digit mobile number' : 'कृपया १०-अंकी वैध मोबाईल नंबर प्रविष्ट करा');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate backend alert subscription registration
    setTimeout(() => {
      console.log('WhatsApp Subscription Payload:', {
        phone: `+91${digitsOnly}`,
        crop: prefilledCrop,
        timestamp: new Date().toISOString()
      });
      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setPhoneNumber('');
      }, 2000);
    }, 1200);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-[#1ebd58] min-h-[44px] min-w-[44px]"
        aria-label={t('fab_title')}
        title={t('fab_title')}
      >
        <Phone className="w-6 h-6 animate-bounce" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setIsOpen(false)}
        >
          <div 
            ref={modalRef}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden relative transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-100">
              <h3 
                id="modal-title" 
                className="text-2xl font-bold text-[#143D2B] pr-10" 
                style={{ fontFamily: 'Times New Roman, serif' }}
              >
                {t('whatsapp_heading')}
              </h3>
              <p className="text-xs text-slate-505 font-semibold mt-2.5 leading-relaxed">
                {t('whatsapp_desc')}
              </p>
            </div>

            {/* Success Feedback */}
            {isSuccess ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-250">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h4 className="text-lg font-bold text-[#143D2B]" style={{ fontFamily: 'Times New Roman, serif' }}>
                  {t('today') !== 'आज' ? 'Subscription Successful!' : 'नोंदणी यशस्वी झाली!'}
                </h4>
                <p className="text-sm text-slate-500 font-semibold">
                  {t('alert_success')}
                </p>
              </div>
            ) : (
              /* Subscription Form */
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                {/* Crop Prefilled Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    {t('crop')}
                  </label>
                  <input
                    type="text"
                    value={t(prefilledCrop.toLowerCase()) || prefilledCrop}
                    disabled
                    className="w-full h-11 px-3.5 bg-slate-100 text-slate-700 font-extrabold text-sm rounded-xl border border-slate-200 cursor-not-allowed select-none min-h-[44px]"
                  />
                </div>

                {/* Phone Input with pre-filled locked +91 prefix */}
                <div className="space-y-1.5">
                  <label htmlFor="whatsapp-number" className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-800" />
                    {t('phone_label')}
                  </label>
                  <div className="flex rounded-xl border border-slate-200 bg-[#F8FAF9] overflow-hidden focus-within:ring-2 focus-within:ring-emerald-800 focus-within:border-transparent transition-all">
                    <span className="h-11 px-3.5 flex items-center bg-slate-150 border-r border-slate-200 text-slate-500 font-extrabold text-sm select-none">
                      +91
                    </span>
                    <input
                      id="whatsapp-number"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={t('alert_placeholder')}
                      required
                      className="flex-1 h-11 px-3.5 bg-transparent text-slate-900 font-bold text-sm focus:outline-none min-h-[44px]"
                    />
                  </div>
                  {errorMessage && (
                    <p className="text-xs font-bold text-red-650 mt-1">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full h-12 flex items-center justify-center rounded-xl bg-[#143D2B] hover:bg-[#1c4e38] text-white font-extrabold text-sm transition-all duration-150 cursor-pointer shadow-md min-h-[44px] ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                </button>

              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
