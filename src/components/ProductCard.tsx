import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../hooks/useStoreData';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, ArrowRight, Share2, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [showMenu, setShowMenu] = useState(false);
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
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group overflow-hidden">
      <div className="relative h-64 overflow-hidden bg-gray-50">
        <img 
          src={product.image} 
          alt={product?.name?.[language]} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {isAdmin && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-gray-700 shadow-sm border border-gray-100 hover:bg-white transition-all transform active:scale-90"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden ring-1 ring-black/5"
                  >
                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.();
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                      >
                         <div className="w-7 h-7 bg-blue-100/50 rounded-lg flex items-center justify-center">
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                         </div>
                        {language === 'ru' ? 'Свойства' : 'Xususiyatlar'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.();
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <div className="w-7 h-7 bg-red-100/50 rounded-lg flex items-center justify-center">
                           <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </div>
                        {language === 'ru' ? 'Удалить' : 'O\'chirish'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {false && ( // Temporarily hidden
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-700 shadow-sm hover:bg-white hover:text-primary transition-all active:scale-90"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
          <span className="text-white font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            {t('products.details')} <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          {categoryName && (
            <span className="inline-block px-2 py-1 bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider rounded-md mb-2">
              {categoryName}
            </span>
          )}
          <h3 className="text-xl font-bold text-gray-900 line-clamp-2 leading-tight">{product?.name?.[language]}</h3>
        </div>
        
        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3 leading-relaxed">{product?.description?.[language]}</p>
        
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {product.tags.map((tag, index) => (
              <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
              {language === 'ru' ? 'Цена' : 'Narx'}
            </span>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {product.price ? `${product.price.toLocaleString('uz-UZ')} ${t('products.price')}` : '---'}
            </span>
          </div>
          
          <button 
            onClick={() => addToCart(product.id)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-bold shadow-md hover:shadow-lg active:scale-95 transform"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">{t('btn.add_to_cart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
