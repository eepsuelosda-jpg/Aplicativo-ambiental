import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { InspectionData, Zone } from '../types';
import { MapPin, Plus, Save, Trash2, X, Square, MousePointer2, Eraser } from 'lucide-react';

// Fix for default marker icons in Leaflet
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const BOGOTA_CENTER: [number, number] = [4.6097, -74.0817];

const LocationMarker = ({ 
  setCoords, 
  type, 
  polygonPoints, 
  setPolygonPoints 
}: { 
  setCoords: (c: [number, number]) => void,
  type: 'point' | 'area',
  polygonPoints: [number, number][],
  setPolygonPoints: (pts: [number, number][]) => void
}) => {
  useMapEvents({
    click(e) {
      if (type === 'point') {
        setCoords([e.latlng.lat, e.latlng.lng]);
      } else {
        setPolygonPoints([...polygonPoints, [e.latlng.lat, e.latlng.lng]]);
      }
    },
  });
  return null;
};

export const MapModule: React.FC = () => {
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [drawingType, setDrawingType] = useState<'point' | 'area'>('point');
  const [newZoneCoords, setNewZoneCoords] = useState<[number, number] | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([]);
  const [zoneName, setZoneName] = useState('');
  const [zoneLocality, setZoneLocality] = useState('');

  useEffect(() => {
    const unsubIns = onSnapshot(collection(db, 'inspections'), (snap) => {
      setInspections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InspectionData)));
    });
    const unsubZones = onSnapshot(collection(db, 'zones'), (snap) => {
      setZones(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone)));
    });
    return () => { unsubIns(); unsubZones(); };
  }, []);

  const handleSaveZone = async () => {
    if (drawingType === 'point' && !newZoneCoords) return;
    if (drawingType === 'area' && polygonPoints.length < 3) return;
    if (!zoneName || !zoneLocality) return;

    try {
      await addDoc(collection(db, 'zones'), {
        name: zoneName,
        locality: zoneLocality,
        type: drawingType,
        coordinates: drawingType === 'point' ? newZoneCoords : polygonPoints,
        createdAt: Timestamp.now()
      });
      setIsAddingZone(false);
      setNewZoneCoords(null);
      setPolygonPoints([]);
      setZoneName('');
      setZoneLocality('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Mapa EEP Bogotá</h2>
          <p className="text-gray-500 mt-1">Geolocalización de inspecciones y zonas de interés.</p>
        </div>
        <button
          onClick={() => {
            setIsAddingZone(!isAddingZone);
            setPolygonPoints([]);
            setNewZoneCoords(null);
          }}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition shadow-lg ${
            isAddingZone ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
          }`}
        >
          {isAddingZone ? <><X size={20} /> Cancelar</> : <><Plus size={20} /> Marcar Zona</>}
        </button>
      </div>

      <div className="relative group">
        <MapContainer 
          {...({
            center: BOGOTA_CENTER,
            zoom: 11,
            className: "h-[600px] w-full rounded-3xl overflow-hidden shadow-inner border border-gray-100",
            children: (
              <>
                <TileLayer
                  {...({
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  } as any)}
                />
                
                {inspections.map((ins) => (
                  <Marker key={ins.id} position={[ins.location.lat, ins.location.lng]}>
                    <Popup {...({ className: "rounded-2xl overflow-hidden shadow-xl border-none p-0" } as any)}>
                      <div className="p-4 w-64">
                        <div className="bg-blue-600 -mx-4 -mt-4 p-3 mb-3 text-white">
                          <h4 className="font-bold truncate">{ins.generalData.component}</h4>
                          <p className="text-xs opacity-80">{ins.generalData.locality} - {ins.generalData.neighborhood}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 leading-snug"><span className="font-bold">Fecha:</span> {ins.generalData.visitDate}</p>
                          <p className="text-xs text-gray-600 leading-snug"><span className="font-bold">Inspector:</span> {ins.inspectorName}</p>
                          <button className="w-full mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition py-2 bg-blue-50 rounded-lg">Ver Detalles</button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {zones.map((zone) => {
                  if (zone.type === 'point') {
                    return (
                      <Circle 
                        key={zone.id} 
                        {...({
                          center: zone.coordinates as [number, number],
                          radius: 300,
                          pathOptions: { fillColor: 'red', color: 'red', fillOpacity: 0.2 },
                          children: (
                            <Popup>
                              <div className="p-2">
                                <h4 className="font-bold text-red-600 uppercase text-xs tracking-wider">{zone.name}</h4>
                                <p className="text-xs text-gray-500">Localidad: {zone.locality}</p>
                              </div>
                            </Popup>
                          )
                        } as any)}
                      />
                    );
                  } else if (zone.type === 'area') {
                    return (
                      <Polygon
                        key={zone.id}
                        {...({
                          positions: zone.coordinates as [number, number][],
                          pathOptions: { fillColor: 'orange', color: 'orange', fillOpacity: 0.3 },
                          children: (
                            <Popup>
                              <div className="p-2">
                                <h4 className="font-bold text-orange-600 uppercase text-xs tracking-wider">{zone.name}</h4>
                                <p className="text-xs text-gray-500">Localidad: {zone.locality} (Área)</p>
                              </div>
                            </Popup>
                          )
                        } as any)}
                      />
                    );
                  }
                  return null;
                })}

                {isAddingZone && (
                  <LocationMarker 
                    setCoords={setNewZoneCoords} 
                    type={drawingType}
                    polygonPoints={polygonPoints}
                    setPolygonPoints={setPolygonPoints}
                  />
                )}
                
                {drawingType === 'point' && newZoneCoords && (
                  <Marker position={newZoneCoords}>
                    <Popup {...({ autoOpen: true } as any)}>Nueva Zona Puntuada</Popup>
                  </Marker>
                )}

                {drawingType === 'area' && polygonPoints.length > 0 && (
                  <>
                    {polygonPoints.map((pt, i) => (
                      <Circle 
                        key={i} 
                        {...({
                          center: pt,
                          radius: 10,
                          pathOptions: { color: 'green', fillColor: 'green' }
                        } as any)} 
                      />
                    ))}
                    {polygonPoints.length >= 2 && (
                      <Polygon
                        {...({
                          positions: polygonPoints,
                          pathOptions: { color: 'green', dashArray: '5, 5', fillOpacity: 0.1 }
                        } as any)}
                      />
                    )}
                  </>
                )}
              </>
            )
          } as any)}
        />

        {isAddingZone && (
          <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/20 w-80 space-y-4">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">Nueva Zona de Interés</h3>
            
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => { setDrawingType('point'); setPolygonPoints([]); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  drawingType === 'point' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <MousePointer2 size={14} /> Punto
              </button>
              <button
                onClick={() => { setDrawingType('area'); setNewZoneCoords(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                  drawingType === 'area' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Square size={14} /> Área
              </button>
            </div>

            <p className="text-xs text-gray-500 italic">
              {drawingType === 'point' 
                ? 'Haga clic en el mapa para ubicar el punto central.' 
                : 'Haga clic en varios puntos para rodear el área. Mínimo 3 puntos.'}
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Nombre</label>
                <input 
                  value={zoneName} 
                  onChange={e => setZoneName(e.target.value)} 
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Ej: Humedal Juan Amarillo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase">Localidad</label>
                <input 
                  value={zoneLocality} 
                  onChange={e => setZoneLocality(e.target.value)} 
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-1 focus:ring-blue-500" 
                  placeholder="Localidad..."
                />
              </div>

              {drawingType === 'area' && polygonPoints.length > 0 && (
                <button 
                  onClick={() => setPolygonPoints([])}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition"
                >
                  <Eraser size={14} /> Reiniciar Área ({polygonPoints.length} pts)
                </button>
              )}

              <button 
                onClick={handleSaveZone}
                disabled={!zoneName || !zoneLocality || (drawingType === 'point' ? !newZoneCoords : polygonPoints.length < 3)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} /> Guardar {drawingType === 'point' ? 'Marca' : 'Polígono'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
