import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Hero() {
  const { t, language } = useLanguage();
  const { heroSlides, heroAutoplayDelay } = useSiteSettings();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!heroSlides || heroSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, heroAutoplayDelay || 5000);
    
    return () => clearInterval(interval);
  }, [heroSlides, heroAutoplayDelay]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  if (!heroSlides || heroSlides.length === 0) return null;

  return (
    <div className="relative bg-blue-50 text-blue-900 overflow-hidden h-[400px] md:h-[500px] lg:h-[600px] group">
      <AnimatePresence initial={false}>
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroSlides[currentSlide].imageUrl || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80'})` }}
        >
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4 z-10 w-full max-w-5xl mx-auto">
               <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4 drop-shadow-sm text-blue-900">
                 {heroSlides[currentSlide].title?.[language] || (language === 'ru' ? 'Мир одинаковый для всех' : 'Dunyo hamma uchun bir xil')}
               </h1>
               {heroSlides[currentSlide].text?.[language] && (
                 <p className="text-lg md:text-xl text-blue-800 mb-8 max-w-3xl mx-auto font-medium">
                   {heroSlides[currentSlide].text[language]}
                 </p>
               )}
               <button 
                  onClick={() => {
                    const el = document.getElementById('products');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 ${!heroSlides[currentSlide].text?.[language] ? 'mt-8' : ''}`}
                >
                  {t('nav.products')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {heroSlides.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/50 hover:bg-white text-blue-900 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm shadow-sm border border-blue-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/50 hover:bg-white text-blue-900 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 backdrop-blur-sm shadow-sm border border-blue-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-3 h-3 rounded-full transition-all border border-blue-200 ${idx === currentSlide ? 'bg-blue-600 scale-110' : 'bg-transparent hover:bg-blue-100'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
