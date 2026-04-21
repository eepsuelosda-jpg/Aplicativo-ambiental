/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, Login, useAuth } from './components/AuthWrapper';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { InspectionForm } from './components/InspectionForm';
import { InspectionList } from './components/InspectionList';
import { MapModule } from './components/MapModule';
import { AdminModule } from './components/AdminModule';
import { PlusCircle, ListFilter } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 uppercase tracking-widest font-black text-blue-600 animate-pulse">
        Cargando Sistema...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inspecciones':
        return showForm ? (
          <div className="space-y-6">
            <button 
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-100 transition flex items-center gap-2"
            >
              <ListFilter size={18} /> Volver al Listado
            </button>
            <InspectionForm onSuccess={() => setShowForm(false)} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                <PlusCircle size={20} /> Nueva Inspección
              </button>
            </div>
            <InspectionList />
          </div>
        );
      case 'mapa':
        return <MapModule />;
      case 'usuarios':
        return <AdminModule />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderTab()}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
