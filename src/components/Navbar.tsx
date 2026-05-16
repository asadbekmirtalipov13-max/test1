import { Menu, X, Globe, Eye, ChevronDown, Moon, Sun, Type, Search, User, Info, Phone, Package, ShieldCheck, LogOut, MapPin, MoreVertical, SlidersHorizontal } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  categories = [], 
  selectedCategoryId, 
  setSelectedCategoryId 
}: { 
  searchQuery: string, 
  setSearchQuery: (q: string) => void,
  categories?: any[],
  selectedCategoryId?: string | null,
  setSelectedCategoryId?: (id: string | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, loginWithGoogle, logout } = useAuth();
  const { logoUrl, siteName } = useSiteSettings();
  const { isLargeText, toggleLargeText } = useTheme();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');
  const navRef = useRef<HTMLDivElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLangSelect = (lang: 'ru' | 'uz') => {
    setLanguage(lang);
    setIsLangOpen(false);
  };

  return (
    <nav ref={navRef} className="bg-white/95 backdrop-blur-md shadow-md fixed top-0 left-0 right-0 z-[100] border-b border-blue-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24 gap-4">
          {/* Logo Area */}
          <a 
            href="/" 
            onClick={(e) => { 
              e.preventDefault(); 
              window.location.hash = ''; 
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
              window.dispatchEvent(new CustomEvent('resetHome'));
              if (window.location.hash === '') window.dispatchEvent(new HashChangeEvent('hashchange'));
            }} 
            className="flex items-center gap-2 hover:opacity-90 transition-opacity group shrink-0"
          >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden shrink-0 bg-transparent"
            >
               <img src={logoUrl || undefined} alt={siteName} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'https://ibb.co/zT6FdmS6'} />
            </motion.div>
            <div className="hidden sm:flex flex-col justify-center min-w-0">
              <span className="font-extrabold text-[10px] sm:text-xs lg:text-sm text-blue-900 uppercase leading-none group-hover:text-blue-600 transition-colors">{siteName.split(' ')[0] || siteName}</span>
              {siteName.split(' ').slice(1).join(' ') && (
                <span className="font-extrabold text-[10px] sm:text-xs lg:text-sm text-blue-900 uppercase leading-none mt-0.5 group-hover:text-blue-600 transition-colors">
                  {siteName.split(' ').slice(1).join(' ')}
                </span>
              )}
            </div>
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            <motion.a 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#products" 
              className="flex items-center justify-center gap-2 h-12 px-6 min-w-[140px] bg-blue-50 text-blue-700 rounded-2xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <Package className="w-5 h-5 shrink-0" />
              <span className="text-xs font-black uppercase whitespace-nowrap">{t('nav.products')}</span>
            </motion.a>

            <motion.a 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#contact" 
              className="flex items-center justify-center gap-2 h-12 px-6 min-w-[140px] bg-blue-50 text-blue-700 rounded-2xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <Phone className="w-5 h-5 shrink-0" />
              <span className="text-xs font-black uppercase whitespace-nowrap">{t('nav.contacts')}</span>
            </motion.a>
            
            <div className="h-8 w-px bg-blue-100 mx-1" />

            {user ? (
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.hash = 'cabinet'} 
                className="flex items-center justify-center gap-2 h-12 px-6 min-w-[140px] bg-blue-50 text-blue-700 rounded-2xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
              >
                <User className="w-6 h-6 shrink-0" />
                <span className="text-xs font-black uppercase whitespace-nowrap">{t('nav.profile')}</span>
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAuthModal(true)} 
                className="flex items-center justify-center gap-2 h-12 px-6 min-w-[140px] bg-blue-50 text-blue-700 rounded-2xl shadow-sm border-2 border-blue-100 hover:bg-blue-400 hover:text-blue-900 transition-all shrink-0"
              >
                <User className="w-6 h-6 shrink-0" />
                <span className="text-xs font-black uppercase whitespace-nowrap">{language === 'ru' ? 'Вход' : language === 'uz' ? 'Kirish' : 'Login'}</span>
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLargeText}
              className={`flex items-center justify-center gap-2 h-12 px-6 min-w-[160px] rounded-2xl border-2 transition-all shrink-0 ${isLargeText ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-lg' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:text-blue-900'}`}
              title={language === 'ru' ? 'Версия для слабовидящих' : 'Maxsus rejim'}
            >
              <Eye className="w-5 h-5 shrink-0" style={{ strokeWidth: 3 }} />
              <span className="text-xs font-black uppercase whitespace-nowrap">
                {language === 'ru' ? 'Спец. версия' : 'Maxsus'}
              </span>
            </motion.button>
            
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center justify-center gap-2 h-12 px-6 min-w-[100px] rounded-2xl border-2 transition-all shrink-0 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:text-blue-900"
              >
                <Globe className="w-5 h-5 shrink-0" />
                <span className="text-xs font-black uppercase whitespace-nowrap">
                  {language === 'ru' ? 'RU' : 'UZ'}
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform shrink-0 ${isLangOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden z-[100]"
                  >
                    <button onClick={() => handleLangSelect('ru')} className="w-full text-left px-4 py-3 font-black text-[10px] uppercase text-blue-700 hover:bg-blue-50 transition-colors border-b border-blue-50">
                      Русский
                    </button>
                    <button onClick={() => handleLangSelect('uz')} className="w-full text-left px-4 py-3 font-black text-[10px] uppercase text-blue-700 hover:bg-blue-50 transition-colors">
                      O'zbekcha
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center justify-center gap-2 h-12 px-5 rounded-2xl transition-all border-2 shrink-0 ${isOpen ? 'bg-primary text-white border-primary shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100'}`}
            >
              <MoreVertical className="w-6 h-6 shrink-0" />
              <span className="text-[10px] font-black uppercase">
                {language === 'ru' ? 'Меню' : 'Menyu'}
              </span>
            </motion.button>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            
            {/* Special Version Button on Mobile - Positioned before Menu */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleLargeText}
              className={`p-2 rounded-xl transition-all ${isLargeText ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'text-blue-500 hover:text-white'}`}
            >
              <Eye className="w-6 h-6" style={{ strokeWidth: 2.5 }} />
            </motion.button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-blue-600 hover:bg-blue-50 focus:outline-none"
            >
              {isOpen ? <X className="block h-7 w-7" /> : <Menu className="block h-7 w-7" />}
            </button>
          </div>
        </div>

        {/* Full-width Search Bar Row */}
        <div className="pb-4 lg:pb-6 pt-0">
          <div className="flex gap-2 items-center">
            <div className={`relative group transition-all duration-300 flex-grow ${isSearchFocused ? 'px-0' : 'px-2 md:px-0'}`}>
              <input 
                type="text" 
                placeholder={language === 'ru' ? "Найти товар..." : "Mahsulotni topish..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`w-full pl-14 pr-8 py-3.5 sm:py-4 rounded-[1.25rem] border-2 transition-all font-black text-base md:text-lg outline-none ${
                  isSearchFocused 
                    ? 'border-blue-600 bg-white shadow-lg ring-4 ring-blue-50' 
                    : 'border-blue-100 bg-blue-50/20 hover:bg-white hover:border-blue-200 placeholder-slate-400'
                }`}
              />
              <Search className={`absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 transition-colors ${isSearchFocused ? 'text-blue-600' : 'text-blue-300 group-hover:text-blue-400'}`} />
            </div>
            
            {setSelectedCategoryId && categories.length > 0 && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-3.5 sm:p-4 rounded-[1.25rem] border-2 transition-all flex items-center justify-center gap-2 ${
                    isFilterOpen || selectedCategoryId
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                      : 'bg-blue-50 text-blue-500 border-blue-100'
                  }`}
                >
                  <SlidersHorizontal className="w-6 h-6" />
                  <span className="hidden sm:inline font-black text-xs uppercase tracking-wider">
                    {language === 'ru' ? 'Категории' : 'Categoriyalar'}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-3 w-72 md:w-80 bg-white rounded-[2rem] shadow-2xl border-2 border-blue-100 p-4 z-[200] overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-4 px-2">
                        <p className="font-black text-[10px] uppercase text-blue-500 tracking-wider">
                          {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
                        </p>
                        {selectedCategoryId && (
                          <button 
                            onClick={() => {
                              setSelectedCategoryId(null);
                              setIsFilterOpen(false);
                            }}
                            className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors"
                          >
                            {language === 'ru' ? 'Сбросить' : 'Tozalash'}
                          </button>
                        )}
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setIsFilterOpen(false);
                              window.location.hash = '';
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left ${
                              selectedCategoryId === cat.id
                                ? 'bg-blue-50 border-blue-600 text-blue-900'
                                : 'bg-white border-transparent hover:border-blue-100 hover:bg-gray-50 text-blue-600'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-blue-100">
                              <img src={cat.image || undefined} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black text-xs uppercase truncate">
                              {cat.name?.[language]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile/Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:shadow-2xl bg-blue-50 border-t border-blue-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
              {/* Only show these on mobile (<lg) since they are in the navbar on desktop */}
              <div className="lg:hidden space-y-2 border-b border-blue-100 pb-4 mb-4 text-blue-700">
                <a href="#products" onClick={() => setIsOpen(false)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase hover:bg-blue-100 transition-all">
                  <Package className="w-5 h-5 text-blue-500" /> {t('nav.products')}
                </a>
                <a href="#contact" onClick={() => setIsOpen(false)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase hover:bg-blue-100 transition-all">
                  <Phone className="w-5 h-5 text-blue-500" /> {t('nav.contacts')}
                </a>
                {user ? (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'cabinet'; }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase hover:bg-blue-100 transition-all">
                    <User className="w-5 h-5 text-blue-500" /> {t('nav.profile')}
                  </button>
                ) : (
                  <button onClick={() => { setIsOpen(false); setShowAuthModal(true); }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase hover:bg-blue-100 transition-all">
                    <User className="w-5 h-5 text-blue-500" /> {language === 'ru' ? 'Вход' : language === 'uz' ? 'Kirish' : 'Login'}
                  </button>
                )}
              </div>
              
              {/* Items always in the menu ("three dots" logic) */}
              <div className="space-y-4">
                {isAdmin && (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'admin'; }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase text-red-600 hover:bg-red-50 transition-colors">
                    <ShieldCheck className="w-5 h-5" /> {language === 'ru' ? 'Админ-панель' : 'Admin paneli'}
                  </button>
                )}

                {/* Updated Language Selector */}
                <div className="px-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                      {language === 'ru' ? 'Специальный режим' : 'Maxsus rejim'}
                    </p>
                    <button 
                      onClick={toggleLargeText}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-black text-[10px] uppercase transition-all ${isLargeText ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-500 shadow-md transform scale-105' : 'bg-blue-100 text-blue-600 border-2 border-transparent'}`}
                    >
                      <Eye className="w-4 h-4" />
                      {isLargeText ? (language === 'ru' ? 'ВКЛ' : 'YONIQ') : (language === 'ru' ? 'ВЫКЛ' : 'OCHIQ')}
                    </button>
                  </div>
                  
                  <div className="relative pt-2">
                    <button
                      onClick={() => setIsLangOpen(!isLangOpen)}
                      className="w-full flex items-center justify-between bg-blue-50 px-5 py-4 rounded-xl border-2 border-blue-100 hover:border-blue-400 transition-all font-black text-xs uppercase text-blue-900"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-blue-500" />
                        {language === 'ru' ? 'Русский' : language === 'uz' ? 'O\'zbekcha' : 'English'}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isLangOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-10 top-full left-0 right-0 mt-2 bg-blue-50 rounded-xl shadow-xl border-2 border-blue-100 overflow-hidden"
                        >
                          <button onClick={() => handleLangSelect('ru')} className="w-full text-left px-5 py-4 font-black text-xs uppercase text-blue-700 hover:bg-blue-100 transition-colors border-b border-blue-100">
                            Русский
                          </button>
                          <button onClick={() => handleLangSelect('uz')} className="w-full text-left px-5 py-4 font-black text-xs uppercase text-blue-700 hover:bg-blue-100 transition-colors">
                            O'zbekcha
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {user && (
                   <div className="px-5 pt-4 border-t border-blue-100">
                     <button onClick={() => { setIsOpen(false); logout(); }} className="flex items-center gap-3 w-full px-5 py-3 rounded-xl text-xs font-black uppercase text-blue-500 hover:bg-red-500/10 hover:text-red-500 transition-all">
                       <LogOut className="w-4 h-4" /> {language === 'ru' ? 'Выйти из аккаунта' : 'Akkauntdan chiqish'}
                     </button>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-hidden h-screen w-screen top-0 left-0">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border-2 border-blue-100 m-auto"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 p-2 text-blue-500 hover:text-blue-900 transition-colors">
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tight">
                  {language === 'ru' ? 'Вход' : 'Kirish'}
                </h3>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-blue-500">
                  {language === 'ru' ? 'Авторизация через Google' : 'Google orqali avtorizatsiya'}
                </p>
              </div>

              {authError && (
                <div className="mb-6 p-3 bg-red-900/20 border-2 border-red-500/20 rounded-xl text-red-400 text-[10px] font-black uppercase tracking-wider text-center">
                  {authError}
                </div>
              )}
              
              <div className="flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={async () => {
                     try {
                        setAuthError('');
                        await loginWithGoogle();
                        setShowAuthModal(false);
                     } catch(e: any) {
                        if (e.code === 'auth/operation-not-allowed') {
                           setAuthError('Вход через Google отключен. Включите провайдер Google в консоли Firebase (Authentication -> Sign-in method).');
                        } else {
                           setAuthError(e.message || 'Error via Google');
                        }
                     }
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:bg-blue-100 hover:border-blue-500/30 transition-all text-xs font-black uppercase tracking-wider text-blue-700"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt=""/>
                  Google Login
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}
