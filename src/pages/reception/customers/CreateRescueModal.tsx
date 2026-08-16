import React, { useEffect, useRef, useState } from 'react';
import { X, User, ShieldCheck, MapPin, CheckCircle, XCircle, Search, Car, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'react-phone-input-2/lib/style.css';
import * as PhoneInputLib from 'react-phone-input-2';

// Icons for Map
const garageIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1986/1986937.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// Đồng nhất marker khách hàng với MapTracking, TechnicianRescuePage và bản đồ admin:
// ghim đỏ SVG nhúng trực tiếp, không phụ thuộc ảnh CDN bên ngoài.
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

const assignmentStatusLabel = (status: string) => ({
  ASSIGNED: 'Chờ thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  PAUSED: 'Đang tạm dừng',
  WAITING_STOCK: 'Đang chờ phụ tùng',
}[status] || status);

// resolve default export for PhoneInput
type Mod = { default?: unknown };
function resolveDefault<T>(mod: unknown): T {
  const m = mod as Mod;
  if (m && typeof m === 'object' && 'default' in m) {
    const d = m.default as unknown;
    if (d && typeof d === 'object' && 'default' in (d as Mod)) return (d as Mod).default as T;
    return d as T;
  }
  return mod as T;
}
type PhoneInputProps = {
  country?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  inputProps?: { name?: string };
  countryCodeEditable?: boolean;
  disabled?: boolean;
};
const PhoneInput = resolveDefault<React.ComponentType<PhoneInputProps>>(PhoneInputLib);

const phoneStyles = `
    .rescue-phone .react-tel-input .form-control {
        width: 100% !important;
        height: 42px !important;
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.5rem !important;
        padding: 0 20px 0 48px !important;
        font-size: 14px !important;
        color: #0F172A !important;
        letter-spacing: 0.3px !important;
        outline: none !important;
        transition: all 0.2s !important;
    }
    .rescue-phone .react-tel-input .form-control:focus {
        border-color: #00285E !important;
        box-shadow: 0 0 0 3px rgba(0, 40, 94, 0.15) !important;
    }
    .rescue-phone .react-tel-input .flag-dropdown {
        background: #F8FAFC !important;
        border: 1px solid #E2E8F0 !important;
        border-right: none !important;
        border-radius: 0.5rem 0 0 0.5rem !important;
    }
    .rescue-phone .react-tel-input .flag-dropdown:hover,
    .rescue-phone .react-tel-input .flag-dropdown.open {
        background: #F1F5F9 !important;
        border-color: #CBD5E1 !important;
    }
    .rescue-phone .react-tel-input .selected-flag {
        background: transparent !important;
        padding: 0 8px 0 12px !important;
        border-radius: 0.5rem 0 0 0.5rem !important;
    }
    .rescue-phone .react-tel-input .country-list {
        background: white !important;
        border: 1px solid #E2E8F0 !important;
        border-radius: 0.5rem !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
        max-height: 220px !important;
        margin-top: 4px !important;
        z-index: 1000 !important;
    }
`;

const MapFitter = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [bounds, map]);
  return null;
};

// Leaflet đo kích thước container ngay lúc khởi tạo — nếu modal vừa mở, layout DOM đôi khi
// chưa "settle" xong ở thời điểm đó, khiến bản đồ render sai kích thước (tràn ra ngoài khung
// 250px, đè lên phần còn lại của modal). Gọi lại invalidateSize() sau khi mount để Leaflet đo
// lại đúng kích thước thật của container cha.
const MapResizeFixer = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

// Map click handler to select destination coordinates
const MapClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface CreateRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
}

