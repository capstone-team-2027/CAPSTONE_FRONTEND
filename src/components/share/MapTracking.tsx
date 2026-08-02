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
  // Dữ liệu Gara cố định (FPT University Da Nang)
  const garageLocation: [number, number] = [15.9675, 108.2605]; 
  
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

  // Thêm state cho Modal xác nhận
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tempLocation, setTempLocation] = useState<[number, number] | null>(null);
  const [distanceInfo, setDistanceInfo] = useState<{ distKm: number, durMin: number } | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);

  useEffect(() => {
    if (!socket || !user?.id) return;

    // Tham gia vào Room bảo mật riêng của khách hàng này
    socket.emit('join-room', `customer_${user.id}`);

    const handleRescueDispatched = (data: { customerId: number | string, routeCoords?: [number, number][] }) => {
      // Dù Server chỉ gửi cho room này, nhưng check lại id cho chắc chắn
      if (String(data.customerId) === String(user.id)) {
        if (data.routeCoords && data.routeCoords.length > 0) {
           setRescueRoute(data.routeCoords);
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

  const calculatePrice = (distKm: number) => {
    if (distKm <= 15) {
      return Math.max(150000, distKm * 15000);
    } else {
      return (15 * 15000) + ((distKm - 15) * 20000);
    }
  };

  const processLocation = async (lat: number, lng: number) => {
    setTempLocation([lat, lng]);
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      // Gọi OSRM API để lấy đường đi và khoảng cách
      const url = `https://router.project-osrm.org/route/v1/driving/${garageLocation[1]},${garageLocation[0]};${lng},${lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = parseFloat((route.distance / 1000).toFixed(1));
        const durMin = Math.ceil(route.duration / 60);
        
        setDistanceInfo({ distKm, durMin });
        setEstimatedPrice(calculatePrice(distKm));
        setShowConfirmModal(true);
      } else {
        throw new Error("Không thể tính toán đường đi.");
      }
    } catch (error) {
      console.error("Lỗi khi lấy đường đi:", error);
      setErrorMsg("Không thể tính toán đường đi và chi phí. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRescue = () => {
    if (tempLocation) {
      setUserLocation(tempLocation);
      setShowConfirmModal(false);
      // Gửi lên server để Lễ tân thấy
      fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
        latitude: tempLocation[0],
        longitude: tempLocation[1]
      }).then(() => console.log("Lưu vị trí thành công!"))
        .catch(err => console.error("Lỗi khi lưu vị trí lên DB", err));
    }
  };

  const handleCancelRescue = () => {
    setShowConfirmModal(false);
    setTempLocation(null);
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
          processLocation(lat, lng);
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
            // Lấy một vị trí ngẫu nhiên gần Gara để test (10-20km)
            const randomLat = garageLocation[0] + (Math.random() - 0.5) * 0.2;
            const randomLng = garageLocation[1] + (Math.random() - 0.5) * 0.2;
            processLocation(randomLat, randomLng);
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

      {/* Modal Xác Nhận Cuốc Xe */}
      {showConfirmModal && distanceInfo && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-[#00285E] p-4 flex flex-col items-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <MapPin className="text-white" size={32} />
              </div>
              <h3 className="font-bold text-white text-xl text-center">Xác nhận gọi cứu hộ</h3>
              <p className="text-blue-200 text-sm mt-1 text-center">Vui lòng kiểm tra chi phí trước khi gọi xe</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Khoảng cách:</span>
                <span className="font-bold text-slate-800 text-lg">{distanceInfo.distKm} km</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-medium">Thời gian dự kiến:</span>
                <span className="font-bold text-slate-800 text-lg">{distanceInfo.durMin} phút</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 font-bold">Phí cứu hộ dự kiến:</span>
                  <span className="font-black text-blue-700 text-2xl">{estimatedPrice.toLocaleString('vi-VN')} đ</span>
                </div>
                <span className="text-xs text-blue-500/80 italic text-right">* Chưa bao gồm phí sửa chữa/vật tư</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={handleCancelRescue}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRescue}
                className="flex-1 py-3 px-4 bg-[#00285E] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20"
              >
                Đồng ý gọi xe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
