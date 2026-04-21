import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { UserCog, Trash2, Shield, Mail, User } from 'lucide-react';

export const AdminModule: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'inspector' : 'admin';
    if (user.email === 'eepsuelosda@gmail.com') {
      alert('No se puede cambiar el rol del administrador principal.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email === 'eepsuelosda@gmail.com') return;
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h2>
        <p className="text-gray-500 mt-1">Administre roles y permisos de acceso al sistema.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Usuario</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Email</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px]">Rol</th>
              <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-[10px] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.uid} className="hover:bg-gray-50/50 transition duration-300">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                      {u.name[0]}
                    </div>
                    <span className="font-bold text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2 text-gray-600 italic">
                    <Mail size={14} />
                    <span className="text-sm">{u.email}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleToggleRole(u)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Cambiar Rol"
                    >
                      <Shield size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.uid, u.email)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar Usuario"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
