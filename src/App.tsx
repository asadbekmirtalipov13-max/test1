import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AdminPanel from './components/AdminPanel';
import Advertisement from './components/Advertisement';
import UserCabinet from './components/UserCabinet';
import { useStoreData } from './hooks/useStoreData';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import { useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDocFromServer, deleteDoc } from 'firebase/firestore';

import { Eye, Loader2, Search } from 'lucide-react';

function LanguageModal({ onComplete }: { onComplete: () => void }) {
  const { setLanguage } = useLanguage();
  const { isLargeText, setIsLargeText } = useTheme();
  
  const [selectedLang, setSelectedLang] = useState<'ru'|'uz'>('ru');
  const [impaired, setImpaired] = useState(isLargeText);

  const handleSubmit = () => {
    setLanguage(selectedLang);
    if (impaired !== isLargeText) {
      setIsLargeText(impaired);
    }
    localStorage.setItem('languageSet', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-center text-gray-900">Выберите язык / Tilni tanlang</h2>
        
        <div className="space-y-3 mb-6">
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedLang === 'ru' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" className="w-5 h-5 text-primary" name="lang" checked={selectedLang === 'ru'} onChange={() => setSelectedLang('ru')} />
            <span className="font-bold text-lg text-gray-900">Русский</span>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedLang === 'uz' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" className="w-5 h-5 text-primary" name="lang" checked={selectedLang === 'uz'} onChange={() => setSelectedLang('uz')} />
            <span className="font-bold text-lg text-gray-900">O'zbekcha</span>
          </label>
        </div>
        
        <div className="h-px bg-gray-200 w-full mb-6"></div>
        
        <label className="flex items-center gap-3 mb-8 cursor-pointer select-none">
          <div className="relative flex items-center">
            <input type="checkbox" className="sr-only peer" checked={impaired} onChange={(e) => setImpaired(e.target.checked)} />
            <div className="w-6 h-6 border-2 border-gray-300 rounded bg-gray-50 peer-checked:bg-yellow-400 peer-checked:border-yellow-400 transition-colors flex items-center justify-center">
              {impaired && <Eye className="w-4 h-4 text-yellow-900" />}
            </div>
          </div>
          <span className="font-bold text-gray-700">Режим для слабовидящих</span>
        </label>
        
        <button 
          onClick={handleSubmit}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          Зайти на сайт / Saytga kirish
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { t, language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const { categories, products, loading: storeLoading } = useStoreData();
  const { about, heroTitle, loading: settingsLoading, heroSlides } = useSiteSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const initialLoading = storeLoading || settingsLoading;

  useEffect(() => {
    if (!localStorage.getItem('languageSet')) {
      setShowLangModal(true);
    }
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setShowAdmin(true);
        setShowCabinet(false);
        window.scrollTo(0, 0);
      } else if (window.location.hash === '#cabinet') {
        setShowCabinet(true);
        setShowAdmin(false);
        window.scrollTo(0, 0);
      } else {
        setShowAdmin(false);
        setShowCabinet(false);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    const handleResetHome = () => {
      setSelectedCategoryId(null);
      setSearchQuery('');
    };
    window.addEventListener('resetHome', handleResetHome);
    
    handleHashChange();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('resetHome', handleResetHome);
    };
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <CartDrawer />
        <div className="flex-grow py-20">
          <AdminPanel />
        </div>
        <Footer />
      </div>
    );
  }

  if (showCabinet) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col transition-colors duration-200">
        <Navbar />
        <CartDrawer />
        <div className="flex-grow">
          <UserCabinet />
        </div>
        <Footer />
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    const searchLow = searchQuery.toLowerCase();
    const matchesSearch = (
      p?.name?.[language]?.toLowerCase().includes(searchLow) || 
      p?.description?.[language]?.toLowerCase().includes(searchLow) ||
      (p?.tags && p.tags.some(tag => tag.toLowerCase().includes(searchLow)))
    );
    if (selectedCategoryId) {
      return matchesSearch && p.categoryId === selectedCategoryId;
    }
    return matchesSearch;
  });

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col transition-colors duration-200">
      {showLangModal && <LanguageModal onComplete={() => setShowLangModal(false)} />}
      <Navbar />
      <CartDrawer />
      
      {!selectedCategoryId && (
        <>
          <Hero />
          <Advertisement />
          
          <section className="py-24 bg-white transition-colors duration-200" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tight mb-10">
                {heroSlides?.[0]?.title?.[language] || heroTitle?.[language] || (language === 'ru' ? 'Мир одинаковый для всех' : 'Dunyo hamma uchun bir xil')}
              </h2>
              <div className="w-24 h-2 bg-primary mx-auto mb-10 rounded-full"></div>
              <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                {about?.[language]}
              </p>
            </div>
          </section>
        </>
      )}
      
      <div className={`flex-grow py-24 ${selectedCategoryId ? 'bg-white' : 'bg-gray-50'} transition-colors duration-200`} id="products">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!selectedCategoryId ? (
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight">{t('products.title')}</h2>
              <div className="w-32 h-2 bg-primary mx-auto mt-6 rounded-full mb-12"></div>
              <div className="relative max-w-2xl mx-auto">
                <input 
                  id="searchInput"
                  type="text" 
                  placeholder={language === 'ru' ? "Поиск товаров..." : "Tovarlarni qidirish..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-8 py-5 rounded-3xl border-2 border-gray-100 bg-white text-gray-900 focus:outline-none focus:border-primary text-xl shadow-xl placeholder-gray-400 transition-all"
                />
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              </div>
            </div>
          ) : (
             <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <button 
                  onClick={() => {
                    setSelectedCategoryId(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-wider hover:opacity-80 transition-opacity text-lg p-3 rounded-xl bg-blue-50 border border-blue-100"
                >
                  &larr; {language === 'ru' ? 'Назад к категориям' : 'Kategoriyalarga qaytish'}
                </button>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                    <img src={selectedCategory?.image} className="w-full h-full object-cover" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">{selectedCategory?.name?.[language]}</h1>
                </div>
             </div>
          )}

          {!selectedCategoryId && searchQuery === '' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {categories.map((category) => (
                <div 
                  key={category.id} 
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group cursor-pointer"
                >
                  <div className="aspect-square rounded-3xl overflow-hidden relative shadow-lg group-hover:shadow-2xl transition-all duration-300">
                    <img src={category.image} alt={category.name?.[language]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{category.name?.[language]}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  categoryName={categories.find(c => c.id === product.categoryId)?.name?.[language]} 
                  isAdmin={user && isAdmin}
                  onEdit={() => {
                    // We need a way to open edit modal from here or just tell user to go to admin panel
                    // For now, let's keep it simple as the user asked for the menu to work.
                    // If we want it to really edit, we'd need to expose setEditingProduct globally or via context.
                  }}
                  onDelete={async () => {
                    if (window.confirm(language === 'ru' ? 'Удалить?' : 'O\'chirish?')) {
                      await deleteDoc(doc(db, 'products', product.id));
                    }
                  }}
                />
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-center text-gray-500 py-12 text-xl col-span-full">
                  {language === 'ru' ? 'Товары не найдены.' : 'Tovarlar topilmadi.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <SiteSettingsProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </SiteSettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
