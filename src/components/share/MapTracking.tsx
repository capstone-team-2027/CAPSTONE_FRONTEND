import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { LOCATION_ENDPOINTS } from '../../constants/customer/locationEndpoints';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useSocket } from '../../hook/useSocket';

// Fix lỗi icon mặc định của leaflet khi dùng chung với React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Tạo Icon tuỳ chỉnh ---
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

// Component con để tự động dịch chuyển bản đồ tới vị trí người dùng khi tìm thấy
const LocationUpdater = ({ userLocation }: { userLocation: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo(userLocation, 15); // Tự động zoom và trượt đến vị trí khách hàng
    }
  }, [userLocation, map]);
  return null;
};

export const MapTracking: React.FC = () => {
  // Dữ liệu Gara cố định
  const garageLocation: [number, number] = [10.762622, 106.660172]; 
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { fetchPrivate } = useFetchClient_v2();

  const user = useSelector((state: RootState) => state.user.user as any);
  const socket = useSocket();

  const [rescueRoute, setRescueRoute] = useState<[number, number][]>([]);
  const [carLocation, setCarLocation] = useState<[number, number] | null>(null);
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'running' | 'arrived'>('idle');
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!socket || !user?.id) return;

    // Tham gia vào Room bảo mật riêng của khách hàng này
    socket.emit('join-room', `customer_${user.id}`);

    const handleRescueDispatched = (data: { customerId: number | string, routeCoords: [number, number][] }) => {
      // Dù Server chỉ gửi cho room này, nhưng check lại id cho chắc chắn
      if (String(data.customerId) === String(user.id)) {
        setRescueRoute(data.routeCoords);
        if (data.routeCoords.length > 0) {
           setCarLocation(data.routeCoords[0]);
           startSimulation(data.routeCoords);
        }
      }
    };

    socket.on('rescue-vehicle-dispatched', handleRescueDispatched);

    return () => {
      socket.off('rescue-vehicle-dispatched', handleRescueDispatched);
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [socket, user]);

  const startSimulation = (routeCoords: [number, number][]) => {
    setSimulationStatus('running');
    let currentIndex = 0;
    
    // Tốc độ di chuyển của icon xe phải giống với tốc độ bên Lễ tân (50ms)
    animationRef.current = setInterval(() => {
      if (currentIndex < routeCoords.length - 1) {
        currentIndex++;
        setCarLocation(routeCoords[currentIndex]);
      } else {
        if (animationRef.current) clearInterval(animationRef.current);
        setSimulationStatus('arrived');
      }
    }, 50);
  };

  // Hàm này chỉ chạy khi người dùng bấm nút
  const handleGetLocation = () => {
    setIsLoading(true);
    setErrorMsg('');

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation([lat, lng]);
          setIsLoading(false);

          // Gửi lên server
          fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
            latitude: lat,
            longitude: lng
          }).then(() => console.log("Lưu vị trí thành công!"))
            .catch(err => console.error("Lỗi khi lưu vị trí lên DB", err));
        },
        (error) => {
          console.error("Lỗi lấy vị trí: ", error);
          setIsLoading(false);
          
          // Xử lý các loại lỗi cụ thể để báo cho người dùng
          if (error.code === error.PERMISSION_DENIED) {
            setErrorMsg("Bạn đã từ chối cấp quyền. Vui lòng bấm vào biểu tượng ổ khoá trên thanh địa chỉ trình duyệt để mở lại quyền Vị trí (Location).");
          } else if (error.code === error.TIMEOUT) {
            setErrorMsg("Quá thời gian lấy vị trí. Vui lòng thử lại. (Nếu bạn dùng máy tính bàn, đôi khi nó không thể định vị được do thiếu GPS).");
          } else {
            setErrorMsg("Không thể lấy vị trí của bạn lúc này. Vui lòng thử lại sau.");
          }
        },
        // Đã bỏ timeout 10s và enableHighAccuracy vì dễ gây lỗi Timeout trên máy tính PC/Laptop
        { enableHighAccuracy: false, maximumAge: 0 }
      );
    } else {
      setIsLoading(false);
      setErrorMsg("Trình duyệt của bạn không hỗ trợ định vị (Geolocation).");
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Khu vực Nút bấm / Cài đặt */}
      <div className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
        <div>
          <h3 className="font-semibold text-gray-800">Chia sẻ vị trí xe hỏng</h3>
          <p className="text-sm text-gray-500">Cung cấp vị trí để xe cứu hộ tìm đến bạn nhanh nhất.</p>
        </div>
        <div className="flex items-center gap-2">
          {userLocation && (
            <button
              onClick={() => {
                setUserLocation(null);
                setErrorMsg('');
                
                // Gửi request xoá vị trí khỏi DB
                fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
                  latitude: null,
                  longitude: null
                }).then(() => console.log("Xoá vị trí thành công!"))
                  .catch(err => console.error("Lỗi khi xoá vị trí trên DB", err));
              }}
              className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              Tắt chia sẻ
            </button>
          )}
          <button 
            onClick={handleGetLocation}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            <MapPin size={18} />
            {isLoading ? 'Đang tìm...' : (userLocation ? 'Cập nhật lại vị trí' : 'Bật Vị Trí Của Tôi')}
          </button>
        </div>
      </div>

      {/* Nút test nhanh (Dùng toạ độ giả) */}
      <div className="flex gap-2">
        <button 
          onClick={() => {
            // Lấy một vị trí ngẫu nhiên gần Gara để test
            const randomLat = garageLocation[0] + (Math.random() - 0.5) * 0.05;
            const randomLng = garageLocation[1] + (Math.random() - 0.5) * 0.05;
            setUserLocation([randomLat, randomLng]);
            setErrorMsg('');

            // Gửi lên server
            fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
              latitude: randomLat,
              longitude: randomLng
            }).then(() => console.log("Lưu vị trí giả thành công!"))
              .catch(err => console.error("Lỗi khi lưu vị trí lên DB", err));
          }}
          className="text-xs px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition"
        >
          🔧 Chạy Test (Dùng vị trí giả)
        </button>
      </div>

      {/* Thanh thông báo lỗi (nếu có) */}
      {errorMsg && <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">{errorMsg}</div>}

      {/* Trạng thái cứu hộ nổi */}
      {simulationStatus !== 'idle' && (
        <div className={`p-4 rounded-lg font-bold border flex items-center justify-center text-center animate-pulse ${simulationStatus === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {simulationStatus === 'running' ? '🚑 CỨU HỘ ĐANG TRÊN ĐƯỜNG TỚI VỊ TRÍ CỦA BẠN...' : '✅ CỨU HỘ ĐÃ ĐẾN NƠI!'}
        </div>
      )}

      {/* Bản đồ */}
      <div className="w-full border rounded-lg overflow-hidden relative z-0">
        <MapContainer 
          center={rescueRoute.length > 0 ? rescueRoute[0] : garageLocation} 
          zoom={14} 
          style={{ width: '100%', height: '500px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <LocationUpdater userLocation={userLocation} />
          
          {/* Điểm Gara */}
          <Marker position={rescueRoute.length > 0 ? rescueRoute[0] : garageLocation} icon={garageIcon}>
            <Popup className="font-semibold text-blue-600">
              Gara Hệ Thống <br /> (Xe cứu hộ xuất phát từ đây)
            </Popup>
          </Marker>

          {/* Điểm Khách hàng */}
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup className="font-semibold text-red-600">
                Vị trí xe hỏng của bạn
              </Popup>
            </Marker>
          )}

          {/* Vẽ đường đi cứu hộ */}
          {rescueRoute.length > 0 && (
            <Polyline positions={rescueRoute} color="#3b82f6" weight={6} opacity={0.8} />
          )}

          {/* Xe cứu hộ mô phỏng */}
          {carLocation && simulationStatus !== 'idle' && (
            <Marker position={carLocation} icon={carIcon} zIndexOffset={1000}>
               <Popup className="font-bold text-green-600">Xe cứu hộ của bạn đây!</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
