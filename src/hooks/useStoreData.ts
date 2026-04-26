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

export function useStoreData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      cats.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(cats);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      prods.sort((a, b) => (a.order || 0) - (b.order || 0));
      setProducts(prods);
      setLoading(false);
    });

    return () => {
      unsubCategories();
      unsubProducts();
    };
  }, []);

  return { categories, products, loading };
}
