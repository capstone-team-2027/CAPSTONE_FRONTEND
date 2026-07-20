// đây là trang bản đồ dùng để đưa cho technician có thể dùng để cứu hộ 
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { X, Navigation } from 'lucide-react';
import { useSocket } from '../../../hook/useSocket';

const garageIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204936.png',
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

interface RescueMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  customerName: string;
  receptionistLat: number;
  receptionistLng: number;
  customerId: number | string;
  autoStartSimulation?: boolean;
}

const MapFitter = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

export const RescueMapModal: React.FC<RescueMapModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  customerName,
  receptionistLat,
  receptionistLng,
  customerId,
  autoStartSimulation = false
}) => {
  const socket = useSocket();
  const garageLocation: [number, number] = [receptionistLat, receptionistLng];
  const customerLocation: [number, number] = [latitude, longitude];

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  // Car animation state
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'arrived'>('idle');
  const [carLocation, setCarLocation] = useState<[number, number]>(garageLocation);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen && latitude && longitude && receptionistLat && receptionistLng) {
      // Reset state khi mở lại Modal
      setCarLocation(garageLocation);
      setSimulationStatus('idle');
      setRouteCoords([]);
      setDistance('');
      setDuration('');
      if (animationRef.current) clearInterval(animationRef.current);

      // Fetch đường đi từ OSRM (API miễn phí)
      // Chú ý OSRM nhận toạ độ theo chuẩn: longitude,latitude
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${garageLocation[1]},${garageLocation[0]};${longitude},${latitude}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];

            // Format quãng đường và thời gian
            const distKm = (route.distance / 1000).toFixed(1);
            const durMin = Math.ceil(route.duration / 60);
            setDistance(`${distKm} km`);
            setDuration(`${durMin} phút`);

            // Đổi GeoJSON coords [lon, lat] thành Leaflet format [lat, lon]
            const coordsArray: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            );
            setRouteCoords(coordsArray);

            // Gom vùng bản đồ hiển thị đủ từ Gara tới Khách hàng
            const bounds = L.latLngBounds([garageLocation, customerLocation]);
            coordsArray.forEach(c => bounds.extend(c));
            setMapBounds(bounds);
          }
        } catch (error) {
          console.error("Lỗi khi lấy đường đi:", error);
        }
      };

      fetchRoute();
    }

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [isOpen, latitude, longitude, receptionistLat, receptionistLng]);

  useEffect(() => {
    if (autoStartSimulation && routeCoords.length > 0 && simulationStatus === 'idle') {
      startSimulation();
    }
  }, [autoStartSimulation, routeCoords, simulationStatus]);

  const startSimulation = () => {
    if (routeCoords.length === 0 || simulationStatus !== 'idle') return;

    setSimulationStatus('running');

    // Gửi sự kiện cho khách hàng biết để tự mô phỏng xe chạy trên điện thoại/web của họ
    if (socket) {
      socket.emit('dispatch-rescue-vehicle', {
        customerId,
        routeCoords
      });
    }

    let currentIndex = 0;

    // Tốc độ di chuyển của icon xe (Càng nhỏ càng nhanh)
    // 50ms cho 1 điểm toạ độ để xe chạy mượt mà
    animationRef.current = setInterval(() => {
      if (currentIndex < routeCoords.length - 1) {
        currentIndex++;
        setCarLocation(routeCoords[currentIndex]);
      } else {
        // Đã tới nơi
        if (animationRef.current) clearInterval(animationRef.current);
        setSimulationStatus('arrived');
      }
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <span className="text-2xl">🚨</span> Vị trí cứu hộ khẩn cấp: {customerName}
            </h3>
            {distance && duration && (
              <span className="text-sm font-semibold text-slate-500 mt-1">
                Khoảng cách: <span className="text-blue-600">{distance}</span> - Thời gian đến: <span className="text-blue-600">{duration}</span>
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Map Area */}
        <div className="w-full h-[60vh] min-h-[400px] relative z-0">
          <MapContainer center={garageLocation} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapBounds && <MapFitter bounds={mapBounds} />}

            <Marker position={garageLocation} icon={garageIcon}>
              <Popup className="font-bold text-blue-800">Vị trí Lễ tân / Gara</Popup>
            </Marker>

            <Marker position={customerLocation} icon={userIcon}>
              <Popup className="font-bold text-red-600">Vị trí cần cứu hộ của {customerName}</Popup>
            </Marker>

            {/* Vẽ đường đi */}
            {routeCoords.length > 0 && (
              <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.8} />
            )}

            {/* Xe cứu hộ mô phỏng */}
            {routeCoords.length > 0 && (
              <Marker position={carLocation} icon={carIcon} zIndexOffset={1000}>
                <Popup className="font-bold text-green-600">Xe cứu hộ đang di chuyển...</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Action Overlay */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400]">
            {simulationStatus === 'idle' && routeCoords.length > 0 && (
              <button
                onClick={startSimulation}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 transition-all animate-bounce"
              >
                <Navigation size={20} />
                ĐIỀU XE CỨU HỘ NGAY
              </button>
            )}
            {simulationStatus === 'running' && (
              <div className="px-6 py-3 bg-white/90 backdrop-blur border border-emerald-200 text-emerald-700 font-bold rounded-full shadow-lg">
                Đang trên đường đến hỗ trợ khách hàng...
              </div>
            )}
            {simulationStatus === 'arrived' && (
              <div className="px-6 py-3 bg-white/90 backdrop-blur border border-blue-200 text-blue-700 font-bold rounded-full shadow-lg">
                ✅ Xe cứu hộ đã tiếp cận hiện trường!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
