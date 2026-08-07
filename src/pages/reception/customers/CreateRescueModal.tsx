import React, { useEffect, useState } from 'react';
import { X, User, ShieldCheck, Star, MapPin, CheckCircle, XCircle, Search } from 'lucide-react';
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

const userIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204936.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

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
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const [searchAddressQuery, setSearchAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);

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
    
    handleMapClick(lat, lng);
    setSearchResults([]);
    setSearchAddressQuery(result.display_name);
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
  const handleMapClick = async (lat: number, lng: number) => {
    setCustomerLat(lat);
    setCustomerLng(lng);

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
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
              <span className="text-rose-600 animate-pulse">🚨</span> Tạo dịch vụ Cứu hộ mới
            </h3>
            <p className="text-sm text-slate-500 mt-1">Lập cuốc cứu hộ mới cho khách hàng/khách vãng lai và phân công kỹ thuật viên</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>
        
        {/* BODY */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Map & Fields */}
          <div className="w-full lg:w-7/12 flex flex-col bg-white border-r border-slate-200 overflow-y-auto p-5 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              {/* Location Lat/Lng Display */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vị trí (Click trên bản đồ)</label>
                <input
                  type="text"
                  readOnly
                  value={customerLat && customerLng ? `${customerLat.toFixed(6)}, ${customerLng.toFixed(6)}` : ''}
                  placeholder="Click bản đồ để lấy tọa độ"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Address Search */}
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

              {/* Search Results — chiếm chỗ thật trong layout (không dùng absolute) để không bị
                  cắt bởi overflow-y-auto của container cha, tránh bị đẩy lệch xuống dưới bản đồ. */}
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

            {/* Map to Select Location */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bản đồ định vị (Click để chọn vị trí khách hàng)
              </label>
              <div className="w-full h-[250px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                <MapContainer center={garageLocation} zoom={13} style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Số tiền cứu hộ (đ)</label>
                <input
                  type="number"
                  value={rescuePrice || ''}
                  onChange={(e) => setRescuePrice(parseFloat(e.target.value) || 0)}
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
                className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg ${
                  submitting || !selectedTechnicianId || !phoneNumber || !customerLat
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                }`}
              >
                {submitting ? "Đang xử lý..." : "Tạo & Phân công"}
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN: Technicians List */}
          <div className="w-full lg:w-5/12 p-5 overflow-y-auto bg-slate-50 flex flex-col">
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
                      onClick={() => setSelectedTechnicianId(tech.id)}
                      className={`p-4 rounded-xl border transition-all flex items-center gap-3 bg-white cursor-pointer ${
                        selectedTechnicianId === tech.id 
                          ? 'border-[#00285E] ring-2 ring-[#00285E]/20 shadow-md' 
                          : 'border-slate-200 hover:border-[#00285E]/50'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${isLeader ? 'bg-amber-500' : 'bg-slate-400'}`}>
                        {tech.fullName ? tech.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-800 text-sm truncate">{tech.fullName}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          {isLeader && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <ShieldCheck size={10} /> Tổ trưởng
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{tech.phoneNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center text-amber-500">
                          <Star size={14} className="fill-amber-500" />
                          <span className="text-xs font-bold ml-1">{tech.skillLevel}</span>
                        </div>
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
          </div>

        </div>
      </div>
    </div>
  );
};
