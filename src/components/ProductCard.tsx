import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../hooks/useStoreData';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ArrowRight, Share2, MoreVertical, Edit, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  categoryName?: string;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProductCard({ product, categoryName, isAdmin, onEdit, onDelete }: ProductCardProps) {
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}#product-${product.id}`;
    
    const shareData = {
      title: product?.name?.[language] || 'Product',
      text: product?.description?.[language] || '',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert(language === 'ru' ? 'Ссылка скопирована в буфер обмена!' : 'Havola vauferga nusxalandi!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-blue-100 flex flex-col h-full group overflow-hidden cursor-pointer" onClick={() => setShowDetails(true)}>
      <div className="relative h-72 overflow-hidden bg-gray-50">
        <img 
          src={product.image || undefined} 
          alt={product?.name?.[language]} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-90 group-hover:brightness-100"
        />
        <div className="absolute top-6 right-6 z-10 flex gap-3">
          {isAdmin && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-3 bg-white/80 backdrop-blur-md rounded-2xl text-blue-900 shadow-xl border border-blue-100 hover:bg-blue-50 transition-all transform active:scale-90"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-48 bg-white rounded-[1.5rem] shadow-2xl border border-blue-100 overflow-hidden ring-1 ring-white/5 z-20"
                  >
                    <div className="p-2 space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.();
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase tracking-wider text-blue-700 hover:bg-blue-50 hover:text-blue-400 rounded-xl transition-all"
                      >
                         <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Edit className="w-4 h-4 text-blue-500" />
                         </div>
                        {language === 'ru' ? 'Свойства' : 'Xususiyatlar'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.();
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
                      >
                        <div className="w-8 h-8 bg-red-900/30 rounded-lg flex items-center justify-center">
                           <Trash2 className="w-4 h-4 text-red-500" />
                        </div>
                        {language === 'ru' ? 'Удалить' : 'O\'chirish'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
          <span className="text-white font-black uppercase tracking-wider text-xs flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
            {t('products.details')} <ArrowRight className="w-4 h-4 text-blue-400" />
          </span>
        </div>
      </div>
      
      <div className="p-8 flex flex-col flex-grow bg-white">
        <div className="mb-6">
          {categoryName && (
            <span className="inline-block px-3 py-1 bg-blue-900/20 text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-full mb-4 border border-blue-500/20">
              {categoryName}
            </span>
          )}
          <h3 className="text-2xl font-black text-blue-900 line-clamp-2 leading-tight uppercase tracking-tight group-hover:text-blue-400 transition-colors">{product?.name?.[language]}</h3>
        </div>
        
        <p className="text-blue-600 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed font-bold">{product?.description?.[language]}</p>
        
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {product.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-blue-50 text-blue-500 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-100">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-8 border-t border-blue-100 flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-500 uppercase font-black tracking-wider mb-1">
              {language === 'ru' ? 'Цена' : 'Narx'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-blue-900 tracking-tighter">
                {product.price?.toLocaleString()}
              </span>
              <span className="text-sm font-black text-blue-500 uppercase tracking-wider">UZS</span>
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all active:scale-90 transform"
          >
            <ShoppingCart className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-50/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl border border-blue-100"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowDetails(false)} 
                className="absolute top-6 right-6 z-[110] p-3 bg-gray-50/50 hover:bg-gray-50 rounded-2xl transition-all border border-blue-100"
              >
                <X className="w-6 h-6 text-blue-900" />
              </button>

              <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-12">
                <img src={product.image || undefined} alt={product.name?.[language]} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-700" />
              </div>

              <div className="w-full md:w-1/2 p-10 md:p-16 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="mb-10">
                  {categoryName && (
                    <span className="inline-block px-4 py-1.5 bg-blue-900/30 text-blue-500 text-[10px] font-black uppercase tracking-wider rounded-full mb-6 border border-blue-500/20">
                      {categoryName}
                    </span>
                  )}
                  <h2 className="text-4xl md:text-5xl font-black text-blue-900 uppercase leading-none mb-8 tracking-tighter">{product.name?.[language]}</h2>
                  
                  <div className="flex flex-wrap items-center gap-8 mb-12">
                     <div className="flex flex-col">
                        <span className="text-[10px] text-blue-500 font-black uppercase tracking-wider mb-2">{language === 'ru' ? 'Стоимость' : 'Qiymati'}</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-5xl font-black text-blue-900 tracking-tighter">
                              {product.price?.toLocaleString()}
                           </span>
                           <span className="text-xl font-black text-blue-500 uppercase tracking-wider">UZS</span>
                        </div>
                     </div>
                    <button 
                      onClick={() => {
                        addToCart(product.id);
                        setShowDetails(false);
                      }}
                      className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-900/30 hover:bg-blue-500 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-4"
                    >
                      <ShoppingCart className="w-5 h-5" /> {t('btn.add_to_cart')}
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-[10px] text-blue-500 font-black uppercase tracking-full">{language === 'ru' ? 'Описание' : 'Tavsif'}</p>
                    <p className="text-blue-600 leading-relaxed text-xl whitespace-pre-wrap font-bold">
                      {product.description?.[language]}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
