import { Menu, X, Globe, ShoppingCart, Eye, ChevronDown, Moon, Sun, Type, Search, User, Info, Phone, Package, ShieldCheck, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { cartCount, setIsCartOpen } = useCart();
  const { user, isAdmin, loginWithGoogle, logout } = useAuth();
  const { logoUrl, siteName } = useSiteSettings();
  const { isLargeText, toggleLargeText } = useTheme();
  const navRef = useRef<HTMLDivElement>(null);

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

  const handleSearchClick = () => {
    const el = document.getElementById('searchInput');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.focus(), 500);
    } else {
      window.location.hash = ''; // go home first
      setTimeout(() => {
        const el2 = document.getElementById('searchInput');
        if (el2) {
          el2.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el2.focus();
        }
      }, 500);
    }
  };

  return (
    <nav ref={navRef} className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
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
            className="flex items-center gap-4 hover:opacity-90 transition-opacity mr-4 group shrink-0 max-w-[200px] sm:max-w-none"
          >
            <motion.div 
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0 bg-white shadow-md border border-gray-100 p-1"
            >
               <img src={logoUrl} alt={siteName} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = 'https://ibb.co/zT6FdmS6'} />
            </motion.div>
            <div className="hidden sm:flex flex-col justify-center">
              <span className="font-black text-xl lg:text-2xl text-primary uppercase tracking-wider leading-none group-hover:text-blue-700 transition-colors uppercase">{siteName.split(' ')[0] || siteName}</span>
              {siteName.split(' ').slice(1).join(' ') && <span className="font-black text-xl lg:text-2xl text-primary uppercase tracking-wider leading-none mt-1 group-hover:text-blue-700 transition-colors uppercase">{siteName.split(' ').slice(1).join(' ')}</span>}
            </div>
          </a>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center space-x-2 justify-end flex-1 min-w-0">
            <motion.a 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#products" 
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <Package className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('nav.products')}</span>
            </motion.a>

            <motion.a 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#about" 
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <Info className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('nav.about')}</span>
            </motion.a>

            <motion.a 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              href="#contact" 
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <Phone className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('nav.contacts')}</span>
            </motion.a>
            
            <div className="h-6 w-px bg-gray-200 mx-1" />

            {user ? (
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.hash = 'cabinet'} 
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-widest">{t('nav.profile')}</span>
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={loginWithGoogle} 
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
              >
                <User className="w-5 h-5" />
                <span className="text-[11px] font-black uppercase tracking-widest">{language === 'ru' ? 'Вход' : 'Kirish'}</span>
              </motion.button>
            )}

            {/* Cart Button */}
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl shadow-sm border-2 border-blue-100 hover:bg-blue-600 hover:text-white transition-all shrink-0"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('cart.title')}</span>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 text-[9px] font-black text-white bg-red-600 rounded-full shadow-lg border-2 border-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>

            {/* Accessibility Eye Icon for Desktop - Before dots, after cart */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLargeText}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all shrink-0 ${isLargeText ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'}`}
              title={language === 'ru' ? 'Версия для слабовидящих' : 'Maxsus rejim'}
            >
              <Eye className="w-5 h-5" style={{ strokeWidth: 3 }} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                {language === 'ru' ? 'Спец. версия' : 'Maxsus'}
              </span>
            </motion.button>

            {/* "More" Button (Three dots) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2.5 ml-1 rounded-xl transition-all border-2 ${isOpen ? 'bg-primary text-white border-primary shadow-lg' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-100'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-2">
            <button onClick={handleSearchClick} className="p-2 text-gray-700">
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-700"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 border-2 border-white dark:border-gray-900 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            
            {/* Special Version Button on Mobile - Positioned before Menu */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleLargeText}
              className={`p-2 rounded-xl transition-all ${isLargeText ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'}`}
            >
              <Eye className="w-6 h-6" style={{ strokeWidth: 2.5 }} />
            </motion.button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none"
            >
              {isOpen ? <X className="block h-7 w-7" /> : <Menu className="block h-7 w-7" />}
            </button>
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
            className="lg:shadow-2xl bg-gray-50 border-t border-gray-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-2">
              {/* Only show these on mobile (<lg) since they are in the navbar on desktop */}
              <div className="lg:hidden space-y-2 border-b border-gray-200 pb-4 mb-4">
                <a href="#products" onClick={() => setIsOpen(false)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-gray-800 hover:bg-white hover:shadow-sm transition-all">
                  <Package className="w-5 h-5 text-gray-400" /> {t('nav.products')}
                </a>
                <a href="#about" onClick={() => setIsOpen(false)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-gray-800 hover:bg-white hover:shadow-sm transition-all">
                  <Info className="w-5 h-5 text-gray-400" /> {t('nav.about')}
                </a>
                <a href="#contact" onClick={() => setIsOpen(false)} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-gray-800 hover:bg-white hover:shadow-sm transition-all">
                  <Phone className="w-5 h-5 text-gray-400" /> {t('nav.contacts')}
                </a>
                {user ? (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'cabinet'; }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-gray-800 hover:bg-white hover:shadow-sm transition-all">
                    <User className="w-5 h-5 text-gray-400" /> {t('nav.profile')}
                  </button>
                ) : (
                  <button onClick={() => { setIsOpen(false); loginWithGoogle(); }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-gray-800 hover:bg-white hover:shadow-sm transition-all">
                    <User className="w-5 h-5 text-gray-400" /> {language === 'ru' ? 'Вход' : 'Kirish'}
                  </button>
                )}
              </div>
              
              {/* Items always in the menu ("three dots" logic) */}
              <div className="space-y-4">
                {isAdmin && (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'admin'; }} className="flex items-center gap-4 w-full px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors">
                    <ShieldCheck className="w-5 h-5" /> {language === 'ru' ? 'Админ-панель' : 'Admin paneli'}
                  </button>
                )}

                {/* Updated Language Selector */}
                <div className="px-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {language === 'ru' ? 'Специальный режим' : 'Maxsus rejim'}
                    </p>
                    <button 
                      onClick={toggleLargeText}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${isLargeText ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isLargeText ? (language === 'ru' ? 'ВКЛ' : 'YONIQ') : (language === 'ru' ? 'ВЫКЛ' : 'OCHIQ')}
                    </button>
                  </div>
                  
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {language === 'ru' ? 'Выберите язык' : 'Tilni tanlang'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleLangSelect('ru')}
                      className={`flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${language === 'ru' ? 'bg-gray-900 text-white border-gray-900 shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                    >
                      <Globe className="w-5 h-5" /> 
                      <span>Русский</span>
                    </button>
                    <button 
                      onClick={() => handleLangSelect('uz')}
                      className={`flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 ${language === 'uz' ? 'bg-gray-900 text-white border-gray-900 shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                    >
                      <Globe className="w-5 h-5" /> 
                      <span>O'zbek</span>
                    </button>
                  </div>
                </div>

                {user && (
                   <div className="px-5 pt-4 border-t border-gray-200">
                     <button onClick={() => { setIsOpen(false); logout(); }} className="flex items-center gap-3 w-full px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
                       <LogOut className="w-4 h-4" /> {language === 'ru' ? 'Выйти из аккаунта' : 'Akkauntdan chiqish'}
                     </button>
                   </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
