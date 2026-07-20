import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Siren, MapPin, Navigation, Phone, CheckCircle, CarFront, Loader2 } from 'lucide-react';
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

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204936.png',
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

  // Car animation state
  const [carLocation, setCarLocation] = useState<[number, number]>([10.762622, 106.660172]);
  const animationRef = useRef<number | null>(null);

  const [technicianLocation, setTechnicianLocation] = useState<[number, number]>([10.762622, 106.660172]); // Default to Garage, update via GPS
  const [hasTechnicianLocation, setHasTechnicianLocation] = useState(false);

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

  useEffect(() => {
    // Get actual Technician location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTechnicianLocation([position.coords.latitude, position.coords.longitude]);
          setCarLocation([position.coords.latitude, position.coords.longitude]);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHasTechnicianLocation(true);
        },
        (error) => {
          console.error("Lỗi khi lấy vị trí Kỹ thuật viên:", error);
          showToast("Không thể lấy vị trí GPS của bạn. Đang dùng vị trí mặc định (Garage).", "warning");
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHasTechnicianLocation(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      showToast("Trình duyệt không hỗ trợ GPS. Đang dùng vị trí mặc định (Garage).", "warning");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasTechnicianLocation(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActiveRescue();
    
    // Listen for incoming new rescue tasks while on this page
    if (socket) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      const handleNewTask = (_data: any) => {
        showToast('Bạn vừa nhận được một cuốc cứu hộ mới!', 'info');
        fetchActiveRescue();
      };
      
      socket.on('incoming-rescue-task', handleNewTask);
      return () => {
        socket.off('incoming-rescue-task', handleNewTask);
      };
    }
  }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rescueTask?.customer_lat && rescueTask?.customer_lng) {
      const fetchRoute = async () => {
        try {
          const customerLat = parseFloat(rescueTask.customer_lat);
          const customerLng = parseFloat(rescueTask.customer_lng);
          const url = `https://router.project-osrm.org/route/v1/driving/${technicianLocation[1]},${technicianLocation[0]};${customerLng},${customerLat}?overview=full&geometries=geojson`;
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

            const bounds = L.latLngBounds([technicianLocation, [customerLat, customerLng]]);
            coordsArray.forEach(c => bounds.extend(c));
            setMapBounds(bounds);
          }
        } catch (error) {
          console.error("Lỗi khi lấy đường đi:", error);
        }
      };

      fetchRoute();
    }
  }, [rescueTask?.customer_lat, rescueTask?.customer_lng, technicianLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (newStatus: string) => {
    if (!rescueTask) return;
    try {
      setActionLoading(true);
      await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.START_RESCUE, 'PATCH', {
        rescueId: rescueTask.id,
        status: newStatus
      });
      setRescueTask({ ...rescueTask, status: newStatus });
      
      if (newStatus === 'ACCEPTED') showToast('Đã xác nhận nhận nhiệm vụ!', 'success');
      else if (newStatus === 'EN_ROUTE') {
        showToast('Đã bắt đầu di chuyển!', 'success');
        startCarSimulation();
      }
      else if (newStatus === 'ARRIVED') {
        showToast('Đã đến nơi thành công!', 'success');
        if (animationRef.current) clearInterval(animationRef.current);
      }
      
    } catch (error) {
      console.error(error);
      showToast('Lỗi cập nhật trạng thái', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const startCarSimulation = () => {
    if (routeCoords.length === 0) return;
    
    let currentIndex = 0;
    if (animationRef.current) clearInterval(animationRef.current);
    
    animationRef.current = setInterval(() => {
      if (currentIndex < routeCoords.length - 1) {
        currentIndex++;
        setCarLocation(routeCoords[currentIndex]);
      } else {
        if (animationRef.current) clearInterval(animationRef.current);
      }
    }, 50) as unknown as number;
  };

  // Nếu đang EN_ROUTE khi load trang thì giả lập xe chạy liền
  useEffect(() => {
    if (rescueTask?.status === 'EN_ROUTE' && routeCoords.length > 0) {
      startCarSimulation();
    }
    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [rescueTask?.status, routeCoords]); // eslint-disable-line react-hooks/exhaustive-deps

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
            className={`fixed top-4 left-1/2 z-[1000] transform -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-xl shadow-xl font-semibold text-white ${
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
            className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-xl border border-slate-200 max-w-lg mx-4"
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
                
                <Marker position={technicianLocation} icon={garageIcon}>
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
                
                {routeCoords.length > 0 && (
                  <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.6} />
                )}

                {/* Simulated Car Icon */}
                {routeCoords.length > 0 && (rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'ARRIVED') && (
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
          <div className="absolute inset-0 z-[400] pointer-events-none p-6 flex flex-col justify-between">
            {/* Top Bar Overlay */}
            <div className="flex justify-between items-start">
              {/* Left Customer Info */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-white p-5 pointer-events-auto max-w-sm"
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
                    className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                  />
                  <div>
                    <div className="font-bold text-slate-800">{rescueTask.customer?.name || rescueTask.customer?.user?.fullName || 'Khách Vãng Lai'}</div>
                    <div className="text-slate-500 text-sm font-medium mt-0.5 flex items-center gap-1.5">
                      <Phone size={14} /> {rescueTask.customer?.phone || rescueTask.customer?.user?.phoneNumber}
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
              {(rescueTask.status === 'ASSIGNED' || rescueTask.status === 'ACCEPTED') && (
                <button 
                  onClick={() => updateStatus('EN_ROUTE')}
                  disabled={actionLoading}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg animate-bounce"
                >
                  {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
                  BẮT ĐẦU DI CHUYỂN
                </button>
              )}

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
                  onClick={() => window.location.href = `/technician/assignments`}
                  className="w-full py-4 bg-slate-800 text-white rounded-full font-black tracking-wide shadow-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-lg"
                >
                  CHUYỂN SANG SỬA CHỮA
                </button>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
