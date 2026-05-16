import { ShoppingCart, X, Trash2, CreditCard, Tag, Clock, CheckCircle, Copy, Upload, Check, Loader2, MapPin, Navigation, Compass, Globe, Phone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useStoreData } from '../hooks/useStoreData';
import { useSiteSettings, PaymentMethod } from '../context/SiteSettingsContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { uzbekistanRegions, Region, District } from '../data/uzbekistan';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapPicker({ onSelect, currentPos }: { onSelect: (pos: {lat: number, lng: number}) => void, currentPos: {lat: number, lng: number} | null }) {
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [map, setMap] = useState<L.Map | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (search.length > 2) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&countrycodes=uz&limit=5`);
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        } catch(err) {
          console.error(err);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const MapEvents = () => {
    const leafletMap = useMapEvents({
      click(e) {
        onSelect(e.latlng);
      },
    });
    useEffect(() => {
      setMap(leafletMap);
    }, [leafletMap]);
    return null;
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&countrycodes=uz`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        onSelect(newPos);
        if (map) {
          map.flyTo([newPos.lat, newPos.lng], 15);
        }
      } else {
        alert('He найдено / Topilmadi');
      }
    } catch(err) {
      console.log(err);
    }
  };

  const center = currentPos || { lat: 41.311081, lng: 69.240562 }; // Tashkent center

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 relative z-[1000]">
        <div className="flex gap-2 relative">
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Поиск места..."
            className="flex-1 px-4 py-2 rounded-xl border-2 border-blue-100 font-bold text-sm outline-none focus:border-blue-500"
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-md uppercase font-black text-[10px] tracking-wider hover:bg-blue-700">Искать</button>
        </div>

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden z-[1100]"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const newPos = { lat: parseFloat(s.lat), lng: parseFloat(s.lon) };
                    onSelect(newPos);
                    if (map) map.flyTo([newPos.lat, newPos.lng], 15);
                    setSearch(s.display_name);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-3 text-xs font-bold text-blue-900 hover:bg-blue-50 transition-colors border-b border-blue-50 last:border-0 truncate"
                >
                  {s.display_name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="h-[300px] w-full rounded-2xl overflow-hidden border-2 border-blue-100 shadow-inner bg-white relative z-0">
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEvents />
          {currentPos && <Marker position={[currentPos.lat, currentPos.lng]} />}
        </MapContainer>
      </div>
    </div>
  );
}

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
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [street, setStreet] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1);

  // Sync back to context on change
  const handleContactChange = (field: 'phone' | 'contact', value: string) => {
    if (field === 'phone') {
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

  const regions = uzbekistanRegions;
  const districts = regions.find(r => r.id === selectedRegion)?.districts || [];

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setCoordinates({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setIsLocating(false);
    }, (err) => {
      console.error(err);
      alert(t('location.error'));
      setIsLocating(false);
    });
  };

  const sendTelegramNotify = async (orderData: any) => {
    try {
      const itemsList = orderData.items.map((i: any) => `${i.name?.[language] || i.name} x${i.quantity}`).join('\n');
      const locationInfo = orderData.deliveryMethod === 'delivery' 
        ? `📍 Адрес: ${orderData.address}\n🗺 Локация: ${orderData.coordinates ? `https://www.google.com/maps?q=${orderData.coordinates.lat},${orderData.coordinates.lng}` : 'Не указана'}`
        : `🏪 Самовывоз\n📍 Адрес: ${orderData.address}`;

      const message = `
🚀 <b>НОВЫЙ ЗАКАЗ #${orderData.code}</b>

👤 Клиент: ${orderData.userName}
📞 Тел: ${orderData.userPhone}
💬 Контакт: ${orderData.userContact}

🛒 Товары:
${itemsList}

💰 Итого: ${orderData.total.toLocaleString()} UZS
💳 Оплата: ${orderData.paymentMethod}

${locationInfo}

🌐 <a href="${window.location.origin}/#admin">Зайти на сайт</a>
      `;
      
      await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }
  };

  const finishCheckout = async (isPayLater = false) => {
    if (isSubmitting || isUploading) return;
    
    if (!phone.trim() || !contactInfo.trim()) {
      alert(language === 'ru' ? 'Пожалуйста, заполните все контактные данные!' : 'Iltimos, barcha aloqa ma\'lumotlarini to\'ldiring!');
      return;
    }

    if (deliveryMethod === 'delivery') {
      if (!selectedRegion || !selectedDistrict || !street.trim()) {
        alert(language === 'ru' ? 'Пожалуйста, заполните адрес доставки!' : 'Iltimos, yetkazib berish manzilini to\'ldiring!');
        return;
      }
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
          }
        } catch (err) {
          console.error('Upload error:', err);
        } finally {
          setIsUploading(false);
        }
      }

      const generatedCode = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      try {
        const fullAddress = deliveryMethod === 'delivery' 
          ? `${regions.find(r => r.id === selectedRegion)?.name[language]}, ${districts.find(d => d.id === selectedDistrict)?.name[language]}, ${street}`
          : (siteSettings.pickupSettings?.address?.[language] || 'Самовывоз');

        const orderData = {
          userId: user!.uid,
          userEmail: user!.email || '',
          userName: user!.displayName || 'Unknown',
          userPhone: phone || '',
          userContact: contactInfo || '',
          address: fullAddress,
          coordinates,
          deliveryMethod,
          code: generatedCode,
          items: cartItems.map(i => ({ 
            id: i.id || '', 
            quantity: i.quantity || 1, 
            name: i.product?.name || { ru: 'Без названия', uz: 'Nomsiz' }, 
            price: i.product?.price || 0,
            image: i.product?.image || ''
          })),
          subtotal,
          discount,
          total,
          status: (isPayLater || selectedPaymentMethod?.type === 'redirect' || selectedPaymentMethod?.type === 'botfather') ? 'need_to_pay' : 'pending',
          createdAt: new Date().toISOString(),
          paymentMethod: isPayLater ? 'pay_later' : (selectedPaymentMethod?.name || 'Unknown'),
          paymentScreenshot: screenshotUrl || ''
        };

        await addDoc(collection(db, 'orders'), orderData);
        
        // Parallel tasks: Notify and handle redirect
        const notifyPromise = sendTelegramNotify(orderData);

        setShowPaymentModal(false);
        clearCart();
        setIsCartOpen(false);

        if (!isPayLater && selectedPaymentMethod?.type === 'redirect' && selectedPaymentMethod.redirectUrlTemplate) {
           let url = selectedPaymentMethod.redirectUrlTemplate;
           url = url.replace(/\{amount\}/g, orderData.total.toString());
           url = url.replace(/\{total\}/g, orderData.total.toString());
           url = url.replace(/\{order_id\}/g, orderData.code);
           url = url.replace(/\{orderId\}/g, orderData.code);
           window.location.href = url;
           return;
        }

        await notifyPromise;

        if (!isPayLater && selectedPaymentMethod?.type === 'botfather' && selectedPaymentMethod.providerToken) {
           try {
             // Telegram API prices amount must be in tiyin (smallest unit)
             const itemsPrices = orderData.items.map((i: any) => ({ 
                label: typeof i.name === 'string' ? i.name : (i.name?.[language] || i.name?.ru || 'Товар'), 
                amount: Math.round(i.price * i.quantity * 100) 
             }));
             const res = await fetch('/api/telegram/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                   title: `Заказ #${orderData.code}`,
                   description: 'Оплата заказа ' + orderData.code,
                   payload: `ORDER_${orderData.code}`,
                   providerToken: selectedPaymentMethod.providerToken,
                   currency: 'UZS',
                   prices: itemsPrices
                })
             });
             const data = await res.json();
             if (data.ok && data.link) {
               window.location.href = data.link;
               return;
             } else {
               alert('Ошибка создания счета: ' + data.error);
             }
           } catch(err) {
             console.error('Invoice error', err);
             alert('Ошибка создания счета');
           }
        }

        alert(language === 'ru' ? 'Заказ оформлен успешно! Переходим в кабинет...' : 'Buyurtma muvaffaqiyatli rasmiylashtirildi! Kabinetga o\'tmoqdamiz...');
        window.location.hash = 'cabinet';
      } catch (err) {
        console.error('Checkout error:', err);
        alert(language === 'ru' ? 'Ошибка при оформлении заказа. Пожалуйста, попробуйте еще раз.' : 'Buyurtma rasmiylashtirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
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
            className="fixed inset-0 bg-black z-[1000] h-full w-full"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[1010] flex flex-col border-l border-blue-100"
          >
            <div className="p-6 border-b border-blue-100 flex justify-between items-center bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-wider text-blue-900">{t('cart.title')}</h2>
              </div>
              <button 
                onClick={() => !showPaymentModal && !isSubmitting && setIsCartOpen(false)} 
                className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-600"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
              {cartItems.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="w-12 h-12 text-slate-700" />
                  </div>
                  <p className="text-xl font-bold text-slate-600 uppercase tracking-wider">{t('cart.empty')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(({ id, quantity, product }) => (
                    <motion.div 
                      key={id} 
                      layout
                      className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm border border-blue-100 group hover:shadow-md transition-shadow"
                    >
                      <img 
                        src={product?.image || undefined} 
                        alt={product?.name?.[language]} 
                        className="w-20 h-20 object-cover rounded-xl shadow-sm border border-blue-100"
                      />
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-blue-900 line-clamp-1 leading-tight">{product?.name?.[language]}</h3>
                          <button 
                            onClick={() => removeFromCart(id)}
                            className="text-slate-600 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-blue-500 font-black text-sm mb-3">
                          {product?.price.toLocaleString()} UZS
                        </p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-1 border border-blue-100">
                             <button 
                              onClick={() => quantity > 1 && updateQuantity(id, quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold text-blue-600 hover:text-blue-500 hover:bg-blue-100 rounded-md transition-all shadow-sm"
                             > - </button>
                             <span className="font-black text-sm w-4 text-center text-blue-900">{quantity}</span>
                             <button 
                              onClick={() => updateQuantity(id, quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center font-bold text-blue-600 hover:text-blue-500 hover:bg-blue-100 rounded-md transition-all shadow-sm"
                             > + </button>
                          </div>
                          <span className="font-bold text-blue-900 border-b-2 border-blue-500/10">
                            {((product?.price || 0) * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-blue-100 bg-white space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
              {cartItems.length > 0 && (
                <div className="space-y-4 mb-2">
                  <div className="flex bg-gray-50 rounded-xl border-2 border-blue-100 overflow-hidden">
                    <input 
                      type="text" 
                      value={promocodeInput}
                      onChange={(e) => setPromocodeInput(e.target.value)}
                      placeholder={language === 'ru' ? 'Промокод' : 'Promokod'}
                      className="flex-1 px-4 py-3 bg-transparent outline-none text-sm font-bold text-blue-900"
                    />
                    <button 
                      onClick={handleApplyPromo} 
                      className="px-6 bg-blue-600 text-white font-black hover:bg-blue-700 transition text-xs uppercase tracking-wider"
                    >
                      {language === 'ru' ? 'Применить' : 'Qo\'llash'}
                    </button>
                  </div>
                  {promoMessage && <p className={`text-xs ${discount > 0 ? 'text-green-500' : 'text-red-500'} font-black uppercase tracking-wide px-1`}>{promoMessage}</p>}
                </div>
              )}

              <div className="space-y-2 py-2 border-t border-blue-100 mt-2">
                <div className="flex justify-between items-center text-blue-500 font-bold uppercase tracking-wider text-[10px]">
                  <span>Подытог</span>
                  <span>{subtotal.toLocaleString()} UZS</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-green-500 font-bold uppercase tracking-wider text-[10px]">
                    <span>Скидка ({discount}%)</span>
                    <span>- {((subtotal * discount) / 100).toLocaleString()} UZS</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xl font-black text-blue-900 uppercase tracking-tighter">
                  <span>{t('cart.total')}</span>
                  <div className="flex flex-col items-end">
                    <span>{total.toLocaleString()} {t('products.price')}</span>
                  </div>
                </div>
              </div>
              
              {!user && cartItems.length > 0 && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl animate-pulse">
                  <p className="text-[10px] font-black uppercase text-yellow-700 tracking-wider text-center">
                    {language === 'ru' 
                      ? 'Чтобы оформить покупку, необходимо войти в аккаунт' 
                      : 'Buyurtmani rasmiylashtirish uchun tizimga kirishingiz kerak'}
                  </p>
                </div>
              )}
              
              <button 
                onClick={handleCheckout} 
                disabled={cartItems.length === 0 || isSubmitting}
                className={`w-full py-5 text-white rounded-2xl font-black text-lg uppercase tracking-wider active:scale-95 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${!user ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
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
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
              >
                <div className={`bg-white rounded-[3rem] w-full shadow-2xl relative flex flex-col max-h-[90vh] md:max-h-[85vh] transition-all duration-500 border border-blue-100 ${selectedPaymentMethod ? 'max-w-4xl' : 'max-w-lg'}`}>
                  {!selectedPaymentMethod ? (
                    <div className="p-10 overflow-y-auto min-h-0 bg-white rounded-[3rem]">
                      <h3 className="text-3xl font-black text-blue-900 mb-8 text-center uppercase tracking-tight">{language === 'ru' ? 'Оплата заказа' : 'Buyurtma to\'lovi'}</h3>
                      <div className="space-y-4">
                        {paymentMethodsList?.map(pm => (
                          <button
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethod(pm)}
                            className="w-full flex items-center gap-6 p-6 border-2 border-blue-100 rounded-[2rem] hover:bg-blue-50 hover:border-blue-500/30 transition-all text-left group"
                          >
                            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 border border-blue-100 p-2 group-hover:scale-105 transition-transform">
                              <img src={pm.image || undefined} alt={pm.name} className="w-full h-full object-contain" />
                            </div>
                            <h4 className="font-black text-blue-900 text-xl uppercase tracking-wider">{pm.name}</h4>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setShowPaymentModal(false)} className="mt-10 w-full text-center text-blue-500 hover:text-blue-900 font-black py-4 uppercase tracking-[0.2em] text-xs">
                        {language === 'ru' ? 'Назад в корзину' : 'Savatga qaytish'}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-gray-50 rounded-[3rem]">
                      {/* Left Side: Information */}
                      <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-blue-100">
                        <div className="relative h-40 md:h-56 w-full shrink-0">
                          <img src={selectedPaymentMethod.image || undefined} alt="Payment" className="w-full h-full object-contain bg-white" />
                          <button onClick={() => setSelectedPaymentMethod(null)} className="absolute left-6 top-6 px-6 py-3 bg-white/80 backdrop-blur-md rounded-2xl text-blue-400 shadow-xl hover:bg-blue-600 hover:text-white text-xs font-black uppercase tracking-wider z-10 transition-all border border-blue-100">
                            {language === 'ru' ? '← Способы' : '← Usullar'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-gray-50 min-h-0 custom-scrollbar">
                          <h3 className="text-3xl md:text-5xl font-black mb-10 text-blue-900 uppercase leading-none tracking-tight">
                            {selectedPaymentMethod.name}
                          </h3>

                          {paymentStep === 1 ? (
                            <div className="space-y-6 mb-8">
                              <p className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-6">
                                {language === 'ru' ? 'Контактные данные' : 'Kontakt ma\'lumotlari'}
                              </p>
                              
                              <div className="space-y-4">
                                <div className="relative group">
                                  <input 
                                    type="tel" 
                                    value={phone}
                                    onChange={(e) => {
                                      let val = e.target.value;
                                      if (!val.startsWith('+998')) val = '+998' + val.replace(/\D/g, '').replace(/^998/, '');
                                      const digits = val.replace(/\D/g, '');
                                      if (digits.length > 12) return;
                                      const finalVal = '+' + digits;
                                      setPhone(finalVal);
                                      setStoredContactInfo({ phone: finalVal, contact: contactInfo });
                                    }}
                                    className={`w-full px-8 py-5 pl-16 rounded-2xl border-2 transition-all outline-none font-black text-sm shadow-xl text-slate-900 bg-white ${(!phone.trim() || phone.length < 13) ? 'border-red-500/50 focus:border-red-500' : 'border-blue-100 focus:border-blue-500'}`}
                                  />
                                  <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none text-xl">
                                    🇺🇿
                                  </div>
                                </div>
                                <div className="relative group">
                                  <input 
                                    type="text" 
                                    placeholder={language === 'ru' ? 'Ваш Telegram или Instagram' : 'Telegram yoki Instagramingiz'}
                                    value={contactInfo}
                                    onChange={(e) => handleContactChange('contact', e.target.value)}
                                    className={`w-full px-8 py-5 rounded-2xl border-2 transition-all outline-none font-black text-sm shadow-xl text-slate-900 bg-white ${!contactInfo.trim() ? 'border-red-500/50 focus:border-red-500' : 'border-blue-100 focus:border-blue-500'}`}
                                  />
                                </div>
                              </div>

                              <div className="space-y-8 pt-10 border-t border-blue-100">
                                <p className="text-[10px] font-black tracking-wider text-blue-500 uppercase">{language === 'ru' ? 'Доставка или Самовывоз' : 'Yetkazib berish yoki Olib ketish'}</p>
                                
                                <div className="grid grid-cols-2 gap-6">
                                  <button 
                                    onClick={() => setDeliveryMethod('pickup')}
                                    className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-4 ${deliveryMethod === 'pickup' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-xl shadow-emerald-500/20' : 'border-blue-100 bg-white text-blue-500 hover:border-blue-100'}`}
                                  >
                                    <MapPin className="w-8 h-8" />
                                    <span className="text-xs font-black uppercase">{t('checkout.pickup')}</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeliveryMethod('delivery')}
                                    className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-4 ${deliveryMethod === 'delivery' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 shadow-xl shadow-emerald-500/20' : 'border-blue-100 bg-white text-blue-500 hover:border-blue-100'}`}
                                  >
                                    <Navigation className="w-8 h-8" />
                                    <span className="text-xs font-black uppercase">{t('checkout.delivery')}</span>
                                  </button>
                                </div>

                                {deliveryMethod === 'delivery' ? (
                                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 pt-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <select 
                                        value={selectedRegion}
                                        onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDistrict(''); }}
                                        className="w-full px-6 py-5 rounded-2xl border-2 border-blue-100 bg-white text-blue-900 focus:border-blue-500 transition-all outline-none font-black text-sm appearance-none"
                                      >
                                        <option value="" className="bg-white">{language === 'ru' ? 'Область' : 'Viloyat'}</option>
                                        {regions.map(r => (
                                          <option key={r.id} value={r.id} className="bg-white">{r.name[language]}</option>
                                        ))}
                                      </select>
                                      <select 
                                        value={selectedDistrict}
                                        onChange={(e) => setSelectedDistrict(e.target.value)}
                                        className="w-full px-6 py-5 rounded-2xl border-2 border-blue-100 bg-white text-blue-900 focus:border-blue-500 transition-all outline-none font-black text-sm appearance-none disabled:opacity-30"
                                        disabled={!selectedRegion}
                                      >
                                        <option value="" className="bg-white">{language === 'ru' ? 'Район' : 'Tuman'}</option>
                                        {districts.map(d => (
                                          <option key={d.id} value={d.id} className="bg-white">{d.name[language]}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <input 
                                      type="text" 
                                      placeholder={language === 'ru' ? 'Улица, дом, кв.' : 'Ko\'cha, uy, kv.'}
                                      value={street}
                                      onChange={(e) => setStreet(e.target.value)}
                                      className="w-full px-8 py-5 rounded-2xl border-2 border-blue-100 bg-white text-blue-900 focus:border-blue-500 transition-all outline-none font-black text-sm shadow-xl"
                                    />
                                    
                                    <div className="pt-4 space-y-6">
                                <p className="text-[10px] font-black tracking-wider text-blue-500 uppercase">{language === 'ru' ? 'Место на карте' : 'Xaritada joy'}</p>
                                      
                                      <div className="rounded-[2.5rem] overflow-hidden border-4 border-blue-100 shadow-2xl">
                                        <MapPicker currentPos={coordinates} onSelect={setCoordinates} />
                                      </div>

                                      <button 
                                        onClick={handleShareLocation}
                                        disabled={isLocating}
                                        className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${coordinates ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                      >
                                        {isLocating ? (
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : coordinates ? (
                                          <><Check className="w-5 h-5" /> {language === 'ru' ? 'Точка установлена' : 'Nuqta o\'rnatildi'}</>
                                        ) : (
                                          <><Navigation className="w-5 h-5" /> {language === 'ru' ? 'Моя Геолокация' : 'Mening Geolokatsiyam'}</>
                                        )}
                                      </button>
                                      
                                      {!coordinates && <p className="text-[10px] font-black text-red-500 mt-2 uppercase tracking-widest text-center">* {language === 'ru' ? 'Выберите точку на карте' : 'Xaritadan nuqtani tanlang'}</p>}
                                    </div>
                                  </motion.div>
                                ) : (
                                  siteSettings.pickupSettings && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-900/20 border-2 border-blue-500/30 p-8 rounded-[2.5rem] space-y-6 mt-6">
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                           <MapPin className="w-6 h-6 text-blue-900" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider">
                                            {language === 'ru' ? 'Пункт выдачи' : 'Olib ketish punkti'}
                                          </p>
                                          <p className="text-lg font-black text-blue-900 leading-tight mt-1">{siteSettings.pickupSettings.address?.[language]}</p>
                                        </div>
                                      </div>
                                      
                                      {(siteSettings.pickupSettings.mapUrl || siteSettings.pickupSettings.callCenter) && (
                                        <div className="pt-6 flex flex-wrap items-center gap-4 border-t border-blue-100/50">
                                          {siteSettings.pickupSettings.mapUrl && (
                                            <a href={siteSettings.pickupSettings.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-grow inline-flex items-center justify-center gap-3 text-blue-700 font-black text-xs uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all bg-blue-50 px-6 py-4 rounded-xl border border-blue-200 shadow-sm">
                                              <Globe className="w-4 h-4" /> {language === 'ru' ? 'Маршрут' : 'Yo\'nalish'}
                                            </a>
                                          )}
                                          {siteSettings.pickupSettings.callCenter && (
                                            <a href={`tel:${siteSettings.pickupSettings.callCenter.replace(/\s+/g, '')}`} className="flex-grow inline-flex items-center justify-center gap-3 text-blue-700 font-black text-xs uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all bg-blue-50 px-6 py-4 rounded-xl border border-blue-200 shadow-sm">
                                              <Phone className="w-4 h-4" /> {siteSettings.pickupSettings.callCenter}
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </motion.div>
                                  )
                                )}
                              </div>

                              <div className="bg-white border-2 border-blue-100 p-8 rounded-[2.5rem] mt-10">
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-wider mb-4">
                                  {language === 'ru' ? 'Инструкция' : 'Yo\'riqnoma'}
                                </p>
                                <p className="text-base text-blue-700 font-bold leading-relaxed whitespace-pre-wrap">
                                  {selectedPaymentMethod.description?.[language]}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-8 mb-8 animate-in fade-in slide-in-from-bottom-5">
                               <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 p-10 opacity-10 group-hover:scale-110 transition-transform">
                                  <Upload className="w-40 h-40" />
                                </div>
                                <div className="relative z-10">
                                  <h4 className="text-2xl font-black uppercase tracking-tight mb-4">{language === 'ru' ? 'Прикрепите Чек' : 'Chekni biriktiring'}</h4>
                                  <p className="text-sm font-bold opacity-80 leading-relaxed">
                                    {language === 'ru' ? 'Загрузите скриншот или фото банковского чека для подтверждения оплаты.' : 'To\'lovni tasdiqlash uchun bank cheki skrinshoti yoki rasm yuklang.'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="group relative p-12 lg:p-20 border-4 border-dashed border-blue-100 rounded-[3rem] bg-white/50 hover:bg-white hover:border-blue-500/30 transition-all flex flex-col items-center justify-center text-center cursor-pointer">
                                <div className="w-24 h-24 bg-gray-50 rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 border-2 border-blue-100 group-hover:scale-110 transition-transform">
                                  {screenshotFile ? <Check className="w-10 h-10 text-green-500" /> : <Upload className="w-10 h-10 text-blue-500" />}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xl font-black text-blue-900 uppercase tracking-tight">{screenshotFile ? screenshotFile.name : (language === 'ru' ? 'Выбрать файл' : 'Faylni tanlash')}</p>
                                  <p className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">{language === 'ru' ? 'До 5 МБ • JPG, PNG, PDF' : 'Maksimal 5 MB'}</p>
                                </div>
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Summary and Actions */}
                      <div className="w-full md:w-[400px] p-8 md:p-12 bg-white flex flex-col justify-center relative overflow-hidden">
                        {(isSubmitting || isUploading) && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 z-50 bg-gray-50/90 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center"
                          >
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                            <p className="text-xs font-black uppercase tracking-wider text-blue-900 animate-pulse">
                              {isUploading 
                                ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...') 
                                : (language === 'ru' ? 'Оформление...' : "Tayyorlanmoqda...")}
                            </p>
                          </motion.div>
                        )}
                        <div className="mb-12">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block mb-6">{language === 'ru' ? 'Сумма заказа' : 'Buyurtma summasi'}</span>
                          <div className="text-4xl md:text-6xl font-black text-blue-900 tracking-tighter flex items-baseline gap-2">
                            {total.toLocaleString()} <span className="text-lg md:text-2xl opacity-40">UZS</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-5">
                          {paymentStep === 1 ? (
                            <button 
                              onClick={() => {
                                 const isAddressMissing = deliveryMethod === 'delivery' && (!selectedRegion || !selectedDistrict || !street.trim() || !coordinates);
                                 if (phone.replace(/\D/g, '').length < 12) {
                                    alert(language === 'ru' ? 'Номер телефона должен содержать код и 9 цифр (например +998 90 123 45 67)' : 'Telefon raqamida kod va 9 ta raqam bo\'lishi kerak (+998 90 123 45 67)');
                                    return;
                                 }
                                 if (!contactInfo.trim() || isAddressMissing) {
                                    alert(language === 'ru' ? 'Пожалуйста, заполните все контактные данные' : 'Iltimos, ma\'lumotlarni to\'ldiring');
                                    return;
                                 }
                                 if (selectedPaymentMethod?.type && selectedPaymentMethod.type !== 'manual') {
                                    finishCheckout(false);
                                 } else if (selectedPaymentMethod?.screenshotRequired) {
                                    setPaymentStep(2);
                                 } else {
                                    finishCheckout(false);
                                 }
                              }}
                              disabled={isSubmitting || phone.replace(/\D/g, '').length < 12 || !contactInfo.trim() || (deliveryMethod === 'delivery' && (!selectedRegion || !selectedDistrict || !street.trim() || !coordinates))}
                              className="w-full py-6 text-white rounded-[1.5rem] font-black text-base md:text-xl uppercase tracking-wider transition shadow-2xl hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                              style={{ backgroundColor: selectedPaymentMethod.btnColor || '#2563eb' }}
                            >
                              {selectedPaymentMethod.btnText?.[language] || (selectedPaymentMethod.type === 'redirect' ? (language === 'ru' ? 'ПЕРЕЙТИ К ОПЛАТЕ' : 'TOLOVGA O\'TISH') : (language === 'ru' ? 'Я ОПЛАТИЛ' : 'MEN TOLADIM'))}
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={() => finishCheckout(false)}
                                disabled={isSubmitting || isUploading || !screenshotFile}
                                className="w-full py-6 bg-green-600 text-white rounded-[1.5rem] font-black text-base md:text-xl uppercase tracking-wider transition shadow-2xl hover:bg-green-500 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-30"
                              >
                                {language === 'ru' ? 'ГОТОВО' : 'TAYYOR'}
                              </button>
                              <button onClick={() => setPaymentStep(1)} className="text-[10px] font-black text-blue-500 uppercase tracking-wider hover:text-blue-900 transition-colors py-2">
                                {language === 'ru' ? 'Назад' : 'Orqaga'}
                              </button>
                            </>
                          )}

                          <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-blue-100"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-600 bg-white px-4 tracking-wider">
                              ИЛИ
                            </div>
                          </div>

                          <button 
                            onClick={() => finishCheckout(true)}
                            disabled={isSubmitting}
                            className="w-full py-5 bg-blue-50 text-blue-700 rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition hover:bg-blue-100 active:scale-[0.98] disabled:opacity-30 border border-blue-100"
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
