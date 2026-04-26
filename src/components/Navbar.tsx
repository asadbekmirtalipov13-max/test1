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

            {/* Accessibility Eye Icon for Desktop */}
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleLargeText}
              className={`p-2.5 rounded-xl border-2 transition-all shrink-0 ${isLargeText ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
              title={language === 'ru' ? 'Версия для слабовидящих' : 'Maxsus rejim'}
            >
              <Eye className="w-5 h-5 font-black" style={{ strokeWidth: 3 }} />
            </motion.button>

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

            {/* "More" Button (Three dots) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 ml-2 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-100 transition-all"
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
            className="lg:shadow-2xl bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {/* Only show these on mobile (<lg) since they are in the navbar on desktop */}
              <div className="lg:hidden space-y-1 border-b border-gray-100 pb-3 mb-3">
                <a href="#products" onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 transition-all">
                  <Package className="w-4 h-4 text-gray-400" /> {t('nav.products')}
                </a>
                <a href="#about" onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 transition-all">
                  <Info className="w-4 h-4 text-gray-400" /> {t('nav.about')}
                </a>
                <a href="#contact" onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 transition-all">
                  <Phone className="w-4 h-4 text-gray-400" /> {t('nav.contacts')}
                </a>
                {user ? (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'cabinet'; }} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 transition-all">
                    <User className="w-4 h-4 text-gray-400" /> {t('nav.profile')}
                  </button>
                ) : (
                  <button onClick={() => { setIsOpen(false); loginWithGoogle(); }} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 transition-all">
                    <User className="w-4 h-4 text-gray-400" /> {language === 'ru' ? 'Вход' : 'Kirish'}
                  </button>
                )}
              </div>
              
              {/* Items always in the menu ("three dots" logic) */}
              <div className="space-y-4">
                {isAdmin && (
                  <button onClick={() => { setIsOpen(false); window.location.hash = 'admin'; }} className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors">
                    <ShieldCheck className="w-4 h-4" /> {language === 'ru' ? 'Админ-панель' : 'Admin paneli'}
                  </button>
                )}

                <div className="flex gap-2 px-4">
                  <button 
                    onClick={toggleLargeText}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isLargeText ? 'bg-yellow-400 text-yellow-900 shadow-md border-2 border-yellow-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 border-2 border-transparent'}`}
                  >
                    <Eye className="w-4 h-4" />
                    {language === 'ru' ? 'Спец.версия' : 'Maxsus rejim'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 px-4">
                  <button 
                    onClick={() => setLanguage('ru')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${language === 'ru' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    Русский
                  </button>
                  <button 
                    onClick={() => setLanguage('uz')}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${language === 'uz' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    O'zbek
                  </button>
                </div>

                {user && (
                   <div className="px-4 border-t border-gray-100 pt-3">
                     <button onClick={() => { setIsOpen(false); logout(); }} className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                       <LogOut className="w-3 h-3" /> {language === 'ru' ? 'Выйти' : 'Chiqish'}
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
