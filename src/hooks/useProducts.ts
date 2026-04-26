import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { products as localProducts, Product } from '../data/products';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(localProducts);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const firestoreProducts = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {} as Record<string, any>);

      setProducts(localProducts.map(p => ({
        ...p,
        price: firestoreProducts[p.id]?.price !== undefined ? firestoreProducts[p.id].price : p.price,
        image: firestoreProducts[p.id]?.image !== undefined ? firestoreProducts[p.id].image : p.image
      })));
    });
    return unsubscribe;
  }, []);

  return products;
}
