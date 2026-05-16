import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AdData {
  isActive: boolean;
  text: string;
  imageUrl: string;
  link: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  image: string;
  description: { ru: string; uz: string };
  btnColor: string;
  btnText: { ru: string; uz: string };
  screenshotRequired?: boolean;
  type?: 'manual' | 'botfather' | 'redirect';
  providerToken?: string;
  redirectUrlTemplate?: string;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: { ru: string; uz: string };
  text: { ru: string; uz: string };
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
}

interface SiteSettings {
  siteName: string;
  logoUrl: string;
  bannerUrl: string;
  footerImageUrl?: string;
  primaryColor: string;
  ad: AdData;
  contacts: {
    phone: string;
    email: string;
    address: { ru: string; uz: string };
    workingHours: { ru: string; uz: string };
  };
  socialLinks: SocialLink[];
  pickupSettings: {
    address: { ru: string; uz: string };
    mapUrl: string;
    callCenter: string;
  };
  about: {
    ru: string;
    uz: string;
  };
  aboutImage?: string;
  aboutStats?: {
    years: number;
    clients: number;
  };
  payLaterButtonText?: { ru: string; uz: string };
  paymentMethodsList: PaymentMethod[];
  
  heroSlides: HeroSlide[];
  heroAutoplayDelay: number;

  siteDescription?: { ru: string; uz: string };
  aboutUs?: { ru: string; uz: string };
  adBlockTitle?: { ru: string; uz: string };
  adBlockLink?: string;
  showAdBlock?: boolean;
  adBlockImage?: string;
  
  tgSettings?: {
    token: string;
    chatIds: string;
  };
}

const defaultSettings: SiteSettings = {
  siteName: 'Konstructuv Metall',
  logoUrl: 'https://i.ibb.co/wz09y2z/53087047-1-192x192-rev003.jpg',
  bannerUrl: 'https://i.ibb.co/h14w00g/64250047-1-1366x210-rev004.jpg',
  footerImageUrl: 'https://i.ibb.co/h14w00g/64250047-1-1366x210-rev004.jpg',
  
  siteDescription: {
    ru: 'Производство пандусов и металлоконструкций',
    uz: 'Panduslar va metall konstruksiyalar ishlab chiqarish'
  },
  tgSettings: {
    token: '',
    chatIds: ''
  },
  aboutUs: {
    ru: '',
    uz: ''
  },
  adBlockTitle: { ru: '', uz: '' },
  adBlockLink: '',
  showAdBlock: false,
  adBlockImage: '',

  heroSlides: [
    {
      id: 'default-1',
      imageUrl: 'https://images.unsplash.com/photo-1542314831-c6a4d14cd4a1?auto=format&fit=crop&q=80',
      title: { ru: 'Медицинское и реабилитационное оборудование', uz: 'Tibbiyot va reabilitatsiya uskunalari' },
      text: { ru: '', uz: '' }
    }
  ],
  heroAutoplayDelay: 5000,
  
  primaryColor: '#2563eb', // blue-600
  ad: {
    isActive: false,
    text: '',
    imageUrl: '',
    link: ''
  },
  contacts: {
    phone: '+998 90 123 45 67',
    email: 'info@konstructuvmetall.uz',
    address: {
      ru: 'Узбекистан, г. Ташкент',
      uz: 'O\'zbekiston, Toshkent sh.'
    },
    workingHours: {
      ru: 'Пн-Пт: 9:00 - 18:00',
      uz: 'Du-Ju: 9:00 - 18:00'
    }
  },
  socialLinks: [
    { id: 'tg', name: 'Telegram', url: 'https://t.me/', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png' },
    { id: 'ig', name: 'Instagram', url: 'https://instagram.com/', iconUrl: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png' }
  ],
  pickupSettings: {
    address: {
      ru: 'г. Ташкент, ул. Примерная, 12',
      uz: 'Toshkent sh., Namunaviy ko\'chasi, 12'
    },
    mapUrl: 'https://maps.google.com',
    callCenter: '+998 71 123 45 67'
  },
  about: {
    ru: 'Мы создаем доступную среду, чтобы каждый человек чувствовал себя комфортно и безопасно.',
    uz: 'Biz har bir inson o\'zini qulay va xavfsiz his qilishi uchun ochiq muhit yaratamiz.'
  },
  aboutStats: {
    years: 10,
    clients: 500
  },
  payLaterButtonText: {
    ru: 'Оплачу позже (Ожидает подтверждения)',
    uz: 'Keyinroq to\'layman (Tasdiqlash kutilmoqda)'
  },
  paymentMethodsList: [
    {
      id: 'cash-1',
      name: 'Наличные / Naqd',
      image: 'https://images.unsplash.com/photo-1580519542036-ed47f3ae3ea8?auto=format&fit=crop&q=80',
      description: { ru: 'Оплата наличными при получении.', uz: 'Qabul qilganda naqd pul bilan to\'lash.' },
      btnColor: '#22c55e',
      btnText: { ru: 'Я оплатил', uz: 'Men to\'ladim' }
    }
  ]
};

const SiteSettingsContext = createContext<SiteSettings>(defaultSettings);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<SiteSettings>;
        setSettings(prev => ({
          ...prev,
          ...data,
          heroSlides: data.heroSlides?.length ? data.heroSlides : prev.heroSlides,
          heroAutoplayDelay: data.heroAutoplayDelay || prev.heroAutoplayDelay,
          paymentMethodsList: data.paymentMethodsList?.length ? data.paymentMethodsList : prev.paymentMethodsList,
          contacts: { ...prev.contacts, ...(data.contacts || {}) },
          about: { ...prev.about, ...(data.about || {}) },
          socialLinks: data.socialLinks || prev.socialLinks
        }));
      }
      setLoading(false);
    });

    const unsubscribeTelegram = onSnapshot(doc(db, 'settings', 'telegram'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({
          ...prev,
          tgSettings: {
            token: data.token || '',
            chatIds: data.chatIds || ''
          }
        }));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTelegram();
    };
  }, []);

  // Apply primary color to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
  }, [settings.primaryColor]);

  return (
    <SiteSettingsContext.Provider value={{...settings, loading}}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
