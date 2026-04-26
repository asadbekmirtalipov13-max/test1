import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { useStoreData, Category, Product } from '../hooks/useStoreData';
import { useLanguage } from '../context/LanguageContext';
import { useSiteSettings, HeroSlide, PaymentMethod } from '../context/SiteSettingsContext';
import { Upload, Plus, Trash2, Edit, Save, Search, FileText, CheckCircle, Clock, MapPin, PhoneCall, Link2, ShoppingCart, User, Users, Settings, CreditCard, ShieldCheck, Globe, X, ChevronUp, ChevronDown, Share2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const IMGBB_API_KEY = (import.meta as any).env?.VITE_IMGBB_API_KEY || '99ba8daf990b634a58e3d47eae7cb907';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  alert(`Ошибка [${operationType}] в ${path}: ${error instanceof Error ? error.message : String(error)}`);
  throw new Error(JSON.stringify(errInfo));
}

export default function AdminPanel() {
  const { user, isAdmin, loading } = useAuth();
  // ... rest of the component
  const { language } = useLanguage();
  const { categories, products } = useStoreData();
  const siteSettings = useSiteSettings();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'categories' | 'products' | 'ai-import' | 'settings' | 'promocodes' | 'admins'>('orders');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [promocodesList, setPromocodesList] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState<number | string>(10);
  const [newPromoLimit, setNewPromoLimit] = useState<number | string>(100);
  
  // Custom Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmData({ title, message, onConfirm });
    setIsConfirmOpen(true);
  };
  
  // AI Import state
  const [aiIsProcessing, setAiIsProcessing] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiCategoryId, setAiCategoryId] = useState('auto');
  const [aiResults, setAiResults] = useState<any[]>([]);
  
  // Bulk selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showPasswordsSection, setShowPasswordsSection] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

  // Store management state
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  
  // Edit states
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Customization state
  const [customizationSaving, setCustomizationSaving] = useState(false);
  const [adForm, setAdForm] = useState(siteSettings.ad);
  const [primaryColor, setPrimaryColor] = useState(siteSettings.primaryColor);
  const [siteName, setSiteName] = useState(siteSettings.siteName || 'Konstruktuv Metall');
  const [contactsForm, setContactsForm] = useState(siteSettings.contacts);
  const [pickupSettings, setPickupSettings] = useState(siteSettings.pickupSettings);
  const [aboutForm, setAboutForm] = useState(siteSettings.about);
  const [payLaterButtonText, setPayLaterButtonText] = useState(siteSettings.payLaterButtonText || { ru: '', uz: '' });
  const [socialLinks, setSocialLinks] = useState(siteSettings.socialLinks || []);
  
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(siteSettings.heroSlides || []);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethod[]>(siteSettings.paymentMethodsList || []);
  const [aboutUs, setAboutUs] = useState(siteSettings.aboutUs || { ru: '', uz: '' });
  const [adBlockTitle, setAdBlockTitle] = useState(siteSettings.adBlockTitle || '');
  const [adBlockLink, setAdBlockLink] = useState(siteSettings.adBlockLink || '');
  const [showAdBlock, setShowAdBlock] = useState(siteSettings.showAdBlock || false);
  const [adBlockImage, setAdBlockImage] = useState(siteSettings.adBlockImage || '');
  const [siteDescription, setSiteDescription] = useState(siteSettings.siteDescription || { ru: '', uz: '' });

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsubAdmins = onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    
    const unsubPromocodes = onSnapshot(query(collection(db, 'promocodes')), (snap) => {
      setPromocodesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAdmins();
      unsubAllUsers();
      unsubOrders();
      unsubPromocodes();
    };
  }, [isAdmin]);

  useEffect(() => {
    setAdForm(siteSettings.ad);
    setPrimaryColor(siteSettings.primaryColor);
    setSiteName(siteSettings.siteName || 'Konstructuv Metall');
    setContactsForm(siteSettings.contacts);
    setPickupSettings(siteSettings.pickupSettings);
    setAboutForm(siteSettings.about);
    setPayLaterButtonText(siteSettings.payLaterButtonText || { ru: '', uz: '' });
    setHeroSlides(siteSettings.heroSlides || []);
    setPaymentMethodsList(siteSettings.paymentMethodsList || []);
    setSocialLinks(siteSettings.socialLinks || []);
    setAboutUs(siteSettings.aboutUs || { ru: '', uz: '' });
    setAdBlockTitle(siteSettings.adBlockTitle || '');
    setAdBlockLink(siteSettings.adBlockLink || '');
    setShowAdBlock(siteSettings.showAdBlock || false);
    setAdBlockImage(siteSettings.adBlockImage || '');
    setSiteDescription(siteSettings.siteDescription || { ru: '', uz: '' });
  }, [siteSettings]);

  const handleDeleteOrder = async (orderId: string) => {
    showConfirm(
      language === 'ru' ? 'Удаление заказа' : 'Buyurtmani o\'chirish',
      language === 'ru' ? 'Удалить этот заказ навсегда?' : 'Ushbu buyurtmani butunlay o\'chirib tashlash?',
      async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
          alert(language === 'ru' ? 'Заказ удален' : 'Buyurtma o\'chirildi');
        } catch (error: any) {
          handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
        }
      }
    );
  };
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage({ type: '', text: '' });
    if (!newAdminEmail) return;

    try {
      const q = query(collection(db, 'users'), where('email', '==', newAdminEmail.toLowerCase().trim()));
      let snap = await getDocs(q);
      
      if (snap.empty) {
        setAdminMessage({ type: 'error', text: 'Пользователь не найден. Он должен сначала войти на сайт.' });
        return;
      }

      const userDoc = snap.docs[0];
      await updateDoc(userDoc.ref, { role: 'admin' });
      setAdminMessage({ type: 'success', text: 'Администратор успешно назначен!' });
      setNewAdminEmail('');
      setTimeout(() => setAdminMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error(error);
      setAdminMessage({ type: 'error', text: 'Ошибка при назначении администратора.' });
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    showConfirm(
      language === 'ru' ? 'Массовое удаление' : 'Ommaviy o\'chirish',
      language === 'ru' ? `Удалить выбранные товары (${selectedProductIds.length} шт)?` : `Tanlangan mahsulotlarni o'chirish (${selectedProductIds.length} ta)?`,
      async () => {
        try {
          for (const id of selectedProductIds) {
            await deleteDoc(doc(db, 'products', id));
          }
          setSelectedProductIds([]);
          alert(language === 'ru' ? 'Выбранные товары удалены' : 'Tanlangan mahsulotlar o\'chirildi');
        } catch (error: any) {
          alert('Error: ' + error.message);
        }
      }
    );
  };

  const uploadImgBB = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });

    const formData = new FormData();
    formData.append('image', base64);
    
    const apiKey = '99ba8daf990b634a58e3d47eae7cb907';
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.url) {
      return data.data.url;
    }
    
    throw new Error(data.error?.message || 'Upload failed');
  };

  const handleEntityImageUpload = async (collectionName: string, docId: string, file: File) => {
    setUploadingImage(docId);
    try {
      const imageUrl = await uploadImgBB(file);
      await setDoc(doc(db, collectionName, docId), { image: imageUrl }, { merge: true });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(error.message || 'Ошибка при загрузке изображения');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleAddCategory = async () => {
    try {
      const newRef = doc(collection(db, 'categories'));
      await setDoc(newRef, {
        name: { ru: 'Новая категория', uz: 'Yangi kategoriya' },
        image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=800',
        order: categories.length
      });
      alert("Категория успешно создана");
    } catch (error: any) {
       console.error("Add category error:", error);
       alert("Error adding category: " + error.message);
    }
  };

  const handleMoveCategory = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = sorted.findIndex(c => c.id === id);
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      const current = sorted[index];
      const prev = sorted[index - 1];
      const prevOrder = prev.order || 0;
      await updateDoc(doc(db, 'categories', current.id), { order: prevOrder });
      await updateDoc(doc(db, 'categories', prev.id), { order: current.order || index });
    } else if (direction === 'down' && index < sorted.length - 1) {
      const current = sorted[index];
      const next = sorted[index + 1];
      const nextOrder = next.order || 0;
      await updateDoc(doc(db, 'categories', current.id), { order: nextOrder });
      await updateDoc(doc(db, 'categories', next.id), { order: current.order || index });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    showConfirm(
      "Удаление категории",
      "Удалить категорию? Все товары внутри этой категории также будут недоступны.",
      async () => {
        try {
          console.log('Deleting category:', id);
          await deleteDoc(doc(db, 'categories', id));
          alert("Категория успешно удалена");
        } catch (e: any) {
          console.error('Delete category error:', e);
          handleFirestoreError(e, OperationType.DELETE, `categories/${id}`);
        }
      }
    );
  }

  const handleAddProduct = async (categoryId: string) => {
    try {
      const newRef = doc(collection(db, 'products'));
      const catProducts = products.filter(p => p.categoryId === categoryId);
      await setDoc(newRef, {
        categoryId,
        name: { ru: 'Новый товар', uz: 'Yangi tovar' },
        description: { ru: 'Описание', uz: 'Tavsif' },
        price: 0,
        image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=800',
        tags: [],
        order: catProducts.length
      });
    } catch (error: any) {
       alert("Error adding product: " + error.message);
    }
  };

  const handleMoveProduct = async (id: string, direction: 'up' | 'down') => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    const catProducts = products.filter(p => p.categoryId === prod.categoryId).sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = catProducts.findIndex(p => p.id === id);
    
    if (direction === 'up' && index > 0) {
      const current = catProducts[index];
      const prev = catProducts[index - 1];
      const prevOrder = prev.order || 0;
      await updateDoc(doc(db, 'products', current.id), { order: prevOrder });
      await updateDoc(doc(db, 'products', prev.id), { order: current.order || index });
    } else if (direction === 'down' && index < catProducts.length - 1) {
      const current = catProducts[index];
      const next = catProducts[index + 1];
      const nextOrder = next.order || 0;
      await updateDoc(doc(db, 'products', current.id), { order: nextOrder });
      await updateDoc(doc(db, 'products', next.id), { order: current.order || index });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    showConfirm(
      "Удаление товара",
      "Вы действительно хотите удалить этот товар?",
      async () => {
        try {
          console.log('Deleting product:', id);
          await deleteDoc(doc(db, 'products', id));
          alert("Товар успешно удален");
        } catch (e: any) {
          console.error('Delete product error:', e);
          handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
        }
      }
    );
  };

  const handleUpdateCategory = async (id: string, field: string, value: string, lang?: 'ru'|'uz') => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    const newData = { ...cat } as any;
    if (lang) {
      newData.name[lang] = value;
    } else {
      newData[field] = value;
    }
    await setDoc(doc(db, 'categories', id), newData);
  }

  const handleUpdateProduct = async (id: string, field: string, value: string | number | string[], subField?: 'ru'|'uz', isDesc?: boolean) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    const newData = { ...prod } as any;
    if (subField) {
      if (isDesc) {
        newData.description[subField] = value;
      } else {
        newData.name[subField] = value;
      }
    } else {
      newData[field] = value;
    }
    await setDoc(doc(db, 'products', id), newData);
  }

  const handleSiteImageUpload = async (field: 'logoUrl' | 'bannerUrl' | 'footerImageUrl' | 'ad.imageUrl' | 'adBlockImage', file: File) => {
    setCustomizationSaving(true);
    try {
      const imageUrl = await uploadImgBB(file);
      if (field === 'ad.imageUrl') {
        setAdForm(prev => ({ ...prev, imageUrl }));
      } else if (field === 'adBlockImage') {
        setAdBlockImage(imageUrl);
      } else {
        await setDoc(doc(db, 'settings', 'site'), { [field]: imageUrl }, { merge: true });
      }
    } catch (error: any) {
      console.error('Error uploading site image:', error);
      alert(error.message || 'Ошибка при загрузке изображения');
    } finally {
      setCustomizationSaving(false);
    }
  };

  const handleSaveCustomization = async () => {
    setCustomizationSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        siteName,
        primaryColor,
        ad: adForm,
        contacts: contactsForm,
        pickupSettings,
        about: aboutForm,
        payLaterButtonText,
        heroSlides,
        paymentMethodsList,
        socialLinks,
        aboutUs,
        adBlockTitle,
        adBlockLink,
        showAdBlock,
        adBlockImage,
        siteDescription
      }, { merge: true });
      alert('Настройки успешно сохранены!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Ошибка при сохранении настроек');
    } finally {
      setCustomizationSaving(false);
    }
  };

  const handleAddSocialLink = () => {
    setSocialLinks([...socialLinks, { id: Date.now().toString(), name: '', url: '', iconUrl: '' }]);
  };

  const handleUpdateSocialLink = (id: string, field: string, value: string) => {
    setSocialLinks(socialLinks.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleDeleteSocialLink = (id: string) => {
    setSocialLinks(socialLinks.filter(l => l.id !== id));
  };

  const handleSocialIconUpload = async (id: string, file: File) => {
    try {
       const url = await uploadImgBB(file);
       handleUpdateSocialLink(id, 'iconUrl', url);
    } catch (err: any) {
       alert('Error uploading icon: ' + err.message);
    }
  };

  const handleDeleteAdmin = async (uid: string) => {
    showConfirm(
      language === 'ru' ? 'Удаление администратора' : 'Adminni o\'chirish',
      language === 'ru' ? 'Вы действительно хотите лишить этого пользователя прав администратора?' : 'Haqiqatan ham ushbu foydalanuvchini administrator huquqlaridan mahrum qilmoqchimisiz?',
      async () => {
        try {
          await updateDoc(doc(db, 'users', uid), { role: 'user' });
          alert(language === 'ru' ? "Права администратора отозваны" : "Admin huquqlari bekor qilindi");
        } catch (e: any) {
          console.error('Delete admin error:', e);
          alert("Ошибка: " + e.message);
        }
      }
    );
  };

  const handleAddPromoCode = async () => {
    if (!newPromoCode) return;
    try {
      await setDoc(doc(db, 'promocodes', newPromoCode.toUpperCase().trim()), { 
        code: newPromoCode.toUpperCase().trim(), 
        discount: Number(newPromoDiscount),
        limit: Number(newPromoLimit),
        usedCount: 0,
        createdAt: new Date().toISOString()
      });
      setNewPromoCode('');
      alert(language === 'ru' ? "Промокод успешно добавлен" : "Promokod muvaffaqiyatli qo'shildi");
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeletePromoCode = async (id: string) => {
    showConfirm(
      language === 'ru' ? 'Удаление промокода' : 'Promokodni o\'chirish',
      language === 'ru' ? 'Вы действительно хотите удалить этот промокод?' : 'Haqiqatan ham ushbu promokodni o\'chirib tashlamoqchimisiz?',
      async () => {
        try {
          await deleteDoc(doc(db, 'promocodes', id));
          alert(language === 'ru' ? "Промокод удален" : "Promokod o'chirildi");
        } catch (err: any) {
           alert("Error: " + err.message);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Загрузка...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-black text-red-600 uppercase tracking-tight mb-4">Доступ запрещен</h2>
        <p className="text-gray-600">У вас нет прав для просмотра этой страницы.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tight">Админ-панель</h2>
           <div className="w-24 h-2 bg-red-600 mt-2 rounded-full"></div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          {user.photoURL && user.photoURL !== "" ? (
            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-xl" />
          ) : (
            <div className="w-10 h-10 bg-blue-100 text-primary rounded-xl flex items-center justify-center font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-black text-gray-900">{user.displayName || user.email}</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Администратор</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-100">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Заказы' : 'Buyurtmalar'}
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'categories' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
          </button>
          <button 
            onClick={() => setActiveTab('promocodes')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'promocodes' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Промокоды' : 'Promokodlar'}
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'admins' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Админы' : 'Adminlar'}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {language === 'ru' ? 'Настройки' : 'Sozlamalar'}
          </button>
      </div>

      {activeTab === 'settings' && (
        <div className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-12">
           <div className="border-b border-gray-100 pb-4">
             <h3 className="text-xl font-black uppercase">Настройки сайта</h3>
             <p className="text-gray-500 text-sm">Управление внешним видом и доступом</p>
           </div>

                   
                   <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Главный баннер</label>
                        <div className="relative aspect-video bg-white rounded-xl border border-gray-200 overflow-hidden group">
                           <img src={siteSettings.bannerUrl} className="w-full h-full object-cover" />
                           <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                              <Upload className="w-6 h-6 text-white" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSiteImageUpload('bannerUrl', e.target.files[0])} />
                           </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Нижнее фото (Footer Image)</label>
                        <div className="relative h-24 bg-white rounded-xl border border-gray-200 overflow-hidden group">
                           {siteSettings.footerImageUrl ? <img src={siteSettings.footerImageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-black uppercase tracking-widest">Нет фото</div>}
                           <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                              <Upload className="w-6 h-6 text-white" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSiteImageUpload('footerImageUrl', e.target.files[0])} />
                           </label>
                        </div>
                      </div>
                   </div>
               <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase">Слайды в Hero-секции</h3>
                    </div>
                    <button 
                      onClick={() => setHeroSlides([...heroSlides, { id: Date.now().toString(), imageUrl: '', title: { ru: '', uz: '' }, text: { ru: '', uz: '' } }])}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-purple-700"
                    >
                      + Добавить слайд
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                    {heroSlides.map((slide, idx) => (
                      <div key={slide.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-gray-400">Слайд #{idx + 1}</span>
                            <button onClick={() => setHeroSlides(heroSlides.filter(s => s.id !== slide.id))} className="text-red-500 hover:text-red-600">
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                               <div className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200">
                                  {slide.imageUrl ? <img src={slide.imageUrl} className="w-full h-full object-cover" /> : null}
                                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                     <Upload className="w-8 h-8 text-white mb-2" />
                                     <span className="text-[10px] font-black uppercase text-white tracking-widest">Изменить фото</span>
                                     <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                           const url = await uploadImgBB(file);
                                           setHeroSlides(heroSlides.map(s => s.id === slide.id ? { ...s, imageUrl: url } : s));
                                        }
                                     }} />
                                  </label>
                               </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                               <input placeholder="Заголовок RU" value={slide.title?.ru || ''} onChange={e => setHeroSlides(heroSlides.map(s => s.id === slide.id ? { ...s, title: { ...s.title, ru: e.target.value } } : s))} className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold" />
                               <input placeholder="Заголовок UZ" value={slide.title?.uz || ''} onChange={e => setHeroSlides(heroSlides.map(s => s.id === slide.id ? { ...s, title: { ...s.title, uz: e.target.value } } : s))} className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold" />
                               <input placeholder="Текст (RU)" value={slide.text?.ru || ''} onChange={e => setHeroSlides(heroSlides.map(s => s.id === slide.id ? { ...s, text: { ...s.text, ru: e.target.value } } : s))} className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold col-span-2" />
                               <input placeholder="Текст (UZ)" value={slide.text?.uz || ''} onChange={e => setHeroSlides(heroSlides.map(s => s.id === slide.id ? { ...s, text: { ...s.text, uz: e.target.value } } : s))} className="px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold col-span-2" />
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </section>

              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Пароли & Пользователи</h3>
                  </div>
                  
                  {!showPasswordsSection ? (
                    <div className="space-y-4">
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Для доступа к этому разделу введите мастер-пароль</p>
                       <div className="flex gap-2">
                          <input 
                            type="password" 
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && passwordInput === '1267144' && setShowPasswordsSection(true)}
                            className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold"
                            placeholder="Пароль..."
                          />
                          <button 
                            onClick={() => {
                              if (passwordInput === '1267144') setShowPasswordsSection(true);
                              else alert('Неверный пароль');
                            }}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
                          >
                            Войти
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-4">
                          <p className="text-[10px] font-black uppercase text-blue-600 mb-2">Все зарегистрированные пользователи ({allUsers.length})</p>
                          <div className="divide-y divide-blue-100 max-h-96 overflow-y-auto">
                             {allUsers.map(u => (
                                <div key={u.id} className="py-3 flex justify-between items-center text-xs">
                                   <div>
                                      <p className="font-bold text-blue-900">{u.displayName || 'Без имени'}</p>
                                      <p className="text-[10px] text-blue-500">{u.email}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="font-mono text-blue-800 bg-blue-100/50 px-2 py-1 rounded text-[10px]">UID: {u.uid?.substring(0, 8)}...</p>
                                      <p className="text-[9px] text-gray-400 mt-1">{u.role}</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                       <button onClick={() => setShowPasswordsSection(false)} className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-primary transition-colors">Скрыть раздел</button>
                    </div>
                  )}
              </section>

              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Контакты и Режим работы</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Телефон</label>
                             <input type="text" value={contactsForm.phone} onChange={e => setContactsForm({...contactsForm, phone: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Email</label>
                             <input type="text" value={contactsForm.email} onChange={e => setContactsForm({...contactsForm, email: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Время работы (RU)</label>
                             <input type="text" value={contactsForm?.workingHours?.ru || ''} onChange={e => setContactsForm({...contactsForm, workingHours: {...contactsForm.workingHours, ru: e.target.value}})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Время работы (UZ)</label>
                             <input type="text" value={contactsForm?.workingHours?.uz || ''} onChange={e => setContactsForm({...contactsForm, workingHours: {...contactsForm.workingHours, uz: e.target.value}})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 mb-2">
                          <span className="text-[10px] font-black uppercase text-gray-400">Социальные сети</span>
                          <button onClick={handleAddSocialLink} className="text-primary font-black text-[10px] uppercase hover:underline anim-tap">+ Добавить</button>
                       </div>
                       <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {socialLinks.map(link => (
                             <div key={link.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden border border-gray-100 shrink-0">
                                   {link.iconUrl ? <img src={link.iconUrl} className="w-full h-full object-cover" /> : <Share2 className="w-5 h-5 text-gray-300" />}
                                   <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                      <Upload className="w-4 h-4 text-white" />
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSocialIconUpload(link.id, e.target.files[0])} />
                                   </label>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                   <input value={link.name} onChange={e => handleUpdateSocialLink(link.id, 'name', e.target.value)} placeholder="Название" className="text-[10px] font-black uppercase bg-gray-50 rounded-lg px-2 py-1 focus:bg-white transition-all" />
                                   <input value={link.url} onChange={e => handleUpdateSocialLink(link.id, 'url', e.target.value)} placeholder="Ссылка" className="text-[10px] font-bold bg-gray-50 rounded-lg px-2 py-1 focus:bg-white transition-all" />
                                </div>
                                <button onClick={() => handleDeleteSocialLink(link.id)} className="p-1 text-gray-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </section>

              {/* Payment Methods Section */}
              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase">Способы оплаты</h3>
                    </div>
                    <button 
                      onClick={() => setPaymentMethodsList([...paymentMethodsList, { id: `pm-${Date.now()}`, name: 'Новый метод', image: '', description: { ru: '', uz: '' }, btnColor: '#2563eb', btnText: { ru: 'Я оплатил', uz: "Men to'ladim" } }])}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                    >
                      + Добавить метод
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                    {paymentMethodsList.map((pm, idx) => (
                       <div key={pm.id || idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4 flex-1">
                                <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-xl relative group overflow-hidden shrink-0 flex items-center justify-center">
                                   {pm.image ? <img src={pm.image || undefined} className="w-full h-full object-contain" /> : <CreditCard className="w-6 h-6 text-gray-200" />}
                                   <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                      <Upload className="w-4 h-4 text-white" />
                                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                         if (e.target.files?.[0]) {
                                            const url = await uploadImgBB(e.target.files[0]);
                                            setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, image: url } : p));
                                         }
                                      }} />
                                   </label>
                                </div>
                                <div className="flex-1 space-y-2">
                                   <input value={pm.name} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} placeholder="Название платежной системы" className="w-full text-sm font-black text-gray-900 bg-gray-50 px-4 py-3 rounded-xl focus:bg-white transition-all border border-transparent focus:border-gray-200" />
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                         <input type="color" value={pm.btnColor} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnColor: e.target.value } : p))} className="w-6 h-6 rounded-lg cursor-pointer border-2 border-white shadow-sm" />
                                         <span className="text-[10px] font-black uppercase text-gray-400">Цвет кнопки</span>
                                      </div>
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                         <input type="checkbox" checked={pm.requireScreenshot} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, requireScreenshot: e.target.checked } : p))} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                                         <span className="text-[10px] font-black uppercase text-gray-400 group-hover:text-gray-600 transition-colors">Нужен скриншот?</span>
                                      </label>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => setPaymentMethodsList(paymentMethodsList.filter((_, i) => i !== idx))} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Инструкция (RU)</label>
                                <textarea 
                                  value={pm.description?.ru || ''} 
                                  onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, description: { ...p.description || {}, ru: e.target.value } } : p))}
                                  className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white h-32 transition-all"
                                  placeholder="Реквизиты и подробные инструкции..."
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Инструкция (UZ)</label>
                                <textarea 
                                  value={pm.description?.uz || ''} 
                                  onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, description: { ...p.description || {}, uz: e.target.value } } : p))}
                                  className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white h-32 transition-all"
                                  placeholder="Rekvizitlar va to'lov yo'riqnomasi..."
                                />
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Текст кнопки (RU)</label>
                               <input value={pm.btnText?.ru || ''} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnText: { ...p.btnText || {}, ru: e.target.value } } : p))} placeholder="Я оплатил" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Текст кнопки (UZ)</label>
                               <input value={pm.btnText?.uz || ''} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnText: { ...p.btnText || {}, uz: e.target.value } } : p))} placeholder="Men to'ladim" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" />
                            </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </section>

              {/* About Us Section */}
              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-rose-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">О нас</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Текст (RU)</label>
                    <textarea value={aboutUs.ru} onChange={e => setAboutUs({...aboutUs, ru: e.target.value})} className="w-full p-4 bg-white rounded-2xl border border-gray-100 h-40 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Текст (UZ)</label>
                    <textarea value={aboutUs.uz} onChange={e => setAboutUs({...aboutUs, uz: e.target.value})} className="w-full p-4 bg-white rounded-2xl border border-gray-100 h-40 text-sm font-bold" />
                  </div>
                </div>
              </section>

              {/* Ad Block Section */}
              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                         <Share2 className="w-6 h-6" />
                       </div>
                       <h3 className="text-xl font-black text-gray-900 uppercase">Рекламный блок</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" checked={showAdBlock} onChange={e => setShowAdBlock(e.target.checked)} className="sr-only peer" />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                 </div>
                 
                 {showAdBlock && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase text-gray-400 ml-2">Главная картинка блока</label>
                          <div className="relative aspect-video rounded-2xl bg-white border border-gray-100 overflow-hidden group">
                             {adBlockImage ? <img src={adBlockImage} className="w-full h-full object-cover" /> : null}
                             <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                <Upload className="w-8 h-8 text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSiteImageUpload('adBlockImage', e.target.files[0])} />
                             </label>
                          </div>
                       </div>
                       <div className="space-y-4 pt-4">
                          <input value={adBlockTitle || ''} onChange={e => setAdBlockTitle(e.target.value)} placeholder="Заголовок блока" className="w-full px-4 py-3 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                          <input value={adBlockLink || ''} onChange={e => setAdBlockLink(e.target.value)} placeholder="Ссылка (например, в телеграм)" className="w-full px-4 py-3 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                       </div>
                    </div>
                 )}
              </section>

              {/* Passwords (Secure User List) Section */}
              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 uppercase">Пароли & Пользователи</h3>
                  </div>
                  
                  {!showPasswordsSection ? (
                    <div className="space-y-4">
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Для доступа к этому разделу введите мастер-пароль</p>
                       <div className="flex gap-2">
                          <input 
                            type="password" 
                            value={passwordInput}
                            onChange={e => setPasswordInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && passwordInput === '1267144' && setShowPasswordsSection(true)}
                            className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold"
                            placeholder="Код (1267144)..."
                          />
                          <button 
                            onClick={() => {
                              if (passwordInput === '1267144') setShowPasswordsSection(true);
                              else alert('Неверный код');
                            }}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
                          >
                            Войти
                          </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Все пользователи ({allUsers.length})</p>
                            <button onClick={() => setShowPasswordsSection(false)} className="text-[10px] font-black uppercase text-red-500 hover:underline">Закрыть</button>
                          </div>
                          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                             {allUsers.map(u => (
                                <div key={u.id} className="py-4 flex justify-between items-center group">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 overflow-hidden">
                                         {u.photoURL ? <img src={u.photoURL || undefined} className="w-full h-full object-cover" /> : <div className="text-gray-300 font-black">{u.displayName?.[0] || u.email?.[0]?.toUpperCase()}</div>}
                                      </div>
                                      <div>
                                         <p className="text-xs font-black text-gray-900">{u.displayName || 'Без имени'}</p>
                                         <p className="text-[10px] text-gray-400 font-medium">{u.email}</p>
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-1 ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-gray-400'}`}>{u.role}</p>
                                      <p className="text-[8px] font-mono text-gray-300">UID: {u.uid?.substring(0, 12)}...</p>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
              </section>

              <section className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <FileText className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-black text-gray-900 uppercase">Описание в футере</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                     <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Текст (RU)</label>
                        <textarea 
                           className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs h-24"
                           value={siteDescription.ru}
                           onChange={e => setSiteDescription({...siteDescription, ru: e.target.value})}
                           placeholder="Например: Производство пандусов..."
                        />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2">Текст (UZ)</label>
                        <textarea 
                           className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs h-24"
                           value={siteDescription.uz}
                           onChange={e => setSiteDescription({...siteDescription, uz: e.target.value})}
                           placeholder="Masalan: Panduslar ishlab chiqarish..."
                        />
                     </div>
                  </div>
              </section>

              <div className="pt-8 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleSaveCustomization}
                  disabled={customizationSaving}
                  className="px-12 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center gap-3"
                >
                  {customizationSaving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full" /> : <Save className="w-5 h-5" />}
                  {customizationSaving ? 'Сохранение...' : 'Сохранить все настройки'}
                </button>
              </div>
        </div>
      )}

      {activeTab === 'promocodes' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase">Промокоды</h3>
           </div>
           
           <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
              <h4 className="text-sm font-black text-gray-400 uppercase mb-4">Создать промокод</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <input type="text" value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} placeholder="КОД20" className="px-4 py-3 bg-white rounded-xl font-black text-sm uppercase shadow-sm border border-gray-100" />
                 <input type="number" value={newPromoDiscount} onChange={e => setNewPromoDiscount(e.target.value)} placeholder="Скидка %" className="px-4 py-3 bg-white rounded-xl font-black text-sm shadow-sm border border-gray-100" />
                 <input type="number" value={newPromoLimit} onChange={e => setNewPromoLimit(e.target.value)} placeholder="Лимит использований" className="px-4 py-3 bg-white rounded-xl font-black text-sm shadow-sm border border-gray-100" />
                 <button onClick={handleAddPromoCode} className="py-3 bg-pink-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-pink-700 transition-all">Добавить</button>
              </div>
           </div>

           <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Код</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Скидка</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Лимит</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Действие</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {promocodesList.map(promo => (
                       <tr key={promo.id}>
                          <td className="px-6 py-4 font-black text-gray-900">{promo.code}</td>
                          <td className="px-6 py-4 font-black text-pink-600">-{promo.discount}%</td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-900">{promo.usedCount || 0} / {promo.limit}</span>
                                <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
                                   <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min(((promo.usedCount || 0) / (promo.limit || 1)) * 100, 100)}%` }} />
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => handleDeletePromoCode(promo.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </section>
      )}

      {activeTab === 'admins' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase">Управление командой</h3>
           </div>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <h4 className="text-sm font-black text-gray-400 uppercase mb-4">Назначить администратора</h4>
                 <form onSubmit={handleAddAdmin} className="space-y-4">
                    <input 
                      type="email" 
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="Email пользователя..."
                      className="w-full px-4 py-3 bg-white rounded-xl font-bold text-sm border-2 border-transparent shadow-sm focus:border-primary transition-all"
                    />
                    {adminMessage.text && (
                      <div className={`p-3 rounded-xl text-xs font-bold ${adminMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                         {adminMessage.text}
                      </div>
                    )}
                    <button type="submit" className="w-full py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:shadow-xl transition-all">Назначить</button>
                 </form>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <h4 className="text-sm font-black text-gray-400 uppercase mb-4">Список админов</h4>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {admins.map(admin => (
                       <div key={admin.uid} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-primary font-bold shadow-sm overflow-hidden">
                              {admin.photoURL ? <img src={admin.photoURL} className="w-full h-full object-cover" /> : admin.email?.[0].toUpperCase()}
                            </div>
                            <div>
                               <p className="text-xs font-black text-gray-900">{admin.displayName || 'Пользователь'}</p>
                               <p className="text-[10px] text-gray-400">{admin.email}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDeleteAdmin(admin.uid)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="text-2xl font-black text-gray-900 uppercase">Категории</h3>
                <p className="text-[10px] font-black uppercase text-gray-400 mt-1">Управление разделами меню</p>
             </div>
             <button onClick={handleAddCategory} className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl transition-all">
               + Добавить
             </button>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {categories.sort((a, b) => (a.order || 0) - (b.order || 0)).map(cat => (
                <div key={cat.id} className="group bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-white hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                       <img src={cat.image || undefined} className="w-full h-full object-cover" />
                       <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <Upload className="w-4 h-4 text-white" />
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleEntityImageUpload('categories', cat.id, e.target.files[0])} />
                       </label>
                    </div>
                    <div>
                       <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{cat.name?.ru || cat.name?.uz}</h4>
                       <p className="text-[10px] font-black uppercase text-gray-400">{cat.name?.uz}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col gap-1">
                        <button onClick={() => handleMoveCategory(cat.id, 'up')} className="p-1 text-gray-300 hover:text-primary transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => handleMoveCategory(cat.id, 'down')} className="p-1 text-gray-300 hover:text-primary transition-colors"><ChevronDown className="w-4 h-4" /></button>
                     </div>
                     <button onClick={() => setEditingCategory(cat)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                     <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Поиск по товарам..." 
                  value={productSearchQuery}
                  onChange={e => setProductSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:border-primary transition-all font-bold text-sm"
                />
              </div>
              {selectedProductIds.length > 0 && (
                <button 
                  onClick={handleBulkDeleteProducts}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Удалить ({selectedProductIds.length})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('ai-import')}
                className="px-4 py-3 bg-purple-50 text-purple-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Globe className="w-4 h-4" /> AI Импорт
              </button>
              <button 
                onClick={() => setEditingProduct({ name: { ru: '', uz: '' }, description: { ru: '', uz: '' }, price: 0, image: '', categoryId: categories[0]?.id || '', code: '' })} 
                className="px-4 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> {language === 'ru' ? 'Новый товар' : 'Yangi mahsulot'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {categories.sort((a,b) => (a.order || 0) - (b.order || 0)).map(cat => {
              const isExpanded = expandedCategories.includes(cat.id);
              const catProducts = products.filter(p => 
                p.categoryId === cat.id && 
                (!productSearchQuery || 
                  (p.name?.ru || '').toLowerCase().includes(productSearchQuery.toLowerCase()) || 
                  (p.name?.uz || '').toLowerCase().includes(productSearchQuery.toLowerCase()))
              );
              
              if (productSearchQuery && catProducts.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div 
                    onClick={() => setExpandedCategories(prev => prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <img src={cat.image} className="w-10 h-10 rounded-lg object-cover" />
                      <h4 className="font-black text-gray-900 uppercase tracking-tight">{cat.name?.ru || cat.name?.uz}</h4>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-black text-gray-400">{catProducts.length}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => { e.stopPropagation(); handleAddProduct(cat.id); }} className="text-primary font-black text-[10px] uppercase hover:underline">+ Добавить</button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-300" /> : <ChevronDown className="w-5 h-5 text-gray-300" />}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="border-b border-gray-50">
                            <tr>
                              <th className="p-2"><input type="checkbox" onChange={(e) => {
                                const ids = catProducts.map(p => p.id);
                                if (e.target.checked) {
                                  setSelectedProductIds(prev => Array.from(new Set([...prev, ...ids])));
                                } else {
                                  setSelectedProductIds(prev => prev.filter(id => !ids.includes(id)));
                                }
                              }} checked={catProducts.length > 0 && catProducts.every(p => selectedProductIds.includes(p.id))} /></th>
                              <th className="p-2 text-[10px] font-black uppercase text-gray-400">Товар</th>
                              <th className="p-2 text-[10px] font-black uppercase text-gray-400">Цена</th>
                              <th className="p-2 text-right text-[10px] font-black uppercase text-gray-400">Действие</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {catProducts.sort((a,b) => (a.order || 0) - (b.order || 0)).map(prod => (
                              <tr key={prod.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedProductIds.includes(prod.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedProductIds([...selectedProductIds, prod.id]);
                                      else setSelectedProductIds(selectedProductIds.filter(id => id !== prod.id));
                                    }}
                                  />
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-3">
                                    <img src={prod.image} className="w-8 h-8 rounded object-cover" />
                                    <div>
                                      <p className="text-xs font-black text-gray-900 line-clamp-1">{prod.name?.ru || prod.name?.uz}</p>
                                      <p className="text-[9px] text-gray-400 uppercase tracking-widest">{prod.name?.uz}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 text-xs font-black text-gray-900">
                                  {prod.price?.toLocaleString()} UZS
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => setEditingProduct(prod)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ai-import' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">AI Импорт товаров</h3>
            <p className="text-gray-500 mb-8 font-medium">Загрузите PDF или изображение с перечнем товаров, и нейросеть автоматически распознает названия, цены и описания.</p>
            
            <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Назначение</label>
                  <select 
                    value={aiCategoryId}
                    onChange={(e) => setAiCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-primary"
                  >
                    <option value="auto" className="font-black text-purple-600">✨ Авто-распределение (по категориям)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Файл (PDF, PNG, JPG)</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      console.log("File selected:", file?.name, file?.type);
                      setAiFile(file);
                    }}
                    className="w-full px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm font-bold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-black file:bg-primary file:text-white hover:file:bg-blue-700"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  if (!aiFile || !aiCategoryId) return alert('Выберите категорию и файл!');
                  setAiIsProcessing(true);
                  try {
                    const base64 = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.readAsDataURL(aiFile);
                      reader.onload = () => resolve((reader.result as string).split(',')[1]);
                      reader.onerror = reject;
                    });

                    const apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                      throw new Error('Голосовой помошник (Gemini API) не настроен. Пожалуйста, добавьте GEMINI_API_KEY в настройках проекта.');
                    }
                    const ai = new GoogleGenAI({ apiKey });

                    const response = await ai.models.generateContent({
                      model: "gemini-3-flash-preview",
                      contents: [
                        { inlineData: { data: base64, mimeType: aiFile.type } },
                        { text: "Analyze this image/PDF. Extract each medical drug/product. Return ONLY a JSON array. Each object MUST have 'name' (string), 'price' (number), and 'description' (string). No talk, no markdown. Just the array. Example: [{\"name\": \"Paracetamol\", \"price\": 5000, \"description\": \"For fever\"}]" }
                      ]
                    });

                    const text = response.text || "";
                    // More robust JSON extraction: find the first '[' and last ']'
                    const firstBracket = text.indexOf('[');
                    const lastBracket = text.lastIndexOf(']');
                    
                    if (firstBracket === -1 || lastBracket === -1) {
                      throw new Error('AI не смог распознать список товаров в ответе. Попробуйте другое фото.');
                    }

                    const cleaned = text.substring(firstBracket, lastBracket + 1).trim();
                    const results = JSON.parse(cleaned);
                    setAiResults(results);
                  } catch (err: any) {
                    console.error("AI Error:", err);
                    alert('Ошибка AI: ' + err.message);
                  } finally {
                    setAiIsProcessing(false);
                  }
                }}
                disabled={aiIsProcessing || !aiFile}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {aiIsProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full" /> : <FileText className="w-6 h-6" />}
                {aiIsProcessing ? 'Обработка нейросетью...' : 'Распознать товары'}
              </button>
            </div>

            {aiResults.length > 0 && (
              <div className="mt-12 space-y-4">
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                  <span className="font-bold text-blue-900">Распознано товаров: {aiResults.length}</span>
                  <button 
                    onClick={() => {
                      showConfirm(
                        "Импорт товаров",
                        `Вы действительно хотите добавить эти товары (${aiResults.length} шт.) на сайт?`,
                        async () => {
                          setAiIsProcessing(true);
                          try {
                            let addedCount = 0;
                            for (const res of aiResults) {
                               let finalCategoryId = aiCategoryId;
                               
                               if (aiCategoryId === 'auto') {
                                  const match = categories.find(c => 
                                     (res.name.toLowerCase().includes((c.name?.ru || '').toLowerCase())) || 
                                     (res.name.toLowerCase().includes((c.name?.uz || '').toLowerCase()))
                                  );
                                  finalCategoryId = match ? match.id : (categories[0]?.id || '');
                               }

                               if (!finalCategoryId) continue;

                               const newRef = doc(collection(db, 'products'));
                               await setDoc(newRef, {
                                  name: { ru: res.name, uz: res.name },
                                  description: { ru: res.description, uz: res.description },
                                  price: Number(res.price) || 0,
                                  categoryId: finalCategoryId,
                                  image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
                                  tags: [],
                                  order: products.filter(p => p.categoryId === finalCategoryId).length + addedCount
                               });
                               addedCount++;
                            }
                            alert(`Успешно добавлено ${addedCount} товаров!`);
                            setAiResults([]);
                          } catch (err: any) {
                            console.error("AI Save Error:", err);
                            alert('Ошибка сохранения: ' + err.message);
                          } finally {
                            setAiIsProcessing(false);
                          }
                        }
                      );
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-green-700 transition-all"
                  >
                    Добавить все на сайт
                  </button>
                </div>
                {aiResults.map((res, i) => (
                  <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex-1">
                      <h4 className="font-black text-gray-900">{res.name}</h4>
                      <p className="text-primary font-bold">{res.price.toLocaleString()} UZS</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{res.description}</p>
                    </div>
                    <button onClick={() => setAiResults(aiResults.filter((_, idx) => idx !== i))} className="p-2 text-gray-300 hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Управление заказами</h3>
            <div className="flex gap-2">
               <div className="flex bg-gray-100 rounded-xl p-1 items-center px-3">
                  <Search className="w-4 h-4 text-gray-400 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Поиск по коду..." 
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-black uppercase tracking-widest w-40 placeholder:text-gray-300"
                  />
               </div>
            </div>
          </div>
          <div className="space-y-4">
            {orders.filter(o => !orderSearchQuery || o.code.toLowerCase().includes(orderSearchQuery.toLowerCase())).map(order => {
              const isExpanded = expandedOrders.includes(order.id);
              const toggleExpand = () => setExpandedOrders(prev => prev.includes(order.id) ? prev.filter(id => id !== order.id) : [...prev, order.id]);

              return (
              <div key={order.id} className="border border-gray-200 rounded-2xl overflow-hidden hover:border-primary/30 transition-all shadow-sm bg-white">
                <div 
                  onClick={toggleExpand}
                  className="px-6 py-4 flex flex-col md:flex-row justify-between gap-4 items-center cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0">
                       <CheckCircle className={`w-5 h-5 ${
                         order.status === 'need_to_pay' ? 'text-gray-400' :
                         order.status === 'pending' ? 'text-yellow-500' :
                         order.status === 'confirmed' ? 'text-blue-500' :
                         'text-green-500'
                       }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black tracking-tighter text-gray-900 uppercase">{order.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          order.status === 'need_to_pay' ? 'bg-gray-200 text-gray-600' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-gray-900 uppercase tracking-widest">{order.userName}</p>
                      <p className="text-[10px] text-gray-400">{order.userPhone}</p>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-lg font-black text-primary tracking-tight">{order.total?.toLocaleString()} UZS</p>
                    </div>
                    <div className="flex items-center justify-center p-2 rounded-lg bg-gray-50 text-gray-400 group-hover:text-primary transition-colors">
                       {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white"
                    >
                      <div className="p-6 pt-0 border-t border-gray-50 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                         <div className="space-y-6">
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                 <ShoppingCart className="w-3.5 h-3.5" /> Состав заказа
                              </h4>
                              <div className="space-y-3">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm relative group">
                                     <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                                     <div className="flex-1 min-w-0">
                                       <p className="font-black text-xs text-gray-900 truncate">
                                         {typeof item.name === 'object' ? (item.name[language] || item.name['ru'] || 'Товар') : (item.name || 'Товар')}
                                       </p>
                                     </div>
                                     <div className="text-right">
                                       <p className="text-[10px] font-black text-gray-400">{item.quantity} шт.</p>
                                       <p className="text-xs font-black text-gray-900">{(item.price * item.quantity).toLocaleString()} UZS</p>
                                     </div>
                                  </div>
                                ))}
                                
                                {order.promocode && (
                                  <div className="p-2 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center px-4">
                                    <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Промокод</span>
                                    <span className="text-xs font-black text-green-700 font-mono tracking-tighter">{order.promocode}</span>
                                  </div>
                                )}
                                
                                <div className="pt-2 flex justify-between text-[10px] font-black text-gray-400 divide-x divide-gray-100 bg-gray-50 rounded-xl p-3">
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-widest mb-1 text-[8px]">Подытог</p>
                                     <p className="text-gray-700">{order.subtotal?.toLocaleString()} UZS</p>
                                  </div>
                                  {order.discount > 0 && (
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-widest mb-1 text-[8px] text-green-600">Скидка</p>
                                     <p className="text-green-700">-{order.discount}%</p>
                                  </div>
                                  )}
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-widest mb-1 text-[8px] text-primary">Итого</p>
                                     <p className="text-primary text-xs">{order.total?.toLocaleString()} UZS</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                               <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                                 <User className="w-3.5 h-3.5" /> Данные клиента
                               </h4>
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <p className="text-[8px] font-black uppercase text-gray-400">Имя</p>
                                     <p className="font-bold text-sm text-blue-900">{order.userName}</p>
                                  </div>
                                  <div>
                                     <p className="text-[8px] font-black uppercase text-gray-400">Телефон</p>
                                     <p className="text-sm font-bold text-blue-700">{order.userPhone}</p>
                                  </div>
                                  <div className="col-span-2">
                                     <p className="text-[8px] font-black uppercase text-gray-400">Telegram/Insta</p>
                                     <p className="text-sm font-bold text-blue-700">{order.userContact}</p>
                                  </div>
                               </div>
                            </div>

                            {order.paymentScreenshot && (
                              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Чек об оплате</h4>
                                 <a href={order.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="block relative aspect-video rounded-xl overflow-hidden border border-gray-200 group">
                                    <img src={order.paymentScreenshot} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">Открыть фото</span>
                                    </div>
                                 </a>
                                 <p className="text-[9px] text-gray-400 mt-2 font-bold uppercase tracking-wider text-center">{order.paymentMethod || 'Не указан'}</p>
                              </div>
                            )}
                         </div>

                         <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                                <Edit className="w-3.5 h-3.5" /> Управление
                              </h4>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Статус заказа</label>
                                  <select 
                                    value={order.status}
                                    onChange={async (e) => await updateDoc(doc(db, 'orders', order.id), { status: e.target.value })}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 font-bold bg-gray-50 focus:bg-white text-sm"
                                  >
                                     <option value="need_to_pay">Нужна оплата</option>
                                     <option value="pending">На подтверждении</option>
                                     <option value="confirmed">В процессе</option>
                                     <option value="ready">Готов к выдаче</option>
                                     <option value="completed">Завершен</option>
                                     <option value="cancelled">Отменен</option>
                                  </select>
                                </div>
                                
                                {order.status === 'confirmed' && (
                                   <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                     <div>
                                       <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Время</label>
                                       <input 
                                         type="text"
                                         placeholder="6"
                                         value={order.readinessTime?.toString().split(' ')[0] || ''}
                                         className="w-full p-2 rounded-lg border border-gray-200 font-bold bg-white text-sm"
                                         onChange={async (e) => {
                                            const val = e.target.value;
                                            const unit = order.readinessTime?.toString().split(' ')[1] || 'мин';
                                            await updateDoc(doc(db, 'orders', order.id), { readinessTime: `${val} ${unit}`.trim() });
                                         }}
                                       />
                                     </div>
                                     <div>
                                       <label className="block text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Ед. изм.</label>
                                       <select 
                                         value={order.readinessTime?.toString().split(' ')[1] || 'мин'}
                                         onChange={async (e) => {
                                            const val = order.readinessTime?.toString().split(' ')[0] || '';
                                            const unit = e.target.value;
                                            await updateDoc(doc(db, 'orders', order.id), { readinessTime: `${val} ${unit}`.trim() });
                                         }}
                                         className="w-full p-2.5 rounded-lg border border-gray-200 font-bold bg-gray-50 focus:bg-white text-sm"
                                       >
                                         <option value="мин">мин</option>
                                         <option value="час">час</option>
                                         <option value="дн">дн</option>
                                       </select>
                                     </div>
                                   </div>
                                 )}
                                 
                                 <div className="pt-2">
                                   <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1">Комментарий админа</label>
                                   <textarea 
                                     value={order.siteComment || ''}
                                     onChange={async (e) => await updateDoc(doc(db, 'orders', order.id), { siteComment: e.target.value })}
                                     className="w-full p-3 rounded-lg border border-gray-200 font-bold bg-gray-50 focus:bg-white text-xs h-20"
                                     placeholder="Виден клиенту..."
                                   />
                                 </div>
                               </div>
                            </div>
                          </div>
                        </div>
                        </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
                );
              })}
           </div>
         </div>
       )}

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && confirmData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8">
                 <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Trash2 className="w-8 h-8 text-red-600" />
                 </div>
                 <h3 className="text-2xl font-black text-gray-900 text-center mb-2 uppercase tracking-tight">{confirmData.title}</h3>
                 <p className="text-gray-500 text-center font-bold mb-8">{confirmData.message}</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setIsConfirmOpen(false)}
                      className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={() => {
                        confirmData.onConfirm();
                        setIsConfirmOpen(false);
                      }}
                      className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-200 hover:bg-red-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Да, удалить
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h3 className="text-xl font-bold mb-4">Редактировать категорию</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <img src={editingCategory.image} className="w-16 h-16 rounded-lg object-cover" alt="" />
                <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer text-sm font-bold">
                  Загрузить иконку
                  <input type="file" className="hidden" accept="image/*" onChange={(e)=>{
                    if(e.target.files?.[0]) {
                      handleEntityImageUpload('categories', editingCategory.id, e.target.files[0]).then(() => {
                        setEditingCategory({...editingCategory, image: editingCategory.image}); // refresh will happen via onSnapshot anyway roughly
                      });
                    }
                  }} />
                </label>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Название (RU)</label>
                <input type="text" value={editingCategory.name?.ru || ''} onChange={(e)=> {
                  handleUpdateCategory(editingCategory.id, 'name', e.target.value, 'ru');
                  setEditingCategory({...editingCategory, name: {...editingCategory.name, ru: e.target.value}});
                }} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Название (UZ)</label>
                <input type="text" value={editingCategory.name?.uz || ''} onChange={(e)=> {
                  handleUpdateCategory(editingCategory.id, 'name', e.target.value, 'uz');
                  setEditingCategory({...editingCategory, name: {...editingCategory.name, uz: e.target.value}});
                }} className="w-full px-3 py-2 border rounded" />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setEditingCategory(null)} className="px-6 py-2 bg-gray-200 rounded font-bold hover:bg-gray-300">Сохранить и Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Редактировать товар</h3>
            
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <img src={editingProduct.image} className="w-16 h-16 rounded-lg object-cover" alt="" />
                <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded cursor-pointer text-sm font-bold">
                  Загрузить фото
                  <input type="file" className="hidden" accept="image/*" onChange={(e)=>{
                    if(e.target.files?.[0]) {
                      handleEntityImageUpload('products', editingProduct.id, e.target.files[0]);
                    }
                  }} />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Категория</label>
                <select 
                  value={editingProduct.categoryId} 
                  onChange={(e) => {
                    handleUpdateProduct(editingProduct.id, 'categoryId', e.target.value);
                    setEditingProduct({...editingProduct, categoryId: e.target.value});
                  }}
                  className="w-full px-3 py-2 border rounded"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name?.ru || cat.name?.uz}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Название (RU)</label>
                  <input type="text" value={editingProduct.name?.ru || ''} onChange={(e)=> {
                    handleUpdateProduct(editingProduct.id, 'name', e.target.value, 'ru');
                    setEditingProduct({...editingProduct, name: {...editingProduct.name, ru: e.target.value}});
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Название (UZ)</label>
                  <input type="text" value={editingProduct.name?.uz || ''} onChange={(e)=> {
                    handleUpdateProduct(editingProduct.id, 'name', e.target.value, 'uz');
                    setEditingProduct({...editingProduct, name: {...editingProduct.name, uz: e.target.value}});
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Описание подробное (RU)</label>
                  <textarea value={editingProduct.description?.ru || ''} onChange={(e)=> {
                    handleUpdateProduct(editingProduct.id, 'description', e.target.value, 'ru', true);
                    setEditingProduct({...editingProduct, description: {...editingProduct.description, ru: e.target.value}});
                  }} className="w-full px-3 py-2 border rounded h-32" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Описание подробное (UZ)</label>
                  <textarea value={editingProduct.description?.uz || ''} onChange={(e)=> {
                    handleUpdateProduct(editingProduct.id, 'description', e.target.value, 'uz', true);
                    setEditingProduct({...editingProduct, description: {...editingProduct.description, uz: e.target.value}});
                  }} className="w-full px-3 py-2 border rounded h-32" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Теги (через запятую)</label>
                  <input type="text" value={(editingProduct.tags || []).join(', ')} onChange={(e)=> {
                    const tags = e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean);
                    handleUpdateProduct(editingProduct.id, 'tags', tags);
                    setEditingProduct({...editingProduct, tags});
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Цена (UZS)</label>
                  <input type="number" value={editingProduct.price || ''} onChange={(e)=> {
                    handleUpdateProduct(editingProduct.id, 'price', Number(e.target.value));
                    setEditingProduct({...editingProduct, price: Number(e.target.value)});
                  }} className="w-full px-3 py-2 border rounded" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setEditingProduct(null)} className="px-8 py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow flex items-center justify-center">Сохранить и Закрыть</button>
            </div>
          </div>
        </div>
      )}

  </div>
);
}
