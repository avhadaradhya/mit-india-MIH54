import React, { createContext, useContext, useState, useEffect } from 'react';

const dictionary = {
  en: {
    app_title: "KrushakSetu",
    app_slogan: "AI-Driven Crop Price Forecasting & Market Routing",
    crop: "Crop",
    yield: "Yield (Quintals)",
    location: "Current Location",
    onion: "Onion",
    tomato: "Tomato",
    wheat: "Wheat",
    soybean: "Soybean",
    pune: "Pune",
    solapur: "Solapur",
    nashik: "Nashik",
    ahmednagar: "Ahmednagar",
    price_forecast: "14-Day Price Forecasting (ARIMA)",
    history: "History",
    forecast: "Forecast",
    today: "Today",
    decision: "AI Action Advice",
    sell_today: "SELL TODAY",
    hold_for: "HOLD FOR {days} DAYS",
    predicted_jump: "Predicted Jump",
    predicted_jump_val: "+₹{val}/quintal",
    current_price: "Current Price",
    current_price_val: "₹{val}/quintal",
    predicted_peak: "Target Peak Price",
    predicted_peak_val: "₹{val}/quintal",
    price_label: "Price (₹/quintal)",
    mandi_routing: "Smart Mandi Routing & Net-Profit Optimizer",
    mandi_caption: "Ranked by money in your pocket, not raw price.",
    mandi_name: "Mandi Name",
    distance: "Distance",
    raw_rate: "Raw Rate",
    transport_cost: "Transport Cost",
    mandi_fee: "Mandi Fee",
    net_profit: "Net Profit",
    top_recommendation: "TOP RECOMMENDATION",
    lifecycle_roadmap: "AI Crop Lifecycle Roadmap",
    quick_sell: "Quick Sell",
    storage_buffer: "Storage Buffer OK",
    read_more: "Read more",
    read_less: "Read less",
    whatsapp_heading: "WhatsApp Peak Alert",
    whatsapp_desc: "Get automated alerts on WhatsApp when prices reach their seasonal peak in your region.",
    phone_label: "WhatsApp Phone Number",
    submit: "Subscribe",
    submitting: "Subscribing...",
    alert_success: "Subscription successful! You will receive peak alerts on WhatsApp.",
    alert_placeholder: "Enter 10-digit number",
    fab_title: "Subscribe to alerts",
    loading: "Loading information...",
    error_loading: "Error loading data. Please check your connection.",
    retry: "Retry",

    // New Tab Labels
    tab_home: "Home",
    tab_forecast: "Forecast",
    tab_calculate: "Calculate",
    tab_roadmap: "AI Roadmap",
    tab_profile: "Profile & Alerts",

    // Tab 1: Home
    current_rate: "Current Crop Rate",
    nearest_mandi: "Nearest Mandi",
    profit_trend: "7-Day Net Profit Trend",
    logistics_title: "Logistics Management",
    coming_soon: "Coming Soon",
    perishable_route: "Urgent Perishable Route (Immediate Direct APMC Route)",
    storage_route: "Safe Storage Route (WDRA Warehouse Transfer Route)",
    book_truck: "Book a Shared Truck",
    map_routing: "Live OSRM Routing Optimizer",

    // Tab 2: Forecast
    select_state: "Select State",
    select_district: "Select District",
    state: "State",
    district: "District",
    ai_explainer: "AI Price Explainer (Farmer Friendly)",
    maharashtra: "Maharashtra",
    confidence_interval: "ARIMA Confidence bounds (+/- 5%)",

    // Tab 3: Calculate
    calc_yield: "Yield Volume (Quintals)",
    production_cost: "Base Production Cost (₹/Quintal)",
    distance_label: "Transport Distance (km)",
    diesel_rate: "Diesel/Freight Rate (₹/km)",
    gross_revenue: "Gross Mandi Revenue",
    net_in_pocket: "True Net In-Pocket Profit",
    mandi_comparison: "Mandi Comparison & Arbitrage Matrix",
    mandi_higher_profit: "Profit Difference",

    // Tab 4: Roadmap
    soil_breed: "Best Seed Breed (Soil Adaptive)",
    sowing_weather: "Weather & Sowing Window (OpenWeather)",
    holding_strategy: "Shelf-life & Storage Advice",
    peak_selling: "Peak-Price Harvest Selling Window",

    // Tab 5: Profile
    user_profile: "User Profile & Alerts",
    linked_provider: "Linked Provider",
    peak_alert_prefs: "Peak Alert Preferences",
    whatsapp_toggle: "WhatsApp Alerts",
    telegram_toggle: "Telegram Push",
    telegram_id: "Telegram Chat ID",
    target_threshold: "Alert Price Threshold",
    save_firebase: "Save Preferences to Firebase",
    logout: "Sign Out",
  },
  mr: {
    app_title: "कृषकसेतू",
    app_slogan: "एआय-आधारित पीक दर अंदाज आणि बाजारपेठ मार्गदर्शन",
    crop: "पीक",
    yield: "उत्पादन (क्विंटल)",
    location: "सध्याचे ठिकाण",
    onion: "कांदा",
    tomato: "टोमॅटो",
    wheat: "गहू",
    soybean: "सोयाबीन",
    pune: "पुणे",
    solapur: "सोलापूर",
    nashik: "नाशिक",
    ahmednagar: "अहमदनगर",
    price_forecast: "१४-दिवसीय पीक दर अंदाज (ARIMA)",
    history: "इतिहास",
    forecast: "अंदाज (फोरकास्ट)",
    today: "आज",
    decision: "एआय कृती सल्ला",
    sell_today: "आजच विक्री करा",
    hold_for: "{days} दिवसांसाठी थांबा (HOLD)",
    predicted_jump: "अपेक्षित दरवाढ",
    predicted_jump_val: "+₹{val}/क्विंटल",
    current_price: "सध्याचा दर",
    current_price_val: "₹{val}/क्विंटल",
    predicted_peak: "लक्ष्य सर्वोच्च दर",
    predicted_peak_val: "₹{val}/क्विंटल",
    price_label: "दर (₹/क्विंटल)",
    mandi_routing: "स्मार्ट मंडी निवड आणि निव्वळ नफा ऑप्टिमायझर",
    mandi_caption: "नफा खिशात किती उरेल यानुसार क्रमवारी, फक्त कच्च्या दरावर नाही.",
    mandi_name: "बाजारपेठ (मंडी)",
    distance: "अंतर",
    raw_rate: "कच्चा दर",
    transport_cost: "वाहतूक खर्च",
    mandi_fee: "मंडी फी",
    net_profit: "निव्वळ नफा",
    top_recommendation: "सर्वोत्तम शिफारस",
    lifecycle_roadmap: "एआय पीक चक्र मार्गदर्शक (रोडमॅप)",
    quick_sell: "त्वरित विक्री",
    storage_buffer: "साठवणूक सुरक्षित (Storage OK)",
    read_more: "अधिक वाचा",
    read_less: "कमी वाचा",
    whatsapp_heading: "व्हॉट्सॲप पीक अलर्ट",
    whatsapp_desc: "तुमच्या भागात दर जेव्हा उच्चांकी गाठतील तेव्हा थेट व्हॉट्सॲपवर माहिती मिळवा.",
    phone_label: "व्हॉट्सॲप फोन नंबर",
    submit: "सबस्क्राईब करा",
    submitting: "नोंदणी होत आहे...",
    alert_success: "नोंदणी यशस्वी झाली! तुम्हाला व्हॉट्सॲपवर पीक अलर्ट मिळतील.",
    alert_placeholder: "१०-अंकी मोबाईल नंबर टाका",
    fab_title: "अलर्ट सुरू करा",
    loading: "माहिती लोड होत आहे...",
    error_loading: "माहिती लोड करण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.",
    retry: "पुन्हा प्रयत्न करा",

    // New Tab Labels
    tab_home: "मुख्यपृष्ठ",
    tab_forecast: "दर अंदाज",
    tab_calculate: "कॅल्क्युलेटर",
    tab_roadmap: "पीक नियोजन",
    tab_profile: "प्रोफाइल व अलर्ट",

    // Tab 1: Home
    current_rate: "सध्याचा पीक दर",
    nearest_mandi: "सर्वात जवळची मंडी",
    profit_trend: "७-दिवसीय निव्वळ नफा कल",
    logistics_title: "वाहतूक व्यवस्थापन",
    coming_soon: "लवकरच येत आहे",
    perishable_route: "तातडीचा ​​नाशवंत माल मार्ग (थेट बाजार समिती मार्ग)",
    storage_route: "सुरक्षित साठवणूक मार्ग (WDRA वेअरहाउस मार्ग)",
    book_truck: "सामायिक ट्रक बुक करा",
    map_routing: "थेट ओएसआरएम (OSRM) वाहतूक मार्ग",

    // Tab 2: Forecast
    select_state: "राज्य निवडा",
    select_district: "जिल्हा निवडा",
    state: "राज्य",
    district: "जिल्हा",
    ai_explainer: "एआय दर स्पष्टीकरण (सोप्या भाषेत)",
    maharashtra: "महाराष्ट्र",
    confidence_interval: "ARIMA विश्वासार्हता श्रेणी (+/- ५%)",

    // Tab 3: Calculate
    calc_yield: "उत्पादन प्रमाण (क्विंटल)",
    production_cost: "उत्पादन खर्च (₹/क्विंटल)",
    distance_label: "वाहतूक अंतर (किमी)",
    diesel_rate: "डिझेल/भाडे दर (₹/किमी)",
    gross_revenue: "एकूण मंडी महसूल",
    net_in_pocket: "खरा निव्वळ नफा (खिशात उरणारा)",
    mandi_comparison: "मंडी तुलना आणि नफा तक्ता",
    mandi_higher_profit: "नफा फरक",

    // Tab 4: Roadmap
    soil_breed: "उत्कृष्ट बियाणे (मातीनुसार)",
    sowing_weather: "हवामान व पेरणी काळ (OpenWeather)",
    holding_strategy: "साठवणूक आणि विक्री धोरण सल्ला",
    peak_selling: "सर्वोच्च दर काढणी हंगाम विक्री वेळ",

    // Tab 5: Profile
    user_profile: "युझर प्रोफाइल आणि अलर्ट सेटिंग",
    linked_provider: "लॉगिन प्रकार",
    peak_alert_prefs: "सर्वोच्च दर अलर्ट सेटिंग्ज",
    whatsapp_toggle: "व्हॉट्सॲप अलर्ट",
    telegram_toggle: "टेलीग्राम अलर्ट",
    telegram_id: "टेलीग्राम चॅट आयडी",
    target_threshold: "अलर्ट दर मर्यादा (₹/क्विंटल)",
    save_firebase: "सेटिंग्ज फायरबेसवर जतन करा",
    logout: "लॉगआउट करा",
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem('krushaksetu_lang');
      return saved === 'mr' ? 'mr' : 'en';
    } catch (e) {
      return 'en';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('krushaksetu_lang', lang);
    } catch (e) {
      // Fail-safe for environments without localStorage
    }
  }, [lang]);

  const t = (key, variables = {}) => {
    const dict = dictionary[lang] || dictionary.en;
    let text = dict[key] || dictionary.en[key] || key;
    
    Object.keys(variables).forEach(vKey => {
      text = text.replace(`{${vKey}}`, variables[vKey]);
    });
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
