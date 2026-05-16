import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isLargeText: boolean;
  toggleLargeText: () => void;
  setIsLargeText: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  isLargeText: false,
  toggleLargeText: () => {},
  setIsLargeText: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    // const savedDark = localStorage.getItem('theme_dark') === 'true'; // Removed
    const savedLarge = localStorage.getItem('theme_large') === 'true';
    setIsDarkMode(false); // Force light
    setIsLargeText(savedLarge);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark'); // Force remove dark
    localStorage.setItem('theme_dark', 'false');
  }, [isDarkMode]);

  useEffect(() => {
    if (isLargeText) {
      document.documentElement.classList.add('large-text');
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    } else {
      document.documentElement.classList.remove('large-text');
      setShowToast(false);
    }
    localStorage.setItem('theme_large', String(isLargeText));
  }, [isLargeText]);

  const toggleDarkMode = () => {}; // No-op
  const toggleLargeText = () => setIsLargeText(!isLargeText);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, isLargeText, toggleLargeText, setIsLargeText }}>
      {children}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-28 left-6 md:bottom-8 z-[1000] bg-yellow-400 text-yellow-900 px-6 py-3 rounded-lg shadow-xl font-bold flex items-center gap-3 pointer-events-none"
          >
            <Eye className="w-5 h-5" />
            {language === 'ru' ? 'Включен режим для слабовидящих' : 'Maxsus rejim yoqildi'}
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
