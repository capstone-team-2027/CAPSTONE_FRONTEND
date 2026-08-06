import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { LOCATION_ENDPOINTS } from '../../constants/customer/locationEndpoints';
import { PROFILE_API_ENDPOINTS } from '../../constants/customer/profileApiEndpoint';
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

// Icon vị trí khách hàng — dùng SVG nhúng trực tiếp (lucide MapPin) thay vì ảnh PNG tải từ CDN
// ngoài, vì các nguồn ảnh bên ngoài (vd flaticon) có thể chặn hotlink và hiện icon lỗi (⊘).
const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:35px;height:35px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 24 24" fill="#DC2626" stroke="white" stroke-width="1.5">
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
      </svg>
    </div>
  `,
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
  // Dữ liệu gara cố định tại 480 Trần Quốc Hoàn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng
  const garageLocation: [number, number] = [15.9675, 108.2605];

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { fetchPrivate } = useFetchClient_v2();

  const [issueDescription, setIssueDescription] = useState<string>('');

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

  // Khôi phục vị trí đã chia sẻ trước đó sau khi F5.
  useEffect(() => {
    if (!user?.id) return;
    fetchPrivate(PROFILE_API_ENDPOINTS.GET_PROFILE).then((res: any) => {
      const profile = res?.data;
      if (profile?.latitude != null && profile?.longitude != null) {
        setUserLocation([profile.latitude, profile.longitude]);
      }
    }).catch((err) => {
      console.error('Lỗi khi khôi phục vị trí đã chia sẻ:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const startSimulation = (routeCoords: [number, number][]) => {
    let currentIndex = 0;

    // Tốc độ di chuyển của icon xe phải giống với tốc độ bên Lễ tân (50ms)
    animationRef.current = setInterval(() => {
      if (currentIndex < routeCoords.length - 1) {
        currentIndex++;
        setCarLocation(routeCoords[currentIndex]);
      } else {
        if (animationRef.current) clearInterval(animationRef.current);
      }
    }, 50);
  };

  // KTV bấm "Bắt đầu di chuyển" (EN_ROUTE) — BE gửi kèm GPS thật của KTV lúc đó, FE tính route
  // từ ĐÚNG vị trí xuất phát của KTV (không phải Gara cố định) rồi chạy animation icon xe.
  const fetchRouteAndSimulate = async (fromLat: number, fromLng: number, destLat: number, destLng: number) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coordsArray: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setRescueRoute(coordsArray);
        setCarLocation(coordsArray[0]);
        if (animationRef.current) clearInterval(animationRef.current);
        startSimulation(coordsArray);
      }
    } catch (error) {
      console.error("Lỗi khi tính lại đường đi cứu hộ:", error);
    }
  };

  // Realtime cập nhật trạng thái cứu hộ — dùng chung room 'user-{id}' đã được Header.tsx (layout
  // cha) tự join sẵn, không cần tự join room riêng nữa. BE emit 'new_notification' kèm {type,
  // rescueId, status} ở mọi bước: RESCUE_REQUESTED (khách vừa gửi), RESCUE_ASSIGNED (lễ tân gán
  // KTV), RESCUE_STATUS_UPDATED (KTV accept/en_route/arrived/completed).
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      if (!data || !String(data.type || '').startsWith('RESCUE_')) return;

      switch (data.type) {
        case 'RESCUE_REQUESTED':
          setStatusMessage('Yêu cầu cứu hộ đã được gửi, vui lòng đợi lễ tân tiếp nhận.');
          break;
        case 'RESCUE_ASSIGNED':
          // Chỉ báo đã có KTV nhận — CHƯA mô phỏng xe chạy, vì KTV chưa bấm "Bắt đầu di chuyển"
          // và ta cũng chưa có GPS thật của họ ở bước này.
          setStatusMessage('Kỹ thuật viên đã tiếp nhận yêu cầu cứu hộ của bạn.');
          break;
        case 'RESCUE_STATUS_UPDATED':
          if (data.status === 'EN_ROUTE') {
            setStatusMessage('Kỹ thuật viên đang trên đường tới vị trí của bạn.');
            setSimulationStatus('running');
            if (userLocation && data.technicianLat != null && data.technicianLng != null) {
              fetchRouteAndSimulate(data.technicianLat, data.technicianLng, userLocation[0], userLocation[1]);
            }
          } else if (data.status === 'ARRIVED') {
            setStatusMessage('Kỹ thuật viên đã tới nơi.');
            setSimulationStatus('arrived');
            if (animationRef.current) clearInterval(animationRef.current);
          } else if (data.status === 'COMPLETED') {
            setStatusMessage('Cứu hộ đã hoàn tất, xe đã được đưa về Gara.');
            setSimulationStatus('idle');
            setUserLocation(null);
            setRescueRoute([]);
            setCarLocation(null);
            if (animationRef.current) clearInterval(animationRef.current);
          } else if (data.status === 'ACCEPTED') {
            setStatusMessage('Kỹ thuật viên đã xác nhận nhận cứu hộ của bạn.');
          }
          break;
        default:
          break;
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
      if (animationRef.current) clearInterval(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, userLocation]);

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
    if (!tempLocation) return;
    setUserLocation(tempLocation);
    setShowConfirmModal(false);
    setIsLoading(true);
    fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
      latitude: tempLocation[0],
      longitude: tempLocation[1],
    }).then((res: any) => {
      setIsLoading(false);
      console.log("Lưu vị trí và tạo yêu cầu cứu hộ thành công!", res);
    }).catch(err => {
      setIsLoading(false);
      console.error("Lỗi khi gửi yêu cầu cứu hộ", err);
      setErrorMsg("Không thể gửi yêu cầu cứu hộ đến hệ thống.");
    });
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
      {/* Thông tin liên hệ */}
      <div className="p-4 bg-white border rounded-lg shadow-sm flex flex-col gap-3">
        <h3 className="font-semibold text-gray-800">Thông tin liên hệ cứu hộ khẩn cấp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">Số điện thoại liên hệ</label>
            <input
              type="text"
              value={user?.phoneNumber || ''}
              disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2 text-sm text-gray-600"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase">Mô tả sự cố xe (Không bắt buộc)</label>
            <input
              type="text"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="VD: Không nổ được máy, xẹp lốp, ngập nước..."
              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

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
            {isLoading ? 'Đang tìm...' : (userLocation ? 'Cập nhật lại vị trí' : 'Gửi yêu cầu cứu hộ')}
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

      {/* Trạng thái cứu hộ nổi — nội dung realtime từ socket, fallback về text mặc định nếu chưa có */}
      {simulationStatus !== 'idle' && (
        <div className={`p-4 rounded-lg font-bold border flex items-center justify-center text-center animate-pulse ${simulationStatus === 'running' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {statusMessage || (simulationStatus === 'running' ? '🚑 CỨU HỘ ĐANG TRÊN ĐƯỜNG TỚI VỊ TRÍ CỦA BẠN...' : '✅ CỨU HỘ ĐÃ ĐẾN NƠI!')}
        </div>
      )}

      {/* Thông báo realtime khi chưa có xe di chuyển (vd vừa gửi yêu cầu, đang chờ tiếp nhận) */}
      {statusMessage && simulationStatus === 'idle' && (
        <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-semibold text-center">
          {statusMessage}
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

      {/* Chú giải icon trên bản đồ */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 bg-white border rounded-lg shadow-sm text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <img src="https://cdn-icons-png.flaticon.com/512/1986/1986937.png" alt="" className="w-5 h-5" />
          <span>Gara Hệ Thống</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-red-600 fill-white" strokeWidth={1.5} />
          <span>Vị trí xe hỏng của bạn</span>
        </div>
        <div className="flex items-center gap-2">
          <img src="https://cdn-icons-png.flaticon.com/512/744/744402.png" alt="" className="w-5 h-5" />
          <span>Xe cứu hộ đang di chuyển</span>
        </div>
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
                  <span className="font-black text-blue-700 text-2xl">{estimatedPrice.toLocaleString('vi-VN')} VND</span>
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
