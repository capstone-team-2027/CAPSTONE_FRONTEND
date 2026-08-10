import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Siren, MapPin, Navigation, Phone, CheckCircle, CarFront, Loader2, Radio, RadioTower } from 'lucide-react';
import { useFetchClient } from '../../../hook/useFetchClient';
import { TASK_ASSIGNMENT_ENDPOINTS } from '../../../constants/technician/taskAssignmentEndpoint';
import { useSocket } from '../../../hook/useSocket';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const garageIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const carIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744402.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Icon vị trí KTV lúc đứng yên (chưa bắt đầu di chuyển) — phân biệt với garageIcon (Gara thật)
// và carIcon (xe đang di chuyển trong lúc mô phỏng).
const technicianIcon = L.divIcon({
  className: 'custom-technician-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:35px;height:35px;background:#00285E;border-radius:9999px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </div>
  `,
  iconSize: [35, 35],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17],
});

// Icon vị trí khách hàng — SVG nhúng trực tiếp (lucide MapPin) thay vì ảnh PNG tải từ CDN ngoài,
// vì các nguồn ảnh bên ngoài (vd flaticon) có thể chặn hotlink và hiện icon lỗi (⊘).
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:45px;height:45px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" viewBox="0 0 24 24" fill="#DC2626" stroke="white" stroke-width="1.5">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
      </svg>
    </div>
  `,
  iconSize: [45, 45],
  iconAnchor: [22, 45],
  popupAnchor: [0, -45],
});

const MapFitter = ({ bounds, lat, lng }: { bounds?: L.LatLngBounds | null, lat?: number; lng?: number }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (lat && lng) {
      map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, bounds, map]);
  return null;
};

// Toạ độ Gara cố định — khớp với MapTracking.tsx (480 Trần Quốc Hoàn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng)
const garageLocation: [number, number] = [15.9675, 108.2605];

