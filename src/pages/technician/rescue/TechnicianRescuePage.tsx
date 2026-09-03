import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Siren, MapPin, Navigation, Phone, CheckCircle, CarFront, Loader2, Radio, RadioTower, Volume2, VolumeX } from 'lucide-react';
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

const carIcon = L.divIcon({
  className: 'custom-car-marker',
  html: `
    <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#00285E;border-radius:9999px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
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

interface RouteInstruction {
  text: string;
  location: [number, number];
  routeIndex: number;
}

interface OsrmStep {
  name?: string;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
}

interface OsrmRoute {
  geometry: {
    coordinates: [number, number][];
  };
  legs: {
    steps: OsrmStep[];
  }[];
  distance: number;
  duration: number;
}

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

const distanceBetween = (first: [number, number], second: [number, number]) => {
  const earthRadius = 6371000;
  const latitudeDifference = toRadians(second[0] - first[0]);
  const longitudeDifference = toRadians(second[1] - first[1]);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(first[0])) * Math.cos(toRadians(second[0])) * Math.sin(longitudeDifference / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const closestRouteIndex = (route: [number, number][], point: [number, number]) => {
  return route.reduce((closestIndex, coordinate, index) => (
    distanceBetween(coordinate, point) < distanceBetween(route[closestIndex], point) ? index : closestIndex
  ), 0);
};

const instructionText = (step: OsrmStep) => {
  const maneuver = step.maneuver;
  const roadName = step.name ? ` vào ${step.name}` : '';

  if (maneuver.type === 'depart') return `bắt đầu di chuyển${roadName}`;
  if (maneuver.type === 'arrive') return 'đến nơi';
  if (maneuver.type === 'roundabout' || maneuver.type === 'rotary') return `đi vào vòng xuyến${roadName}`;
  if (maneuver.type === 'uturn' || maneuver.modifier === 'uturn') return `quay đầu${roadName}`;

  const directions: Record<string, string> = {
    left: 'rẽ trái',
    right: 'rẽ phải',
    'slight left': 'chếch sang trái',
    'slight right': 'chếch sang phải',
    'sharp left': 'rẽ gắt sang trái',
    'sharp right': 'rẽ gắt sang phải',
    straight: 'đi thẳng',
  };

  const direction = maneuver.modifier ? directions[maneuver.modifier] : undefined;
  return `${direction ?? 'tiếp tục di chuyển'}${roadName}`;
};

const MapInteractionDetector = ({ onUserInteract }: { onUserInteract: () => void }) => {
  const map = useMap();
  useEffect(() => {
    const handleInteraction = () => {
      onUserInteract();
    };

    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);
    map.on('touchmove', handleInteraction);

    return () => {
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
      map.off('touchmove', handleInteraction);
    };
  }, [map, onUserInteract]);

  return null;
};

const MapFitter = ({ bounds, lat, lng, isUserPanned }: { bounds?: L.LatLngBounds | null, lat?: number; lng?: number, isUserPanned: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (isUserPanned) return; // Không tự động co dãn bản đồ nếu người dùng đang tự vuốt/kéo
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (lat && lng) {
      map.flyTo([lat, lng], 15, { animate: true, duration: 1.5 });
    }
  }, [lat, lng, bounds, map, isUserPanned]);
  return null;
};

const getInstructionIcon = (text: string) => {
  const lowercaseText = text.toLowerCase();
  if (lowercaseText.includes('rẽ trái') || lowercaseText.includes('chếch sang trái') || lowercaseText.includes('gắt sang trái')) {
    return <Navigation className="w-6 h-6 text-blue-400 rotate-[-90deg] shrink-0" />;
  }
  if (lowercaseText.includes('rẽ phải') || lowercaseText.includes('chếch sang phải') || lowercaseText.includes('gắt sang phải')) {
    return <Navigation className="w-6 h-6 text-blue-400 rotate-[90deg] shrink-0" />;
  }
  if (lowercaseText.includes('quay đầu')) {
    return <Navigation className="w-6 h-6 text-blue-400 rotate-[180deg] shrink-0" />;
  }
  if (lowercaseText.includes('vòng xuyến')) {
    return <Navigation className="w-6 h-6 text-blue-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />;
  }
  return <Navigation className="w-6 h-6 text-emerald-400 shrink-0" />; // Mặc định là đi thẳng/bắt đầu
};

// Toạ độ Gara cố định — khớp với MapTracking.tsx (480 Trần Quốc Hoàn, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng)
const garageLocation: [number, number] = [16.08100332219308, 108.16569510559148];

export default function TechnicianRescuePage() {
  const { fetchPrivate } = useFetchClient();
  const socket = useSocket();
  const [rescueTask, setRescueTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInstructions, setRouteInstructions] = useState<RouteInstruction[]>([]);
  const [distance, setDistance] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const [carLocation, setCarLocation] = useState<[number, number]>([15.9675, 108.2605]);
  const [technicianLocation, setTechnicianLocation] = useState<[number, number]>([15.9675, 108.2605]); // Default to Garage Đà Nẵng, update via GPS
  const [hasTechnicianLocation, setHasTechnicianLocation] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const voiceEnabledRef = useRef(true);
  const [hudInstruction, setHudInstruction] = useState<string | null>(null);
  const [isMapUserPanned, setIsMapUserPanned] = useState(false);
  const [useFallbackTiles, setUseFallbackTiles] = useState(false);

  const gpsWatchRef = useRef<number | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const lastLocationEmitRef = useRef(0);
  const lastRouteFetchRef = useRef(0);

  const routeCoordsRef = useRef<[number, number][]>([]);
  const routeInstructionsRef = useRef<RouteInstruction[]>([]);
  const announcedWarningsRef = useRef(new Set<number>());
  const announcedTurnsRef = useRef(new Set<number>());

  const speak = (text: string, forceVoiceEnabled?: boolean) => {
    showToast(text, 'info');

    const isEnabled = forceVoiceEnabled !== undefined ? forceVoiceEnabled : voiceEnabledRef.current;
    if (!isEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setToastMessage({ text: 'Trình duyệt này không hỗ trợ đọc chỉ dẫn giọng nói.', type: 'error' });
      return;
    }

    try {
      window.speechSynthesis.resume();
      const isSpeaking = window.speechSynthesis.speaking;
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const vietnameseVoice = voicesRef.current.find(voice => voice.lang.toLowerCase().startsWith('vi'));
      if (vietnameseVoice) utterance.voice = vietnameseVoice;

      (window as any).activeUtterance = utterance;

      if (isSpeaking) {
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      } else {
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error("Lỗi âm thanh chỉ dẫn:", error);
    }
  };

  const updateNavigation = (position: [number, number]) => {
    const coordinates = routeCoordsRef.current;
    if (coordinates.length === 0) return;

    const currentRouteIndex = closestRouteIndex(coordinates, position);
    // 1. Chỉ tìm ngã rẽ tiếp theo mà KTV CHƯA đi qua (không bỏ qua các ngã rẽ đã đọc để tránh đọc vượt đầu)
    const nextInstructionIndex = routeInstructionsRef.current.findIndex(
      (instruction) => instruction.routeIndex >= currentRouteIndex
    );
    if (nextInstructionIndex === -1) {
      setHudInstruction(null);
      return;
    }

    const instruction = routeInstructionsRef.current[nextInstructionIndex];
    const metersToTurn = distanceBetween(position, instruction.location);
    const roundedDistance = Math.round(metersToTurn);

    if (instruction.text === 'đến nơi') {
      if (metersToTurn <= 25) {
        setHudInstruction('Bạn đã đến nơi.');
        if (!announcedTurnsRef.current.has(nextInstructionIndex)) {
          announcedTurnsRef.current.add(nextInstructionIndex);
          speak('Bạn đã đến nơi.');
        }
      } else {
        setHudInstruction(`Cách ${roundedDistance} mét là đến nơi.`);
      }
    } else {
      const capitalizedText = `Cách ${roundedDistance} mét ${instruction.text}`;
      setHudInstruction(capitalizedText);

      // 2. Chỉ phát giọng nói khi khoảng cách <= 40 mét và ngã rẽ này chưa từng được phát
      if (metersToTurn <= 40 && !announcedTurnsRef.current.has(nextInstructionIndex)) {
        announcedTurnsRef.current.add(nextInstructionIndex);
        speak(`Cách ${Math.round(metersToTurn)} mét ${instruction.text}`);
      }
    }
  };

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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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

        // Đọc chỉ dẫn khúc cua bằng giọng nói
        updateNavigation(location);

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

  useEffect(() => {
    if (routeCoords.length === 0 || routeInstructions.length === 0) {
      setHudInstruction(null);
      return;
    }
    updateNavigation(technicianLocation);
  }, [technicianLocation, routeCoords, routeInstructions]);

  // Tránh đơ giọng đọc iOS: Tải trước tiếng nói khi component render
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopLocationSharing();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopLocationSharing]);

  useEffect(() => {
    getCurrentGps()
      .then((location) => {
        setTechnicianLocation(location);
        setCarLocation(location);
        setHasTechnicianLocation(true);
      })
      .catch((err) => {
        console.warn('Không tự động lấy được GPS ban đầu:', err);
        // Để hiển thị map ngay cả khi không lấy được GPS thực tế, set true và dùng vị trí mặc định Gara
        setHasTechnicianLocation(true);
      });
  }, []);

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
  // Đoạn 2 (KTV -> Gara, khi status = TOWING): điểm xuất phát vẫn là GPS realtime của KTV, đích là Gara.
  useEffect(() => {
    if (!rescueTask?.customer_lat || !rescueTask?.customer_lng) return;
    const now = Date.now();
    const isLiveMovement = rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'TOWING';
    if (isLiveMovement && now - lastRouteFetchRef.current < 20000) return;
    lastRouteFetchRef.current = now;

    const isTowingBack = rescueTask.status === 'TOWING' || rescueTask.status === 'COMPLETED';
    const customerLat = parseFloat(rescueTask.customer_lat);
    const customerLng = parseFloat(rescueTask.customer_lng);
    const from: [number, number] = technicianLocation;
    const to: [number, number] = isTowingBack ? garageLocation : [customerLat, customerLng];

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
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
          routeCoordsRef.current = coordsArray;

          // Parse các chỉ dẫn ngã rẽ từ OSRM
          const steps: OsrmStep[] = route.legs?.flatMap((leg: { steps: OsrmStep[] }) => leg.steps) ?? [];
          const instructions = steps.map(step => {
            const maneuverLocation: [number, number] = [step.maneuver.location[1], step.maneuver.location[0]];
            return {
              text: instructionText(step),
              location: maneuverLocation,
              routeIndex: closestRouteIndex(coordsArray, maneuverLocation),
            };
          });
          setRouteInstructions(instructions);
          routeInstructionsRef.current = instructions;

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

      if (newStatus === 'EN_ROUTE') {
        startLocationSharing(rescueTask.id);
        speak('Bắt đầu di chuyển và chia sẻ vị trí cứu hộ.');
        showToast('Đã bắt đầu di chuyển và chia sẻ GPS thật!', 'success');
      }
      else if (newStatus === 'ARRIVED') {
        stopLocationSharing();
        speak('Bạn đã tiếp cận vị trí khách hàng.');
        showToast('Đã đến nơi thành công!', 'success');
      }
      else if (newStatus === 'TOWING') {
        startLocationSharing(rescueTask.id);
        speak('Bắt đầu chở xe về gara.');
        showToast('Đã bắt đầu chở xe về Gara và chia sẻ GPS thật!', 'success');
      }
      else if (newStatus === 'COMPLETED') {
        stopLocationSharing();
        speak('Đã hoàn thành cứu hộ.');
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
      // Đặt âm thanh chào mừng đồng bộ trong thread click để mở khóa tiếng duyệt trên iOS
      speak(status === 'EN_ROUTE' ? 'Bắt đầu di chuyển cứu hộ.' : 'Bắt đầu chở xe về gara.');

      const location = await getCurrentGps();
      setTechnicianLocation(location);
      setCarLocation(location);
      setHasTechnicianLocation(true);

      announcedWarningsRef.current.clear();
      announcedTurnsRef.current.clear();

      await updateStatus(status, location);
    } catch (error) {
      console.error('Không thể bắt đầu GPS:', error);
      showToast('Không thể bắt đầu di chuyển vì chưa lấy được GPS. Hãy bật quyền vị trí.', 'error');
    }
  };

  const mapApiKey = import.meta.env.VITE_API_BANDO;
  const primaryTileUrl = mapApiKey
    ? `https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}.png?api_key=${mapApiKey}`
    : 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
  const primaryTileAttribution = mapApiKey
    ? '&copy; <a href="https://goong.io">Goong</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://openstreetmap.fr">OSM France</a>';
  const tileUrl = useFallbackTiles
    ? 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
    : primaryTileUrl;
  const tileAttribution = useFallbackTiles
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://openstreetmap.fr">OSM France</a>'
    : primaryTileAttribution;

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
    <div className="relative w-full h-[calc(100vh-136px)] lg:h-[calc(100vh-80px)] overflow-hidden bg-slate-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-4 left-1/2 z-[1000] transform -translate-x-1/2 flex items-center gap-2 px-4 sm:px-6 py-3 rounded-xl shadow-xl font-semibold text-white max-w-[90vw] ${toastMessage.type === 'success' ? 'bg-emerald-500' :
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
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
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
              <>
                <MapContainer
                  center={technicianLocation}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    key={tileUrl}
                    attribution={tileAttribution}
                    url={tileUrl}
                    eventHandlers={{
                      tileerror: () => {
                        if (!useFallbackTiles && mapApiKey) setUseFallbackTiles(true);
                      },
                    }}
                  />

                  <Marker position={technicianLocation} icon={isSharingLocation ? carIcon : technicianIcon} zIndexOffset={1000}>
                    <Popup className="font-bold text-blue-800">Vị trí của bạn (KTV)</Popup>
                  </Marker>

                  <Marker
                    position={[parseFloat(rescueTask.customer_lat), parseFloat(rescueTask.customer_lng)]}
                    icon={userIcon}
                  >
                    <Popup className="rounded-xl overflow-hidden shadow-xl font-bold text-slate-800 text-center">
                      Vị trí Khách hàng <br />
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

                  <MapInteractionDetector onUserInteract={() => setIsMapUserPanned(true)} />
                  <MapFitter bounds={mapBounds} isUserPanned={isMapUserPanned} />
                </MapContainer>

                {isMapUserPanned && (
                  <button
                    type="button"
                    onClick={() => setIsMapUserPanned(false)}
                    className="absolute right-4 bottom-24 sm:bottom-28 z-[500] pointer-events-auto px-4 py-2.5 bg-[#00285E] hover:bg-blue-800 text-white rounded-full shadow-2xl transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    <Navigation size={14} className="rotate-45 shrink-0" />
                    ĐỊNH VỊ LẠI
                  </button>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200">
                <MapPin size={64} className="text-slate-400 mb-4" />
                <p className="text-slate-500 font-bold text-lg">Khách hàng chưa cung cấp toạ độ GPS</p>
              </div>
            )}
          </div>

          {/* Floating UI Overlays */}
          <div className="absolute inset-0 z-30 pointer-events-none p-3 sm:p-6 flex flex-col justify-between">
            {/* Top Bar Overlay */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-start gap-3">
              {/* Left Customer Info */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-white p-3.5 sm:p-5 pointer-events-auto w-full sm:max-w-sm"
              >
                <div className="flex items-center gap-2.5 sm:flex-row justify-between mb-3.5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="bg-rose-100 p-2 rounded-lg text-rose-600">
                      <Siren size={18} className="animate-pulse" />
                    </span>
                    <h3 className="font-bold text-slate-800 text-base sm:text-lg">Cứu hộ khẩn cấp</h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 mb-3.5">
                  <img
                    src={rescueTask.customer?.user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop"}
                    alt="Avatar"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white shadow-sm object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm sm:text-base truncate">
                      {rescueTask.customer?.name || rescueTask.customer?.user?.fullName || 'Khách Vãng Lai'}
                    </div>
                    <a
                      href={`tel:${rescueTask.customer?.phone || rescueTask.customer?.user?.phoneNumber}`}
                      className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-semibold mt-1 flex items-center gap-1.5 pointer-events-auto transition-colors"
                    >
                      <Phone size={13} className="shrink-0" />
                      <span className="truncate hover:underline">
                        {rescueTask.customer?.phone || rescueTask.customer?.user?.phoneNumber || 'Chưa có SĐT'}
                      </span>
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3 border border-slate-100">
                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    <span className="text-slate-400 font-bold">MÔ TẢ:</span> {rescueTask.issue_description || "Không có ghi chú"}
                  </p>
                </div>
                {distance && duration && (
                  <div className="flex sm:hidden justify-around items-center mt-3 pt-3 border-t border-slate-100 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Khoảng cách</span>
                      <span className="text-sm font-black text-blue-600">{distance}</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Thời gian</span>
                      <span className="text-sm font-black text-emerald-600">{duration}</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {distance && duration && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden sm:flex bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 border border-white px-6 py-4 pointer-events-auto gap-6"
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
              {/* Chỉ dẫn đường đi: đặt ngay trên cụm nút thay vì trên đầu màn hình,
                  vì ở trên nó che mất thẻ thông tin khách hàng và số điện thoại. */}
              <AnimatePresence>
                {hudInstruction && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="mb-3 bg-slate-900/92 text-white backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-950/25 border border-slate-700/50 p-3.5 flex items-center gap-3"
                  >
                    <div className="p-2 bg-slate-800 rounded-xl border border-slate-700 shadow-inner flex items-center justify-center shrink-0">
                      {getInstructionIcon(hudInstruction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Chỉ dẫn đường đi
                      </p>
                      <p className="text-sm font-bold text-white mt-0.5 leading-snug break-words">
                        {hudInstruction}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {(rescueTask.status === 'EN_ROUTE' || rescueTask.status === 'TOWING') && (
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      const newEnabled = !voiceEnabled;
                      setVoiceEnabled(newEnabled);
                      voiceEnabledRef.current = newEnabled;
                      if (newEnabled) {
                        speak('Đã bật chỉ dẫn giọng nói.', true);
                      } else {
                        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }
                    }}
                    className="p-3 bg-white text-slate-700 border border-slate-200 rounded-xl shadow-lg hover:bg-slate-50 transition-colors shrink-0 flex items-center justify-center pointer-events-auto"
                    title={voiceEnabled ? 'Tắt âm chỉ dẫn' : 'Bật âm chỉ dẫn'}
                  >
                    {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </button>
                  {/* Vị trí luôn được chia sẻ trong lúc di chuyển (updateStatus tự bật khi
                      chuyển sang EN_ROUTE/TOWING) nên chỉ hiển thị trạng thái, không cho tắt. */}
                  <div
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-lg flex items-center justify-center gap-2 ${isSharingLocation
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                  >
                    {isSharingLocation ? (
                      <RadioTower size={18} className="animate-pulse shrink-0" />
                    ) : (
                      <Radio size={18} className="shrink-0" />
                    )}
                    <span className="truncate">
                      {isSharingLocation ? 'KHÁCH ĐANG THEO DÕI VỊ TRÍ' : 'ĐANG CHỜ TÍN HIỆU GPS'}
                    </span>
                  </div>
                </div>
              )}
              {rescueTask.status === 'ASSIGNED' && (
                <button
                  onClick={() => beginMovement('EN_ROUTE')}
                  disabled={actionLoading}
                  className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-base sm:text-lg animate-bounce"
                >
                  {actionLoading ? <Loader2 size={22} className="animate-spin" /> : <Navigation size={22} />}
                  BẮT ĐẦU DI CHUYỂN
                </button>
              )}

              {/* TEST: tạm thời chưa kiểm tra khoảng cách <= 100 m.
                  Khi triển khai thật, bổ sung `&& canConfirmArrival` vào điều kiện bên dưới. */}
              {rescueTask.status === 'EN_ROUTE' && (
                <button
                  onClick={() => updateStatus('ARRIVED')}
                  disabled={actionLoading}
                  className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-full font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-base sm:text-lg"
                >
                  {actionLoading ? <Loader2 size={22} className="animate-spin" /> : <MapPin size={22} />}
                  TÔI ĐÃ ĐẾN NƠI
                </button>
              )}

              {rescueTask.status === 'ARRIVED' && (
                <button
                  onClick={() => beginMovement('TOWING')}
                  disabled={actionLoading}
                  className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black tracking-wide shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2 text-center text-sm sm:text-base leading-snug"
                >
                  {actionLoading ? <Loader2 size={22} className="animate-spin shrink-0" /> : <CarFront size={22} className="shrink-0" />}
                  <span>BẮT ĐẦU CHỜ XE VỀ GARA</span>
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
                  className="w-full py-3.5 sm:py-4 px-6 bg-slate-800 text-white rounded-2xl font-black tracking-wide shadow-2xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-center text-sm sm:text-base leading-snug"
                >
                  {actionLoading ? <Loader2 size={22} className="animate-spin shrink-0" /> : <CheckCircle size={22} className="shrink-0" />}
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
