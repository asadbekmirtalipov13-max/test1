import { ShoppingCart, X, Trash2, CreditCard, Tag, Clock, CheckCircle, Copy, Upload, Check, Loader2, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreData } from '../hooks/useStoreData';
import { useSiteSettings, PaymentMethod } from '../context/SiteSettingsContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { collection, addDoc, query, where, getDocs, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';

export default function CartDrawer() {
  const { items, addToCart, removeFromCart, updateQuantity, isCartOpen, setIsCartOpen, clearCart, contactInfo: storedContactInfo, setContactInfo: setStoredContactInfo } = useCart();
  const { t, language } = useLanguage();
  const { products } = useStoreData();
  const siteSettings = useSiteSettings();
  const { paymentMethodsList } = siteSettings;
  const { user } = useAuth();
  const [promocodeInput, setPromocodeInput] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoMessage, setPromoMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [phone, setPhone] = useState(storedContactInfo.phone || '+998');
  const [contactInfo, setContactInfo] = useState(storedContactInfo.contact || '');
  const [address, setAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1);

  // Sync back to context on change
  const handleContactChange = (field: 'phone' | 'contact', value: string) => {
    if (field === 'phone') {
      // Ensure +998 stays at the start if it was there
      if (value.startsWith('+998') || value === '+99' || value === '+' || value === '') {
         setPhone(value);
         setStoredContactInfo({ phone: value, contact: contactInfo });
      } else if (!value.startsWith('+')) {
         const newVal = '+998' + value.replace(/\D/g, '');
         setPhone(newVal);
         setStoredContactInfo({ phone: newVal, contact: contactInfo });
      }
    } else {
      setContactInfo(value);
      setStoredContactInfo({ phone, contact: value });
    }
  };

  const cartItems = items.map(item => {
    const product = products.find(p => p.id === item.id);
    return { ...item, product };
  }).filter(item => item.product);

  const subtotal = cartItems.reduce((acc, item) => acc + ((item.product?.price || 0) * item.quantity), 0);
  const total = subtotal - (subtotal * (discount / 100));

  const handleApplyPromo = async () => {
    if (!promocodeInput) return;
    try {
      const q = query(collection(db, 'promocodes'), where('code', '==', promocodeInput));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const limit = data.limit || 999999;
        const usedCount = data.usedCount || 0;

        if (usedCount >= limit) {
           setDiscount(0);
           setPromoMessage(language === 'ru' ? 'Лимит использования промокода исчерпан' : 'Promokoddan foydalanish limiti tugadi');
           return;
        }

        setDiscount(data.discount || 0);
        setPromoMessage(language === 'ru' ? `Скидка ${data.discount}% применена!` : `Chegirma ${data.discount}% qo'llanildi!`);
      } else {
        setDiscount(0);
        setPromoMessage(language === 'ru' ? 'Неверный промокод' : 'Noto\'g\'ri promokod');
      }
    } catch(err) {
      console.log(err);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0 || isSubmitting) return;
    if (!user) {
      alert(language === 'ru' ? 'Сначала войдите в систему!' : 'Avval tizimga kiring!');
      return;
    }
    
    setShowPaymentModal(true);
  };

  const finishCheckout = async (isPayLater = false) => {
    if (isSubmitting || isUploading) return;
    
    if (!phone.trim() || !contactInfo.trim()) {
      alert(language === 'ru' ? 'Пожалуйста, заполните все контактные данные (номер телефона и Telegram/Instagram)!' : 'Iltimos, barcha aloqa ma\'lumotlarini (telefon raqami va Telegram/Instagram) to\'ldiring!');
      // Scroll to inputs if needed or just let the user see them
      return;
    }

    if (!isPayLater && selectedPaymentMethod?.screenshotRequired && !screenshotFile) {
      alert(language === 'ru' ? 'Для этого способа оплаты необходимо прикрепить скриншот чека!' : 'Ushbu to\'lov usuli uchun chek skrinshotini biriktirish kerak!');
      return;
    }

    setIsSubmitting(true);

    let screenshotUrl = '';
    if (!isPayLater && screenshotFile) {
      setIsUploading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(screenshotFile);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });

        const formData = new FormData();
        formData.append('image', base64);
        const apiKey = '99ba8daf990b634a58e3d47eae7cb907';
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
          screenshotUrl = data.data.url;
        } else {
          alert(language === 'ru' ? 'Ошибка загрузки чека: ' + (data.error?.message || '') : 'Chekni yuklashda xato: ' + (data.error?.message || ''));
        }
      } catch (err) {
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codePart1 = Array.from({length:4}).map(()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const codePart2 = Array.from({length:4}).map(()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const generatedCode = `${codePart1}-${codePart2}`;

    try {
      const orderData = {
        userId: user!.uid,
        userEmail: user!.email || '',
        userName: user!.displayName || 'Unknown',
        userPhone: phone || '',
        userContact: contactInfo || '',
        address: deliveryMethod === 'delivery' ? (address || '') : 'Самовывоз',
        deliveryMethod,
        code: generatedCode,
        items: cartItems.map(i => ({ 
          id: i.id || '', 
          quantity: i.quantity || 1, 
          name: i.product?.name || { ru: 'Без названия', uz: 'Nomsiz' }, 
          price: i.product?.price || 0,
          image: i.product?.image || '',
          code: i.product?.code || ''
        })),
        subtotal: subtotal || 0,
        discount: discount || 0,
        total: total || 0,
        status: isPayLater ? 'need_to_pay' : 'pending',
        createdAt: new Date().toISOString(),
        siteComment: '',
        readinessTime: null,
        paymentMethod: isPayLater ? 'pay_later' : (selectedPaymentMethod as PaymentMethod)?.name || 'Unknown',
        paymentScreenshot: screenshotUrl || ''
      };

      await addDoc(collection(db, 'orders'), orderData);

      if (discount > 0 && promocodeInput) {
        const q = query(collection(db, 'promocodes'), where('code', '==', promocodeInput));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const promoDoc = snap.docs[0];
          await updateDoc(promoDoc.ref, {
            usedCount: increment(1)
          });
        }
      }

      setOrderCode(generatedCode);
      // Wait a moment to show success or just close
      setShowPaymentModal(false);
      setSelectedPaymentMethod(null);
      clearCart();
      setIsCartOpen(false);
      setDiscount(0);
      setPromocodeInput('');
      setPromoMessage('');
      setPhone('');
      setContactInfo('');
      setAddress('');
      
      // Redirect to cabinet to see the order
      window.location.hash = 'cabinet';
    } catch (error) {
      console.error(error);
      alert("Error creating order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => !showPaymentModal && !isSubmitting && setIsCartOpen(false)}
            className="fixed inset-0 bg-black z-[50] h-full w-full"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">{t('cart.title')}</h2>
              </div>
              <button 
                onClick={() => !showPaymentModal && !isSubmitting && setIsCartOpen(false)} 
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
              {cartItems.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="w-12 h-12 text-gray-300" />
                  </div>
                  <p className="text-xl font-bold text-gray-400 uppercase tracking-widest">{t('cart.empty')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(({ id, quantity, product }) => (
                    <motion.div 
                      key={id} 
                      layout
                      className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-shadow"
                    >
                      <img 
                        src={product?.image || undefined} 
                        alt={product?.name?.[language]} 
                        className="w-20 h-20 object-cover rounded-xl shadow-sm"
                      />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-900 line-clamp-1 leading-tight">{product?.name?.[language]}</h3>
                          <button 
                            onClick={() => removeFromCart(id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-primary font-black text-sm mb-3">
                          {product?.price.toLocaleString()} UZS
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                             <button 
                              onClick={() => quantity > 1 && updateQuantity(id, quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:text-primary hover:bg-white rounded-md transition-all shadow-sm"
                             > - </button>
                             <span className="font-black text-sm w-4 text-center">{quantity}</span>
                             <button 
                              onClick={() => updateQuantity(id, quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold text-gray-500 hover:text-primary hover:bg-white rounded-md transition-all shadow-sm"
                             > + </button>
                          </div>
                          <span className="font-bold text-gray-900 border-b-2 border-primary/10">
                            {((product?.price || 0) * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              {cartItems.length > 0 && (
                <div className="space-y-4 mb-2">
                  <div className="flex bg-gray-50 rounded-xl border-2 border-gray-100 overflow-hidden">
                    <input 
                      type="text" 
                      value={promocodeInput}
                      onChange={(e) => setPromocodeInput(e.target.value)}
                      placeholder={language === 'ru' ? 'Промокод' : 'Promokod'}
                      className="flex-1 px-4 py-3 bg-transparent outline-none text-sm font-bold"
                    />
                    <button 
                      onClick={handleApplyPromo} 
                      className="px-6 bg-gray-900 text-white font-black hover:bg-black transition text-xs uppercase tracking-widest"
                    >
                      {language === 'ru' ? 'Применить' : 'Qo\'llash'}
                    </button>
                  </div>
                  {promoMessage && <p className={`text-xs ${discount > 0 ? 'text-green-600' : 'text-red-500'} font-black uppercase tracking-wide px-1`}>{promoMessage}</p>}
                </div>
              )}

              <div className="space-y-2 py-2 border-t border-gray-100 mt-2">
                <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <span>Подытог</span>
                  <span>{subtotal.toLocaleString()} UZS</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-green-600 font-bold uppercase tracking-widest text-[10px]">
                    <span>Скидка ({discount}%)</span>
                    <span>- {((subtotal * discount) / 100).toLocaleString()} UZS</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xl font-black text-gray-900 uppercase tracking-tighter">
                  <span>{t('cart.total')}</span>
                  <div className="flex flex-col items-end">
                    <span>{total.toLocaleString()} {t('products.price')}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleCheckout} 
                disabled={cartItems.length === 0 || isSubmitting}
                className="w-full py-5 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <CreditCard className="w-6 h-6" />
                    {t('cart.checkout')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
          
          {/* Payment Modal */}
          <AnimatePresence>
            {showPaymentModal && (
              <motion.div
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              >
                <div className={`bg-white rounded-3xl w-full shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[85vh] transition-all duration-500 ${selectedPaymentMethod ? 'max-w-4xl' : 'max-w-lg'}`}>
                  {!selectedPaymentMethod ? (
                    <div className="p-6 overflow-y-auto min-h-0">
                      <h3 className="text-2xl font-black text-gray-900 mb-6 text-center">{language === 'ru' ? 'Выберите способ оплаты' : 'To\'lov usulini tanlang'}</h3>
                      <div className="space-y-4">
                        {paymentMethodsList?.map(pm => (
                          <button
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethod(pm)}
                            className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-left"
                          >
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              <img src={pm.image} alt={pm.name} className="w-full h-full object-cover" />
                            </div>
                            <h4 className="font-bold text-gray-900 text-lg">{pm.name}</h4>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setShowPaymentModal(false)} className="mt-8 w-full text-center text-gray-500 hover:text-gray-700 font-bold py-2">
                        {language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row h-full overflow-hidden">
                      {/* Left Side: Information */}
                      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-gray-100">
                        <div className="relative h-32 md:h-40 w-full shrink-0">
                          <img src={selectedPaymentMethod.image || undefined} alt="Payment" className="w-full h-full object-cover" />
                          <button onClick={() => setSelectedPaymentMethod(null)} className="absolute left-4 top-4 p-2 bg-white/90 rounded-full text-gray-900 shadow hover:bg-white text-sm font-bold z-10">
                            {language === 'ru' ? '← Назад' : '← Orqaga'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white min-h-0 custom-scrollbar">
                          <h3 className="text-xl md:text-3xl font-black mb-4 md:mb-8 text-gray-900 uppercase leading-none">
                            {selectedPaymentMethod.name}
                          </h3>

                          {paymentStep === 1 ? (
                            <div className="space-y-4 mb-8">
                              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                {language === 'ru' ? 'Ваши контакты' : 'Sizning kontaktlaringiz'}
                                {(!phone.trim() || !contactInfo.trim()) && <span className="ml-2 text-red-500 font-black">! {language === 'ru' ? 'НУЖНО ЗАПОЛНИТЬ' : 'TO\'LDIRISH KERAK'}</span>}
                              </label>
                              <div className="relative">
                                <input 
                                  type="tel" 
                                  placeholder={language === 'ru' ? 'Номер телефона (обязательно)' : 'Telefon raqami (majburiy)'}
                                  value={phone}
                                  onChange={(e) => handleContactChange('phone', e.target.value)}
                                  className={`w-full px-5 py-4 rounded-xl border transition-all outline-none font-bold text-sm shadow-sm ${!phone.trim() || phone === '+998' ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-gray-50 focus:ring-primary focus:bg-white'}`}
                                />
                                {(!phone.trim() || phone === '+998') && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold">*</span>}
                              </div>
                              <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder={language === 'ru' ? 'Ваша социальная сеть или почта' : 'Sizning ijtimoiy tarmoqingiz yoki pochtangiz'}
                                  value={contactInfo}
                                  onChange={(e) => handleContactChange('contact', e.target.value)}
                                  className={`w-full px-5 py-4 rounded-xl border transition-all outline-none font-bold text-sm shadow-sm ${!contactInfo.trim() ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-gray-50 focus:ring-primary focus:bg-white'}`}
                                />
                                {!contactInfo.trim() && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 font-bold">*</span>}
                              </div>

                              <div className="space-y-4 pt-4 border-t border-gray-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">{language === 'ru' ? 'Способ получения' : 'Qabul qilish usuli'}</p>
                                <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary/20 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                                      <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-gray-900 uppercase">{language === 'ru' ? 'Только самовывоз' : 'Faqat olib ketish'}</p>
                                      <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tight">{language === 'ru' ? 'Заберите заказ в пункте выдачи' : 'Buyurtmani punktimizdan olib keting'}</p>
                                    </div>
                                  </div>
                                  <CheckCircle className="w-5 h-5 text-primary" />
                                </div>
                              </div>

                              <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl mt-4">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2 opacity-50">{language === 'ru' ? 'Инструкция по оплате' : 'To\'lov bo\'yicha ko\'rsatma'}</p>
                                <p className="text-sm md:text-base text-gray-600 whitespace-pre-wrap leading-relaxed">
                                  {selectedPaymentMethod.description?.[language]}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 mb-8">
                               <div className="bg-blue-50 border-2 border-primary/20 p-6 rounded-3xl mb-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center font-black">!</div>
                                  <p className="font-black text-gray-900 leading-tight">{language === 'ru' ? 'Загрузите скриншот чека' : 'Chek skrinshotini yuklang'}</p>
                                </div>
                                <p className="text-sm font-medium text-gray-600">
                                  {language === 'ru' ? 'После того как вы произвели оплату, прикрепите здесь скриншот чека для подтверждения.' : 'To\'lovni amalga oshirgandan so\'ng, tasdiqlash uchun chek skrinshotini shu yerga biriktiring.'}
                                </p>
                              </div>
                              
                              <div className="p-8 border-4 border-dashed border-primary/20 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 bg-gray-50/50 hover:bg-gray-100/50 transition-colors relative cursor-pointer group">
                                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Upload className="w-8 h-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-black text-gray-900">{screenshotFile ? screenshotFile.name : (language === 'ru' ? 'Нажмите для загрузки' : 'Yuklash uchun bosing')}</p>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">PNG, JPG до 5MB</p>
                                </div>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                {screenshotFile && (
                                  <div className="bg-green-500 text-white p-2 rounded-full absolute -top-3 -right-3 shadow-lg">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Summary and Actions */}
                      <div className="w-full md:w-[360px] p-6 md:p-8 bg-gray-50/50 flex flex-col justify-center relative overflow-hidden">
                        {(isSubmitting || isUploading) && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                          >
                            <motion.div 
                              animate={{ rotate: 360 }} 
                              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} 
                              className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full mb-4" 
                            />
                            <p className="text-sm font-black uppercase tracking-widest text-gray-900 animate-pulse">
                              {isUploading 
                                ? (language === 'ru' ? 'Пожалуйста, подождите, идет загрузка чека...' : 'Iltimos, kuting, chek yuklanmoqda...') 
                                : (language === 'ru' ? 'Оформление заказа...' : "Buyurtma rasmiylashtirilmoqda...")}
                            </p>
                          </motion.div>
                        )}
                        <div className="mb-8 md:mb-12">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] block mb-3">{language === 'ru' ? 'К оплате' : 'To\'lov uchun'}</span>
                          <div className="text-3xl md:text-5xl font-black text-primary tracking-tighter">
                            {total.toLocaleString()} <span className="text-base md:text-xl ml-1 opacity-70">UZS</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          {paymentStep === 1 ? (
                            <>
                              <button 
                                onClick={() => {
                                   if (!phone.trim() || !contactInfo.trim() || (deliveryMethod === 'delivery' && !address.trim())) {
                                      alert(language === 'ru' ? 'Пожалуйста, заполните контактные данные и адрес доставки!' : 'Iltimos, aloqa ma\'lumotlarini va yetkazib berish manzilini to\'ldiring!');
                                      return;
                                   }
                                   if (selectedPaymentMethod.screenshotRequired) {
                                      setPaymentStep(2);
                                   } else {
                                      finishCheckout(false);
                                   }
                                }}
                                disabled={isSubmitting || !phone.trim() || !contactInfo.trim() || (deliveryMethod === 'delivery' && !address.trim())}
                                className="w-full py-5 text-white rounded-2xl font-black text-base md:text-lg uppercase tracking-widest transition shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                                style={{ backgroundColor: selectedPaymentMethod.btnColor || '#2563eb' }}
                              >
                                {selectedPaymentMethod.btnText?.[language] || (language === 'ru' ? 'Я ОПЛАТИЛ' : 'MEN TO\'LADIM')}
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="text-center mb-4">
                                <p className="text-xs font-black text-red-500 uppercase tracking-widest">{language === 'ru' ? 'Шаг 2: Загрузите подтверждение' : '2-qadam: Tasdiqni yuklang'}</p>
                              </div>
                              <button 
                                onClick={() => finishCheckout(false)}
                                disabled={isSubmitting || isUploading || !screenshotFile}
                                className="w-full py-5 bg-green-600 text-white rounded-2xl font-black text-base md:text-lg uppercase tracking-widest transition shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                              >
                                {(isSubmitting || isUploading) ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-6 h-6" />
                                    {language === 'ru' ? 'ПОДТВЕРДИТЬ' : 'TASDIQLASH'}
                                  </>
                                )}
                              </button>
                              <button onClick={() => setPaymentStep(1)} className="text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors">
                                {language === 'ru' ? '← Назад' : '← Orqaga'}
                              </button>
                            </>
                          )}

                          <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase font-black text-gray-300">
                              <span className="bg-gray-50 px-2 tracking-widest font-black uppercase">или</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => finishCheckout(true)}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shadow-lg"
                          >
                            {(siteSettings.payLaterButtonText?.[language] || (language === 'ru' ? 'Оплачу позже' : 'Keyinroq to\'layman')).replace(/\(.*\)/g, '').trim()}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
