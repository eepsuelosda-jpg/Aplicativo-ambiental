import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: fbUser.uid, ...userDoc.data() } as UserProfile);
        } else {
          // If eepsuelosda@gmail.com, make admin, otherwise inspector
          const role = fbUser.email === 'eepsuelosda@gmail.com' ? 'admin' : 'inspector';
          const newUser: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || 'Usuario',
            role: role as any,
            permissions: []
          };
          await setDoc(doc(db, 'users', fbUser.uid), {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            permissions: newUser.permissions
          });
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const Login: React.FC = () => {
  const { login } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('https://picsum.photos/seed/bogota/1920/1080?blur=10')] bg-cover bg-center">
      <div className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/20">
        <img src="https://www.bogota.gov.co/sites/default/files/logo-bogota.png" alt="Logo Bogotá" className="h-16 mx-auto mb-6" referrerPolicy="no-referrer" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Inspección EEP</h1>
        <p className="text-gray-600 mb-8 font-medium">Estructura Ecológica Principal de Bogotá</p>
        <button
          onClick={login}
          className="flex items-center justify-center gap-3 w-full bg-white text-gray-700 px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition font-semibold shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Ingresar con Google
        </button>
      </div>
    </div>
  );
};
