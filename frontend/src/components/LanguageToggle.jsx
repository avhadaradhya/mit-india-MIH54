import React from 'react';
import { useLanguage } from '../lib/i18n';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Languages className="w-4.5 h-4.5 text-emerald-800" aria-hidden="true" />
      <div 
        className="inline-flex rounded-full bg-emerald-50/80 p-0.75 border border-emerald-100"
        role="radiogroup"
        aria-label="Language selection"
      >
        <button
          type="button"
          role="radio"
          aria-checked={lang === 'en'}
          onClick={() => setLang('en')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full min-h-[36px] min-w-[75px] transition-all duration-200 cursor-pointer ${
            lang === 'en'
              ? 'bg-[#143D2B] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-100/50'
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          English
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={lang === 'mr'}
          onClick={() => setLang('mr')}
          className={`px-3 py-1.5 text-xs font-bold rounded-full min-h-[36px] min-w-[75px] transition-all duration-200 cursor-pointer ${
            lang === 'mr'
              ? 'bg-[#143D2B] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-100/50'
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          मराठी
        </button>
      </div>
    </div>
  );
}
