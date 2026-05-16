import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export interface Category {
  id: string;
  name: { ru: string; uz: string };
  image: string;
  order: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: { ru: string; uz: string };
  description: { ru: string; uz: string };
  price: number;
  image: string;
  tags?: string[];
  order?: number;
}

export interface newsItem {
  id: string;
  title: { ru: string; uz: string };
  content: { ru: string; uz: string };
  image: string;
  date: string;
}

export interface Partner {
  id: string;
  name: string;
  image: string;
}

export interface Branch {
  id: string;
  name: { ru: string; uz: string };
  address: { ru: string; uz: string };
  phone: string;
  mapLink: string;
}

export interface SiteUpdate {
  id: string;
  version: string;
  date: string;
  title: { ru: string; uz: string };
  content: { ru: string; uz: string };
}

export function useStoreData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [news, setNews] = useState<newsItem[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [updates, setUpdates] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      cats.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(cats);
    }, (error) => {
      console.error("Categories snapshot error:", error);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      prods.sort((a, b) => (a.order || 0) - (b.order || 0));
      setProducts(prods);
    }, (error) => {
      console.error("Products snapshot error:", error);
    });

    const unsubNews = onSnapshot(collection(db, 'news'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as newsItem));
      items.sort((a, b) => b.date.localeCompare(a.date));
      setNews(items);
    }, (error) => {
      console.error("News snapshot error:", error);
    });

    const unsubPartners = onSnapshot(collection(db, 'partners'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Partner));
      setPartners(items);
    }, (error) => {
      console.error("Partners snapshot error:", error);
    });

    const unsubBranches = onSnapshot(collection(db, 'branches'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
      setBranches(items);
    }, (error) => {
      console.error("Branches snapshot error:", error);
    });

    const unsubUpdates = onSnapshot(collection(db, 'updates'), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SiteUpdate));
      items.sort((a, b) => b.date.localeCompare(a.date));
      setUpdates(items);
      setLoading(false);
    }, (error) => {
      console.error("Updates snapshot error:", error);
      setLoading(false);
    });

    return () => {
      unsubCategories();
      unsubProducts();
      unsubNews();
      unsubPartners();
      unsubBranches();
      unsubUpdates();
    };
  }, []);

  return { categories, products, news, partners, branches, updates, loading };
}
