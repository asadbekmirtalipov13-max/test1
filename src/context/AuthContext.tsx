import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check if user exists in DB
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);

          let role = 'client';
          // Default admin check based on email
          if (currentUser.email === 'asadbekmirtalipov13@gmail.com' && currentUser.emailVerified) {
            role = 'admin';
          }

          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email?.toLowerCase(),
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: role,
              createdAt: new Date().toISOString()
            });
            setIsAdmin(role === 'admin');
          } else {
            setIsAdmin(userSnap.data().role === 'admin' || role === 'admin');
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Error signing in with Google", error);
      if (error.code === 'auth/popup-blocked') {
        alert('Пожалуйста, разрешите всплывающие окна в браузере для входа.');
      } else if (error.code !== 'auth/popup-closed-by-user') {
        alert('Ошибка при входе. Попробуйте еще раз. Если проблема не решается, попробуйте отключить блокировщики рекламы или зайти с другого браузера/устройства.');
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
