import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'ru' | 'uz';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  'nav.home': {
    ru: 'Главная',
    uz: 'Bosh sahifa',
  },
  'nav.products': {
    ru: 'Продукция',
    uz: 'Mahsulotlar',
  },
  'nav.about': {
    ru: 'О нас',
    uz: 'Biz haqimizda',
  },
  'nav.contacts': {
    ru: 'Контакты',
    uz: 'Aloqa',
  },
  'nav.profile': {
    ru: 'Профиль',
    uz: 'Profil',
  },
  'nav.admin': {
    ru: 'Админ',
    uz: 'Admin',
  },
  'status.need_to_pay': {
    ru: 'Ожидает оплаты',
    uz: 'To\'lov kutilmoqda',
  },
  'status.pending': {
    ru: 'Ожидает подтверждения',
    uz: 'Tasdiqlash kutilmoqda',
  },
  'status.cancelled': {
    ru: 'Отменен',
    uz: 'Bekor qilindi',
  },
  'status.confirmed': {
    ru: 'Оплачен - В процессе',
    uz: 'To\'langan - Jarayonda',
  },
  'status.ready': {
    ru: 'Готов к выдаче',
    uz: 'Olib ketishga tayyor',
  },
  'hero.title': {
    ru: 'Производство пандусов и металлоконструкций',
    uz: 'Panduslar va metall konstruksiyalar ishlab chiqarish',
  },
  'hero.subtitle': {
    ru: 'Качественные решения для доступной среды в Узбекистане',
    uz: "O'zbekistonda qulay muhit uchun sifatli yechimlar",
  },
  'hero.cta': {
    ru: 'Связаться с нами',
    uz: "Biz bilan bog'lanish",
  },
  'products.title': {
    ru: 'Наша продукция',
    uz: 'Bizning mahsulotlar',
  },
  'products.price': {
    ru: 'сум',
    uz: "so'm",
  },
  'products.details': {
    ru: 'Подробнее',
    uz: "Batafsil",
  },
  'features.title': {
    ru: 'Почему выбирают нас',
    uz: 'Nima uchun bizni tanlashadi',
  },
  'footer.rights': {
    ru: 'Все права защищены',
    uz: 'Barcha huquqlar himoyalangan',
  },
  'footer.address': {
    ru: 'г. Ташкент, Узбекистан',
    uz: 'Toshkent sh., O\'zbekiston',
  },
  'contact.phone': {
    ru: 'Телефоны',
    uz: 'Telefonlar',
  },
  'cart.title': {
    ru: 'Корзина',
    uz: 'Savatcha',
  },
  'cart.empty': {
    ru: 'Корзина пуста',
    uz: 'Savatcha bo\'sh',
  },
  'cart.checkout': {
    ru: 'Оформить заказ',
    uz: 'Buyurtma berish',
  },
  'cart.total': {
    ru: 'Итого:',
    uz: 'Jami:',
  },
  'price.request': {
    ru: 'Цена по запросу',
    uz: 'Narx so\'rov bo\'yicha',
  },
  'btn.add_to_cart': {
    ru: 'В корзину',
    uz: 'Savatchaga',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'ru' || saved === 'uz') ? saved : 'ru';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
