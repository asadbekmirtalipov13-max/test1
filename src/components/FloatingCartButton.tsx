import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../context/CartContext';

export const FloatingCartButton: React.FC = () => {
  const { cartCount, isCartOpen, setIsCartOpen } = useCart();

  return (
    <AnimatePresence>
      {!isCartOpen && (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-8 right-8 z-[150] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white group"
      >
        <ShoppingCart className="w-8 h-8 group-hover:scale-110 transition-transform" />
        {cartCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 -right-3 flex items-center justify-center w-8 h-8 text-xs font-black text-white bg-red-600 rounded-full shadow-lg border-4 border-white"
          >
            {cartCount}
          </motion.span>
        )}
      </motion.button>
      )}
    </AnimatePresence>
  );
};
