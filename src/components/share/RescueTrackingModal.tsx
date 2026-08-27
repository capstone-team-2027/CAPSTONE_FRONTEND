import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Radio, X } from 'lucide-react';
import { useSocket } from '../../hook/useSocket';
import 'leaflet/dist/leaflet.css';

const garageLocation: [number, number] = [15.9675, 108.2605];

// Dùng đúng bộ icon của MapTracking (customer) và TechnicianRescuePage để ba màn đồng nhất.
const customerIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#DC2626" stroke="white" stroke-width="1.5">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const technicianIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744402.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Icon gara — dùng SVG nhúng trực tiếp thay vì ảnh PNG tải từ CDN ngoài, vì các nguồn ảnh
// bên ngoài (vd flaticon) có thể chặn hotlink và hiện icon lỗi (⊘).
const garageIcon = L.divIcon({
  className: 'custom-garage-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#00285E;border-radius:9999px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21V10l9-7 9 7v11" />
        <path d="M9 21v-6h6v6" />
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

type Rescue = {
  id: number;
  status: string;
  customer_lat: number | string;
  customer_lng: number | string;
  technician?: { fullName?: string; latitude?: number | string | null; longitude?: number | string | null };
};

function FitMap({ points }: { points: [number, number][] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (hasFittedRef.current || points.length === 0) return;
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [45, 45] });
    else if (points.length === 1) map.setView(points[0], 15);
    hasFittedRef.current = true;
  }, [map, points]);
  return null;
}

export default function RescueTrackingModal({ rescue, customerName, onClose }: { rescue: Rescue | null; customerName: string; onClose: () => void }) {
  const socket = useSocket();
  const customerLocation = useMemo<[number, number] | null>(() => {
    const lat = Number(rescue?.customer_lat); const lng = Number(rescue?.customer_lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }, [rescue]);
  const fallbackTechnicianLocation = useMemo<[number, number] | null>(() => {
    const lat = Number(rescue?.technician?.latitude); const lng = Number(rescue?.technician?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  }, [rescue?.technician?.latitude, rescue?.technician?.longitude]);
  const [liveTechnicianLocation, setLiveTechnicianLocation] = useState<[number, number] | null>(null);
  const technicianLocation = liveTechnicianLocation || fallbackTechnicianLocation;
  const [route, setRoute] = useState<[number, number][]>([]);
  const lastRouteRef = useRef(0);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    if (!rescue) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const join = () => socket.emit(
      'join-rescue-tracking',
      { rescueId: rescue.id, token },
      (result: { success?: boolean; message?: string }) => setTrackingError(result?.success ? '' : (result?.message || 'Không thể kết nối theo dõi realtime')),
    );
    const update = (data: { rescueId?: number; latitude?: number; longitude?: number }) => {
      if (Number(data?.rescueId) !== Number(rescue.id)) return;
      const lat = Number(data.latitude); const lng = Number(data.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLiveTechnicianLocation([lat, lng]);
        setTrackingError('');
      }
    };
    join(); socket.on('connect', join); socket.on('rescue-location-updated', update);
    return () => { socket.emit('leave-rescue-tracking', rescue.id); socket.off('connect', join); socket.off('rescue-location-updated', update); };
  }, [rescue, socket]);

  useEffect(() => {
    if (!rescue || !technicianLocation || !customerLocation) return;
    const now = Date.now(); if (now - lastRouteRef.current < 15000) return; lastRouteRef.current = now;
    const destination = rescue.status === 'TOWING' ? garageLocation : customerLocation;
    fetch(`https://router.project-osrm.org/route/v1/driving/${technicianLocation[1]},${technicianLocation[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`)
      .then(r => r.json()).then(data => setRoute((data.routes?.[0]?.geometry?.coordinates || []).map((c: [number, number]) => [c[1], c[0]])))
      .catch(error => console.error('Không thể tải tuyến đường cứu hộ:', error));
  }, [customerLocation, rescue, technicianLocation]);

  if (!rescue) return null;
  const destination = rescue.status === 'TOWING' ? garageLocation : customerLocation;
  const points = [technicianLocation, destination].filter(Boolean) as [number, number][];
  return <div className="fixed inset-0 z-[1200] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white w-full max-w-5xl h-[82vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="px-5 py-4 flex items-center justify-between border-b">
        <div><h2 className="font-black text-[#00285E] flex items-center gap-2"><Radio className="text-emerald-500 animate-pulse" size={19}/> Theo dõi cứu hộ realtime</h2><p className="text-xs text-slate-500 mt-1">{rescue.technician?.fullName || 'Kỹ thuật viên'} → {rescue.status === 'TOWING' ? 'Gara' : customerName}</p></div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X size={20}/></button>
      </div>
      <div className="flex-1 relative">
        {customerLocation ? <MapContainer center={technicianLocation || customerLocation} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
          <Marker position={customerLocation} icon={customerIcon}><Popup>Vị trí khách hàng: {customerName}</Popup></Marker>
          {technicianLocation && <Marker position={technicianLocation} icon={technicianIcon}><Popup>{rescue.technician?.fullName || 'Kỹ thuật viên'} đang ở đây</Popup></Marker>}
          {rescue.status === 'TOWING' && <Marker position={garageLocation} icon={garageIcon}><Popup>Gara</Popup></Marker>}
          {route.length > 0 && <Polyline positions={route} color="#2563eb" weight={6} opacity={0.75}/>}<FitMap points={points}/>
        </MapContainer> : <div className="h-full flex flex-col items-center justify-center text-slate-400"><MapPin size={52}/><p className="mt-3 font-semibold">Chưa có tọa độ khách hàng</p></div>}
        {!technicianLocation && <div className="absolute z-[500] left-1/2 top-4 -translate-x-1/2 bg-white/95 shadow-lg rounded-full px-4 py-2 text-xs font-bold text-amber-600 flex items-center gap-2"><Navigation size={14}/> Đang chờ tín hiệu GPS từ kỹ thuật viên...</div>}
        {trackingError && <div className="absolute z-[500] left-1/2 bottom-4 -translate-x-1/2 bg-rose-600 text-white shadow-lg rounded-full px-4 py-2 text-xs font-bold">{trackingError}</div>}
      </div>
    </div>
  </div>;
}
