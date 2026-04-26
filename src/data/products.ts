export interface Product {
  id: string;
  name: {
    ru: string;
    uz: string;
  };
  price: number | null;
  image: string;
  category: 'accessibility' | 'ramps' | 'handrails' | 'lifts';
  description: {
    ru: string;
    uz: string;
  };
}

export const products: Product[] = [
  {
    id: 'tactile-tile-pvc',
    name: {
      ru: 'Тактильная плитка ПВХ (Конус)',
      uz: 'PVX taktil plitka (Konus)',
    },
    price: null,
    category: 'accessibility',
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Предупреждающая тактильная плитка для помещений. Желтый цвет для контраста.',
      uz: 'Binolar uchun ogohlantiruvchi taktil plitka. Kontrast uchun sariq rang.',
    },
  },
  {
    id: 'braille-sign',
    name: {
      ru: 'Табличка со шрифтом Брайля',
      uz: 'Brayl yozuvi bilan tablichka',
    },
    price: null,
    category: 'accessibility',
    image: 'https://images.unsplash.com/photo-1632910121591-29e2484c0259?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Информационная табличка с дублированием текста шрифтом Брайля. Антивандальная.',
      uz: 'Matnni Brayl yozuvi bilan takrorlaydigan ma\'lumot tablichkasi. Vandalizmga qarshi.',
    },
  },
  {
    id: 'ramp-stationary',
    name: {
      ru: 'Пандус стационарный металлический',
      uz: 'Statsionar metall pandus',
    },
    price: null,
    category: 'ramps',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Изготовление и монтаж стационарных пандусов по ГОСТ. Противоскользящее покрытие.',
      uz: 'GOST bo\'yicha statsionar panduslarni ishlab chiqarish va o\'rnatish. Sirpanishga qarshi qoplama.',
    },
  },
  {
    id: 'handrail-stainless',
    name: {
      ru: 'Перила из нержавеющей стали',
      uz: 'Zanglamaydigan po\'latdan panjaralar',
    },
    price: null,
    category: 'handrails',
    image: 'https://images.unsplash.com/photo-1584622050111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Ограждения для лестниц и входных групп. Марка стали AISI 304.',
      uz: 'Zinapoyalar va kirish guruhlari uchun to\'siqlar. AISI 304 po\'lat markasi.',
    },
  },
  {
    id: 'lift-vertical',
    name: {
      ru: 'Подъемник вертикальный',
      uz: 'Vertikal ko\'taruvchi',
    },
    price: null,
    category: 'lifts',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Электрический подъемник для маломобильных групп населения. Высота подъема до 2м.',
      uz: 'Kam harakatlanuvchi aholi guruhlari uchun elektr ko\'taruvchi. Ko\'tarish balandligi 2 metrgacha.',
    },
  },
  {
    id: 'bathroom-handrail',
    name: {
      ru: 'Поручень для санузла откидной',
      uz: 'Sanuzel uchun yig\'iladigan tutqich',
    },
    price: null,
    category: 'handrails',
    image: 'https://images.unsplash.com/photo-1584622050111-993a426fbf0a?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Откидной поручень для унитаза. Нержавеющая сталь, надежное крепление.',
      uz: 'Unitaz uchun yig\'iladigan tutqich. Zanglamaydigan po\'lat, ishonchli mahkamlash.',
    },
  },
  {
    id: 'call-system',
    name: {
      ru: 'Система вызова помощи',
      uz: 'Yordam chaqirish tizimi',
    },
    price: null,
    category: 'accessibility',
    image: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'Беспроводная кнопка вызова для установки у входа или в санузле.',
      uz: 'Kirish joyida yoki sanuzelda o\'rnatish uchun simsiz chaqirish tugmasi.',
    },
  },
  {
    id: 'mnemoscheme',
    name: {
      ru: 'Мнемосхема тактильная',
      uz: 'Taktil mnemosxema',
    },
    price: null,
    category: 'accessibility',
    image: 'https://images.unsplash.com/photo-1632910121591-29e2484c0259?auto=format&fit=crop&q=80&w=800',
    description: {
      ru: 'План помещения с рельефным изображением и шрифтом Брайля.',
      uz: 'Relyefli tasvir va Brayl yozuvi bilan bino rejasi.',
    },
  },
];
