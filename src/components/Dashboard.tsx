import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { InspectionData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { ClipboardList, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'inspections'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InspectionData));
      setInspections(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getLocalityData = () => {
    const counts: Record<string, number> = {};
    inspections.forEach(ins => {
      const loc = ins.generalData.locality || 'Sin definir';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getComplianceData = () => {
    let totalC = 0;
    let totalI = 0;
    let totalNA = 0;
    inspections.forEach(ins => {
      Object.values(ins.situations || {}).forEach((s: any) => {
        if (s.status === 'C') totalC++;
        else if (s.status === 'I') totalI++;
        else totalNA++;
      });
    });
    return [
      { name: 'Cumple', value: totalC, color: '#10b981' },
      { name: 'Inconsistente', value: totalI, color: '#ef4444' },
      { name: 'N/A', value: totalNA, color: '#94a3b8' },
    ];
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Indicadores de Gestión</h2>
        <p className="text-gray-500 mt-1">Resumen ejecutivo del estado de las inspecciones en Bogotá.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><ClipboardList size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Visitas</p>
            <p className="text-3xl font-black text-gray-900">{inspections.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-50 text-green-600 rounded-2xl"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Localidades</p>
            <p className="text-3xl font-black text-gray-900">{new Set(inspections.map(i => i.generalData.locality)).size}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Incidencias</p>
            <p className="text-3xl font-black text-gray-900">{getComplianceData().find(d => d.name === 'Inconsistente')?.value || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><MapPin size={24} /></div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Zonas EEP</p>
            <p className="text-3xl font-black text-gray-900">{new Set(inspections.map(i => i.generalData.component)).size}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Localities Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin size={18} className="text-blue-500" />
            Inspecciones por Localidad
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLocalityData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Compliance Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <CheckCircle size={18} className="text-green-500" />
            Estado de Cumplimiento General
          </h3>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getComplianceData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getComplianceData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
