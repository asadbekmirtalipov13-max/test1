import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronLeft, CreditCard, MapPin, Link2, ShoppingCart, Camera, Save, Edit3, LogOut, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { useSiteSettings } from '../context/SiteSettingsContext';

import { updateProfile } from 'firebase/auth';

interface OrderItem {
  id: string;
  quantity: number;
  name?: { ru: string; uz: string };
  price?: number;
  image?: string;
}

interface Order {
  id: string;
  userId: string;
  code: string;
  total: number;
  subtotal: number;
  discount: number;
  promocode?: string;
  status: 'need_to_pay' | 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  createdAt: string;
  items: OrderItem[];
  siteComment?: string;
  readinessTime?: number | string;
  paymentMethod?: string;
  paymentScreenshot?: string;
}

const statusMap: Record<string, any> = {
  need_to_pay: { ru: 'Ожидает оплаты', uz: 'To\'lov kutilmoqda', icon: CreditCard, color: 'text-amber-600 bg-amber-50 border-amber-100' },
  pending: { ru: 'На подтверждении', uz: 'Tasdiqlashda', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
  confirmed: { ru: 'В процессе', uz: 'Jarayonda', icon: Package, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  ready: { ru: 'Готов к выдаче', uz: 'Olib ketishga tayyor', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-100' },
  completed: { ru: 'Завершен', uz: 'Tugallangan', icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  cancelled: { ru: 'Отменен', uz: 'Bekor qilindi', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-100' },
};

const IMGBB_API_KEY = (import.meta as any).env?.VITE_IMGBB_API_KEY;

export default function UserCabinet() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const siteSettings = useSiteSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentInfo, setShowPaymentInfo] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState<string | null>(null);
  const [selectedPMForOrder, setSelectedPMForOrder] = useState<any>(null);
  const [paymentStep, setPaymentStep] = useState<'methods' | 'instructions' | 'upload' | 'confirm'>('methods');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editingName, setEditingName] = useState(user?.displayName || '');
  const [editingAvatar, setEditingAvatar] = useState(user?.photoURL || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditingName(user.displayName || '');
      setEditingAvatar(user.photoURL || '');
    }
  }, [user]);

  const { logout } = useAuth();

  // Timer update
  const [now, setNow] = useState(new Date().getTime());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date().getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm(language === 'ru' ? 'Вы уверены, что хотите отменить заказ?' : 'Haqiqatdan ham buyurtmani bekor qilmoqchimisiz?')) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      alert(language === 'ru' ? 'Заказ отменен' : 'Buyurtma bekor qilindi');
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Error: ' + error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      // Update Auth Profile
      await updateProfile(auth.currentUser!, {
        displayName: editingName,
        photoURL: editingAvatar
      });
      
      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editingName,
        photoURL: editingAvatar
      });
      
      setIsEditingProfile(false);
      alert(language === 'ru' ? 'Профиль успешно обновлен!' : 'Profil muvaffaqiyatli yangilandi!');
      // Force reload to see changes if context doesn't auto-update
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
      });

      const formData = new FormData();
      formData.append('image', base64);
      const apiKey = '99ba8daf990b634a58e3d47eae7cb907';
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setEditingAvatar(data.data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      console.log("Fetching orders for user:", user.uid);
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        console.log("Found orders:", snapshot.size);
        const fetchedOrders: Order[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          const createdAt = createdAtDate.toISOString();
          
          // Auto-cancel logic for need_to_pay status
          const now = new Date().getTime();
          const createdTime = createdAtDate.getTime();
          const EightHours = 8 * 60 * 60 * 1000;
          
          let status = data.status;
          if (status === 'need_to_pay' && (now - createdTime) > EightHours) {
            status = 'cancelled';
            updateDoc(doc.ref, { status: 'cancelled', siteComment: 'Auto-cancelled due to non-payment within 8 hours' }).catch(console.error);
          }

          fetchedOrders.push({ id: doc.id, ...data, status, createdAt } as Order);
        });
        
        fetchedOrders.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        setOrders(fetchedOrders);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => window.location.hash = ''} 
          className="p-2 bg-white rounded-full shadow hover:bg-gray-50 flex items-center justify-center text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-black text-gray-900">
          {language === 'ru' ? 'Личный кабинет' : 'Shaxsiy kabinet'}
        </h1>
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mb-8 mt-4">
        <div className="bg-gradient-to-r from-primary to-blue-700 p-8 pt-12 text-white relative">
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-white shadow-2xl border-4 border-white/20 relative group">
                <img 
                  src={editingAvatar || (user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`)} 
                  alt={user.displayName || ''} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                />
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
                      className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full mb-2" 
                    />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest animate-pulse">
                      {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
                    </span>
                  </div>
                )}

                {isEditingProfile && !isUploading && (
                  <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px] z-10">
                    <Camera className="w-8 h-8 text-white mb-2" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest text-center px-2">
                       {language === 'ru' ? 'Сменить фото' : 'Rasmni o\'zgartirish'}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                  </label>
                )}
              </div>
              
              {isEditingProfile && (
                <motion.button 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => document.getElementById('avatar-upload-cabinet')?.click()}
                  className="absolute -bottom-2 -right-2 p-3 bg-white text-primary rounded-2xl shadow-xl hover:bg-gray-50 transition-all border-2 border-primary/10 z-30"
                  title={language === 'ru' ? 'Загрузить фото' : 'Rasm yuklash'}
                >
                  <Camera className="w-5 h-5 font-black" />
                  <input id="avatar-upload-cabinet" type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </motion.button>
              )}
            </div>
            <div className="text-center md:text-left flex-1 min-w-0">
              {isEditingProfile ? (
                 <input 
                   type="text" 
                   value={editingName} 
                   onChange={(e) => setEditingName(e.target.value)}
                   className="bg-white/10 border-2 border-white/20 rounded-xl px-4 py-2 text-2xl font-black outline-none focus:bg-white/20 transition-all w-full max-w-md"
                 />
              ) : (
                <>
                  <h1 className="text-3xl font-black uppercase tracking-tight truncate">{user.displayName}</h1>
                  <p className="text-blue-100 font-medium opacity-80">{user.email}</p>
                </>
              )}
            </div>
            <div className="flex gap-2">
               {isEditingProfile ? (
                  <>
                    <button 
                      onClick={handleUpdateProfile} 
                      disabled={isUpdatingProfile || isUploading}
                      className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition flex items-center gap-2"
                    >
                      {isUpdatingProfile ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                      {language === 'ru' ? 'Сохранить' : 'Saqlash'}
                    </button>
                    <button 
                      onClick={() => { setIsEditingProfile(false); setEditingName(user.displayName || ''); setEditingAvatar(user.photoURL || ''); }} 
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition"
                    >
                      {language === 'ru' ? 'Отмена' : 'Bekor qilish'}
                    </button>
                  </>
               ) : (
                 <button onClick={() => setIsEditingProfile(true)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition backdrop-blur-sm shadow-sm group">
                   <Edit3 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                 </button>
               )}
               <button onClick={logout} className="p-3 bg-white/10 hover:bg-red-500/20 rounded-xl border border-white/20 transition backdrop-blur-sm shadow-sm group">
                 <LogOut className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
               </button>
            </div>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        {language === 'ru' ? 'Мои заказы' : 'Mening buyurtmalarim'}
      </h2>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-8 h-8 rounded-full border-t-2 border-primary mx-auto mb-4"></div>
          {language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg text-gray-500 font-medium">
            {language === 'ru' ? 'У вас пока нет заказов' : 'Sizda hozircha buyurtmalar yo\'q'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => {
            const statusInfo = statusMap[order.status || 'pending'] || statusMap.pending;
            const StatusIcon = statusInfo.icon;
            
            return (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                <div 
                  onClick={() => setShowOrderDetails(showOrderDetails === order.id ? null : order.id)}
                  className="p-6 flex flex-col md:flex-row gap-6 justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono font-bold bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm">
                      {order.code}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString(language === 'ru' ? 'ru' : 'uz-UZ', {
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusInfo[language as 'ru' | 'uz']}
                    </div>
                    <button 
                      onClick={() => setShowOrderDetails(showOrderDetails === order.id ? null : order.id)}
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                      <Package className="w-3.5 h-3.5" />
                      {language === 'ru' ? 'Информация о товаре' : 'Mahsulot ma\'lumotlari'}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showOrderDetails === order.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-l-2 border-gray-100 pl-4 mb-6"
                      >
                        <div className="p-4 bg-gray-50/50 rounded-2xl space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                            {language === 'ru' ? 'Состав заказа' : 'Buyurtma tarkibi'}
                          </h4>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                              <img src={item.image || 'https://via.placeholder.com/50'} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-sm text-gray-900 truncate">{item.name?.[language as 'ru' | 'uz'] || (language === 'ru' ? 'Товар' : 'Mahsulot')}</p>
                                <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                                  {item.code && <span className="bg-gray-100 px-1 rounded text-[9px]">{item.code}</span>}
                                  {item.quantity} x {item.price?.toLocaleString()} UZS
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-primary">{( (item.price || 0) * item.quantity).toLocaleString()} UZS</p>
                              </div>
                            </div>
                          ))}
                          
                          {order.promocode && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center">
                              <span className="text-xs font-black text-green-700 uppercase tracking-widest">{language === 'ru' ? 'Промокод' : 'Promokod'}</span>
                              <span className="text-xs font-black text-green-700 font-mono">{order.promocode}</span>
                            </div>
                          )}

                          <div className="pt-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <span>{language === 'ru' ? 'Сумма без скидки' : 'Chegirmasiz summa'}</span>
                            <span>{order.subtotal?.toLocaleString()} UZS</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {order.status === 'need_to_pay' && (
                    <button 
                      onClick={async () => {
                        const confirmMsg = language === 'ru' 
                          ? 'Вы уверены, что хотите отменить этот заказ?' 
                          : 'Haqiqatan ham ushbu buyurtmani bekor qilmoqchimisiz?';
                        if (window.confirm(confirmMsg)) {
                          try {
                            await updateDoc(doc(db, 'orders', order.id), { 
                              status: 'cancelled',
                              siteComment: language === 'ru' ? 'Отменено пользователем' : 'Foydalanuvchi tomonidan bekor qilindi'
                            });
                            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
                            alert(language === 'ru' ? 'Заказ отменен' : 'Buyurtma bekor qilindi');
                          } catch (err) {
                            console.error('Error cancelling order:', err);
                            alert('Error cancelling order');
                          }
                        }
                      }}
                      className="w-full py-3 border-2 border-gray-100 text-gray-400 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all mb-4"
                    >
                      {language === 'ru' ? 'Отменить заказ' : 'Buyurtmani bekor qilish'}
                    </button>
                  )}

                  {order.status === 'need_to_pay' && (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                             <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                               <Clock className="w-4 h-4" />
                               {language === 'ru' ? 'Авто-отмена через:' : 'Avto-bekor qilish muddati:'}
                               <span className="font-black text-amber-600 text-sm ml-auto">
                                  {(() => {
                                     const createdDate = new Date(order.createdAt).getTime();
                                     const EightHours = 8 * 60 * 60 * 1000;
                                     const diff = EightHours - (now - createdDate);
                                     if (diff <= 0) return '00:00:00';
                                     const h = Math.floor(diff / (1000 * 60 * 60));
                                     const m = Math.floor((diff / (1000 * 60)) % 60);
                                     const s = Math.floor((diff / 1000) % 60);
                                     return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                                  })()}
                               </span>
                             </p>
                             <p className="text-[10px] text-amber-700 font-medium">
                                {language === 'ru' ? '*Оплата должна быть произведена в течение 8 часов' : '*To\'lov 8 soat ichida amalga oshirilishi kerak'}
                             </p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              if (showPaymentInfo === order.id) {
                                setShowPaymentInfo(null);
                                setSelectedPMForOrder(null);
                                setPaymentStep('methods');
                                setUploadedImageUrl(null);
                              } else {
                                setShowPaymentInfo(order.id);
                                setPaymentStep('methods');
                                setUploadedImageUrl(null);
                                // Check if already selected
                                const pm = siteSettings.paymentMethodsList?.find(p => p.name === order.paymentMethod);
                                if (pm) {
                                  setSelectedPMForOrder(pm);
                                  setPaymentStep('instructions');
                                }
                              }
                            }}
                            className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-md hover:shadow-lg transition-all"
                          >
                            {language === 'ru' ? 'Оплатить заказ' : 'Buyurtmani to\'lash'}
                          </button>

                          <AnimatePresence>
                            {showPaymentInfo === order.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="mt-4 p-5 bg-white border-2 border-primary/20 rounded-3xl shadow-xl space-y-4"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-black uppercase text-gray-900 tracking-wider">
                                    {language === 'ru' ? 'Подтверждение оплаты' : 'To\'lovni tasdiqlash'}
                                  </h4>
                                  <button onClick={() => {
                                    setShowPaymentInfo(null);
                                    setPaymentStep('methods');
                                    setSelectedPMForOrder(null);
                                    setUploadedImageUrl(null);
                                  }} className="p-1 text-gray-400 hover:text-gray-600">
                                    <XCircle className="w-5 h-5" />
                                  </button>
                                </div>

                                {paymentStep === 'methods' && (
                                  <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 text-center tracking-widest">
                                      {language === 'ru' ? 'Выберите способ оплаты:' : 'To\'lov usulini tanlang:'}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {siteSettings.paymentMethodsList?.map((pm, idx) => (
                                        <button 
                                          key={idx}
                                          onClick={() => {
                                            setSelectedPMForOrder(pm);
                                            setPaymentStep('instructions');
                                          }}
                                          className="p-3 border-2 border-gray-100 rounded-2xl hover:border-primary hover:bg-blue-50 transition-all text-left"
                                        >
                                          <p className="text-xs font-black text-gray-900 mb-1">{pm.name}</p>
                                          <p className="text-[10px] text-gray-500 truncate">{pm.description?.[language as 'ru' | 'uz']}</p>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {paymentStep === 'instructions' && selectedPMForOrder && (
                                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{selectedPMForOrder.name}</span>
                                        <button onClick={() => setPaymentStep('methods')} className="text-[10px] font-black text-gray-400 hover:text-gray-600">
                                          {language === 'ru' ? 'Изменить' : 'O\'zgartirish'}
                                        </button>
                                      </div>
                                      <p className="text-sm font-bold text-gray-900 break-words mb-2 whitespace-pre-wrap">{selectedPMForOrder.description?.[language as 'ru' | 'uz']}</p>
                                      <p className="text-[11px] text-blue-700 italic border-t border-blue-100 pt-2 mt-2">
                                        {language === 'ru' 
                                          ? 'Переведите указанную сумму по реквизитам выше.' 
                                          : 'Ko\'rsatilgan summani yuqoridagi rekvizitlarga o\'tkazing.'}
                                      </p>
                                    </div>

                                    <button 
                                      onClick={() => setPaymentStep('upload')}
                                      className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-blue-700 transition-all transform hover:scale-[1.02]"
                                      style={{ backgroundColor: selectedPMForOrder.btnColor }}
                                    >
                                      {selectedPMForOrder.btnText?.[language as 'ru' | 'uz'] || (language === 'ru' ? 'Я оплатил' : 'Men to\'ladim')}
                                    </button>
                                  </div>
                                )}

                                {paymentStep === 'upload' && selectedPMForOrder && (
                                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-black uppercase text-gray-900 tracking-widest">
                                        {language === 'ru' ? 'Шаг 2: Загрузите подтверждение' : '2-qadam: Tasdiqni yuklang'}
                                      </p>
                                      <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                                        {language === 'ru' 
                                          ? 'Пожалуйста, прикрепите скриншот или фото чека об оплате. Это ускорит подтверждение заказа.' 
                                          : 'Iltimos, to\'lov chekining skrinshotini yoki fotosuratini biriktiring. Bu buyurtmani tasdiqlashni tezlashtiradi.'}
                                      </p>
                                      
                                      <div className="relative group">
                                        <input 
                                          type="file" 
                                          accept="image/*"
                                          disabled={isUploading}
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            setIsUploading(true);
                                            try {
                                               const formData = new FormData();
                                               formData.append('image', file);
                                               
                                               const resp = await fetch(`https://api.imgbb.com/1/upload?key=99ba8daf990b634a58e3d47eae7cb907`, {
                                                  method: 'POST',
                                                  body: formData
                                               });
                                               const data = await resp.json();
                                               if (data.success) {
                                                  const url = data.data.url;
                                                  setUploadedImageUrl(url);
                                                  setPaymentStep('confirm');
                                               } else {
                                                  alert(language === 'ru' ? 'Ошибка загрузки: ' + (data.error?.message || 'Неизвестная ошибка') : 'Yuklashda xato: ' + (data.error?.message || 'Noma\'lum xato'));
                                               }
                                            } catch (err) {
                                               console.error("Upload error:", err);
                                               alert("Upload failed");
                                            } finally {
                                               setIsUploading(false);
                                            }
                                          }}
                                          className="w-full text-xs font-bold file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all border-2 border-dashed border-gray-100 rounded-2xl p-4 text-center cursor-pointer hover:border-primary/50"
                                        />
                                        {isUploading && (
                                          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                                             <div className="animate-spin w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full"></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <button 
                                      onClick={() => setPaymentStep('instructions')}
                                      className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                    >
                                      {language === 'ru' ? 'Назад к инструкциям' : 'Ko\'rsatmalarga qaytish'}
                                    </button>
                                  </div>
                                )}

                                {paymentStep === 'confirm' && uploadedImageUrl && (
                                  <div className="space-y-4 animate-in zoom-in-95">
                                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex flex-col items-center gap-4">
                                       <div className="w-16 h-16 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                                          <img src={uploadedImageUrl || undefined} alt="Check" className="w-full h-full object-cover" />
                                       </div>
                                       <div className="text-center">
                                          <p className="text-xs font-black text-green-800 uppercase tracking-widest">{language === 'ru' ? 'Чек загружен!' : 'Chek yuklandi!'}</p>
                                          <button onClick={() => { setUploadedImageUrl(null); setPaymentStep('upload'); }} className="text-[10px] font-bold text-green-600 hover:underline">
                                             {language === 'ru' ? 'Загрузить другой' : 'Boshqasini yuklash'}
                                          </button>
                                       </div>
                                    </div>

                                    <button 
                                      onClick={async () => {
                                        try {
                                          await updateDoc(doc(db, 'orders', order.id), {
                                            status: 'pending',
                                            paymentScreenshot: uploadedImageUrl,
                                            paymentMethod: selectedPMForOrder.name,
                                            updatedAt: new Date().toISOString()
                                          });
                                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'pending', paymentScreenshot: uploadedImageUrl } : o));
                                          setShowPaymentInfo(null);
                                          setPaymentStep('methods');
                                          setSelectedPMForOrder(null);
                                          setUploadedImageUrl(null);
                                          alert(language === 'ru' ? 'Ваш запрос отправлен на проверку. Спасибо!' : 'Sizning so\'rovingiz tekshiruvga yuborildi. Rahmat!');
                                        } catch (err) {
                                          console.error("Error confirming payment:", err);
                                          alert("Error confirming payment");
                                        }
                                      }}
                                      className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-700 transition-all transform hover:scale-[1.02]"
                                    >
                                      {language === 'ru' ? 'Завершить подтверждение' : 'Tasdiqlashni yakunlash'}
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {order.status === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl mb-4">
                           <p className="text-sm font-bold text-yellow-800 leading-relaxed">
                              {language === 'ru' 
                                ? 'Ваш заказ находится на подтверждении. Это может занять до 48 часов.' 
                                : 'Buyurtmangiz tasdiqlanish jarayonida. Bu 48 soatgacha vaqt olishi mumkin.'}
                           </p>
                           <p className="text-xs font-black text-yellow-600 mt-2 uppercase tracking-wider">
                              Call-центр: +998-94-800-0068
                           </p>
                        </div>
                      )}

                  {order.status === 'ready' && (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-2xl mb-4 space-y-3">
                       <p className="text-sm font-bold text-green-800 flex items-center gap-2">
                         <MapPin className="w-4 h-4 text-green-600" />
                         {language === 'ru' ? 'Пункт выдачи:' : 'Topshirish punkti:'}
                       </p>
                       <div className="pl-6 space-y-2">
                          <p className="font-bold text-green-900">
                            {siteSettings.pickupSettings?.address?.[language as 'ru' | 'uz']}
                          </p>
                          <p className="text-xs text-green-700 font-bold">{language === 'ru' ? 'Тел:' : 'Tel:'} {siteSettings.pickupSettings?.callCenter}</p>
                          <a 
                            href={siteSettings.pickupSettings?.mapUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-xs font-black text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 uppercase tracking-widest shadow-sm"
                          >
                            <Link2 className="w-3 h-3" />
                            {language === 'ru' ? 'Открыть на карте' : 'Xaritada ochish'}
                          </a>
                       </div>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {language === 'ru' ? 'Товаров в заказе:' : 'Buyurtmadagi tovarlar:'} <span className="font-bold text-gray-900">{order.items.length}</span>
                    {order.address && (
                      <div className="mt-3 flex gap-2 items-start text-xs font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <Truck className="w-4 h-4 text-primary shrink-0" />
                        <span>{language === 'ru' ? 'Адрес доставки:' : 'Yetkazib berish manzili:'} {order.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Items List */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest flex items-center gap-2">
                       <ShoppingCart className="w-3 h-3" />
                       {language === 'ru' ? 'Информация о товарах:' : 'Tovar haqida ma\'lumot:'}
                    </p>
                    <div className="space-y-3">
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-50">
                          <img 
                            src={item.image || 'https://via.placeholder.com/150'} 
                            alt={item.name} 
                            className="w-10 h-10 rounded-lg object-cover bg-gray-50 flex-shrink-0" 
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">
                               {typeof item.name === 'object' && item.name ? (item.name as any)[language] : (item.name || '')}
                            </p>
                            <p className="text-[10px] font-black uppercase text-primary tracking-tighter flex items-center gap-2">
                               {item.code && <span className="bg-primary/10 px-1 rounded">{item.code}</span>}
                               {item.quantity} шт × {item.price?.toLocaleString()} UZS
                               {item.discount > 0 && <span className="text-green-600 ml-1">(-{item.discount}%)</span>}
                            </p>
                          </div>
                          <div className="text-right text-xs font-black text-gray-900">
                            {(item.price * item.quantity).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.readinessTime && order.status === 'confirmed' && (
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-4">
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">
                        {language === 'ru' ? 'Ориентировочное время готовности:' : 'Taxminiy tayyor bo\'lish vaqti:'}
                      </p>
                      <p className="text-sm font-black text-blue-900">
                        {order.readinessTime}
                      </p>
                    </div>
                  )}

                  {order.siteComment && (
                    <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg mb-4 italic text-sm text-gray-700">
                      <p className="text-[10px] font-black uppercase text-gray-400 not-italic mb-1">
                        {language === 'ru' ? 'Комментарий магазина:' : 'Do\'kon sharhi:'}
                      </p>
                      "{order.siteComment}"
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-end md:items-end border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[200px] relative">
                  <div className="text-sm text-gray-500 mb-1">
                    {language === 'ru' ? 'Итоговая сумма:' : 'Jami summa:'}
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {order.total?.toLocaleString()} UZS
                  </div>
                  {order.discount > 0 && (
                    <div className="text-xs text-green-600 mt-1 font-medium">
                      {language === 'ru' ? 'Скидка:' : 'Chegirma:'} {order.discount}%
                    </div>
                  )}
                  <div className="mt-4 md:mt-auto flex justify-end">
                    {showOrderDetails === order.id ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />}
                  </div>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
