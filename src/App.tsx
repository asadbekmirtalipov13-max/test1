import Navbar from './components/Navbar';
import { FloatingCartButton } from './components/FloatingCartButton';
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
import { motion, AnimatePresence } from 'motion/react';

import { Eye, Loader2, Search, ShieldCheck, MapPin, Phone, Globe, X, ArrowLeft, CheckCircle2, ChevronUp } from 'lucide-react';

function LanguageModal({ onComplete }: { onComplete: () => void }) {
  const { setLanguage, language } = useLanguage();
  const { isLargeText, setIsLargeText } = useTheme();
  
  const [selectedLang, setSelectedLang] = useState<'ru'|'uz'>(language === 'en' ? 'ru' : language || 'ru');
  const [impaired, setImpaired] = useState(isLargeText);

  const handleSubmit = () => {
    setLanguage(selectedLang as any);
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
        
        <h2 className="text-2xl font-black mb-6 text-blue-950 leading-tight">Выберите язык <br/><span className="text-primary">Tilni tanlang</span></h2>
        
        <div className="space-y-3 mb-8">
          <button 
            onClick={() => setSelectedLang('ru')}
            className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${selectedLang === 'ru' ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
          >
            <span className={`font-black text-lg ${selectedLang === 'ru' ? 'text-primary' : 'text-blue-500'}`}>РУССКИЙ</span>
            {selectedLang === 'ru' && <div className="w-3 h-3 bg-primary rounded-full" />}
          </button>
          <button 
            onClick={() => setSelectedLang('uz')}
            className={`flex items-center justify-between w-full p-4 rounded-2xl border-2 transition-all ${selectedLang === 'uz' ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-100 hover:bg-gray-50'}`}
          >
            <span className={`font-black text-lg ${selectedLang === 'uz' ? 'text-primary' : 'text-blue-500'}`}>O'ZBEKCHA</span>
            {selectedLang === 'uz' && <div className="w-3 h-3 bg-primary rounded-full" />}
          </button>
        </div>
        
        <div className="h-px bg-gray-100 w-full mb-8"></div>
        
        <div className="flex items-center justify-between mb-8 cursor-pointer group" onClick={() => setImpaired(!impaired)}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${impaired ? 'bg-yellow-400 shadow-lg shadow-yellow-100' : 'bg-gray-100'}`}>
              <Eye className={`w-6 h-6 transition-colors ${impaired ? 'text-yellow-900' : 'text-blue-500'}`} />
            </div>
            <div>
              <p className={`font-black text-xs uppercase tracking-wider leading-none mb-1 transition-colors ${impaired ? 'text-yellow-700' : 'text-blue-500'}`}>Режим</p>
              <p className={`font-bold transition-colors ${impaired ? 'text-blue-950' : 'text-blue-400'}`}>Для слабовидящих</p>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full relative transition-colors ${impaired ? 'bg-yellow-400' : 'bg-gray-200'}`}>
             <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${impaired ? 'translate-x-6' : ''}`} />
          </div>
        </div>
        
        <button 
          onClick={handleSubmit}
          className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-wider shadow-xl hover:bg-blue-700 active:scale-95 transition-all"
        >
          {selectedLang === 'ru' ? 'Зайти на сайт' : 'Saytga kirish'}
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { t, language } = useLanguage();
  const { user, isAdmin, loading } = useAuth();
  const { categories, products, news, partners, branches, updates, loading: storeLoading } = useStoreData();
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<any>(null);
  const [selectedNews, setSelectedNews] = useState<any>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (updates.length > 0) {
      const latest = updates[0];
      const seenId = localStorage.getItem('seen_update_id');
      if (seenId !== latest.id) {
        setLatestUpdate(latest);
        setShowUpdateModal(true);
      }
    }
  }, [updates]);

  const closeUpdateModal = () => {
    if (latestUpdate) {
      localStorage.setItem('seen_update_id', latestUpdate.id);
    }
    setShowUpdateModal(false);
  };
  const { about, heroTitle, loading: settingsLoading, heroSlides, aboutImage, aboutStats, tgSettings } = useSiteSettings() as any;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [consultationSuccess, setConsultationSuccess] = useState(false);
  const [isConsultationSubmitting, setIsConsultationSubmitting] = useState(false);
  const [consultationPhone, setConsultationPhone] = useState('+998');

  useEffect(() => {
    if (!localStorage.getItem('languageSet')) {
      setShowLangModal(true);
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
       const hasShown = sessionStorage.getItem('loginSuccessShown');
       if (!hasShown) {
          setLoginSuccess(true);
          sessionStorage.setItem('loginSuccessShown', 'true');
          setTimeout(() => setLoginSuccess(false), 5000);
       }
    } else if (!user) {
       sessionStorage.removeItem('loginSuccessShown');
    }
  }, [user, loading]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  const successMessage = (
    <AnimatePresence>
      {loginSuccess && (
        <motion.div
           initial={{ opacity: 0, y: 50, scale: 0.8 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 50, scale: 0.8 }}
           className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex justify-center pointer-events-none"
        >
          <div className="bg-white/90 backdrop-blur-xl text-blue-950 px-8 py-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4 border border-white/50">
            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-green-600 tracking-wider mb-0.5">Успешно</p>
              <p className="font-black text-base whitespace-nowrap">
                {language === 'ru' ? 'Вы успешно вошли на сайт!' : 'Siz saytga muvaffaqiyatli kirdingiz!'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const consultationSuccessMessage = (
    <AnimatePresence>
      {consultationSuccess && (
        <motion.div
           initial={{ opacity: 0, y: 50, scale: 0.8 }}
           animate={{ opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: 50, scale: 0.8 }}
           className="fixed bottom-10 right-10 z-[200] flex justify-center pointer-events-none"
        >
          <div className="bg-white/90 backdrop-blur-xl text-blue-950 px-8 py-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4 border border-white/50">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-0.5">{t('consultation.success_title')}</p>
              <p className="font-black text-xs sm:text-sm whitespace-nowrap">
                {t('consultation.success_msg')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  if (showAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-blue-900 flex flex-col transition-colors duration-200 overflow-x-hidden pt-[180px] md:pt-[200px]">
        {successMessage}
        <Navbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
        />
        <FloatingCartButton />
        <CartDrawer />
        <div className="flex-grow py-20 bg-white/50">
          <AdminPanel />
        </div>
        <Footer />
      </div>
    );
  }

  if (showCabinet) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-blue-900 flex flex-col transition-colors duration-200 overflow-x-hidden pt-[180px] md:pt-[200px]">
        {successMessage}
        <Navbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
        />
        <FloatingCartButton />
        <CartDrawer />
        <div className="flex-grow py-20 bg-white/50">
          <UserCabinet />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-blue-900 flex flex-col transition-colors duration-200 overflow-x-hidden pt-[180px] md:pt-[200px]">
      {showLangModal && <LanguageModal onComplete={() => setShowLangModal(false)} />}
      {successMessage}
      {consultationSuccessMessage}
      
      <AnimatePresence>
        {isConsultationSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 100, x: '-50%' }}
            className="fixed bottom-32 left-1/2 z-[110] bg-white rounded-3xl shadow-[0_20px_50px_rgba(30,58,138,0.3)] p-5 border-2 border-blue-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider mb-0.5">{t('consultation.wait')}</p>
                <p className="font-black text-xs sm:text-sm whitespace-nowrap">
                  {t('consultation.sending')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
      />
      
      <FloatingCartButton />
      <CartDrawer />

      {!selectedCategoryId && searchQuery === '' && (
        <>
          <Hero />
          
          {/* News Scrolling Section */}
          {news.length > 0 && (
            <section className="py-24 bg-white/50" id="news">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <p className="text-blue-500 font-black text-xs uppercase tracking-wider mb-4">{language === 'ru' ? 'Актуальное' : 'Dolzarb'}</p>
                  <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tight">
                    {language === 'ru' ? 'Новости и Акции' : 'Yangiliklar va Aksiyalar'}
                  </h2>
                  <div className="w-32 h-2 bg-blue-600 mx-auto mt-8 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                  {news.slice(0, 3).map((item) => (
                    <motion.div 
                      key={item.id}
                      whileHover={{ y: -10 }}
                      onClick={() => setSelectedNews(item)}
                      className="bg-blue-50 rounded-[3rem] overflow-hidden shadow-2xl border border-blue-100 flex flex-col group cursor-pointer"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden">
                        <img src={item.image || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      </div>
                      <div className="p-10 flex-grow">
                        <h3 className="text-2xl font-black text-blue-900 uppercase mb-4 leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title?.[language]}</h3>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* News Detail Modal */}
              <AnimatePresence>
                {selectedNews && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedNews(null)}
                      className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="relative w-full max-w-3xl bg-white rounded-[3rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
                    >
                       <button 
                         onClick={() => setSelectedNews(null)}
                         className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all shadow-xl border border-white/20"
                       >
                         <X className="w-6 h-6" />
                       </button>

                       <div className="overflow-y-auto custom-scrollbar">
                         <div className="relative aspect-video">
                            <img src={selectedNews.image || undefined} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                         </div>
                         <div className="p-10 pt-4">
                            <h2 className="text-3xl md:text-4xl font-black text-blue-900 uppercase leading-tight mb-8">
                              {selectedNews.title?.[language]}
                            </h2>
                            <div className="text-blue-700 text-lg font-bold leading-relaxed whitespace-pre-wrap mb-10">
                              {selectedNews.content?.[language]}
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-6 border-t border-blue-50">
                              <span className="text-blue-400 font-black text-xs uppercase tracking-wider">
                                {selectedNews.date ? (() => {
                                  try {
                                    const date = new Date(selectedNews.date);
                                    if (isNaN(date.getTime())) return selectedNews.date;
                                    const day = String(date.getDate()).padStart(2, '0');
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const year = String(date.getFullYear()).slice(-2);
                                    return `${day}-${month}-${year}`;
                                  } catch {
                                    return selectedNews.date;
                                  }
                                })() : ''}
                              </span>
                              <div className="h-0.5 w-8 bg-blue-100 rounded-full" />
                            </div>
                         </div>
                       </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </section>
          )}

          <Advertisement />

          {/* About Section */}
          <section className="py-24 bg-gray-50" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="relative">
                  <div className="aspect-square rounded-[3rem] overflow-hidden border-8 border-slate-900 shadow-2xl">
                    <img src={aboutImage || 'https://images.unsplash.com/photo-1576091160550-217359f48f4c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'} className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tight mb-8 leading-tight">
                    {heroSlides?.[0]?.title?.[language] || heroTitle?.[language] || (language === 'ru' ? 'Мир одинаковый для всех' : 'Dunyo hamma uchun bir xil')}
                  </h2>
                  <p className="text-xl text-blue-600 font-bold leading-relaxed mb-10" style={{ whiteSpace: 'pre-line' }}>
                    {about?.[language]}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white px-6 py-4 rounded-2xl border border-blue-100">
                      <p className="text-blue-500 font-black text-2xl mb-1">{aboutStats?.years || 10}+</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">{language === 'ru' ? 'Лет опыта' : 'Yillik tajriba'}</p>
                    </div>
                    <div className="bg-white px-6 py-4 rounded-2xl border border-blue-100">
                      <p className="text-blue-500 font-black text-2xl mb-1">{aboutStats?.clients || 500}+</p>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">{language === 'ru' ? 'Клиентов' : 'Mijozlar'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Consultation Form Section */}
          <section className="py-24 bg-white/50" id="consultation">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-blue-50 rounded-[4rem] shadow-2xl p-12 lg:p-20 border-8 border-blue-100/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
                </div>
                <div className="relative z-10 max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tight mb-6">
                    {language === 'ru' ? 'Бесплатная Консультация' : 'Bepul Konsultatsiya'}
                  </h2>
                  <p className="text-blue-600 font-bold text-lg mb-12">
                    {language === 'ru' ? 'Наши эксперты помогут вам с выбором правильного продукта для ваших нужд.' : 'Bizning ekspertlarimiz sizga to\'g\'ri mahsulotni tanlashda yordam berishadi.'}
                  </p>
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (isConsultationSubmitting) return;
                      
                      const formData = new FormData(e.currentTarget);
                      const data = {
                        name: formData.get('name'),
                        phone: consultationPhone,
                        situation: formData.get('situation'),
                        status: 'new',
                        createdAt: new Date().toISOString()
                      };
                      
                      if (!data.name || data.phone.length < 13) {
                        alert(language === 'ru' ? 'Пожалуйста, введите корректный номер телефона' : 'Iltimos, telefon raqamini to\'g\'ri kiriting');
                        return;
                      }

                      setIsConsultationSubmitting(true);
                      try {
                         const { collection, addDoc } = await import('firebase/firestore');
                         const { db } = await import('./firebase');
                         await addDoc(collection(db, 'help_requests'), data);

                         await fetch('/api/telegram/notify', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({
                             message: `🔔 <b>Новая заявка на консультацию!</b>\n\n👤 Имя: ${data.name}\n📞 Телефон: ${data.phone}\n💬 Вопрос: ${data.situation || 'Нет'}\n\n🌐 <a href="${window.location.origin}/#admin">Открыть админ-панель</a>`
                           })
                         });

                         setConsultationSuccess(true);
                         setTimeout(() => setConsultationSuccess(false), 6000);
                         (e.target as HTMLFormElement).reset();
                         setConsultationPhone('+998');
                      } catch (err) { 
                        console.error(err); 
                        alert(language === 'ru' ? 'Ошибка при отправке' : 'Yuborishda xatolik');
                      } finally {
                        setIsConsultationSubmitting(false);
                      }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-8"
                  >
                    <div className="space-y-4">
                      <input name="name" type="text" required placeholder={language === 'ru' ? 'Ваше имя' : 'Ismingiz'} className="w-full px-8 py-5 rounded-2xl bg-white border-2 border-blue-100 focus:border-blue-500 transition-all text-blue-900 font-bold placeholder-slate-600" />
                      <div className="relative">
                        <input 
                          name="phone" 
                          type="tel" 
                          required 
                          value={consultationPhone}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('+998')) val = '+998' + val.replace(/\D/g, '').replace(/^998/, '');
                            const digits = val.replace(/\D/g, '');
                            if (digits.length > 12) return;
                            setConsultationPhone('+' + digits);
                          }}
                          className="w-full px-8 pl-16 py-5 rounded-2xl bg-white border-2 border-blue-100 focus:border-blue-500 transition-all text-blue-900 font-bold" 
                        />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-xl">
                          🇺🇿
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                      <textarea name="situation" placeholder={language === 'ru' ? 'Ваш вопрос...' : 'Savolingiz...'} rows={4} className="flex-grow w-full px-8 py-5 rounded-2xl bg-white border-2 border-blue-100 focus:border-blue-500 transition-all text-blue-900 font-bold placeholder-slate-600 resize-none" />
                      <button 
                        type="submit" 
                        disabled={isConsultationSubmitting}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1 group"
                      >
                        <div className="flex items-center justify-center gap-3">
                          {isConsultationSubmitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>{language === 'ru' ? 'Обработка...' : 'Yuborilmoqda...'}</span>
                            </>
                          ) : (
                            <>
                              <span>{language === 'ru' ? 'Отправить заявку' : 'Arizani yuborish'}</span>
                            </>
                          )}
                        </div>
                        {isConsultationSubmitting && (
                          <span className="text-[10px] font-black opacity-80 animate-pulse">
                            {language === 'ru' ? 'Пожалуйста, подождите...' : 'Iltimos, kuting...'}
                          </span>
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {consultationSuccess && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="p-4 bg-green-500 text-white rounded-2xl text-center font-black uppercase text-sm shadow-xl border-4 border-green-400"
                          >
                            <div className="flex items-center justify-center gap-2 mb-1 text-lg">
                              <CheckCircle2 className="w-6 h-6" />
                              <span>{language === 'ru' ? 'Успешно отправлено!' : 'Muvaffaqiyatli yuborildi!'}</span>
                            </div>
                            <p className="text-[10px] opacity-90">
                              {language === 'ru' ? 'Ваша заявка принята. Ожидайте ответа нашего специалиста.' : 'Arizangiz qabul qilindi. Mutaxassisimiz javobini kuting.'}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>

        </>
      )}

      {/* Products Grid Section */}
      <div className="flex-grow py-24 bg-gray-50" id="products">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!selectedCategoryId ? (
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase tracking-tight">
                {t('products.title')}
              </h2>
              <div className="w-32 h-2 bg-blue-600 mx-auto mt-8 rounded-full"></div>
            </div>
          ) : (
            <div className="mb-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <button 
                onClick={() => { setSelectedCategoryId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="inline-flex items-center gap-3 px-8 py-5 bg-white text-blue-400 rounded-2xl font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-100 shadow-xl"
              >
                <ArrowLeft className="w-5 h-5" /> {language === 'ru' ? 'К категориям' : 'Kategoriyalarga'}
              </button>
              <div className="flex items-center gap-8 bg-white p-5 rounded-[3rem] border-2 border-blue-100 pr-12 shadow-2xl">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-100 p-2 bg-blue-50">
                  <img src={selectedCategory?.image || undefined} className="w-full h-full object-cover rounded-xl" />
                </div>
                <h1 className="text-4xl font-black text-blue-900 uppercase tracking-tight">{selectedCategory?.name?.[language]}</h1>
              </div>
            </div>
          )}

          {!selectedCategoryId && searchQuery === '' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {categories.map((category) => (
                <motion.div 
                  key={category.id} 
                  whileHover={{ y: -10 }}
                  onClick={() => { setSelectedCategoryId(category.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="group cursor-pointer relative"
                >
                  <div className="aspect-[3/4] rounded-[3rem] overflow-hidden relative shadow-2xl transition-all duration-500 border-4 border-white group-hover:border-blue-200">
                    <img src={category.image || undefined} alt={category.name?.[language]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-10">
                      <div className="w-12 h-2 bg-blue-500 rounded-full mb-6 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500"></div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">{category.name?.[language]}</h3>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mt-4 opacity-0 group-hover:opacity-100 transition-all duration-500">{language === 'ru' ? 'Посмотреть' : 'Ko\'rish'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  categoryName={categories.find(c => c.id === product.categoryId)?.name?.[language]} 
                  isAdmin={user && isAdmin}
                  onDelete={async () => {
                    if (window.confirm(language === 'ru' ? 'Удалить?' : 'O\'chirish?')) {
                      await deleteDoc(doc(db, 'products', product.id));
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

          {/* Partners Marquee */}
          {partners.length > 0 && (
            <section className="py-24 bg-gray-50 overflow-hidden border-y border-slate-900" id="partners">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
                <p className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-4">{language === 'ru' ? 'Нам доверяют' : 'Bizga ishonishadi'}</p>
                <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tight">{language === 'ru' ? 'Наши Партнеры' : 'Bizning Hamkorlarimiz'}</h2>
              </div>
          <div className="relative flex whitespace-nowrap overflow-hidden py-10 transition-all duration-500">
            <div className="flex animate-marquee gap-24 items-center">
              {[...partners, ...partners, ...partners].map((p, idx) => {
                const content = (
                  <div className="w-48 h-24 flex items-center justify-center transition-all transform hover:scale-110">
                    <img src={p.image || undefined} alt={p.name} className="max-w-full max-h-full object-contain" />
                  </div>
                );

                return p.url ? (
                  <a key={`${p.id}-${idx}`} href={p.url} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                ) : (
                  <div key={`${p.id}-${idx}`}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Branches Section */}
      {branches.length > 0 && (
        <section className="py-24 bg-white" id="branches">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="text-blue-500 font-bold text-xs uppercase tracking-wider mb-4">{language === 'ru' ? 'Локации' : 'Lokatsiyalar'}</p>
              <h2 className="text-4xl font-black text-blue-900 uppercase tracking-tight">{language === 'ru' ? 'Наши Филиалы' : 'Bizning Filiallarimiz'}</h2>
              <div className="w-32 h-2 bg-blue-600 mx-auto mt-8 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {branches.map((branch) => (
                <div key={branch.id} className="bg-blue-50 p-10 rounded-[3rem] border-2 border-blue-100 shadow-2xl overflow-hidden relative group">
                  <h3 className="text-2xl font-black text-blue-900 uppercase mb-8 relative z-10">{branch.name?.[language]}</h3>
                  <div className="space-y-6 relative z-10">
                    <p className="flex items-start gap-4 text-blue-600 font-bold leading-relaxed">
                      <MapPin className="w-6 h-6 text-blue-500 shrink-0" />
                      {branch.address?.[language]}
                    </p>
                    <p className="flex items-center gap-4 text-blue-600 font-bold">
                      <Phone className="w-6 h-6 text-blue-500 shrink-0" />
                      {branch.phone}
                    </p>
                  </div>
                  <a 
                    href={branch.mapLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-10 flex items-center justify-center gap-3 w-full py-5 bg-blue-100 text-white rounded-[1.5rem] font-black uppercase tracking-wider text-xs hover:bg-blue-600 transition-all border border-blue-200 shadow-xl"
                  >
                    <Globe className="w-4 h-4" />
                    {language === 'ru' ? 'Открыть на карте' : 'Xaritada ochish'}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

        <Footer />

        {/* Floating Controls */}
        <div className="fixed bottom-6 right-6 z-[100] flex flex-row items-center gap-3">
           <FloatingCartButton />
        </div>
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