export const CreateRescueModal: React.FC<CreateRescueModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}) => {
  const { fetchPrivate } = useFetchClient_v2();

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [rescuePrice, setRescuePrice] = useState<number>(0);
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [expandedTechnicianId, setExpandedTechnicianId] = useState<number | null>(null);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const programmaticAddressRef = useRef<string | null>(null);

  const fillAddressInput = (address: string) => {
    programmaticAddressRef.current = address;
    setSearchAddressQuery(address);
    setSearchResults([]);
  };

  const handleSearchAddress = async (query: string) => {
    setSearchingAddress(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`;
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'vi'
        }
      });
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm địa chỉ:", error);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Tự động tìm kiếm khi gõ, không cần bấm nút — debounce 500ms để tránh gọi API dồn dập.
  useEffect(() => {
    const query = searchAddressQuery.trim();
    if (programmaticAddressRef.current === searchAddressQuery) {
      programmaticAddressRef.current = null;
      return;
    }
    if (!query) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(() => {
      handleSearchAddress(query);
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchAddressQuery]);

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    handleMapClick(lat, lng, result.display_name);
  };

  const garageLocation: [number, number] = [15.9675, 108.2605]; // 480 Trần Quốc Hoàn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng

  // Fetch technicians working today
  useEffect(() => {
    if (isOpen) {
      const fetchTechnicians = async () => {
        setLoadingTechs(true);
        try {
          const result = await fetchPrivate(RECEPTION_API.TECHNICIANS_WORKING_TODAY);
          if (result && result.success) {
            setTechnicians(result.data);
          }
        } catch (error) {
          console.error("Error fetching technicians:", error);
        } finally {
          setLoadingTechs(false);
        }
      };
      fetchTechnicians();
    }
  }, [isOpen, fetchPrivate]);

  // Handle map click
  const handleMapClick = async (lat: number, lng: number, knownAddress?: string) => {
    setCustomerLat(lat);
    setCustomerLng(lng);
    fillAddressInput(knownAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);

    if (!knownAddress) {
      try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=vi`;
        const reverseResponse = await fetch(reverseUrl, {
          headers: { 'Accept-Language': 'vi' }
        });
        if (!reverseResponse.ok) throw new Error(`Reverse geocoding HTTP ${reverseResponse.status}`);
        const location = await reverseResponse.json();
        if (location?.display_name) {
          fillAddressInput(location.display_name);
        }
      } catch (error) {
        console.error('Không thể lấy tên địa chỉ từ tọa độ:', error);
        // Giữ tọa độ đã điền làm giá trị dự phòng khi dịch vụ địa chỉ không phản hồi.
      }
    }

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${garageLocation[1]},${garageLocation[0]};${lng},${lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = parseFloat((route.distance / 1000).toFixed(1));
        setDistanceKm(distKm);

        // Calculate Price based on distance:
        // <=15km: 15k/km, min 150k. >15km: 15*15k + (dist - 15)*20k
        let price = 0;
        if (distKm <= 15) {
          price = Math.max(150000, distKm * 15000);
        } else {
          price = (15 * 15000) + ((distKm - 15) * 20000);
        }
        setRescuePrice(price);

        const coordsArray: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setRouteCoords(coordsArray);

        const bounds = L.latLngBounds([garageLocation, [lat, lng]]);
        coordsArray.forEach(c => bounds.extend(c));
        setMapBounds(bounds);
      }
    } catch (error) {
      console.error("Lỗi khi tính toán đường đi OSRM:", error);
      showToast("Không thể tính toán đường đi và khoảng cách tự động.", "warning");
    }
  };

  // Recalculate price when distance is manually changed
  const handleDistanceChange = (valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setDistanceKm(val);
    let price = 0;
    if (val <= 15) {
      price = Math.max(150000, val * 15000);
    } else {
      price = (15 * 15000) + ((val - 15) * 20000);
    }
    setRescuePrice(price);
  };

  const handleCreate = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      showToast("Vui lòng nhập số điện thoại khách hàng", "warning");
      return;
    }
    if (!selectedTechnicianId) {
      showToast("Vui lòng chọn kỹ thuật viên để gán", "warning");
      return;
    }
    if (!customerLat || !customerLng) {
      showToast("Vui lòng click chọn vị trí của khách hàng trên bản đồ", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        phone_number: phoneNumber,
        customer_name: customerName,
        customer_lat: customerLat,
        customer_lng: customerLng,
        distance_km: distanceKm,
        rescue_price: rescuePrice,
        issue_description: issueDescription || "Yêu cầu cứu hộ khẩn cấp",
        technician_id: selectedTechnicianId
      };

      const result = await fetchPrivate(RECEPTION_API.CREATE_RESCUE, "POST", payload);
      if (result && result.success) {
        showToast("Tạo dịch vụ cứu hộ thành công", "success");
        // Reset states
        setCustomerName('');
        setPhoneNumber('');
        setIssueDescription('');
        setDistanceKm(0);
        setRescuePrice(0);
        setCustomerLat(null);
        setCustomerLng(null);
        setSelectedTechnicianId(null);
        setRouteCoords([]);
        setMapBounds(null);
        onSuccess();
        onClose();
      } else {
        showToast(result.message || "Tạo dịch vụ cứu hộ thất bại", "warning");
      }
    } catch (error: any) {
      console.error("Error creating rescue:", error);
      showToast(error.message || "Có lỗi xảy ra khi tạo cứu hộ", "warning");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <style>{phoneStyles}</style>
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="p-5 border-b border-[#001f49] flex items-center justify-between bg-[#00285E] shrink-0">
          <div>
            <h3 className="font-bold text-white text-xl flex items-center gap-2">
              Tạo dịch vụ Cứu hộ mới
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-100 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

          {/* LEFT COLUMN: Map & Fields */}
          <div className="w-full lg:w-[70%] flex flex-col bg-white border-r border-slate-200 overflow-y-auto px-5 pb-5 pt-7 lg:pl-8 lg:pr-6 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tên khách hàng</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập tên khách hàng..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Số điện thoại khách hàng</label>
                <div className="rescue-phone">
                  <PhoneInput
                    country="vn"
                    value={phoneNumber}
                    onChange={(val) => setPhoneNumber(val)}
                    enableSearch
                    searchPlaceholder="Tìm quốc gia..."
                    inputProps={{ name: 'phone' }}
                    countryCodeEditable={false}
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Distance in km */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Quãng đường (km)</label>
                <input
                  type="number"
                  step="0.1"
                  value={distanceKm || ''}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  placeholder="Nhập hoặc click bản đồ"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
              </div>

       {/* Calculated price */}
<div>
  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
    Số tiền cứu hộ (VND)
  </label>

  <input
    type="text"
    value={
      rescuePrice
        ? new Intl.NumberFormat('vi-VN').format(rescuePrice)
        : ''
    }
    onChange={(e) => {
      // Xóa toàn bộ ký tự không phải số
      const rawValue = e.target.value.replace(/\D/g, '');

      setRescuePrice(Number(rawValue) || 0);
    }}
    placeholder="Hệ thống tự tính hoặc nhập tay"
    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
  />
</div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Mô tả tình trạng/sự cố xe</label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Vd: Xe xì lốp, chết máy giữa đường cần kéo về gara..."
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
              />
            </div>

            {/* Location search and map are placed after all rescue information. */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tìm kiếm vị trí (Địa điểm / Địa chỉ)
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchAddressQuery}
                  onChange={(e) => setSearchAddressQuery(e.target.value)}
                  placeholder="Vd: Đại học Bách Khoa Đà Nẵng..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
                />
                {searchingAddress && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">Đang tìm...</span>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-sm max-h-60 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(result)}
                      className="px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 cursor-pointer border-b border-slate-100 last:border-0 flex items-start gap-2"
                    >
                      <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                      <span>{result.display_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bản đồ định vị (Click để chọn vị trí khách hàng)
              </label>
              <div className="w-full h-[390px] xl:h-[430px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <MapContainer center={garageLocation} zoom={13} style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapResizeFixer />
                  {mapBounds && <MapFitter bounds={mapBounds} />}
                  <MapClickHandler onClick={handleMapClick} />
                  <Marker position={garageLocation} icon={garageIcon}>
                    <Popup>Gara AGM</Popup>
                  </Marker>
                  {customerLat && customerLng && (
                    <Marker position={[customerLat, customerLng]} icon={userIcon}>
                      <Popup>Vị trí Khách hàng</Popup>
                    </Marker>
                  )}
                  {routeCoords.length > 0 && (
                    <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.8} />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors flex justify-center items-center gap-2"
              >
                <XCircle size={18} /> Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || !selectedTechnicianId || !phoneNumber || !customerLat}
                className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg ${submitting || !selectedTechnicianId || !phoneNumber || !customerLat
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
              >
                {submitting ? "Đang xử lý..." : "Tạo & Phân công"}
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Technicians List */}
          <div className="w-full lg:w-[30%] px-5 pb-5 pt-7 lg:px-5 overflow-y-auto bg-slate-50 flex flex-col">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 shrink-0">
              <User size={18} className="text-[#00285E]" /> Phân công Kỹ thuật viên đang trực
            </h4>

            {loadingTechs ? (
              <div className="text-center text-slate-500 py-8 flex-1 flex items-center justify-center">Đang tải danh sách...</div>
            ) : technicians.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1">
                {technicians.map(tech => {
                  const isLeader = tech.role?.roleCode === 'TECHNICIAN_LEADER';
                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechnicianId(selectedTechnicianId === tech.id ? null : tech.id)}
                      className={`group relative p-4 rounded-xl border transition-all flex items-center gap-3 bg-white cursor-pointer ${selectedTechnicianId === tech.id
                        ? 'border-[#00285E] ring-2 ring-[#00285E]/20 shadow-md'
                        : 'border-slate-200 hover:border-[#00285E]/50'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${isLeader ? 'bg-amber-500' : 'bg-slate-400'}`}>
                        {tech.fullName ? tech.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-800 text-sm truncate">{tech.fullName}</h5>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isLeader && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <ShieldCheck size={10} /> Tổ trưởng
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${tech.isBusy ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            <CircleAlert size={10} /> {tech.isBusy ? 'Đang bận' : 'Đang rảnh'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{tech.phoneNumber}</p>
                        {tech.isBusy && tech.currentTasks?.length > 0 && (
                          <div className={`${expandedTechnicianId === tech.id ? 'block' : 'hidden'} absolute left-1/2 top-2 z-50 w-80 max-w-[calc(100%-24px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl`} onClick={(event) => event.stopPropagation()}>
                            <p className="mb-2 text-xs font-bold text-slate-800">Công việc đang phụ trách</p>
                            <div className="max-h-56 space-y-1.5 overflow-y-auto">
                              {tech.currentTasks.map((task: any) => (
                                <div key={task.id} className="rounded-lg border border-orange-100 bg-orange-50/70 px-2.5 py-2 text-[11px]">
                                  <p className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <Car size={12} className="shrink-0 text-orange-500" />
                                    {task.serviceName || task.taskType || 'Công việc kỹ thuật'}
                                  </p>
                                  <p className="mt-1 text-slate-500">
                                    {task.serviceOrderId ? `Lệnh dịch vụ #${task.serviceOrderId}` : `Công việc #${task.id}`}
                                    {task.vehiclePlate ? ` · Xe ${task.vehiclePlate}` : ''}
                                  </p>
                                  <p className="mt-0.5 font-semibold text-orange-700">{assignmentStatusLabel(task.status)}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {tech.isBusy && tech.currentTasks?.length > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedTechnicianId(tech.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                          >
                            <Eye size={13} />
                            Xem việc
                          </button>
                        ) : null}
                        {selectedTechnicianId === tech.id && <span className="text-xs text-white bg-[#00285E] px-2 py-1 rounded-md">Đã chọn</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8 flex-1 flex items-center justify-center">
                Không có kỹ thuật viên nào làm việc hôm nay.
              </div>
            )}

            {/* Modal "Công việc đang phụ trách" — modal riêng thay vì popup định vị theo nút,
                tránh mọi vấn đề overflow/tràn màn hình của cách định vị theo toạ độ. */}
            {expandedTechnicianId != null && (() => {
              const expandedTech = technicians.find((t) => t.id === expandedTechnicianId);
              if (!expandedTech) return null;
              return (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
                  onClick={() => setExpandedTechnicianId(null)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Công việc đang phụ trách</p>
                        <p className="text-xs text-slate-500">{expandedTech.fullName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedTechnicianId(null)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
                      {expandedTech.currentTasks.map((task: any) => (
                        <div key={task.id} className="rounded-lg border border-orange-100 bg-orange-50/70 px-3 py-2.5 text-xs">
                          <p className="flex items-center gap-1.5 font-bold text-slate-700">
                            <Car size={13} className="shrink-0 text-orange-500" />
                            {task.serviceName || task.taskType || 'Công việc kỹ thuật'}
                          </p>
                          <p className="mt-1 text-slate-500">
                            {task.serviceOrderId ? `Lệnh dịch vụ #${task.serviceOrderId}` : `Công việc #${task.id}`}
                            {task.vehiclePlate ? ` · Xe ${task.vehiclePlate}` : ''}
                          </p>
                          <p className="mt-0.5 font-semibold text-orange-700">{assignmentStatusLabel(task.status)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
};
