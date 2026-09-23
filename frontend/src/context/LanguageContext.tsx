import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta' | 'hi';

interface Translations {
  [key: string]: {
    en: string;
    ta: string;
    hi: string;
  };
}

export const translations: Translations = {
  // Navigation
  home: { en: 'Home', ta: 'முகப்பு', hi: 'होम' },
  recharge: { en: 'Recharge', ta: 'ரீசார்ஜ்', hi: 'रिचार्ज' },
  passbook: { en: 'Passbook', ta: 'பாஸ்புக்', hi: 'पासबुक' },
  commission: { en: 'Commission', ta: 'கமிஷன்', hi: 'कमीशन' },
  profile: { en: 'Profile', ta: 'சுயவிவரம்', hi: 'प्रोफ़ाइल' },
  settings: { en: 'Settings', ta: 'அமைப்புகள்', hi: 'सेटिंग्स' },

  // Wallet
  walletBalance: { en: 'Wallet Balance', ta: 'வாலட் இருப்பு', hi: 'वॉलेट बैलेंस' },
  walletActive: { en: 'Wallet Active', ta: 'வாலட் செயலில் உள்ளது', hi: 'वॉलेट सक्रिय' },
  addCash: { en: 'Add Money (UPI)', ta: 'பணம் சேர்க்க (UPI)', hi: 'पैसे जोड़ें (UPI)' },
  addCashShort: { en: 'Add Cash', ta: 'பணம் சேர்', hi: 'पैसे जोड़ें' },
  instantCredit: { en: 'Instant Credit', ta: 'உடனடி வரவு', hi: 'तत्काल क्रेडिट' },

  // Home Stats
  todayRecharge: { en: "Today's Recharge", ta: 'இன்றைய ரீசார்ஜ்', hi: 'आज का रिचार्ज' },
  todayCommission: { en: "Today's Commission", ta: 'இன்றைய கமிஷன்', hi: 'आज का कमीशन' },
  pendingRecharge: { en: 'Pending Recharge', ta: 'நிலுவையில் உள்ளவை', hi: 'लंबित रिचार्ज' },
  failedRecharge: { en: 'Failed Recharge', ta: 'தோல்வியுற்றவை', hi: 'विफल रिचार्ज' },
  netProfitCredited: { en: 'Net Profit Credited', ta: 'நிகர லாபம் வரவு', hi: 'शुद्ध लाभ क्रेडिट' },

  // Services
  rechargeServices: { en: 'Recharge Services', ta: 'ரீசார்ஜ் சேவைகள்', hi: 'रिचार्ज सेवाएं' },
  mobileRecharge: { en: 'Mobile Recharge', ta: 'மொபைல் ரீசார்ஜ்', hi: 'मोबाइल रिचार्ज' },
  dthTv: { en: 'DTH Television', ta: 'டிடிஎச் டிவி', hi: 'डीटीएच टीवी' },
  liveInstant: { en: 'Live & Instant', ta: 'உடனடி சேவை', hi: 'लाइव और तत्काल' },

  // Passbook & Ledger
  rechargePassbook: { en: 'Recharge Passbook', ta: 'ரீசார்ஜ் பாஸ்புக்', hi: 'रिचार्ज पासबुक' },
  walletLedger: { en: 'Wallet Ledger', ta: 'வாலட் லெட்ஜர்', hi: 'वॉलेट लेजर' },
  depositRequests: { en: 'Deposit Requests', ta: 'வைப்பு கோரிக்கைகள்', hi: 'जमा अनुरोध' },
  success: { en: 'Success', ta: 'வெற்றி', hi: 'सफल' },
  pending: { en: 'Pending', ta: 'நிலுவையில்', hi: 'लंबित' },
  failed: { en: 'Failed', ta: 'தோல்வி', hi: 'विफल' },
  refunded: { en: 'Refunded', ta: 'திரும்பப் பெறப்பட்டது', hi: 'वापस किया गया' },

  // Plan Selection
  selectPlan: { en: 'Select a Recharge Plan', ta: 'திட்டத்தைத் தேர்ந்தெடுக்கவும்', hi: 'प्लान चुनें' },
  select: { en: 'Select', ta: 'தேர்ந்தெடு', hi: 'चुनें' },
  selected: { en: 'Selected', ta: 'தேர்ந்தெடுக்கப்பட்டது', hi: 'चुना गया' },
  allPlans: { en: 'All Plans', ta: 'அனைத்து திட்டங்கள்', hi: 'सभी प्लान' },
  validity: { en: 'Validity', ta: 'செல்லுபடியாகும் காலம்', hi: 'वैधता' },
  data: { en: 'Data', ta: 'டேட்டா', hi: 'डेटा' },
  details: { en: 'Details', ta: 'விவரங்கள்', hi: 'विवरण' },

  // Commission Structure
  commissionStructure: { en: 'My Commission Structure', ta: 'எனது கமிஷன் விபரம்', hi: 'मेरा कमीशन स्ट्रक्चर' },
  allServices: { en: 'All Services', ta: 'அனைத்து சேவைகள்', hi: 'सभी सेवाएं' },
  activeOperators: { en: 'active operators', ta: 'செயலில் உள்ள ஆபரேட்டர்கள்', hi: 'सक्रिय ऑपरेटर' },
  yourRate: { en: 'Your Commission Rate', ta: 'உங்கள் கமிஷன் விகிதம்', hi: 'आपकी कमीशन दर' },

  // Share & Invite
  shareApp: { en: 'SHARE TRIHUBPAY APP', ta: 'ட்ரிஹப்-பே செயலியைப் பகிரவும்', hi: 'ट्राईहबपे ऐप शेयर करें' },
  shareSubtitle: { en: 'Invite friends & retailers to join TriHubPay', ta: 'நண்பர்களை ட்ரிஹப்-பேயில் இணைய அழையுங்கள்', hi: 'दोस्तों को ट्राईहबपे में शामिल होने के लिए आमंत्रित करें' },
  shareNow: { en: 'Share Now', ta: 'இப்போதே பகிர்', hi: 'अभी शेयर करें' },

  // Common Actions
  refresh: { en: 'Refresh', ta: 'புதுப்பிக்கவும்', hi: 'रिफ्रेश' },
  close: { en: 'Close', ta: 'மூடு', hi: 'बंद करें' },
  cancel: { en: 'Cancel', ta: 'ரத்து', hi: 'रद्द करें' },
  save: { en: 'Save Changes', ta: 'மாற்றங்களைச் சேமி', hi: 'बदलाव सहेजें' },
  signOut: { en: 'Sign Out', ta: 'வெளியேறு', hi: 'साइन आउट' },
  language: { en: 'Language', ta: 'மொழி', hi: 'भाषा' },
  adminPortal: { en: 'Admin Portal', ta: 'நிர்வாக போர்டல்', hi: 'व्यवस्थापक पोर्टल' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('trihub_language');
    if (saved === 'ta' || saved === 'hi' || saved === 'en') return saved;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('trihub_language', lang);
  };

  const t = (key: string): string => {
    const item = translations[key];
    if (!item) return key;
    return item[language] || item.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
