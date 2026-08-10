import React, { useEffect, useState } from 'react';
import { X, User, ShieldCheck, Star, MapPin, Navigation, CheckCircle, XCircle, Car, CircleAlert, Eye, EyeOff } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';

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

const MapFitter = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [bounds, map]);
  return null;
};

const assignmentStatusLabel = (status: string) => ({
  ASSIGNED: 'Chờ thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  PAUSED: 'Đang tạm dừng',
  WAITING_STOCK: 'Đang chờ phụ tùng',
}[status] || status);

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (technicianId: number) => void;
  customerName: string;
  customerLat?: number;
  customerLng?: number;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({ 
  isOpen, 
  onClose, 
  onAssign, 
  customerName,
  customerLat,
  customerLng
}) => {
  const { fetchPrivate } = useFetchClient_v2();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New State for Rescue Flow
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [expandedTechnicianId, setExpandedTechnicianId] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [distanceInfo, setDistanceInfo] = useState<{ distKm: number, durMin: number } | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number>(0);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const garageLocation: [number, number] = [15.9675, 108.2605]; // 480 Trần Quốc Hoàn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng

  // Fetch Technicians
  useEffect(() => {
    if (isOpen) {
      const fetchTechnicians = async () => {
        setLoading(true);
        try {
          const result = await fetchPrivate(RECEPTION_API.TECHNICIANS_WORKING_TODAY);
          if (result && result.success) {
            setTechnicians(result.data);
          }
        } catch (error) {
          console.error("Error fetching technicians:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchTechnicians();
    }
  }, [isOpen, fetchPrivate]);

  // Fetch Route and Calculate Price
  useEffect(() => {
    if (isOpen) {
      setSelectedTechnicianId(null); // Reset accept status on modal open
      
      if (customerLat && customerLng) {
        const fetchRoute = async () => {
          try {
            const url = `https://router.project-osrm.org/route/v1/driving/${garageLocation[1]},${garageLocation[0]};${customerLng},${customerLat}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const distKm = parseFloat((route.distance / 1000).toFixed(1));
              const durMin = Math.ceil(route.duration / 60);
              
              setDistanceInfo({ distKm, durMin });
              
              // Tính tiền (<=15km: 15k/km min 150k. >15km: 15*15k + extra)
              let price = 0;
              if (distKm <= 15) {
                price = Math.max(150000, distKm * 15000);
              } else {
                price = (15 * 15000) + ((distKm - 15) * 20000);
              }
              setEstimatedPrice(price);

              const coordsArray: [number, number][] = route.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
              );
              setRouteCoords(coordsArray);
              
              const bounds = L.latLngBounds([garageLocation, [customerLat, customerLng]]);
              coordsArray.forEach(c => bounds.extend(c));
              setMapBounds(bounds);
            }
          } catch (error) {
            console.error("Lỗi khi lấy đường đi OSRM:", error);
          }
        };
        fetchRoute();
      } else {
        // Nếu không có toạ độ
        setRouteCoords([]);
        setDistanceInfo(null);
        setEstimatedPrice(0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customerLat, customerLng]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
              <span className="text-rose-600 animate-pulse">🚨</span> Yêu cầu Cứu hộ: {customerName}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Xem xét khoảng cách, chi phí và phân công Kỹ thuật viên phù hợp</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <X size={24} />
          </button>
        </div>
        
        {/* BODY - TWO COLUMNS */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          
          {/* LEFT COLUMN: Map & Info */}
          <div className="w-full lg:w-1/2 flex flex-col bg-white border-r border-slate-200">
            <div className="p-4 flex-1 flex flex-col gap-4">
              {/* Map */}
              <div className="w-full h-[300px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shrink-0">
                {customerLat && customerLng ? (
                  <MapContainer center={garageLocation} zoom={13} style={{ width: '100%', height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {mapBounds && <MapFitter bounds={mapBounds} />}
                    <Marker position={garageLocation} icon={garageIcon}>
                      <Popup>Gara Xuất Phát</Popup>
                    </Marker>
                    <Marker position={[customerLat, customerLng]} icon={userIcon}>
                      <Popup>Vị trí Khách hàng</Popup>
                    </Marker>
                    {routeCoords.length > 0 && (
                      <Polyline positions={routeCoords} color="#3b82f6" weight={6} opacity={0.8} />
                    )}
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    Khách hàng chưa cung cấp vị trí
                  </div>
                )}
              </div>

              {/* Info & Actions */}
              <div className="flex flex-col gap-3">
                {distanceInfo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">Khoảng cách & Thời gian</p>
                      <p className="font-bold text-slate-800 text-lg">
                        {distanceInfo.distKm} km <span className="text-sm font-normal text-slate-500 ml-1">~ {distanceInfo.durMin} phút</span>
                      </p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium">Phí cứu hộ gợi ý</p>
                      <p className="font-black text-blue-700 text-lg">
                        {estimatedPrice.toLocaleString('vi-VN')} VND
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-white border border-rose-200 text-rose-600 font-bold rounded-xl hover:bg-rose-50 transition-colors flex justify-center items-center gap-2"
                  >
                    <XCircle size={20} /> Từ chối
                  </button>
                  <button
                    onClick={() => {
                      if (selectedTechnicianId) {
                        onAssign(selectedTechnicianId);
                      } else {
                        // Trình duyệt native alert hoặc chỉ disable là đủ vì đã có disabled attribute
                      }
                    }}
                    disabled={!selectedTechnicianId}
                    className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg ${
                      selectedTechnicianId 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                        : 'bg-slate-300 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <CheckCircle size={20} /> Tiếp nhận
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Technicians */}
          <div className="w-full lg:w-1/2 p-4 overflow-y-auto relative bg-slate-50">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-[#00285E]" /> Danh sách Kỹ thuật viên
            </h4>
            
            {/* Loading or Tech list */}
            {loading ? (
              <div className="text-center text-slate-500 py-8">Đang tải danh sách...</div>
            ) : technicians.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {technicians.map(tech => {
                  const isLeader = tech.role?.roleCode === 'TECHNICIAN_LEADER';
                  return (
                    <div 
                      key={tech.id}
                      onClick={() => {
                        setSelectedTechnicianId(selectedTechnicianId === tech.id ? null : tech.id);
                      }}
                      className={`group relative p-4 rounded-xl border transition-all flex items-center gap-3 bg-white cursor-pointer ${
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {isLeader && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <ShieldCheck size={10} /> Tổ trưởng
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 ${
                            tech.isBusy
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
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
                              setExpandedTechnicianId(expandedTechnicianId === tech.id ? null : tech.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                          >
                            {expandedTechnicianId === tech.id ? <EyeOff size={13} /> : <Eye size={13} />}
                            {expandedTechnicianId === tech.id ? 'Đóng' : 'Xem việc'}
                          </button>
                        ) : <div className="flex items-center text-amber-500">
                          <Star size={14} className="fill-amber-500" />
                          <span className="text-xs font-bold ml-1">{tech.skillLevel}</span>
                        </div>}
                        {selectedTechnicianId === tech.id && <span className="text-xs text-white bg-[#00285E] px-2 py-1 rounded-md">Đã chọn</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center text-slate-500 py-8">Không có kỹ thuật viên nào làm việc hôm nay.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

