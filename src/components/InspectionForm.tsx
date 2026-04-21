import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from './AuthWrapper';
import { MapPin, Save, Clipboard, Map as MapIcon, Info, CheckCircle2, AlertCircle, HelpCircle, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

const localidades = [
  "Usaquén", "Chapinero", "Santa Fe", "San Cristóbal", "Usme", "Tunjuelito", "Bosa", 
  "Kennedy", "Fontibón", "Engativá", "Suba", "Barrios Unidos", "Teusaquillo", 
  "Los Mártires", "Antonio Nariño", "Puente Aranda", "La Candelaria", 
  "Rafael Uribe Uribe", "Ciudad Bolívar", "Sumapaz"
];

const schema = z.object({
  generalData: z.object({
    component: z.string().min(1, "Requerido"),
    address: z.string().min(1, "Requerido"),
    locality: z.string().min(1, "Requerido"),
    neighborhood: z.string().min(1, "Requerido"),
    entryRadicado: z.string().optional(),
    process: z.string().optional(),
    visitDate: z.string().min(1, "Requerido"),
    startTime: z.string().min(1, "Requerido"),
    authority: z.string().default("Secretaría Distrital de Ambiente"),
    fileNo: z.string().min(1, "Requerido"),
  }),
  reason: z.string().min(5, "Especifique el motivo de visita"),
  situations: z.record(z.string(), z.object({
    status: z.enum(['C', 'I', 'NA']),
    description: z.string().optional()
  })),
  finalConsiderations: z.string().min(5, "Especifique consideraciones"),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

export const InspectionForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 3) {
      alert("Máximo 3 fotos permitidas");
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      generalData: {
        authority: "Secretaría Distrital de Ambiente",
        visitDate: new Date().toISOString().split('T')[0],
        startTime: new Date().toTimeString().slice(0, 5),
      },
      location: { lat: 4.6097, lng: -74.0817 }, // Central Bogotá
      situations: checklistItems.reduce((acc, _, idx) => ({ 
        ...acc, 
        [idx]: { status: 'NA', description: '' } 
      }), {})
    }
  });

  const onSubmit = async (data: any) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'inspections'), {
        ...data,
        photos,
        inspectorId: user.uid,
        inspectorName: user.name,
        createdAt: Timestamp.now(),
      });
      alert('Inspección guardada exitosamente');
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inspections');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setLocationFromBrowser = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setValue('location.lat', pos.coords.latitude);
      setValue('location.lng', pos.coords.longitude);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Nueva Inspección Técnica</h2>
          <p className="text-gray-500 mt-1">Diligencie todos los campos requeridos para el reporte de la EEP.</p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando...' : <><Save size={20} /> Guardar Inspección</>}
        </button>
      </div>

      {/* Datos Generales */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Clipboard size={22} /></div>
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide text-sm">Datos Generales</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Componente de la EEP</label>
            <input {...register('generalData.component')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" placeholder="Ej: Canal Salitre" />
            {errors.generalData?.component && <p className="text-red-500 text-xs">{errors.generalData.component.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Dirección</label>
            <input {...register('generalData.address')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
            {errors.generalData?.address && <p className="text-red-500 text-xs">{errors.generalData.address.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Localidad</label>
            <select {...register('generalData.locality')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition">
              <option value="">Seleccione...</option>
              {localidades.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Barrio</label>
            <input {...register('generalData.neighborhood')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Radicado / Expediente</label>
            <input {...register('generalData.fileNo')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" placeholder="08-2017-775" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Proceso</label>
            <input {...register('generalData.process')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Fecha de Visita</label>
            <input type="date" {...register('generalData.visitDate')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Hora Inicio</label>
            <input type="time" {...register('generalData.startTime')} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Coordenadas</label>
            <div className="flex gap-2">
              <input type="number" step="any" {...register('location.lat')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs" />
              <input type="number" step="any" {...register('location.lng')} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs" />
              <button 
                type="button" 
                onClick={setLocationFromBrowser}
                className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                title="Obtener ubicación actual"
              >
                <MapPin size={20} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Motivo de Visita */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Info size={22} /></div>
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide text-sm">1. Motivo de la Visita</h3>
        </div>
        <textarea 
          {...register('reason')} 
          rows={3} 
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Describa el motivo de la inspección técnica..."
        />
        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
      </section>

      {/* Situaciones Encontradas */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><MapIcon size={22} /></div>
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide text-sm">2. Situaciones Encontradas</h3>
        </div>
        
        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Aspecto a Evaluar</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">C</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">I</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">NA</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción / Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checklistItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-700 text-sm leading-relaxed">{item}</td>
                  <td className="px-2 py-4 text-center">
                    <input type="radio" value="C" {...register(`situations.${idx}.status`)} className="w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500" />
                  </td>
                  <td className="px-2 py-4 text-center">
                    <input type="radio" value="I" {...register(`situations.${idx}.status`)} className="w-5 h-5 text-red-600 border-gray-300 focus:ring-red-500" />
                  </td>
                  <td className="px-2 py-4 text-center">
                    <input type="radio" value="NA" {...register(`situations.${idx}.status`)} className="w-5 h-5 text-gray-400 border-gray-300 focus:ring-gray-400" />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      {...register(`situations.${idx}.description`)} 
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 transition" 
                      placeholder="Obs..." 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Consideraciones Finales */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><CheckCircle2 size={22} /></div>
          <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide text-sm">Consideraciones Finales</h3>
        </div>
        <textarea 
          {...register('finalConsiderations')} 
          rows={4} 
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Escriba sus conclusiones de la visita técnica..."
        />
        {errors.finalConsiderations && <p className="text-red-500 text-xs mt-1">{errors.finalConsiderations.message}</p>}
      </section>

      {/* Registro Fotográfico */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Camera size={22} /></div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wide text-sm">Registro Fotográfico</h3>
              <p className="text-xs text-gray-500 mt-1">Adjunte hasta 3 fotografías de la inspección.</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${photos.length === 3 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {photos.length} / 3 Fotos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AnimatePresence>
            {photos.map((photo, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-200"
              >
                <img src={photo} alt={`Inspección ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {photos.length < 3 && (
            <label className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500">
              <Camera size={24} />
              <span className="text-xs font-bold uppercase">Añadir Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </label>
          )}
        </div>
      </section>
    </form>
  );
};