export default function TechnicianRescuePage() {
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const [rescueTask, setRescueTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const [carLocation, setCarLocation] = useState<[number, number]>([15.9675, 108.2605]);
  const [technicianLocation, setTechnicianLocation] = useState<[number, number]>([15.9675, 108.2605]); // Default to Garage Đà Nẵng, update via GPS
  const [hasTechnicianLocation, setHasTechnicianLocation] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const gpsWatchRef = useRef<number | null>(null);
  const lastLocationEmitRef = useRef(0);
  const lastRouteFetchRef = useRef(0);

  const showToast = (text: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchActiveRescue = async () => {
    try {
      setLoading(true);
      const res = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_MY_RESCUE);
      if (res?.data) {
        setRescueTask(res.data);
      } else {
        setRescueTask(null);
      }
    } catch (error) {
      console.error('Lỗi lấy thông tin cứu hộ:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopLocationSharing = useCallback(() => {
    if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    gpsWatchRef.current = null;
    setIsSharingLocation(false);
  }, []);

  const getCurrentGps = () => new Promise<[number, number]>((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error('Thiết bị không hỗ trợ GPS'));
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.latitude, position.coords.longitude]),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
  });

  const startLocationSharing = useCallback((rescueId: number) => {
    if (!("geolocation" in navigator) || gpsWatchRef.current !== null) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    socket.emit('join-rescue-tracking', { rescueId, token });
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        const location: [number, number] = [position.coords.latitude, position.coords.longitude];
        setTechnicianLocation(location);
        setCarLocation(location);
        setHasTechnicianLocation(true);
        if (now - lastLocationEmitRef.current < 3000) return;
        lastLocationEmitRef.current = now;
        socket.emit('update-rescue-location', {
          token,
          rescueId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        });
      },
      (error) => {
        console.error('Lỗi chia sẻ GPS:', error);
        showToast('Mất tín hiệu GPS. Hãy kiểm tra quyền vị trí trên điện thoại.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
    setIsSharingLocation(true);
  }, [socket]);

  useEffect(() => () => stopLocationSharing(), [stopLocationSharing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActiveRescue();
    
    // Nhận nhiệm vụ cứu hộ mới realtime — BE emit 'new_notification' qua room 'user-{id}' (đã
    // được TechnicianLayout tự join sẵn) khi lễ tân gán KTV cho 1 cuốc cứu hộ.
    if (socket) {
      const handleNewNotification = (data: any) => {
        if (data?.type === 'RESCUE_ASSIGNED') {
          showToast('Bạn vừa nhận được một cuốc cứu hộ mới!', 'info');
          fetchActiveRescue();
        }
      };

      socket.on('new_notification', handleNewNotification);
      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đoạn 1 (KTV -> khách): điểm xuất phát là GPS realtime của KTV, đích là vị trí khách.
  // Đoạn 2 (khách -> Gara, khi status = TOWING): điểm xuất phát cố định là vị trí khách (nơi KTV
  // vừa nhận xe), đích là Gara — không dùng GPS realtime nữa vì KTV đang lái, không đứng yên bấm nút.
  useEffect(() => {
    if (!rescueTask?.customer_lat || !rescueTask?.customer_lng) return;
    const now = Date.now();
    const isLiveMovement = rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'TOWING';
    if (isLiveMovement && now - lastRouteFetchRef.current < 20000) return;
    lastRouteFetchRef.current = now;

    const isTowingBack = rescueTask.status === 'TOWING' || rescueTask.status === 'COMPLETED';
    const customerLat = parseFloat(rescueTask.customer_lat);
    const customerLng = parseFloat(rescueTask.customer_lng);
    const from: [number, number] = isTowingBack ? [customerLat, customerLng] : technicianLocation;
    const to: [number, number] = isTowingBack ? garageLocation : [customerLat, customerLng];

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distKm = (route.distance / 1000).toFixed(1);
          const durMin = Math.ceil(route.duration / 60);
          setDistance(`${distKm} km`);
          setDuration(`${durMin} phút`);

          const coordsArray: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]]
          );
          setRouteCoords(coordsArray);
          const bounds = L.latLngBounds([from, to]);
          coordsArray.forEach(c => bounds.extend(c));
          setMapBounds(bounds);
        }
      } catch (error) {
        console.error("Lỗi khi lấy đường đi:", error);
      }
    };

    fetchRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescueTask?.customer_lat, rescueTask?.customer_lng, rescueTask?.status, technicianLocation]);

  const updateStatus = async (newStatus: string, gpsLocation?: [number, number]) => {
    if (!rescueTask) return;
    try {
      setActionLoading(true);
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_RESCUE, 'PATCH', {
        rescueId: rescueTask.id,
        status: newStatus,
        // Gửi kèm GPS hiện tại của KTV khi bắt đầu 1 đoạn di chuyển mới (tới khách hoặc chở về
        // Gara) — BE lưu vào User.latitude/longitude và gửi lại cho khách hàng để cả 2 phía tính
        // CÙNG 1 route xuất phát từ vị trí thật.
        ...(newStatus === 'EN_ROUTE' || newStatus === 'TOWING'
          ? { technicianLat: (gpsLocation || technicianLocation)[0], technicianLng: (gpsLocation || technicianLocation)[1] }
          : {}),
      });
      lastRouteFetchRef.current = 0;
      setRescueTask({ ...rescueTask, status: newStatus });

      // Không tự gọi startCarSimulation() ở đây — route cho đoạn mới (EN_ROUTE/TOWING) chưa kịp
      // fetch xong tại thời điểm này. Effect riêng theo dõi routeCoords sẽ tự bắt đầu animation
      // đúng lúc route mới đã sẵn sàng.
      if (newStatus === 'EN_ROUTE') {
        startLocationSharing(rescueTask.id);
        showToast('Đã bắt đầu di chuyển và chia sẻ GPS thật!', 'success');
      }
      else if (newStatus === 'ARRIVED') {
        stopLocationSharing();
        showToast('Đã đến nơi thành công!', 'success');
      }
      else if (newStatus === 'TOWING') {
        startLocationSharing(rescueTask.id);
        showToast('Đã bắt đầu chở xe về Gara và chia sẻ GPS thật!', 'success');
      }
      else if (newStatus === 'COMPLETED') {
        stopLocationSharing();
        showToast('Đã đưa xe về Gara thành công! Đang chuyển trang...', 'success');
      }

    } catch (error) {
      console.error(error);
      showToast('Lỗi cập nhật trạng thái', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const beginMovement = async (status: 'EN_ROUTE' | 'TOWING') => {
    try {
      const location = await getCurrentGps();
      setTechnicianLocation(location);
      setCarLocation(location);
      setHasTechnicianLocation(true);
      await updateStatus(status, location);
    } catch (error) {
      console.error('Không thể bắt đầu GPS:', error);
      showToast('Không thể bắt đầu di chuyển vì chưa lấy được GPS. Hãy bật quyền vị trí.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#00285E] animate-spin mb-4" />
        <p className="text-slate-500 font-semibold uppercase tracking-widest text-sm animate-pulse">
          Đang quét tín hiệu cứu hộ...
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-slate-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-[1000] transform -translate-x-1/2 flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl shadow-xl font-semibold text-white max-w-[90vw] ${
              toastMessage.type === 'success' ? 'bg-emerald-500' :
              toastMessage.type === 'error' ? 'bg-rose-500' : 
              toastMessage.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle size={20} />}
            {toastMessage.type === 'info' && <Siren size={20} className="animate-pulse" />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!rescueTask ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-50">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 sm:p-16 flex flex-col items-center justify-center text-center shadow-xl border border-slate-200 max-w-lg mx-4"
          >
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CarFront className="w-12 h-12 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Tạm thời chưa có cuốc cứu hộ nào</h2>
            <p className="text-slate-500 leading-relaxed">
              Hệ thống đang ở trạng thái chờ. Khi có khách hàng gặp sự cố, thông báo sẽ tự động hiện lên tại đây.
            </p>
            <button 
              onClick={fetchActiveRescue}
              className="mt-8 px-8 py-3.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
              LÀM MỚI TÍN HIỆU
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Map Layer */}
          <div className="absolute inset-0 z-0">
            {rescueTask.customer_lat && rescueTask.customer_lng && hasTechnicianLocation ? (
              <MapContainer
                center={technicianLocation}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">Carto</a>'
                />
                
                <Marker position={technicianLocation} icon={technicianIcon}>
                  <Popup className="font-bold text-blue-800">Vị trí của bạn (KTV)</Popup>
                </Marker>

                <Marker
                  position={[parseFloat(rescueTask.customer_lat), parseFloat(rescueTask.customer_lng)]}
                  icon={userIcon}
                >
                  <Popup className="rounded-xl overflow-hidden shadow-xl font-bold text-slate-800 text-center">
                    Vị trí Khách hàng <br/>
                    <span className="text-xs text-rose-500 uppercase tracking-widest mt-1 block">Đang đợi cứu hộ</span>
                  </Popup>
                </Marker>

                {/* Điểm đến khi đang chở xe về — chỉ hiện ở đoạn TOWING trở đi */}
                {(rescueTask.status === 'TOWING' || rescueTask.status === 'COMPLETED') && (
                  <Marker position={garageLocation} icon={garageIcon}>
                    <Popup className="font-bold text-blue-800">Gara Hệ Thống (điểm đến)</Popup>
                  </Marker>
                )}

                {routeCoords.length > 0 && (
                  <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.6} />
                )}

                {/* Simulated Car Icon */}
                {routeCoords.length > 0 && (rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'ARRIVED' || rescueTask.status === 'TOWING') && (
                  <Marker position={carLocation} icon={carIcon} zIndexOffset={1000}>
                    <Popup className="font-bold text-green-600">Bạn đang ở đây</Popup>
                  </Marker>
                )}

                <MapFitter bounds={mapBounds} />
              </MapContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200">
                <MapPin size={64} className="text-slate-400 mb-4" />
                <p className="text-slate-500 font-bold text-lg">Khách hàng chưa cung cấp toạ độ GPS</p>
              </div>
            )}
          </div>

          {/* Floating UI Overlays */}
          <div className="absolute inset-0 z-[400] pointer-events-none p-3 sm:p-6 flex flex-col justify-between">
            {/* Top Bar Overlay */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3">
              {/* Left Customer Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-white p-4 sm:p-5 pointer-events-auto w-full sm:max-w-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-rose-100 p-2 rounded-lg text-rose-600">
                    <Siren size={20} className="animate-pulse" />
                  </span>
                  <h3 className="font-bold text-slate-800 text-lg">Cứu hộ khẩn cấp</h3>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={rescueTask.customer?.user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                    alt="Avatar"
                    className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{rescueTask.customer?.name || rescueTask.customer?.user?.fullName || 'Khách Vãng Lai'}</div>
                    <div className="text-slate-500 text-sm font-medium mt-0.5 flex items-center gap-1.5">
                      <Phone size={14} className="shrink-0" /> <span className="truncate">{rescueTask.customer?.phone || rescueTask.customer?.user?.phoneNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    <span className="text-slate-400 font-bold">MÔ TẢ:</span> {rescueTask.issue_description || "Không có ghi chú"}
                  </p>
                </div>
                
                <a 
                  href={`tel:${rescueTask.customer?.phone || rescueTask.customer?.user?.phoneNumber}`}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={16} /> GỌI CHO KHÁCH
                </a>
              </motion.div>

              {/* Right Route Info */}
              {distance && duration && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-white px-6 py-4 pointer-events-auto flex gap-6"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Khoảng cách</span>
                    <span className="text-xl font-black text-blue-600">{distance}</span>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Thời gian</span>
                    <span className="text-xl font-black text-emerald-600">{duration}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto mx-auto w-full max-w-md"
            >
              {(rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'TOWING') && (
                <button
                  type="button"
                  onClick={async () => {
                    if (isSharingLocation) {
                      stopLocationSharing();
                      showToast('Đã tắt chia sẻ vị trí.', 'info');
                    } else {
                      try {
                        const location = await getCurrentGps();
                        setTechnicianLocation(location);
                        setCarLocation(location);
                        setHasTechnicianLocation(true);
                        startLocationSharing(rescueTask.id);
                        showToast('Đã bật chia sẻ GPS thật.', 'success');
                      } catch {
                        showToast('Không lấy được GPS. Hãy cấp quyền vị trí cho trình duyệt.', 'error');
                      }
                    }
                  }}
                  className={`mb-3 w-full rounded-xl border px-4 py-2.5 font-bold shadow-lg flex items-center justify-center gap-2 ${isSharingLocation ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  {isSharingLocation ? <RadioTower size={18} className="animate-pulse" /> : <Radio size={18} />}
                  {isSharingLocation ? 'ĐANG CHIA SẺ GPS · BẤM ĐỂ TẮT' : 'BẬT CHIA SẺ GPS'}
                </button>
              )}
              {rescueTask.status === 'ASSIGNED' && (
                <button 
                  onClick={() => beginMovement('EN_ROUTE')}
                  disabled={actionLoading}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg animate-bounce"
                >
                  {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
                  BẮT ĐẦU DI CHUYỂN
                </button>
              )}

              {/* TEST: tạm thời chưa kiểm tra khoảng cách <= 100 m.
                  Khi triển khai thật, bổ sung `&& canConfirmArrival` vào điều kiện bên dưới. */}
              {rescueTask.status === 'EN_ROUTE' && (
                <button 
                  onClick={() => updateStatus('ARRIVED')}
                  disabled={actionLoading}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg"
                >
                  {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <MapPin size={24} />}
                  TÔI ĐÃ ĐẾN NƠI
                </button>
              )}
              
              {rescueTask.status === 'ARRIVED' && (
                <button
                  onClick={() => beginMovement('TOWING')}
                  disabled={actionLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-center text-sm sm:text-base leading-snug"
                >
                  {actionLoading ? <Loader2 size={24} className="animate-spin shrink-0" /> : <CarFront size={24} className="shrink-0" />}
                  <span>BẮT ĐẦU CHỞ XE VỀ GARA</span>
                </button>
              )}

              {rescueTask.status === 'TOWING' && (
                <button
                  onClick={async () => {
                    await updateStatus('COMPLETED');
                    setTimeout(() => {
                      window.location.href = `/technician/assignments`;
                    }, 1500);
                  }}
                  disabled={actionLoading}
                  className="w-full py-4 px-6 bg-slate-800 text-white rounded-2xl font-black tracking-wide shadow-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-center text-sm sm:text-base leading-snug"
                >
                  {actionLoading ? <Loader2 size={24} className="animate-spin shrink-0" /> : <CheckCircle size={24} className="shrink-0" />}
                  <span>ĐÃ VỀ TỚI GARA</span>
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
