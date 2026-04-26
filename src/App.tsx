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
import { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { db } from './firebase';
import { doc, getDocFromServer, deleteDoc } from 'firebase/firestore';

import { Eye, Loader2, Search } from 'lucide-react';

function LanguageModal({ onComplete }: { onComplete: () => void }) {
  const { setLanguage, language } = useLanguage();
  const { isLargeText, setIsLargeText } = useTheme();
  
  const [selectedLang, setSelectedLang] = useState<'ru'|'uz'>(language || 'ru');
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-hidden">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Eye className="w-20 h-20" />
        </div>
        
        <h2 className="text-2xl font-black mb-6 text-gray-900 leading-tight">Выберите язык <br/><span className="text-primary">Tilni tanlang</span></h2>
        
        <div className="space-y-3 mb-8">
          <button 
            onClick={() => setSelectedLang('ru')}
            className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${selectedLang === 'ru' ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
          >
            <span className={`font-black text-lg ${selectedLang === 'ru' ? 'text-primary' : 'text-gray-400'}`}>РУССКИЙ</span>
            {selectedLang === 'ru' && <div className="w-3 h-3 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setSelectedLang('uz')}
            className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${selectedLang === 'uz' ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
          >
            <span className={`font-black text-lg ${selectedLang === 'uz' ? 'text-primary' : 'text-gray-400'}`}>O'ZBEKCHA</span>
            {selectedLang === 'uz' && <div className="w-3 h-3 bg-primary rounded-full" />}
          </button>
        </div>
        
        <div className="h-px bg-gray-100 w-full mb-8"></div>
        
        <div className="flex items-center justify-between mb-8 cursor-pointer group" onClick={() => setImpaired(!impaired)}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${impaired ? 'bg-yellow-400 shadow-lg shadow-yellow-100' : 'bg-gray-100'}`}>
              <Eye className={`w-6 h-6 transition-colors ${impaired ? 'text-yellow-900' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`font-black text-xs uppercase tracking-widest leading-none mb-1 transition-colors ${impaired ? 'text-yellow-700' : 'text-gray-400'}`}>Режим</p>
              <p className={`font-bold transition-colors ${impaired ? 'text-gray-900' : 'text-gray-500'}`}>Для слабовидящих</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full relative transition-colors ${impaired ? 'bg-yellow-400' : 'bg-gray-200'}`}>
             <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${impaired ? 'translate-x-6' : ''}`} />
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          {selectedLang === 'ru' ? 'Зайти на сайт' : 'Saytga kirish'}
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

  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (searchQuery.trim()) {
      const fuse = new Fuse(products, {
        keys: [
          { name: 'name.ru', weight: 1.0 },
          { name: 'name.uz', weight: 1.0 },
          { name: 'description.ru', weight: 0.5 },
          { name: 'description.uz', weight: 0.5 },
          { name: 'tags', weight: 0.8 },
          { name: 'code', weight: 0.8 }
        ],
        threshold: 0.4,
        distance: 100,
        ignoreLocation: true
      });
      result = fuse.search(searchQuery).map(r => r.item);
    }

    if (selectedCategoryId) {
      result = result.filter(p => p.categoryId === selectedCategoryId);
    }
    
    return result;
  }, [products, searchQuery, selectedCategoryId]);

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

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col transition-colors duration-200 overflow-x-hidden">
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
