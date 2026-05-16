import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { useStoreData, Category, Product } from '../hooks/useStoreData';
import { useLanguage } from '../context/LanguageContext';
import { useSiteSettings, HeroSlide, PaymentMethod } from '../context/SiteSettingsContext';
import { Upload, Plus, Trash2, Edit, Save, Search, FileText, CheckCircle, Clock, MapPin, PhoneCall, Link2, ShoppingCart, User, Users, Settings, CreditCard, ShieldCheck, Globe, X, ChevronUp, ChevronDown, Share2, Tag, Loader, MessageSquare, Star, Send, Newspaper, Bell } from 'lucide-react';
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
  const { categories, products, news, partners, branches, updates } = useStoreData();
  const siteSettings = useSiteSettings();
  
  const [activeTab, setActiveTab] = useState<'orders' | 'categories' | 'products' | 'ai-import' | 'settings' | 'promocodes' | 'admins' | 'consultations' | 'users' | 'news' | 'partners' | 'branches' | 'telegram' | 'updates'>('orders');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
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
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      orders.forEach(async (order) => {
        if (order.status === 'confirmed' && order.targetReadyAt) {
          const readyAt = new Date(order.targetReadyAt);
          if (now >= readyAt) {
            try {
              await updateDoc(doc(db, 'orders', order.id), { 
                status: 'ready',
                siteComment: 'Ваш заказ автоматически переведен в статус "Готов"! Можете забирать.' 
              });
            } catch (err) {
              console.error("Auto-ready error:", err);
            }
          }
        }
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [orders]);

  // AI Import state
  const [aiIsProcessing, setAiIsProcessing] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiCategoryId, setAiCategoryId] = useState('auto');
  const [aiTags, setAiTags] = useState('');
  const [aiResults, setAiResults] = useState<any[]>([]);
  
  // Bulk selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [consultationSearchQuery, setConsultationSearchQuery] = useState('');
  const [updateScheduledTime, setUpdateScheduledTime] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
  
  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showPasswordsSection, setShowPasswordsSection] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminMessage, setAdminMessage] = useState({ type: '', text: '' });

  // Telegram Settings
  const [tgToken, setTgToken] = useState('8708002341:AAHaRPYWhCR3Hgj6bUUDF-nmy5EMrMTf-LM');
  const [tgChatId, setTgChatId] = useState('-1002315682855');
  const [tgTestLoading, setTgTestLoading] = useState(false);
  const [tgSaveLoading, setTgSaveLoading] = useState(false);
  const [tgUpdates, setTgUpdates] = useState<any[]>([]);

  useEffect(() => {
    const loadTgSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'telegram'));
        if (snap.exists()) {
          const data = snap.data();
          setTgToken(data.token || '');
          setTgChatId(data.chatIds || '');
        }
      } catch (err) {
        console.error('Failed to load TG settings:', err);
      }
    };
    loadTgSettings();
  }, []);

  const saveTgSettings = async () => {
    setTgSaveLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'telegram'), {
        token: tgToken,
        chatIds: tgChatId,
        updatedAt: serverTimestamp()
      });
      alert('Telegram settings saved!');
    } catch (err) {
      alert('Failed to save settings: ' + err);
    } finally {
      setTgSaveLoading(false);
    }
  };

  const fetchTgUpdates = async () => {
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgToken}/getUpdates`);
      const data = await res.json();
      if (data.ok) {
        setTgUpdates(data.result);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendTgTest = async () => {
    setTgTestLoading(true);
    try {
      const res = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '🔔 Тестовое сообщение от Admin Panel! Если вы это видите, интеграция работает.',
          token: tgToken,
          chatIds: tgChatId 
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert('Test message sent successfully!');
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    } catch (err) {
      alert('Failed: ' + err);
    } finally {
      setTgTestLoading(false);
    }
  };

  // Store management state
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [activeOrderAction, setActiveOrderAction] = useState<{ id: string, type: 'confirm' | 'reject' } | null>(null);
  const [localReadinessValue, setLocalReadinessValue] = useState('');
  
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
  const [adBlockTitle, setAdBlockTitle] = useState(siteSettings.adBlockTitle || { ru: '', uz: '' });
  const [adBlockLink, setAdBlockLink] = useState(siteSettings.adBlockLink || '');
  const [showAdBlock, setShowAdBlock] = useState(siteSettings.showAdBlock || false);
  const [adBlockImage, setAdBlockImage] = useState(siteSettings.adBlockImage || '');
  const [siteDescription, setSiteDescription] = useState(siteSettings.siteDescription || { ru: '', uz: '' });
  const [aboutImage, setAboutImage] = useState(siteSettings.aboutImage || '');
  const [aboutStats, setAboutStats] = useState(siteSettings.aboutStats || { years: 10, clients: 500 });
  const [heroTitle, setHeroTitle] = useState(siteSettings.heroTitle || { ru: 'Мир одинаковый для всех', uz: 'Dunyo hamma uchun bir xil' });

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    const unsubAdmins = onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'admins-query');
    });

    const unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'users');
    });
    
    const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'orders');
    });
    
    const unsubPromocodes = onSnapshot(query(collection(db, 'promocodes')), (snap) => {
      setPromocodesList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'promocodes');
    });

    const unsubHelp = onSnapshot(query(collection(db, 'help_requests')), (snap) => {
      setHelpRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'help_requests');
    });

    return () => {
      unsubAdmins();
      unsubAllUsers();
      unsubOrders();
      unsubPromocodes();
      unsubHelp();
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
    setAdBlockTitle(siteSettings.adBlockTitle || { ru: '', uz: '' });
    setAdBlockLink(siteSettings.adBlockLink || '');
    setShowAdBlock(siteSettings.showAdBlock || false);
    setAdBlockImage(siteSettings.adBlockImage || '');
    setSiteDescription(siteSettings.siteDescription || { ru: '', uz: '' });
    setAboutImage(siteSettings.aboutImage || '');
    setAboutStats(siteSettings.aboutStats || { years: 10, clients: 500 });
    setHeroTitle(siteSettings.heroTitle || { ru: 'Мир одинаковый для всех', uz: 'Dunyo hamma uchun bir xil' });
  }, [siteSettings]);

  const handleDeleteOrder = async (orderId: string) => {
    showConfirm(
      language === 'ru' ? 'Удаление заказа' : 'Buyurtmani o\'chirish',
      language === 'ru' ? 'Вы уверены, что хотите безвозвратно удалить этот заказ?' : 'Haqiqatan ham ushbu buyurtmani butunlay o\'chirib tashlamoqchimisiz?',
      async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
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
      language === 'ru' ? 'Удаление категории' : 'Kategoriyani o\'chirish',
      language === 'ru' ? 'Удалить категорию? Все товары внутри этой категории также будут недоступны.' : 'Kategoriyani o\'chirishni xohlaysizmi? Ushbu kategoriya ichidagi barcha mahsulotlar ham mavjud bo\'lmaydi.',
      async () => {
        try {
          await deleteDoc(doc(db, 'categories', id));
        } catch (e: any) {
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
      language === 'ru' ? 'Удаление товара' : 'Mahsulotni o\'chirish',
      language === 'ru' ? 'Вы действительно хотите удалить этот товар?' : 'Haqiqatan ham ushbu mahsulotni o\'chirib tashlamoqchimisiz?',
      async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
        } catch (e: any) {
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

  const handleSiteImageUpload = async (field: 'logoUrl' | 'bannerUrl' | 'footerImageUrl' | 'ad.imageUrl' | 'adBlockImage' | 'aboutImage', file: File) => {
    setCustomizationSaving(true);
    try {
      const imageUrl = await uploadImgBB(file);
      if (field === 'ad.imageUrl') {
        setAdForm(prev => ({ ...prev, imageUrl }));
      } else if (field === 'adBlockImage') {
        setAdBlockImage(imageUrl);
      } else if (field === 'aboutImage') {
        setAboutImage(imageUrl);
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
        siteDescription,
        aboutImage,
        aboutStats,
        heroTitle
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

  const handleToggleBan = async (uid: string, isCurrentlyBanned: boolean) => {
    showConfirm(
      language === 'ru' ? 'Изменение статуса пользователя' : 'Foydalanuvchi holatini o\'zgartirish',
      isCurrentlyBanned ? (language === 'ru' ? 'Вы хотите разбанить этого пользователя?' : 'Siz bu foydalanuvchini blokdan chiqarmoqchimisiz?') : (language === 'ru' ? 'Вы хотите забанить этого пользователя?' : 'Siz bu foydalanuvchini bloklamoqchimisiz?'),
      async () => {
         try {
           await updateDoc(doc(db, 'users', uid), { isBanned: !isCurrentlyBanned });
         } catch(err:any) {
           alert("Ошибка: " + err.message);
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
           <h2 className="text-4xl font-black text-blue-950 uppercase tracking-tight">Админ-панель</h2>
           <div className="w-24 h-2 bg-red-600 mt-2 rounded-full"></div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          {user.photoURL && user.photoURL !== "" ? (
            <img src={user.photoURL || undefined} alt="" className="w-10 h-10 rounded-xl" />
          ) : (
            <div className="w-10 h-10 bg-blue-100 text-primary rounded-xl flex items-center justify-center font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-black text-blue-950">{user.displayName || user.email}</p>
            <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Администратор</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 ml-4">ОСНОВНЫЕ</p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start bg-gray-100/50 p-2 rounded-[1.5rem] border border-gray-100">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'orders' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Заказы' : 'Buyurtmalar'}
            </button>
            <button 
              onClick={() => setActiveTab('consultations')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'consultations' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Заявки' : 'Arizalar'}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'settings' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Настройки' : 'Sozlamalar'}
            </button>
            <button 
              onClick={() => setActiveTab('categories')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'categories' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Категории' : 'Kategoriyalar'}
            </button>
            <button 
              onClick={() => setActiveTab('news')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'news' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Новости' : 'Yangiliklar'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 ml-4">МАГАЗИН</p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start bg-gray-100/50 p-2 rounded-[1.5rem] border border-gray-100 mb-4">
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'products' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
            </button>
            <button 
              onClick={() => setActiveTab('promocodes')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'promocodes' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Промокоды' : 'Promokodlar'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 ml-4">ИНТЕГРАЦИИ</p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start bg-gray-100/50 p-2 rounded-[1.5rem] border border-gray-100 mb-4">
            <button 
              onClick={() => setActiveTab('telegram')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'telegram' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Telegram' : 'Telegram'}
            </button>
            <button 
              onClick={() => setActiveTab('partners')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'partners' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Партнеры' : 'Hamkorlar'}
            </button>
            <button 
              onClick={() => setActiveTab('branches')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'branches' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Филиалы' : 'Filiallar'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-2 ml-4">СИСТЕМА</p>
          <div className="flex flex-wrap gap-2 justify-center lg:justify-start bg-gray-100/50 p-2 rounded-[1.5rem] border border-gray-100 mb-4">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'users' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Пользователи' : 'Foydalanuvchilar'}
            </button>
            <button 
              onClick={() => setActiveTab('updates')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'updates' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'Обновления' : 'Yangilanishlar'}
            </button>
            <button 
              onClick={() => setActiveTab('ai-import')}
              className={`flex-1 sm:flex-none justify-center px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'ai-import' ? 'bg-white text-primary shadow-sm' : 'text-blue-400 hover:text-blue-950 border border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
            >
              {language === 'ru' ? 'AI Импорт' : 'AI Import'}
            </button>
          </div>
        </div>
      </div>

      

      

      

      {activeTab === 'news' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                   <Newspaper className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-blue-950 uppercase">Новости</h3>
              </div>
              <button 
                onClick={async () => {
                  const newRef = doc(collection(db, 'news'));
                  await setDoc(newRef, {
                    title: { ru: 'Новая новость', uz: 'Yangi yangilik' },
                    content: { ru: 'Текст новости', uz: 'Yangilik matni' },
                    image: '',
                    date: new Date().toISOString()
                  });
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl transition-all"
              >
                + Добавить новость
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map(item => (
                <div key={item.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">
                        {item.date ? (() => {
                          try {
                            const date = new Date(item.date);
                            if (isNaN(date.getTime())) return item.date;
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = String(date.getFullYear()).slice(-2);
                            return `${day}-${month}-${year}`;
                          } catch {
                            return item.date;
                          }
                        })() : 'Нет даты'}
                      </span>
                    </div>
                   <div className="aspect-video relative rounded-xl overflow-hidden bg-white border border-gray-100 group">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-700 font-black uppercase text-[10px]">Нет фото</div>}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                         <Upload className="w-6 h-6 text-white" />
                         <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleEntityImageUpload('news', item.id, e.target.files[0]) }} />
                      </label>
                   </div>
                   <input value={item.title.ru} onChange={e => updateDoc(doc(db, 'news', item.id), { 'title.ru': e.target.value })} placeholder="Заголовок (RU)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   <input value={item.title.uz} onChange={e => updateDoc(doc(db, 'news', item.id), { 'title.uz': e.target.value })} placeholder="Заголовок (UZ)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   <textarea value={item.content.ru} onChange={e => updateDoc(doc(db, 'news', item.id), { 'content.ru': e.target.value })} placeholder="Текст (RU)" className="w-full px-4 py-2 bg-white rounded-xl text-xs h-24 border border-gray-100" />
                   <textarea value={item.content.uz} onChange={e => updateDoc(doc(db, 'news', item.id), { 'content.uz': e.target.value })} placeholder="Текст (UZ)" className="w-full px-4 py-2 bg-white rounded-xl text-xs h-24 border border-gray-100" />
                   <button onClick={() => { 
                      showConfirm(
                        language === 'ru' ? 'Удаление новости' : 'Yangilikni o\'chirish',
                        language === 'ru' ? 'Вы уверены, что хотите безвозвратно удалить эту новость?' : 'Siz ushbu yangilikni butunlay o\'chirib tashlamoqchimisiz?',
                        async () => {
                          try {
                            await deleteDoc(doc(db, 'news', item.id));
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, `news/${item.id}`);
                          }
                        }
                      );
                    }} className="w-full py-2 bg-red-100 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                </div>
              ))}
           </div>
        </section>
      )}

      {activeTab === 'partners' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                   <ShieldCheck className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-blue-950 uppercase">Наши Партнеры</h3>
              </div>
              <button 
                onClick={async () => {
                  const newRef = doc(collection(db, 'partners'));
                  await setDoc(newRef, {
                    name: 'Новый партнер',
                    image: '',
                    url: ''
                  });
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl transition-all"
              >
                + Добавить партнера
              </button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {partners.map(p => (
                <div key={p.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                   <div className="aspect-square relative rounded-xl overflow-hidden bg-white border border-gray-100 group flex items-center justify-center p-4">
                      {p.image ? <img src={p.image} className="max-w-full max-h-full object-contain" /> : <ShieldCheck className="w-12 h-12 text-blue-800" />}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                         <Upload className="w-6 h-6 text-white" />
                         <input type="file" className="hidden" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleEntityImageUpload('partners', p.id, e.target.files[0]) }} />
                      </label>
                   </div>
                   <input value={p.name} onChange={e => updateDoc(doc(db, 'partners', p.id), { name: e.target.value })} placeholder="Название партнера" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   <input value={p.url || ''} onChange={e => updateDoc(doc(db, 'partners', p.id), { url: e.target.value })} placeholder="Ссылка (URL)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   <button onClick={() => { 
                      showConfirm(
                        language === 'ru' ? 'Удаление партнера' : 'Hamkorni o\'chirish',
                        language === 'ru' ? 'Вы уверены, что хотите удалить этого партнера?' : 'Siz ushbu hamkorni o\'chirib tashlamoqchimisiz?',
                        async () => {
                          try {
                            await deleteDoc(doc(db, 'partners', p.id));
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, `partners/${p.id}`);
                          }
                        }
                      );
                    }} className="w-full py-2 bg-red-100 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                </div>
              ))}
           </div>
        </section>
      )}

      {activeTab === 'branches' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                   <MapPin className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-black text-blue-950 uppercase">Наши Филиалы</h3>
              </div>
              <button 
                onClick={async () => {
                  const newRef = doc(collection(db, 'branches'));
                  await setDoc(newRef, {
                    name: { ru: 'Новый филиал', uz: 'Yangi filial' },
                    address: { ru: 'Адрес филиала', uz: 'Filial manzili' },
                    phone: '',
                    mapLink: ''
                  });
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:shadow-xl transition-all"
              >
                + Добавить филиал
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {branches.map(b => (
                <div key={b.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                     <input value={b.name.ru} onChange={e => updateDoc(doc(db, 'branches', b.id), { 'name.ru': e.target.value })} placeholder="Название (RU)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                     <input value={b.name.uz} onChange={e => updateDoc(doc(db, 'branches', b.id), { 'name.uz': e.target.value })} placeholder="Название (UZ)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   </div>
                   <div className="space-y-2">
                     <input value={b.address.ru} onChange={e => updateDoc(doc(db, 'branches', b.id), { 'address.ru': e.target.value })} placeholder="Адрес (RU)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                     <input value={b.address.uz} onChange={e => updateDoc(doc(db, 'branches', b.id), { 'address.uz': e.target.value })} placeholder="Адрес (UZ)" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <input value={b.phone} onChange={e => updateDoc(doc(db, 'branches', b.id), { phone: e.target.value })} placeholder="Телефон" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                     <input value={b.mapLink} onChange={e => updateDoc(doc(db, 'branches', b.id), { mapLink: e.target.value })} placeholder="Ссылка на карту" className="w-full px-4 py-2 bg-white rounded-xl text-xs font-bold border border-gray-100" />
                   </div>
                   <button onClick={() => { 
                      showConfirm(
                        language === 'ru' ? 'Удаление филиала' : 'Filialni o\'chirish',
                        language === 'ru' ? 'Вы уверены, что хотите удалить этот филиал?' : 'Usbu filialni o\'chirib tashlamoqchimisiz?',
                        async () => {
                          try {
                            await deleteDoc(doc(db, 'branches', b.id));
                          } catch (err) {
                            handleFirestoreError(err, OperationType.DELETE, `branches/${b.id}`);
                          }
                        }
                      );
                    }} className="w-full py-2 bg-red-100 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                </div>
              ))}
           </div>
        </section>
      )}

      {activeTab === 'telegram' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-blue-950 uppercase">Настройки Telegram</h3>
            </div>
            <div className="space-y-6 max-w-2xl bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
               <div>
                  <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Token бота</label>
                  <input value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="BotFather token" className="w-full px-6 py-4 bg-white rounded-2xl border border-gray-100 font-bold text-sm shadow-sm" />
               </div>
               <div>
                  <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Chat ID (основной)</label>
                  <input value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="-100..." className="w-full px-6 py-4 bg-white rounded-2xl border border-gray-100 font-bold text-sm shadow-sm" />
               </div>
               <div className="flex gap-4">
                  <button onClick={saveTgSettings} disabled={tgSaveLoading} className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-lg transition-all">
                     {tgSaveLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                  <button onClick={sendTgTest} disabled={tgTestLoading} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:shadow-lg transition-all">
                     {tgTestLoading ? 'Отправка...' : 'Отправить тест'}
                  </button>
               </div>
               <div className="pt-6 border-t border-gray-200 mt-6">
                  <button onClick={fetchTgUpdates} className="w-full py-4 bg-gray-200 text-blue-950 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-300 transition-all mb-4">
                    Получить Chat ID из сообщений бота
                  </button>
                  {tgUpdates.map(u => (
                     <div key={u.update_id} className="mt-2 text-xs font-mono bg-white p-3 border border-gray-100 rounded-xl flex justify-between items-center shadow-sm">
                       <span className="font-bold text-blue-900">{u.message?.chat?.title || u.message?.from?.first_name}</span>
                       <span className="bg-gray-100 px-2 py-1 rounded font-mono select-all">{u.message?.chat?.id}</span>
                     </div>
                  ))}
               </div>
            </div>
        </section>
      )}

      {activeTab === 'updates' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                   <Clock className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-blue-950 uppercase">Обновления системы</h3>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider mt-0.5">Публикация новостей и объявлений</p>
                 </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                 <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
                   <Clock className="w-4 h-4 text-amber-500" />
                   <input 
                     type="datetime-local" 
                     value={updateScheduledTime}
                     onChange={(e) => setUpdateScheduledTime(e.target.value)}
                     className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none"
                   />
                   <span className="text-[10px] font-black text-blue-400">GMT+3</span>
                 </div>
                 <button 
                   onClick={async () => {
                     const newRef = doc(collection(db, 'updates'));
                     await setDoc(newRef, {
                       title: { ru: 'Пример обновления', uz: 'Yangilanish namunasi' },
                       features: { 
                         ru: ['Добавлена новая функция', 'Исправлен баг'], 
                         uz: ['Yangi funksiya qo\'shildi', 'Xatolik tuzatildi'] 
                       },
                       date: updateScheduledTime ? new Date(updateScheduledTime).toISOString() : new Date().toISOString(),
                       isAnnouncement: true
                     });
                     setUpdateScheduledTime('');
                   }}
                   className="px-6 py-3 bg-amber-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-amber-600 transition-all flex items-center gap-2"
                 >
                   <Bell className="w-4 h-4" /> {language === 'ru' ? 'Анонс' : 'E\'lon'}
                 </button>
                 <button 
                   onClick={async () => {
                     const newRef = doc(collection(db, 'updates'));
                     await setDoc(newRef, {
                       title: { ru: 'Пример обновления', uz: 'Yangilanish namunasi' },
                       features: { 
                         ru: ['Добавлена новая функция', 'Исправлен баг'], 
                         uz: ['Yangi funksiya qo\'shildi', 'Xatolik tuzatildi'] 
                       },
                       date: new Date().toISOString()
                     });
                   }}
                   className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                 >
                   + Добавить обновление
                 </button>
              </div>
           </div>
           
           <div className="space-y-6">
              {updates.map(update => (
                <div key={update.id} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 relative group">
                   <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => showConfirm('Удаление обновления', 'Вы уверены, что хотите удалить это обновление?', () => deleteDoc(doc(db, 'updates', update.id)))} className="p-2 bg-red-100 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                   </div>
                   {update.isAnnouncement && (
                     <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                       <Bell className="w-3 h-3" /> Анонс / Объявление
                     </div>
                   )}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase text-blue-500">Заголовок</label>
                         <input value={update.title.ru} onChange={e => updateDoc(doc(db, 'updates', update.id), { 'title.ru': e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold" placeholder="RU" />
                         <input value={update.title.uz} onChange={e => updateDoc(doc(db, 'updates', update.id), { 'title.uz': e.target.value })} className="w-full px-4 py-2 rounded-xl border border-gray-100 text-sm font-bold" placeholder="UZ" />
                         <div className="pt-2">
                           <label className="block text-[10px] font-black uppercase text-blue-500 mb-1">Дата выхода</label>
                           <input 
                             type="datetime-local" 
                             value={update.date ? new Date(new Date(update.date).getTime() + (3*60*60*1000)).toISOString().slice(0, 16) : ''} 
                             onChange={e => updateDoc(doc(db, 'updates', update.id), { date: new Date(new Date(e.target.value).getTime() - (3*60*60*1000)).toISOString() })} 
                             className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold" 
                           />
                         </div>
                      </div>
                      <div className="space-y-4">
                         <label className="block text-[10px] font-black uppercase text-blue-500">Список изменений (через запятую)</label>
                         <textarea value={update.features.ru?.join(', ')} onChange={e => updateDoc(doc(db, 'updates', update.id), { 'features.ru': e.target.value.split(',').map(s => s.trim()) })} className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-medium h-32" placeholder="RU changes" />
                         <textarea value={update.features.uz?.join(', ')} onChange={e => updateDoc(doc(db, 'updates', update.id), { 'features.uz': e.target.value.split(',').map(s => s.trim()) })} className="w-full px-4 py-2 rounded-xl border border-gray-100 text-xs font-medium h-32" placeholder="UZ changes" />
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm space-y-4">
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>Основные настройки сайта</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 ml-2">Название сайта</label>
                    <input 
                      type="text" 
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm focus:bg-white focus:border-primary transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 ml-2">Основной цвет (HEX)</label>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={primaryColor}
                         onChange={e => setPrimaryColor(e.target.value)}
                         className="flex-1 px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-black text-sm uppercase"
                       />
                       <div className="relative w-14 h-14 rounded-2xl border-4 border-white shadow-lg overflow-hidden shrink-0">
                         <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="absolute -top-4 -left-4 w-32 h-32 cursor-pointer opacity-0" />
                         <div className="w-full h-full pointer-events-none" style={{ backgroundColor: primaryColor }} />
                       </div>
                    </div>
                  </div>
               </div>

               {/* Рекламный Баннер */}
               <div className="space-y-4 pt-6 border-t border-gray-100 md:border-t-0 md:pt-0 md:border-l md:pl-8">
                  <div className="flex items-center justify-between">
                     <label className="block text-sm font-black uppercase tracking-wider text-blue-950">Рекламный блок на главном экране</label>
                     <button
                        onClick={() => setAdForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`w-14 h-8 rounded-full transition-colors relative ${adForm.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${adForm.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                     </button>
                  </div>
                  {adForm.isActive && (
                     <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4">
                        <input type="text" placeholder="Заголовок рекламы" value={adForm.text} onChange={e => setAdForm(prev => ({ ...prev, text: e.target.value }))} className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-100 font-bold text-sm" />
                        <input type="text" placeholder="Ссылка (необязательно)" value={adForm.link} onChange={e => setAdForm(prev => ({ ...prev, link: e.target.value }))} className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-100 font-bold text-sm" />
                        <div className="flex items-center gap-6">
                          {adForm.imageUrl && (
                            <img src={adForm.imageUrl || undefined} className="h-16 w-16 object-cover rounded-xl shadow-sm" />
                          )}
                          <label className="cursor-pointer px-6 py-3 bg-white text-gray-700 font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-colors shadow-sm">
                            Загрузить Картинку
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleSiteImageUpload('ad.imageUrl', e.target.files[0]) }} />
                          </label>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-4 pt-6 mt-6 border-t border-gray-100">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2 ml-2">Логотип сайта</label>
                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 group hover:border-primary transition-colors">
                   <div className="w-20 h-20 bg-white rounded-2xl shadow-xl p-2 flex items-center justify-center">
                      <img src={siteSettings.logoUrl || undefined} className="w-full h-full object-contain" />
                   </div>
                   <label className="cursor-pointer">
                      <div className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-primary/30 transition-all">Загрузить лого</div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSiteImageUpload('logoUrl', e.target.files[0])} />
                   </label>
                </div>
             </div>

            <div className="space-y-6 mt-6 pt-6 border-t border-gray-100">
               <div>
                 <label className="block text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Главный баннер</label>
                        <div className="relative aspect-video bg-white rounded-xl border border-gray-200 overflow-hidden group">
                           <img src={siteSettings.bannerUrl || undefined} className="w-full h-full object-cover" />
                           <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                              <Upload className="w-6 h-6 text-blue-900" />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSiteImageUpload('bannerUrl', e.target.files[0])} />
                           </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-blue-500 mb-2">Нижнее фото (Footer Image)</label>
                        <div className="relative h-24 bg-white rounded-xl border border-gray-200 overflow-hidden group">
                           {siteSettings.footerImageUrl ? <img src={siteSettings.footerImageUrl || undefined} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-500 text-[10px] font-black uppercase tracking-widest">Нет фото</div>}
                           <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                              <Upload className="w-6 h-6 text-blue-900" />
                              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSiteImageUpload('footerImageUrl', e.target.files[0])} />
                           </label>
                        </div>
                      </div>
                   </div>

             <div className="space-y-6 mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-900 mb-4">Секция "О нас"</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2 ml-2">Фото "О нас"</label>
                    <div className="relative aspect-video bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden group hover:border-primary transition-colors">
                      {aboutImage ? (
                        <img src={aboutImage || undefined} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-500 text-[10px] font-black uppercase tracking-widest">Нет фото</div>
                      )}
                      <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                        <Upload className="w-6 h-6 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleSiteImageUpload('aboutImage', e.target.files[0])} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Лет опыта</label>
                        <input 
                          type="number" 
                          value={aboutStats.years} 
                          onChange={e => setAboutStats({...aboutStats, years: parseInt(e.target.value) || 0})}
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Клиентов</label>
                        <input 
                          type="number" 
                          value={aboutStats.clients} 
                          onChange={e => setAboutStats({...aboutStats, clients: parseInt(e.target.value) || 0})}
                          className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Текст О нас (RU)</label>
                       <textarea 
                         value={aboutForm.ru}
                         onChange={e => setAboutForm({...aboutForm, ru: e.target.value})}
                         className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm h-32"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Текст О нас (UZ)</label>
                       <textarea 
                         value={aboutForm.uz}
                         onChange={e => setAboutForm({...aboutForm, uz: e.target.value})}
                         className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm h-32"
                       />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Главный заголовок (RU)</label>
                       <input 
                         type="text"
                         value={heroTitle.ru}
                         onChange={e => setHeroTitle({...heroTitle, ru: e.target.value})}
                         className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 ml-2">Главный заголовок (UZ)</label>
                       <input 
                         type="text"
                         value={heroTitle.uz}
                         onChange={e => setHeroTitle({...heroTitle, uz: e.target.value})}
                         className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm"
                       />
                    </div>
                  </div>
                </div>
             </div>

  </div>
</details>
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>Слайды в Hero-секции</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
    
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-black text-blue-950 uppercase">Слайды в Hero-секции</h3>
                    </div>
                    <button 
                      onClick={() => setHeroSlides([...heroSlides, { id: Date.now().toString(), imageUrl: '', title: { ru: '', uz: '' }, text: { ru: '', uz: '' } }])}
                      className="px-4 py-2 bg-purple-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:bg-purple-700"
                    >
                      + Добавить слайд
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-6">
                    {heroSlides.map((slide, idx) => (
                      <div key={slide.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase text-blue-500">Слайд #{idx + 1}</span>
                            <button onClick={() => setHeroSlides(heroSlides.filter(s => s.id !== slide.id))} className="text-red-500 hover:text-red-600">
                               <Trash2 className="w-5 h-5" />
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-4">
                               <div className="relative group aspect-video rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200">
                                  {slide.imageUrl ? <img src={slide.imageUrl || undefined} className="w-full h-full object-cover" /> : null}
                                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                     <Upload className="w-8 h-8 text-blue-900 mb-2" />
                                     <span className="text-[10px] font-black uppercase text-blue-900 tracking-widest">Изменить фото</span>
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
              
  </div>
</details>


               
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>Настройки самовывоза</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
    
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-emerald-600" />
                     </div>
                     <h3 className="text-xl font-black text-blue-950 uppercase">Настройки самовывоза</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-4">
                        <div>
                           <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Адрес самовывоза (RU)</label>
                           <input 
                              type="text" 
                              value={pickupSettings.address.ru} 
                              onChange={e => setPickupSettings({...pickupSettings, address: {...pickupSettings.address, ru: e.target.value}})}
                              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                              placeholder="г. Ташкент, ул. ..."
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Адрес самовывоза (UZ)</label>
                           <input 
                              type="text" 
                              value={pickupSettings.address.uz} 
                              onChange={e => setPickupSettings({...pickupSettings, address: {...pickupSettings.address, uz: e.target.value}})}
                              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                              placeholder="Toshkent sh., ..."
                           />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div>
                           <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Ссылка на карту (Google/Yandex)</label>
                           <input 
                              type="text" 
                              value={pickupSettings.mapUrl} 
                              onChange={e => setPickupSettings({...pickupSettings, mapUrl: e.target.value})}
                              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                              placeholder="https://maps.google.com/..."
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-black uppercase text-blue-500 mb-2 ml-2">Телефон менеджера</label>
                           <input 
                              type="text" 
                              value={pickupSettings.callCenter} 
                              onChange={e => setPickupSettings({...pickupSettings, callCenter: e.target.value})}
                              className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold text-xs"
                              placeholder="+998 ..."
                           />
                        </div>
                     </div>
                  </div>
               
  </div>
</details>


               
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>Контакты и Режим работы</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
    
                  <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                       <Share2 className="w-6 h-6 text-emerald-600" />
                     </div>
                     <h3 className="text-xl font-black text-blue-950 uppercase">Контакты и Режим работы</h3>
                  </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Телефон</label>
                             <input type="text" value={contactsForm.phone} onChange={e => setContactsForm({...contactsForm, phone: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Email</label>
                             <input type="text" value={contactsForm.email} onChange={e => setContactsForm({...contactsForm, email: e.target.value})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Время работы (RU)</label>
                             <input type="text" value={contactsForm?.workingHours?.ru || ''} onChange={e => setContactsForm({...contactsForm, workingHours: {...contactsForm.workingHours, ru: e.target.value}})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Время работы (UZ)</label>
                             <input type="text" value={contactsForm?.workingHours?.uz || ''} onChange={e => setContactsForm({...contactsForm, workingHours: {...contactsForm.workingHours, uz: e.target.value}})} className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold" />
                          </div>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 mb-2">
                          <span className="text-[10px] font-black uppercase text-blue-500">Социальные сети</span>
                          <button onClick={handleAddSocialLink} className="text-primary font-black text-[10px] uppercase hover:underline anim-tap">+ Добавить</button>
                       </div>
                       <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {socialLinks.map(link => (
                             <div key={link.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm group">
                                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden border border-gray-100 shrink-0">
                                   {link.iconUrl ? <img src={link.iconUrl || undefined} className="w-full h-full object-cover" /> : <Share2 className="w-5 h-5 text-blue-700" />}
                                   <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                      <Upload className="w-4 h-4 text-blue-900" />
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSocialIconUpload(link.id, e.target.files[0])} />
                                   </label>
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                   <input value={link.name} onChange={e => handleUpdateSocialLink(link.id, 'name', e.target.value)} placeholder="Название" className="text-[10px] font-black uppercase bg-gray-50 rounded-lg px-2 py-1 focus:bg-white transition-all" />
                                   <input value={link.url} onChange={e => handleUpdateSocialLink(link.id, 'url', e.target.value)} placeholder="Ссылка" className="text-[10px] font-bold bg-gray-50 rounded-lg px-2 py-1 focus:bg-white transition-all" />
                                </div>
                                <button onClick={() => handleDeleteSocialLink(link.id)} className="p-1 text-blue-800 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              
  </div>
</details>


              {/* Payment Methods Section */}
              
<details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
  <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
    <span>Способы оплаты</span>
    <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
    </span>
  </summary>
  <div className="px-6 pb-6 mt-2">
    
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-black text-blue-950 uppercase">Способы оплаты</h3>
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
                                   {pm.image ? <img src={pm.image || undefined} className="w-full h-full object-contain" /> : <CreditCard className="w-6 h-6 text-blue-800" />}
                                   <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                      <Upload className="w-4 h-4 text-blue-900" />
                                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                                         if (e.target.files?.[0]) {
                                            const url = await uploadImgBB(e.target.files[0]);
                                            setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, image: url } : p));
                                         }
                                      }} />
                                   </label>
                                </div>
                                <div className="flex-1 space-y-2">
                                   <input value={pm.name} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} placeholder="Название платежной системы" className="w-full text-sm font-black text-blue-950 bg-gray-50 px-4 py-3 rounded-xl focus:bg-white transition-all border border-transparent focus:border-gray-200" />
                                   <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2">
                                         <input type="color" value={pm.btnColor} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnColor: e.target.value } : p))} className="w-6 h-6 rounded-lg cursor-pointer border-2 border-white shadow-sm" />
                                         <span className="text-[10px] font-black uppercase text-blue-500">Цвет кнопки</span>
                                      </div>
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                         <input type="checkbox" checked={pm.screenshotRequired} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, screenshotRequired: e.target.checked } : p))} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                                         <span className="text-[10px] font-black uppercase text-blue-500 group-hover:text-gray-600 transition-colors">Нужен скриншот?</span>
                                      </label>
                                   </div>
                                </div>
                             </div>
                             <button onClick={() => setPaymentMethodsList(paymentMethodsList.filter((_, i) => i !== idx))} className="p-2 text-blue-800 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Инструкция (RU)</label>
                                <textarea 
                                  value={pm.description?.ru || ''} 
                                  onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, description: { ...p.description || {}, ru: e.target.value } } : p))}
                                  className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white h-32 transition-all"
                                  placeholder="Реквизиты и подробные инструкции..."
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Инструкция (UZ)</label>
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
                               <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Текст кнопки (RU)</label>
                               <input value={pm.btnText?.ru || ''} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnText: { ...p.btnText || {}, ru: e.target.value } } : p))} placeholder="Я оплатил" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Текст кнопки (UZ)</label>
                               <input value={pm.btnText?.uz || ''} onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, btnText: { ...p.btnText || {}, uz: e.target.value } } : p))} placeholder="Men to'ladim" className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" />
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-gray-100">
                             <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Тип метода оплаты</label>
                             <select 
                               value={pm.type || 'manual'} 
                               onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, type: e.target.value as any } : p))}
                               className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all"
                             >
                                <option value="manual">Ручная (инструкция + скриншот)</option>
                                <option value="botfather">Telegram Invoice Link (через BotFather)</option>
                                <option value="redirect">Прямая ссылка (URL Click/Payme)</option>
                             </select>
                             
                             {pm.type === 'botfather' && (
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Provider Token (из BotFather)</label>
                                    <input 
                                       value={pm.providerToken || ''} 
                                       onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, providerToken: e.target.value } : p))} 
                                       placeholder="Например: 410694247:TEST:53cda..." 
                                       className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" 
                                    />
                                 </div>
                             )}
                             {pm.type === 'redirect' && (
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-blue-500 ml-2">Шаблон ссылки на оплату</label>
                                    <div className="text-[9px] text-gray-500 font-medium px-2 pb-1">Используйте <code>{'{amount}'}</code> и <code>{'{order_id}'}</code> в ссылке.</div>
                                    <input 
                                       value={pm.redirectUrlTemplate || ''} 
                                       onChange={e => setPaymentMethodsList(paymentMethodsList.map((p, i) => i === idx ? { ...p, redirectUrlTemplate: e.target.value } : p))} 
                                       placeholder="https://my.click.uz/services/pay?merchant_id=...&amount={amount}&transaction_param={order_id}" 
                                       className="w-full px-4 py-3 bg-gray-50 rounded-xl text-xs font-bold border border-transparent focus:border-gray-200 focus:bg-white transition-all" 
                                    />
                                 </div>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </details>

              {/* Ad Block Section */}
              <details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
                  <span>Дополнительный Рекламный блок</span>
                  <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 mt-2">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                        <Share2 className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-blue-950 uppercase">Рекламный блок</h3>
                      </div>
                    </div>
                    <button
                        onClick={() => setShowAdBlock(!showAdBlock)}
                        className={`w-14 h-8 rounded-full transition-colors relative ${showAdBlock ? 'bg-green-500' : 'bg-gray-200'}`}
                     >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${showAdBlock ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {showAdBlock && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2">Заголовок (RU)</label>
                          <input value={adBlockTitle.ru} onChange={e => setAdBlockTitle({...adBlockTitle, ru: e.target.value})} className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 font-bold text-xs" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2">Заголовок (UZ)</label>
                          <input value={adBlockTitle.uz} onChange={e => setAdBlockTitle({...adBlockTitle, uz: e.target.value})} className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 font-bold text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2">Ссылка</label>
                        <input value={adBlockLink} onChange={e => setAdBlockLink(e.target.value)} className="w-full px-5 py-4 bg-white rounded-2xl border border-gray-200 font-bold text-xs" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2">Изображение</label>
                        <div className="flex items-center gap-6">
                          <div className="w-32 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
                            {adBlockImage ? <img src={adBlockImage} className="w-full h-full object-cover" /> : <Share2 className="w-6 h-6 text-gray-400" />}
                          </div>
                          <label className="cursor-pointer px-6 py-3 bg-white text-gray-700 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-gray-100 transition-colors shadow-sm border border-gray-200">
                            Выбрать фото
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) handleSiteImageUpload('adBlockImage', e.target.files[0]) }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Passwords (Secure User List) Section */}
              <details className="group pb-4 border-b border-gray-100 bg-white rounded-2xl shadow-sm mb-4">
                <summary className="flex items-center justify-between cursor-pointer list-none font-black text-blue-950 uppercase select-none outline-none p-6">
                  <span>Пароли & Пользователи</span>
                  <span className="transition duration-300 group-open:rotate-180 bg-gray-50 w-8 h-8 flex items-center justify-center rounded-full text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </summary>
                <div className="px-6 pb-6 mt-2">
                  {!showPasswordsSection ? (
                    <div className="space-y-4">
                      <p className="text-[10px] text-blue-500 font-black uppercase tracking-wider">Для доступа к этому разделу введите мастер-пароль</p>
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          value={passwordInput}
                          onChange={e => setPasswordInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && passwordInput === '1267144' && setShowPasswordsSection(true)}
                          className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-100 font-bold"
                          placeholder="Код доступа..."
                        />
                        <button 
                          onClick={() => {
                            if (passwordInput === '1267144') setShowPasswordsSection(true);
                            else alert('Неверный код');
                          }}
                          className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg"
                        >
                          Войти
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                          <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Все пользователи ({allUsers.length})</p>
                          <button onClick={() => setShowPasswordsSection(false)} className="text-[10px] font-black uppercase text-red-500">Скрыть</button>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                           {allUsers.map((u: any) => (
                              <div key={u.id} className="py-4 flex justify-between items-center group">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 overflow-hidden">
                                       {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <div className="text-blue-700 font-black">{u.displayName?.[0] || u.email?.[0]?.toUpperCase()}</div>}
                                    </div>
                                    <div>
                                       <p className="text-xs font-black text-blue-950">{u.displayName || 'Без имени'}</p>
                                       <p className="text-[10px] text-blue-500 font-medium">{u.email}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-1 ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-50 text-blue-500'}`}>{u.role}</p>
                                    <p className="text-[8px] font-mono text-blue-700">UID: {u.uid?.substring(0, 12)}...</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </details>

              {/* Sticky Save Button Container */}
              <div className="sticky bottom-4 left-0 right-0 z-30 pt-4">
                <div className="max-w-4xl mx-auto">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCustomization}
                    disabled={customizationSaving}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center justify-center gap-4 border-4 border-white"
                  >
                    {customizationSaving ? (
                      <Loader className="w-6 h-6 animate-spin text-blue-900" />
                    ) : (
                      <Save className="w-6 h-6" />
                    )}
                    <span className="text-sm">
                      {customizationSaving ? 'Сохранение настроек...' : 'Сохранить все изменения сайта'}
                    </span>
                  </motion.button>
                </div>
              </div>
        </div>
      )}

      {activeTab === 'promocodes' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                <Tag className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="text-xl font-black text-blue-950 uppercase">Промокоды</h3>
           </div>
           
           <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
              <h4 className="text-sm font-black text-blue-500 uppercase mb-4">Создать промокод</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <input type="text" value={newPromoCode} onChange={e => setNewPromoCode(e.target.value)} placeholder="КОД20" className="px-4 py-3 bg-white rounded-xl font-black text-sm uppercase shadow-sm border border-gray-100" />
                 <input type="number" value={newPromoDiscount} onChange={e => setNewPromoDiscount(e.target.value)} placeholder="Скидка %" className="px-4 py-3 bg-white rounded-xl font-black text-sm shadow-sm border border-gray-100" />
                 <input type="number" value={newPromoLimit} onChange={e => setNewPromoLimit(e.target.value)} placeholder="Лимит использований" className="px-4 py-3 bg-white rounded-xl font-black text-sm shadow-sm border border-gray-100" />
                 <button onClick={handleAddPromoCode} className="py-3 bg-pink-600 text-blue-900 rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:bg-pink-700 transition-all">Добавить</button>
              </div>
           </div>

           <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-blue-500">Код</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-blue-500">Скидка</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-blue-500">Лимит</th>
                       <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-blue-500 text-right">Действие</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                    {promocodesList.map(promo => (
                       <tr key={promo.id}>
                          <td className="px-6 py-4 font-black text-blue-950">{promo.code}</td>
                          <td className="px-6 py-4 font-black text-pink-600">-{promo.discount}%</td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-950">{promo.usedCount || 0} / {promo.limit}</span>
                                <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
                                   <div className="h-full bg-pink-400 rounded-full" style={{ width: `${Math.min(((promo.usedCount || 0) / (promo.limit || 1)) * 100, 100)}%` }} />
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={() => handleDeletePromoCode(promo.id)} className="p-2 text-blue-700 hover:text-red-500 transition-colors">
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



      {activeTab === 'users' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-black text-blue-950 uppercase">Пользователи и Администраторы</h3>
           </div>
           
           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {allUsers.map(u => (
                 <div key={u.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border ${u.isBanned ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} shadow-sm gap-4`}>
                    <div className="flex items-center gap-4 flex-1">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm overflow-hidden ${u.isBanned ? 'bg-red-300' : 'bg-primary/20 text-primary'}`}>
                         {u.photoURL ? <img src={u.photoURL || undefined} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                       </div>
                       <div>
                          <p className="font-black text-blue-950">{u.displayName || 'Без имени'}</p>
                          <p className="text-xs text-blue-400 font-medium">{u.email || 'Без email'} • <span className="uppercase text-[9px] tracking-wider font-black text-indigo-500">{u.provider || 'password'}</span></p>
                          <div className="mt-2 flex gap-2">
                             <select
                               className="text-[10px] font-black uppercase bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500 cursor-pointer"
                               value={u.role || 'user'}
                               onChange={async (e) => {
                                 const newRole = e.target.value;
                                 if (newRole === 'admin') {
                                    await setDoc(doc(db, 'admins', u.uid), { email: u.email, addedAt: new Date().toISOString() });
                                 } else {
                                    await deleteDoc(doc(db, 'admins', u.uid));
                                 }
                               }}
                             >
                               <option value="user">Клиент</option>
                               <option value="admin">Администратор</option>
                             </select>
                          </div>
                       </div>
                    </div>
                    {u.uid !== user?.uid && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleToggleBan(u.uid || u.id, u.isBanned)}
                          className={`px-4 py-2 ${u.isBanned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors shrink-0`}
                        >
                          {u.isBanned ? 'Разбанить' : 'Забанить'}
                        </button>
                      </div>
                    )}
                 </div>
              ))}
           </div>
        </section>
      )}

      {activeTab === 'consultations' && (
        <section className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex items-center gap-3 text-left">
                 <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                   <MessageSquare className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-blue-950 uppercase">Заявки на консультацию</h3>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Всего заявок: {helpRequests.length}</p>
                 </div>
              </div>
              
              <div className="w-full md:w-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                <input 
                  type="text" 
                  placeholder="Поиск по имени, телефону или тексту..." 
                  value={consultationSearchQuery}
                  onChange={(e) => setConsultationSearchQuery(e.target.value)}
                  className="w-full md:w-80 pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:bg-white transition-all outline-none"
                />
              </div>
           </div>
           
           <div className="space-y-4 text-left">
              {helpRequests.length === 0 ? (
                <div className="text-center py-12 text-blue-500 font-bold uppercase tracking-wider text-xs">
                  Заявок пока нет
                </div>
              ) : (
                helpRequests.filter(req => {
                  const query = consultationSearchQuery.toLowerCase();
                  return (
                    req.name?.toLowerCase().includes(query) || 
                    req.phone?.toLowerCase().includes(query) || 
                    req.situation?.toLowerCase().includes(query) ||
                    req.tag?.toLowerCase().includes(query)
                  );
                }).map(req => (
                  <div key={req.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between gap-6 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${req.status === 'processed' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600 animate-pulse'}`}>
                          {req.status === 'processed' ? 'Обработано' : 'Новая'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Tag className="w-3 h-3 text-blue-400" />
                          <input 
                            value={req.tag || ''} 
                            placeholder="Добавить тег..."
                            onChange={async (e) => {
                              await updateDoc(doc(db, 'help_requests', req.id), { tag: e.target.value });
                            }}
                            className="bg-transparent border-b border-transparent focus:border-blue-200 outline-none text-[10px] font-black uppercase tracking-wider text-blue-500 w-24"
                          />
                        </div>
                        <span className="text-xs text-blue-500 font-mono">
                          {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-blue-950">{req.name}</h4>
                      <p className="text-sm font-bold text-gray-600 mt-1">{req.phone}</p>
                      {req.email && <p className="text-xs text-blue-500 mt-1">{req.email}</p>}
                      <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap italic">"{req.situation}"</p>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center items-end gap-2">
                      {req.status !== 'processed' && (
                        <button 
                          onClick={async () => {
                            await updateDoc(doc(db, 'help_requests', req.id), { status: 'processed' });
                          }}
                          className="px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap font-bold"
                        >
                          <CheckCircle className="w-4 h-4" /> Отметить как обработанную
                        </button>
                      )}
                      <button 
                        onClick={async () => {
                          showConfirm(
                            language === 'ru' ? 'Удаление заявки' : 'Arizani o\'chirish',
                            language === 'ru' ? 'Удалить эту заявку навсегда?' : 'Ushbu arizani butunlay o\'chirib tashlash?',
                            async () => {
                              try {
                                await deleteDoc(doc(db, 'help_requests', req.id));
                              } catch (e) {
                                console.error("Error deleting request:", e);
                              }
                            }
                          );
                        }}
                        className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
           </div>
        </section>
      )}

      {activeTab === 'categories' && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
           <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="text-2xl font-black text-blue-950 uppercase">Категории</h3>
                <p className="text-[10px] font-black uppercase text-blue-500 mt-1">Управление разделами меню</p>
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
                          <Upload className="w-4 h-4 text-blue-900" />
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleEntityImageUpload('categories', cat.id, e.target.files[0])} />
                       </label>
                    </div>
                    <div>
                       <h4 className="font-black text-blue-950 uppercase text-sm tracking-tight">{cat.name?.ru || cat.name?.uz}</h4>
                       <p className="text-[10px] font-black uppercase text-blue-500">{cat.name?.uz}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col gap-1">
                        <button onClick={() => handleMoveCategory(cat.id, 'up')} className="p-1 text-blue-700 hover:text-primary transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => handleMoveCategory(cat.id, 'down')} className="p-1 text-blue-700 hover:text-primary transition-colors"><ChevronDown className="w-4 h-4" /></button>
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
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
                  className="px-4 py-2 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Удалить ({selectedProductIds.length})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('ai-import')}
                className="px-4 py-3 bg-purple-50 text-purple-600 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Globe className="w-4 h-4" /> AI Импорт
              </button>
              <button 
                onClick={() => setEditingProduct({ name: { ru: '', uz: '' }, description: { ru: '', uz: '' }, price: 0, image: '', categoryId: categories[0]?.id || '', code: '' })} 
                className="px-4 py-3 bg-primary text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap"
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
                      <img src={cat.image || undefined} className="w-10 h-10 rounded-lg object-cover" />
                      <h4 className="font-black text-blue-950 uppercase tracking-tight">{cat.name?.ru || cat.name?.uz}</h4>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] font-black text-blue-500">{catProducts.length}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={(e) => { e.stopPropagation(); handleAddProduct(cat.id); }} className="text-primary font-black text-[10px] uppercase hover:underline">+ Добавить</button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-blue-700" /> : <ChevronDown className="w-5 h-5 text-blue-700" />}
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
                              <th className="p-2 text-[10px] font-black uppercase text-blue-500">Товар</th>
                              <th className="p-2 text-[10px] font-black uppercase text-blue-500">Цена</th>
                              <th className="p-2 text-right text-[10px] font-black uppercase text-blue-500">Действие</th>
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
                                    <img src={prod.image || undefined} className="w-8 h-8 rounded object-cover" />
                                    <div>
                                      <p className="text-xs font-black text-blue-950 line-clamp-1">{prod.name?.ru || prod.name?.uz}</p>
                                      <p className="text-[9px] text-blue-500 uppercase tracking-wider">{prod.name?.uz}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 text-xs font-black text-blue-950">
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
            <h3 className="text-2xl font-black text-blue-950 mb-2 uppercase tracking-tight">AI Импорт товаров</h3>
            <p className="text-blue-400 mb-8 font-medium">Загрузите PDF или изображение с перечнем товаров, и нейросеть автоматически распознает названия, цены и описания.</p>
            
            <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.1em] text-blue-500 mb-2">Назначение</label>
                  <select 
                    value={aiCategoryId}
                    onChange={(e) => setAiCategoryId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-primary"
                  >
                    <option value="auto" className="font-black text-purple-600">✨ Авто-распределение (по категориям)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-[0.1em] text-blue-500 mb-2">Теги (через запятую)</label>
                  <input 
                    type="text" 
                    placeholder="тег1, тег2, тег3"
                    value={aiTags} 
                    onChange={e => setAiTags(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-100 font-bold text-sm mb-4"
                  />
                  <label className="block text-xs font-black uppercase tracking-[0.1em] text-blue-500 mb-2">Файл (PDF, PNG, JPG)</label>
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

                    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY || '';
                    if (!apiKey) {
                      throw new Error('Модуль распознавания не настроен. Пожалуйста, добавьте GEMINI_API_KEY в настройках проекта (Секреты) или в .env файл.');
                    }
                     const ai = new GoogleGenAI({ apiKey });
                     const response = await ai.models.generateContent({
                       model: "gemini-3-flash-preview",
                       contents: {
                         parts: [
                           {
                             inlineData: {
                               data: base64,
                               mimeType: aiFile.type
                             }
                           },
                           {
                             text: "Analyze this image/PDF. Extract each product with its price and description. Return ONLY a JSON array of objects. Each object MUST have 'name' (string), 'price' (number), and 'description' (string). Return only pure JSON, no markdown code blocks, no preamble. Example: [{\"name\": \"Product Name\", \"price\": 1000, \"description\": \"Details\"}]"
                           }
                         ]
                       }
                     });

                     const text = response.text || "";
                    
                    // More robust JSON extraction: find the first '[' and last ']'
                    const firstBracket = text?.indexOf('[');
                    const lastBracket = text?.lastIndexOf(']');
                    
                    if (!text || firstBracket === -1 || lastBracket === -1) {
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
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-wider shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {aiIsProcessing ? <Loader className="w-6 h-6 animate-spin text-blue-900" /> : <FileText className="w-6 h-6" />}
                {aiIsProcessing ? 'Обработка...' : 'Распознать товары'}
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
                                  const productNameLower = res.name.toLowerCase();
                                  
                                  const categoryScores = categories.map(c => {
                                     const ruName = (c.name?.ru || '').toLowerCase();
                                     const uzName = (c.name?.uz || '').toLowerCase();
                                     
                                     // Улучшенное получение основ слов: убираем окончания
                                     const getBases = (name: string) => name.split(/\s+/).map(w => w.replace(/[.,!?:;]/g, '').trim()).filter(w => w.length > 2).map(w => w.replace(/(и|ы|ая|ой|ые|ие|а|я|о|е|ar|lar|ий|ый|ое|ее)$/i, ''));
                                     const pBases = getBases(productNameLower);
                                     const ruBases = getBases(ruName);
                                     const uzBases = getBases(uzName);
                                     
                                     let score = 0;
                                     // Совпадение основ слов категорий в названии товара
                                     ruBases.forEach(b => { if (productNameLower.includes(b)) score += 10; });
                                     uzBases.forEach(b => { if (productNameLower.includes(b)) score += 10; });
                                     
                                     // Совпадение основ слов товара в названии категории
                                     pBases.forEach(pb => { if (ruName.includes(pb) || uzName.includes(pb)) score += 10; });

                                     // Специальные ключевые слова (основы)
                                     const keywords = ['плитк', 'индикатор', 'табличк', 'кнопк', 'пандус', 'подъемник', 'замок', 'держател', 'табло', 'мнемосхем', 'звуковой'];
                                     keywords.forEach(word => { 
                                       if (productNameLower.includes(word) && (ruName.includes(word) || uzName.includes(word))) score += 20; 
                                     });

                                     return { id: c.id, score };
                                  });

                                  const bestMatch = categoryScores.filter(s => s.score > 0).sort((a, b) => b.score - a.score)[0];
                                  
                                  if (bestMatch && bestMatch.score > 0) {
                                     finalCategoryId = bestMatch.id;
                                  } else {
                                     const otherCategory = categories.find(c => {
                                        const n = (c.name?.ru || '').toLowerCase();
                                        return n.includes('прочее') || n.includes('другое') || n.includes('boshqa');
                                     });
                                     finalCategoryId = otherCategory ? otherCategory.id : (categories[0]?.id || '');
                                  }
                               }

                               if (!finalCategoryId) continue;

                               const newRef = doc(collection(db, 'products'));
                               await setDoc(newRef, {
                                  name: { ru: res.name, uz: res.name },
                                  description: { ru: res.description, uz: res.description },
                                  price: Number(res.price) || 0,
                                  categoryId: finalCategoryId,
                                  image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
                                  tags: aiTags.split(',').map(t => t.trim()).filter(t => t),
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
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-lg hover:bg-green-700 transition-all"
                  >
                    Добавить все на сайт
                  </button>
                </div>
                {aiResults.map((res, i) => (
                  <div key={i} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
                    <div className="flex-1">
                      <h4 className="font-black text-blue-950">{res.name}</h4>
                      <p className="text-primary font-bold">{res.price.toLocaleString()} UZS</p>
                      <p className="text-xs text-blue-500 mt-1 line-clamp-1">{res.description}</p>
                    </div>
                    <button onClick={() => setAiResults(aiResults.filter((_, idx) => idx !== i))} className="p-2 text-blue-700 hover:text-red-500">
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
            <h3 className="text-2xl font-black text-blue-950 uppercase tracking-tight">Управление заказами</h3>
            <div className="flex gap-2">
               <div className="flex bg-gray-100 rounded-xl p-1 items-center px-3">
                  <Search className="w-4 h-4 text-blue-500 mr-2" />
                  <input 
                    type="text" 
                    placeholder="Поиск по коду..." 
                    value={orderSearchQuery}
                    onChange={e => setOrderSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs font-black uppercase tracking-wider w-40 placeholder:text-blue-700"
                  />
               </div>
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   showConfirm(
                    "ОПАСНО: Очистка заказов", 
                    "Вы действительно хотите УДАЛИТЬ ВСЕ заказы из базы данных? Это действие необратимо!", 
                    async () => {
                      showConfirm("ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ", "Заказы будут удалены навсегда. Вы точно уверены?", async () => {
                        try {
                          const ordersRef = collection(db, 'orders');
                          const snap = await getDocs(ordersRef);
                          
                          if (snap.empty) {
                            alert('Заказов не найдено');
                            return;
                          }

                          const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'orders', d.id)));
                          await Promise.all(deletePromises);
                          
                          alert('Все заказы успешно удалены');
                        } catch (err) {
                          console.error('Delete all error:', err);
                          handleFirestoreError(err, OperationType.DELETE, 'orders');
                          alert('Ошибка при удалении заказов');
                        }
                      });
                    }
                   )
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-wider shrink-0 ml-2"
               >
                 <Trash2 className="w-4 h-4" />
                 Очистить все
               </button>
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
                         order.status === 'need_to_pay' ? 'text-blue-500' :
                         order.status === 'pending' ? 'text-yellow-500' :
                         order.status === 'confirmed' ? 'text-blue-500' :
                         'text-green-500'
                       }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black tracking-tighter text-blue-950 uppercase">{order.code}</span>
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
                      <p className="text-[10px] text-blue-500 font-bold uppercase">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-black text-blue-950 uppercase tracking-wider">{order.userName}</p>
                      <p className="text-[10px] text-blue-500">{order.userPhone}</p>
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-lg font-black text-primary tracking-tight">{order.total?.toLocaleString()} UZS</p>
                    </div>
                    <div className="flex items-center justify-center p-2 rounded-lg bg-gray-50 text-blue-500 group-hover:text-primary transition-colors">
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
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-4 flex items-center gap-2">
                                 <ShoppingCart className="w-3.5 h-3.5" /> Состав заказа
                              </h4>
                              <div className="space-y-3">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-100 shadow-sm relative group">
                                     <img src={item.image || undefined} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                                     <div className="flex-1 min-w-0">
                                       <p className="font-black text-xs text-blue-950 truncate">
                                         {typeof item.name === 'object' ? (item.name[language] || item.name['ru'] || 'Товар') : (item.name || 'Товар')}
                                       </p>
                                     </div>
                                     <div className="text-right">
                                       <p className="text-[10px] font-black text-blue-500">{item.quantity} шт.</p>
                                       <p className="text-xs font-black text-blue-950">{(item.price * item.quantity).toLocaleString()} UZS</p>
                                     </div>
                                  </div>
                                ))}
                                
                                {order.promocode && (
                                  <div className="p-2 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center px-4">
                                    <span className="text-[9px] font-black text-green-700 uppercase tracking-wider">Промокод</span>
                                    <span className="text-xs font-black text-green-700 font-mono tracking-tighter">{order.promocode}</span>
                                  </div>
                                )}
                                
                                <div className="pt-2 flex justify-between text-[10px] font-black text-blue-500 divide-x divide-gray-100 bg-gray-50 rounded-xl p-3">
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-wider mb-1 text-[8px]">Подытог</p>
                                     <p className="text-gray-700">{order.subtotal?.toLocaleString()} UZS</p>
                                  </div>
                                  {order.discount > 0 && (
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-wider mb-1 text-[8px] text-green-600">Скидка</p>
                                     <p className="text-green-700">-{order.discount}%</p>
                                  </div>
                                  )}
                                  <div className="flex-1 px-2 text-center">
                                     <p className="uppercase tracking-wider mb-1 text-[8px] text-primary">Итого</p>
                                     <p className="text-primary text-xs">{order.total?.toLocaleString()} UZS</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                               <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-2">
                                  <User className="w-3.5 h-3.5" /> Данные клиента
                               </h4>
                               <div className="grid grid-cols-2 gap-4">
                                  <div>
                                     <p className="text-[8px] font-black uppercase text-blue-500">Имя</p>
                                     <p className="font-bold text-sm text-blue-900">{order.userName}</p>
                                  </div>
                                  <div>
                                     <p className="text-[8px] font-black uppercase text-blue-500">Телефон</p>
                                     <p className="text-sm font-bold text-blue-700">{order.userPhone}</p>
                                  </div>
                                  <div className="col-span-2">
                                     <p className="text-[8px] font-black uppercase text-blue-500">Telegram/Insta</p>
                                     <p className="text-sm font-bold text-blue-700">{order.userContact}</p>
                                  </div>
                                  {order.address && order.deliveryMethod === 'delivery' && (
                                    <div className="col-span-2 border-t border-blue-100 pt-2 mt-2">
                                       <p className="text-[8px] font-black uppercase text-blue-500">Адрес доставки</p>
                                       {typeof order.address === 'object' ? (
                                         <div className="space-y-1 mt-1">
                                           <p className="text-sm font-bold text-blue-900 leading-tight">
                                             {order.address.region}, {order.address.district}
                                           </p>
                                           <p className="text-xs font-bold text-blue-700">
                                             {order.address.street} {order.address.house}
                                           </p>
                                           {order.address.coords && (
                                             <a 
                                               href={`https://www.google.com/maps?q=${order.address.coords.lat},${order.address.coords.lng}`}
                                               target="_blank"
                                               rel="noopener noreferrer"
                                               className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all w-fit font-bold"
                                             >
                                               <MapPin className="w-3.5 h-3.5" /> Посмотреть на карте
                                             </a>
                                           )}
                                         </div>
                                       ) : (
                                         <p className="text-sm font-bold text-blue-900 leading-tight">{order.address}</p>
                                       )}
                                    </div>
                                  )}
                               </div>
                            </div>

                            {order.paymentScreenshot && (
                              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                 <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-3">Чек об оплате</h4>
                                 <a href={order.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="block relative aspect-video rounded-xl overflow-hidden border border-gray-200 group">
                                    <img src={order.paymentScreenshot || undefined} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <span className="text-[10px] font-black text-white uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full">Открыть фото</span>
                                    </div>
                                 </a>
                                 <p className="text-[9px] text-blue-500 mt-2 font-bold uppercase tracking-wider text-center">{order.paymentMethod || 'Не указан'}</p>
                                 {(order.status === 'pending' || order.status === 'need_to_pay') && (!activeOrderAction || activeOrderAction.id !== order.id) ? (
                                   <div className="mt-4 flex gap-2">
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setActiveOrderAction({ id: order.id, type: 'confirm' }); }}
                                         className="flex-1 py-3 bg-green-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-700 transition-all shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
                                       >
                                         Подтвердить
                                       </button>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setActiveOrderAction({ id: order.id, type: 'reject' }); }}
                                         className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
                                       >
                                         Отклонить
                                       </button>
                                    </div>
                                 ) : null}

                                 {activeOrderAction?.id === order.id && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="mt-4 p-3 bg-white border border-gray-100 rounded-xl shadow-inner space-y-3"
                                      onClick={e => e.stopPropagation()}
                                    >
                                       {activeOrderAction.type === 'confirm' ? (
                                          <>
                                             <p className="text-[10px] font-black uppercase text-blue-500 text-center">Выберите статус готовности</p>
                                             <div className="grid grid-cols-1 gap-2">
                                                <button 
                                                  onClick={async () => {
                                                     await updateDoc(doc(db, 'orders', order.id), { 
                                                       status: 'ready',
                                                       siteComment: 'Оплата подтверждена. Ваш заказ готов к выдаче!'
                                                     });
                                                     setActiveOrderAction(null);
                                                  }}
                                                  className="py-2 bg-green-50 text-green-700 rounded-lg border border-green-100 text-[10px] font-black uppercase tracking-wider hover:bg-green-100"
                                                >
                                                  Готов к выдаче
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                     setLocalReadinessValue(order.readinessTime?.toString().split(' ')[0] || '');
                                                     setActiveOrderAction({ id: order.id, type: 'confirm_time' as any });
                                                  }}
                                                  className="py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-[10px] font-black uppercase tracking-wider hover:bg-blue-100"
                                                >
                                                  Указать время
                                                </button>
                                                <button 
                                                  onClick={() => setActiveOrderAction(null)}
                                                  className="py-1 text-[8px] font-black uppercase text-blue-500 hover:text-gray-600 text-center"
                                                >
                                                  Назад
                                                </button>
                                             </div>
                                          </>
                                       ) : activeOrderAction.type === 'reject' ? (
                                          <div className="space-y-2">
                                             <p className="text-[10px] font-black uppercase text-blue-500">Причина отклонения</p>
                                             <textarea 
                                               className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold"
                                               placeholder="Например: Неверный чек / Оплата не поступила"
                                               value={order.siteComment || ''}
                                               onChange={async (e) => await updateDoc(doc(db, 'orders', order.id), { siteComment: e.target.value })}
                                             />
                                             <div className="flex gap-2">
                                                <button 
                                                  onClick={async () => {
                                                     await updateDoc(doc(db, 'orders', order.id), { 
                                                       status: 'cancelled',
                                                       siteComment: order.siteComment || 'Заказ отклонен. Пожалуйста, проверьте данные оплаты или свяжитесь с нами.'
                                                     });
                                                     setActiveOrderAction(null);
                                                  }}
                                                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md"
                                                >
                                                  Отменить заказ
                                                </button>
                                                <button 
                                                  onClick={() => setActiveOrderAction(null)}
                                                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                                >
                                                  Назад
                                                </button>
                                             </div>
                                          </div>
                                        ) : activeOrderAction.type === ('confirm_time' as any) ? (
                                           <div className="space-y-4">
                                              <div className="grid grid-cols-2 gap-2">
                                                 <div>
                                                   <label className="block text-[8px] font-black uppercase text-blue-500 mb-1">Срок</label>
                                                   <input 
                                                     type="text"
                                                     placeholder="Число"
                                                     className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold"
                                                     value={localReadinessValue}
                                                     onChange={(e) => setLocalReadinessValue(e.target.value)}
                                                   />
                                                 </div>
                                                 <div>
                                                   <label className="block text-[8px] font-black uppercase text-blue-500 mb-1">Ед. изм.</label>
                                                   <select 
                                                     className="w-full p-2 border border-gray-200 rounded-lg text-xs font-bold"
                                                     onChange={async (e) => {
                                                        const val = order.readinessTime?.toString().split(' ')[0] || '';
                                                        const unit = e.target.value;
                                                        await updateDoc(doc(db, 'orders', order.id), { readinessTime: `${val} ${unit}`.trim() });
                                                     }}
                                                   >
                                                      <option value="час">час</option>
                                                      <option value="дн">дн</option>
                                                   </select>
                                                 </div>
                                              </div>
                                              <button 
                                                onClick={async () => {
                                                   const unit = order.readinessTime?.toString().split(' ')[1] || 'час';
                                                   const timeString = `${localReadinessValue} ${unit}`.trim();
                                                   
                                                   const timeParts = timeString.split(' ');
                                                   const val = parseInt(timeParts[0]) || 0;
                                                   
                                                   let readyAt = new Date();
                                                   if (unit === 'час') readyAt.setHours(readyAt.getHours() + val);
                                                   else if (unit === 'дн') readyAt.setDate(readyAt.getDate() + val);
                                                   
                                                   await updateDoc(doc(db, 'orders', order.id), { 
                                                     status: 'confirmed',
                                                     readinessTime: timeString,
                                                     targetReadyAt: readyAt.toISOString(),
                                                     siteComment: `Заказ подтвержден. Будет готов через ${timeString}`
                                                   });
                                                   setActiveOrderAction(null);
                                                   setLocalReadinessValue('');
                                                }}
                                                className="w-full py-2 bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md"
                                              >
                                                Подтвердить время
                                              </button>
                                           </div>
                                        ) : null}
                                     </motion.div>
                                  )}
                              </div>
                            )}
                         </div>

                         <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-2 flex items-center gap-2">
                                <Edit className="w-3.5 h-3.5" /> Управление
                              </h4>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1 ml-1">Статус заказа</label>
                                  <select 
                                    value={order.status}
                                    onClick={e => e.stopPropagation()}
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
                                       <label className="block text-[8px] font-black uppercase tracking-wider text-blue-500 mb-1 ml-1">Время</label>
                                       <input 
                                         type="text" 
                                         placeholder="6"
                                         onClick={e => e.stopPropagation()}
                                         value={order.readinessTime?.toString().split(' ')[0] || ''}
                                         className="w-full p-2 rounded-lg border border-gray-200 font-bold bg-white text-sm"
                                         onChange={async (e) => {
                                            const val = e.target.value;
                                            const unit = order.readinessTime?.toString().split(' ')[1] || 'час';
                                            await updateDoc(doc(db, 'orders', order.id), { readinessTime: `${val} ${unit}`.trim() });
                                         }}
                                       />
                                     </div>
                                     <div>
                                       <label className="block text-[8px] font-black uppercase tracking-wider text-blue-500 mb-1 ml-1">Ед. изм.</label>
                                       <select 
                                         value={order.readinessTime?.toString().split(' ')[1] || 'час'}
                                         onClick={e => e.stopPropagation()}
                                         onChange={async (e) => {
                                            const val = order.readinessTime?.toString().split(' ')[0] || '';
                                            const unit = e.target.value;
                                            await updateDoc(doc(db, 'orders', order.id), { readinessTime: `${val} ${unit}`.trim() });
                                         }}
                                         className="w-full p-2.5 rounded-lg border border-gray-200 font-bold bg-gray-50 focus:bg-white text-sm"
                                       >
                                         <option value="час">час</option>
                                         <option value="дн">дн</option>
                                       </select>
                                     </div>
                                   </div>
                                 )}
                                 
                                 <div className="pt-2">
                                   <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1 ml-1">Адрес доставки</label>
                                   <textarea 
                                     value={order.address || ''}
                                     onClick={e => e.stopPropagation()}
                                     onChange={async (e) => await updateDoc(doc(db, 'orders', order.id), { address: e.target.value })}
                                     className="w-full p-3 rounded-lg border border-gray-200 font-bold bg-gray-50 focus:bg-white text-xs h-16"
                                     placeholder="Укажите адрес доставки..."
                                   />
                                 </div>
                                 
                                 <div className="pt-2">
                                   <label className="block text-[10px] font-black uppercase tracking-wider text-blue-500 mb-1 ml-1">Комментарий админа</label>
                                   <textarea 
                                     value={order.siteComment || ''}
                                     onClick={e => e.stopPropagation()}
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
                 <div className={`w-16 h-16 ${confirmData.title.toUpperCase().includes('ИМПОРТ') || confirmData.title.toUpperCase().includes('ДОБАВЛЕНИЕ') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-2xl flex items-center justify-center mb-6 mx-auto`}>
                    {confirmData.title.toUpperCase().includes('ИМПОРТ') || confirmData.title.toUpperCase().includes('ДОБАВЛЕНИЕ') ? <CheckCircle className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
                 </div>
                 <h3 className="text-2xl font-black text-blue-950 text-center mb-2 uppercase tracking-wider">{confirmData.title}</h3>
                 <p className="text-blue-400 text-center font-bold mb-8">{confirmData.message}</p>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setIsConfirmOpen(false)}
                      className="py-4 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-wider text-xs hover:bg-gray-200 transition-colors"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={() => {
                        const callback = confirmData.onConfirm;
                        setIsConfirmOpen(false);
                        setTimeout(callback, 0);
                      }}
                      className={`py-4 ${confirmData.title.toUpperCase().includes('ИМПОРТ') || confirmData.title.toUpperCase().includes('ДОБАВЛЕНИЕ') ? 'bg-green-600 shadow-green-200 hover:bg-green-700' : 'bg-red-600 shadow-red-200 hover:bg-red-700'} text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0`}
                    >
                      {confirmData.title.toUpperCase().includes('ИМПОРТ') || confirmData.title.toUpperCase().includes('ДОБАВЛЕНИЕ') ? 'Да, добавить' : 'Да, удалить'}
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
                <img src={editingCategory.image || undefined} className="w-16 h-16 rounded-lg object-cover" alt="" />
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
                <img src={editingProduct.image || undefined} className="w-16 h-16 rounded-lg object-cover" alt="" />
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
