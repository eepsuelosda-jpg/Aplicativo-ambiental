import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, where, deleteDoc, doc } from 'firebase/firestore';
import { InspectionData } from '../types';
import { useAuth } from './AuthWrapper';
import { Eye, Trash2, Calendar, User, MapPin, ChevronRight, Search, Filter, FileText, Download, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const InspectionList: React.FC = () => {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const checklistItems = [
    "El cuerpo de agua se encuentra libre de escombros y/ residuos sólidos",
    "La Zona de manejo y preservación Ambiental ZMPA se encuentra despejada de escombros, RCD y/o Residuos Sólidos",
    "La infraestructura presente en la EEP cuenta con permiso de la Autoridad Ambiental Competente",
    "Las descargas de aguas lluvias al cuerpo de agua cuentan con Permiso EAAB ó POC ó lineamientos SER – SDA",
    "El componente de la EEP se encuentra protegido de derrames de Hidrocarburos u otros compuestos químicos",
    "El suelo de la EEP se encuentra libre de afectaciones al suelo como (compactación, excavación, otros)",
    "El arbolado o zonas verdes se encuentran libres de afectaciones (mecánicas, excavación, disposición, otras)",
    "El cerramiento de la obra hacia la EEP se encuentra en buen estado",
    "Los mojones de delimitación se encuentran materializados de acuerdo a lo establecido en el POT",
    "La EEP se encuentra libre de endurecimientos. ",
    "El componente de la EEP se encuentra despejado de actividades diferentes a las de recreación pasiva",
    "Se evidencian especies Ferales",
    "Se evidencian procesos de eutroficación",
    "Se evidencia presencia de habitantes de calle",
    "Se evidencia pastoreo de semovientes",
    "Se evidencian captaciones ilegales del Recurso Hídrico",
    "Se evidencian descarga de aguas residuales al cuerpo de agua y/o conexiones erradas",
    "Se evidencian quemas a cielo abierto",
    "La fauna existente en el sector se encuentra protegida de afectaciones",
    "Se mantiene el cerramiento de delimitación en las condiciones establecidas por la EAAB"
  ];

  useEffect(() => {
    if (!user) return;

    // Users see only their own, admins see all
    let q = query(collection(db, 'inspections'), orderBy('createdAt', 'desc'));
    if (user.role !== 'admin') {
      q = query(collection(db, 'inspections'), where('inspectorId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snap) => {
      setInspections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InspectionData)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const generatePDF = (ins: InspectionData) => {
    const doc = new jsPDF();
    
    // Header mimicking the original PDF
    doc.setFontSize(10);
    doc.text('EVALUACIÓN, CONTROL Y SEGUIMIENTO', 105, 10, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Acta de visita técnica a componentes de la Estructura Ecológica Principal – EEP', 105, 18, { align: 'center', maxWidth: 180 });
    doc.setFont('helvetica', 'normal');
    
    // Header Table
    autoTable(doc, {
      startY: 25,
      body: [
        ['COMPONENTE', ins.generalData.component, 'RADICADO', ins.generalData.fileNo],
        ['DIRECCIÓN', ins.generalData.address, 'LOCALIDAD', ins.generalData.locality],
        ['FECHA VISITA', ins.generalData.visitDate, 'HORA INICIO', ins.generalData.startTime],
        ['INSPECTOR', ins.inspectorName, 'AUTORIDAD', ins.generalData.authority]
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 
        0: { fillColor: [240, 240, 240], fontStyle: 'bold' },
        2: { fillColor: [240, 240, 240], fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('1- MOTIVO DE LA VISITA', 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ins.reason, 14, finalY + 6, { maxWidth: 185 });

    const tableY = finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('2- SITUACIONES ENCONTRADAS', 14, tableY);

    // Checklist Table
    const tableRows = checklistItems.map((item, idx) => {
      const situation = ins.situations[idx] || { status: 'NA', description: '' };
      return [item, situation.status === 'C' ? 'X' : '', situation.status === 'I' ? 'X' : '', situation.status === 'NA' ? 'X' : '', situation.description];
    });

    autoTable(doc, {
      startY: tableY + 5,
      head: [['ASPECTO A EVALUAR', 'C', 'I', 'NA', 'DESCRIPCIÓN']],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center', cellWidth: 10 },
        4: { cellWidth: 'auto' }
      },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0] }
    });

    const considerationsY = (doc as any).lastAutoTable.finalY + 10;
    if (considerationsY > 260) doc.addPage();
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSIDERACIONES FINALES', 14, considerationsY > 260 ? 20 : considerationsY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ins.finalConsiderations, 14, (considerationsY > 260 ? 20 : considerationsY) + 6, { maxWidth: 185 });

    // Photos Section
    if (ins.photos && ins.photos.length > 0) {
      doc.addPage();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('REGISTRO FOTOGRÁFICO', 105, 15, { align: 'center' });
      
      let photoY = 25;
      ins.photos.forEach((photo, idx) => {
        try {
          doc.addImage(photo, 'JPEG', 14, photoY, 180, 80);
          photoY += 85;
          if (idx === 1 && ins.photos.length > 2) {
            doc.addPage();
            photoY = 25;
          }
        } catch (e) {
          console.error("Error adding image to PDF:", e);
        }
      });
    }

    doc.save(`inspeccion_${ins.generalData.component.replace(/\s+/g, '_')}_${ins.generalData.visitDate}.pdf`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Desea eliminar este registro de inspección?')) {
      try {
        await deleteDoc(doc(db, 'inspections', id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredInspections = inspections.filter(ins => 
    ins.generalData.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ins.generalData.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ins.generalData.locality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Historial de Inspecciones</h2>
          <p className="text-gray-500 mt-1">Registros existentes en la base de datos de la EEP.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por componente, barrio o localidad..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition shadow-sm bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-300 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron inspecciones</h3>
            <p className="text-gray-500">Cree una nueva inspección o ajuste sus filtros de búsqueda.</p>
          </div>
        ) : (
          filteredInspections.map((ins) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={ins.id}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition group"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900">{ins.generalData.component}</h3>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest rounded-lg">
                      {ins.generalData.locality}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {ins.generalData.visitDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      {ins.generalData.neighborhood}
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {ins.inspectorName}
                    </div>
                    {ins.photos && ins.photos.length > 0 && (
                      <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <Camera size={16} />
                        {ins.photos.length} {ins.photos.length === 1 ? 'Foto' : 'Fotos'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-gray-50">
                  <button 
                    onClick={() => generatePDF(ins)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition text-sm"
                  >
                    <Download size={18} /> PDF
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition text-sm">
                    <Eye size={18} /> Ver Acta
                  </button>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => ins.id && handleDelete(ins.id)}
                      className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                  <div className="hidden md:block">
                    <ChevronRight size={24} className="text-gray-300 group-hover:text-blue-500 transition" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
