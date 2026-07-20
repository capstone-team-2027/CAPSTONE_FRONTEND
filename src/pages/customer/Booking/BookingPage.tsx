import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Calendar, Car, Settings,
    Check, ChevronRight, Phone, Clock, Edit2, ArrowLeft,
    Sparkles, Upload, X, AlertTriangle, Banknote, Wrench, Video
} from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import { APPOINTMENT_API_ENDPOINTS } from '../../../constants/customer/appointmentsEndpoints';
import { GARAGE_CONFIG_API_ENDPOINTS } from '../../../constants/customer/garage_configurationsEndpoints';
import { PROFILE_API_ENDPOINTS } from '../../../constants/customer/profileApiEndpoint';
import { VEHICLE_MAKE_MODEL_API_ENDPOINTS } from '../../../constants/customer/vehicelMakeModelEndpoint';
import { useSocket } from '../../../hook/useSocket';
import SingleServicesSelector from './SingleServicesSelector';
import ComboServicesSelector from './ComboServicesSelector';
import InlineCalendar from './InlineCalendar';
import type { ServiceCombo, ServiceItem } from '../../../model/Service';



export default function BookingPage() {
    const apiAI = import.meta.env.VITE_AI_API_URL || "http://localhost:3000";
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState(1);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { fetchPublic, fetchPrivate, fetchPrivateForm } = useFetchClient_v2();
    const socket = useSocket();

    const handleStartVideoCall = () => {
        const roomId = `sos_${Date.now()}`;
        if (socket) {
            socket.emit('request-video-call', {
                roomId,
                timestamp: new Date()
            });
        }
        navigate(`/video-call/${roomId}`);
    };

    // Booking Flow State: 'CONSULTATION' | 'SPECIFIC'
    const [bookingFlow, setBookingFlow] = useState<'CONSULTATION' | 'SPECIFIC'>('SPECIFIC');
    // Service Subtype State: 'service' | 'combo'
    const [serviceSubtype, setServiceSubtype] = useState<'combo' | 'service'>('combo');
    const [serviceCategoryMode, setServiceCategoryMode] = useState<'SERVICES' | 'REPAIR'>('SERVICES');
    // Consultation notes / description state
    const [notes, setNotes] = useState('');

    // Garage configuration states
    const [shifts, setShifts] = useState<any[]>([]);
    const [bufferMinutes, setBufferMinutes] = useState<number>(90);

    // Form States
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [servicePage, setServicePage] = useState(1);
    const [selectedSubItems, setSelectedSubItems] = useState<string[]>([]);

    const getTodayString = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [bookingDate, setBookingDate] = useState(getTodayString());
    const [bookingTime, setBookingTime] = useState('');
    const [isDateFocused, setIsDateFocused] = useState(false);

    const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
    const [selectedCustomerVehicleId, setSelectedCustomerVehicleId] = useState<number | null>(null);
    const [vehicleInputMode, setVehicleInputMode] = useState<'NEW' | 'EXISTING'>('NEW');

    const [vehicleBrand, setVehicleBrand] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [plateError, setPlateError] = useState('');
    const [isCheckingPlate, setIsCheckingPlate] = useState(false);
    const [vehicleYear, setVehicleYear] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [isAnalyzingColor, setIsAnalyzingColor] = useState(false);
    const [colorImagePreviews, setColorImagePreviews] = useState<string[]>([]);
    const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
    const [colorInputMode, setColorInputMode] = useState<'TEXT' | 'IMAGE'>('TEXT');
    const [aiDetectionResult, setAiDetectionResult] = useState<{
        rawText: string | null;
        color: string | null;
        brand: string | null;
        model: string | null;
        licensePlate: string | null;
    } | null>(null);

    const [consultationType, setConsultationType] = useState<'AI_DIAGNOSIS' | 'CALL_BACK'>('AI_DIAGNOSIS');
    const [issueDescription, setIssueDescription] = useState('');
    const [issueImagePreview, setIssueImagePreview] = useState<string | null>(null);
    const [isImageFullScreen, setIsImageFullScreen] = useState(false);
    const [isAnalyzingIssue, setIsAnalyzingIssue] = useState(false);
    const [aiIssueResult, setAiIssueResult] = useState<{
        possible_causes: string[];
        severity: string;
        recommendation: string;
    } | null>(null);

    // State cho kết quả AI YOLO phân tích ảnh
    const [aiImageDamageResult, setAiImageDamageResult] = useState<{
        tong_so_loi: number;
        chi_tiet_loi: {
            loi_phat_hien: string;
            class_yolo: string;
            do_tin_cay: string;
            toa_do_box: number[];
            muc_do_nghiem_trong: string;
            chi_phi_uoc_tinh: string;
            thoi_gian_du_kien: string;
            vat_tu_can_thiet: string[];
            quy_trinh_xu_ly: string[];
        }[];
    } | null>(null);

    const [callbackPhone, setCallbackPhone] = useState('');
    const [callbackNotes, setCallbackNotes] = useState('');

    const [brandSuggestions, setBrandSuggestions] = useState<any[]>([]);
    const [modelSuggestions, setModelSuggestions] = useState<any[]>([]);
    const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null);
    const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
    const [showModelSuggestions, setShowModelSuggestions] = useState(false);

    const brandRef = useRef<HTMLDivElement>(null);
    const modelRef = useRef<HTMLDivElement>(null);

    const [profileName, setProfileName] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isPendingPayment, setIsPendingPayment] = useState(false);

    // Dynamic Data States
    const [dbServices, setDbServices] = useState<any[]>([]);
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [dbCombos, setDbCombos] = useState<ServiceCombo[]>([]);
    const [_, setIsLoading] = useState(true);

    const [garageCapacity, setGarageCapacity] = useState<number>(1);
    const [bookedCounts, setBookedCounts] = useState<Record<string, number>>({});

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // Booking code will be the service_order_id from backend
    const [bookingCode, setBookingCode] = useState<string | null>(null);

    const minDateStr = useMemo(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const maxDateStr = useMemo(() => {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 5);
        const y = maxDate.getFullYear();
        const m = String(maxDate.getMonth() + 1).padStart(2, '0');
        const d = String(maxDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    const steps = useMemo(() => {
        if (bookingFlow === 'CONSULTATION') {
            return [
                { id: 1, label: t('booking.steps.service', 'Dịch vụ'), icon: <Settings size={20} /> },
                { id: 2, label: t('booking.steps.time', 'Thời gian'), icon: <Clock size={20} /> },
            ];
        } else {
            return [
                { id: 1, label: t('booking.steps.vehicle', 'Thông tin xe'), icon: <Car size={20} /> },
                { id: 2, label: t('booking.steps.service', 'Dịch vụ'), icon: <Settings size={20} /> },
                { id: 3, label: t('booking.steps.time', 'Thời gian'), icon: <Clock size={20} /> },
            ];
        }
    }, [bookingFlow, t]);

    const [serviceSearch, setServiceSearch] = useState('');
    const [serviceTotalPages, setServiceTotalPages] = useState(1);
    const [currentPageServices, setCurrentPageServices] = useState<any[]>([]);

    // Load dynamic categories & services from backend
    useEffect(() => {
        const loadDbData = async () => {
            setIsLoading(true);
            const currentLang = i18n.language || 'vi';
            try {
                // Fetch Categories
                const catRes = await fetchPublic(`${SERVICE_API_ENDPOINTS.GET_CATEGORIES}?lang=${currentLang}`);
                if (catRes && catRes.data) {
                    setDbCategories(catRes.data);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu categories từ backend:", error);
            }

        };
        loadDbData();
    }, [i18n.language]);

    // Fetch Services on page/search/category change
    useEffect(() => {
        const fetchServices = async () => {
            const currentLang = i18n.language || 'vi';
            try {
                const query = `lang=${currentLang}&page=${servicePage}&limit=16&search=${encodeURIComponent(serviceSearch)}&category_id=${selectedCategoryId || ''}`;
                const svcRes = await fetchPublic(`${SERVICE_API_ENDPOINTS.GET_SERVICES}?${query}`);
                if (svcRes && svcRes.data) {
                    const newItems = svcRes.data.items || [];
                    setCurrentPageServices(newItems);
                    
                    setDbServices(prev => {
                        const map = new Map(prev.map((item: any) => [item.id, item]));
                        newItems.forEach((item: any) => map.set(item.id, item));
                        return Array.from(map.values());
                    });
                    setServiceTotalPages(svcRes.data.totalPages || 1);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu services từ backend:", error);
            }
        };

        const timer = setTimeout(() => {
            fetchServices();
        }, 300);

        return () => clearTimeout(timer);
    }, [i18n.language, servicePage, serviceSearch, selectedCategoryId, fetchPublic]);

    // Load garage configuration data (shifts & buffer time)
    useEffect(() => {
        const loadGarageConfigs = async () => {
            try {
                // Fetch buffer time as before
                const bufferRes = await fetchPublic(GARAGE_CONFIG_API_ENDPOINTS.GET_CONFIGURATION_BY_KEY("BUFFER_TIME_MINUTES"));
                if (bufferRes && bufferRes.success && bufferRes.data) {
                    const parsedVal = parseInt(bufferRes.data.config_value, 10);
                    if (!isNaN(parsedVal) && parsedVal > 0) {
                        setBufferMinutes(parsedVal);
                    }
                }
            } catch (error) {
                console.error("Lỗi khi tải cấu hình BUFFER_TIME_MINUTES:", error);
            }

            try {
                // Fetch availability
                const dateParam = bookingDate ? `?date=${bookingDate}` : '';
                const availRes = await fetchPublic(GARAGE_CONFIG_API_ENDPOINTS.GET_AVAILABILITY + dateParam);
                if (availRes && availRes.success && availRes.data) {
                    const data = availRes.data;
                    if (data.shifts) setShifts(data.shifts);
                    if (data.capacity !== undefined) setGarageCapacity(data.capacity);
                    if (data.bookedCounts) setBookedCounts(data.bookedCounts);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu ca làm việc và tình trạng sức chứa:", error);
            }
        };
        loadGarageConfigs();
    }, [bookingDate, fetchPublic]);

    // Check duplicate license plate
    useEffect(() => {
        if (vehicleInputMode !== 'NEW' || !vehiclePlate.trim()) {
            setPlateError('');
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingPlate(true);
            try {
                const res = await fetchPublic(APPOINTMENT_API_ENDPOINTS.CHECK_LICENSE_PLATE + '?license_plate=' + encodeURIComponent(vehiclePlate.trim()));
                if (res && res.success && res.exists) {
                    setPlateError(res.message || 'Biển số xe đã tồn tại.');
                } else {
                    setPlateError('');
                }
            } catch (error) {
                console.error("Lỗi khi kiểm tra biển số:", error);
            } finally {
                setIsCheckingPlate(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [vehiclePlate, vehicleInputMode, fetchPublic]);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
                setShowBrandSuggestions(false);
            }
            if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
                setShowModelSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debounce fetch Vehicle Brands
    useEffect(() => {
        const delayFn = setTimeout(async () => {
            try {
                const res = await fetchPublic(VEHICLE_MAKE_MODEL_API_ENDPOINTS.GET_VEHICLE_MAKES, "POST", { search: vehicleBrand });
                if (res && res.data) {
                    setBrandSuggestions(res.data);
                }
            } catch (error) {
                console.error("Lỗi khi tìm kiếm hãng xe:", error);
            }
        }, 500);

        return () => clearTimeout(delayFn);
    }, [vehicleBrand, fetchPublic]);

    // Debounce fetch Vehicle Models
    useEffect(() => {
        const delayFn = setTimeout(async () => {
            try {
                const body: any = { search: vehicleModel };
                if (selectedMakeId) body.make_id = selectedMakeId;

                const res = await fetchPublic(VEHICLE_MAKE_MODEL_API_ENDPOINTS.GET_VEHICLE_MODELS, "POST", body);
                if (res && res.data) {
                    setModelSuggestions(res.data);
                }
            } catch (error) {
                console.error("Lỗi khi tìm kiếm dòng xe:", error);
            }
        }, 500);

        return () => clearTimeout(delayFn);
    }, [vehicleModel, selectedMakeId, fetchPublic]);

    // Load customer profile data & vehicles
    useEffect(() => {
        const loadProfileAndVehicles = async () => {
            try {
                const res = await fetchPrivate(PROFILE_API_ENDPOINTS.GET_PROFILE);
                if (res && res.success && res.data) {
                    setProfileName(res.data.name || res.data.email || 'Khách hàng');
                    if (res.data.phone) {
                        setCallbackPhone(res.data.phone);
                    } else if (res.data.phone_number) {
                        setCallbackPhone(res.data.phone_number);
                    }
                }
                const vehicleRes = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.GET_APPOINTMENT_VEHICLE);
                if (vehicleRes && vehicleRes.success && vehicleRes.data) {
                    setCustomerVehicles(vehicleRes.data);
                    if (vehicleRes.data.length > 0) {
                        setVehicleInputMode('EXISTING');
                    }
                }
            } catch (error) {
                console.error("Lỗi khi tải thông tin cá nhân hoặc danh sách xe:", error);
            }
        };
        loadProfileAndVehicles();
    }, []);


    // Auto redirect to home after 5 seconds of success
    useEffect(() => {
        let timer: any;
        if (isSuccess) {
            timer = setTimeout(() => {
                navigate('/');
            }, 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isSuccess, navigate]);

    const handleColorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files).slice(0, 3); // Max 3 files

        // Preview local image
        const localUrls = fileArray.map(file => URL.createObjectURL(file));
        setColorImagePreviews(localUrls);
        setAiDetectionResult(null);

        // Call API to analyze
        setIsAnalyzingColor(true);
        try {
            const formData = new FormData();
            fileArray.forEach(file => {
                formData.append("images", file);
            });

            const endpoint = (APPOINTMENT_API_ENDPOINTS as any).ANALYZE_CAR_COLOR || `${API_BASE_URL}/api/customer/analyze-car-color`;
            const response = await fetchPrivateForm(
                endpoint,
                'POST',
                formData
            );

            if (response && response.success && response.data) {
                const result = response.data;
                setAiDetectionResult(result);
                if (result.color) setVehicleColor(result.color);
                if (result.brand) setVehicleBrand(result.brand);
                if (result.model) setVehicleModel(result.model);
                if (result.licensePlate) setVehiclePlate(result.licensePlate);
            } else {
                throw new Error("Không có phản hồi từ máy chủ");
            }
        } catch (error: any) {
            console.error("Lỗi phân tích ảnh xe:", error);
            alert("Tính năng nhận diện xe bằng AI hiện đang có lỗi xử lý. Vui lòng thử lại hoặc nhập trực tiếp.");
            setColorImagePreviews([]);
            setAiDetectionResult(null);
        } finally {
            setIsAnalyzingColor(false);
            e.target.value = '';
        }
    };

    const handleRemoveColorImage = () => {
        setColorImagePreviews([]);
        setAiDetectionResult(null);
    };

    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

    const handleIssueImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        const localUrl = URL.createObjectURL(file);
        setIssueImagePreview(localUrl);

        setIsAnalyzingImage(true);
        setAiImageDamageResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${apiAI}/api/analyze-damage`, {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                const data = await response.json();
                if (data.status === "success") {
                    setAiImageDamageResult(data);
                    if (data.image_base64) {
                        setIssueImagePreview(data.image_base64);
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi phân tích AI:", error);
        } finally {
            setIsAnalyzingImage(false);
            e.target.value = '';
        }
    };

    const handleRemoveIssueImage = () => {
        setIssueImagePreview(null);
        setAiImageDamageResult(null);
    };

    const handleAnalyzeIssue = async () => {
        if (!issueDescription.trim()) return;
        setIsAnalyzingIssue(true);
        setAiIssueResult(null);

        // Simulate AI analysis delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const textLower = issueDescription.toLowerCase();
        let possible_causes = [
            "Hao mòn khớp truyền động hoặc rô-tuyn hệ thống lái",
            "Giảm xóc bị rò rỉ dầu hoặc khô mỡ khớp bạc lót",
            "Lỏng các đai ốc gầm hoặc tấm chắn bảo vệ khoang máy"
        ];
        let severity = "Trung bình";
        let recommendation = "Hạn chế đi qua các đoạn đường gồ ghề, ổ gà lớn. Nên đặt hẹn sớm nhất có thể để kỹ thuật viên kích gầm và kiểm tra hệ thống rô-tuyn lái để tránh mất lái đột ngột.";

        if (textLower.includes("khói") || textLower.includes("nhiệt") || textLower.includes("sôi") || textLower.includes("nóng máy") || textLower.includes("két nước")) {
            severity = "Cao";
            possible_causes = [
                "Rò rỉ hoặc thiếu nước làm mát động cơ",
                "Quạt tản nhiệt két nước bị hỏng hoặc cháy rơ-le",
                "Kẹt van hằng nhiệt hoặc hỏng bơm nước tuần hoàn"
            ];
            recommendation = "Dừng vận hành xe ngay lập tức, tấp vào lề đường an toàn. Tuyệt đối không mở nắp két nước khi máy đang nóng để tránh bị bỏng hơi nước. Hãy liên hệ hotline cứu hộ hoặc đặt lịch kỹ thuật viên hỗ trợ khẩn cấp.";
        } else if (textLower.includes("phanh") || textLower.includes("thắng") || textLower.includes("kêu két") || textLower.includes("nặng phanh")) {
            severity = "Cao";
            possible_causes = [
                "Má phanh bị mòn hết phần ma sát, cọ xát kim loại vào đĩa phanh",
                "Thiếu hụt dầu phanh hoặc rò rỉ xylanh bánh xe",
                "Bầu trợ lực chân không phanh bị hỏng hoặc rách đường ống"
            ];
            recommendation = "Cực kỳ nguy hiểm. Hạn chế phanh gấp và di chuyển chậm. Cần châm thêm dầu phanh nếu thiếu và đưa xe tới trạm AGM gần nhất kiểm tra má phanh, đĩa phanh ngay lập tức.";
        } else if (textLower.includes("điều hòa") || textLower.includes("nóng") || textLower.includes("máy lạnh") || textLower.includes("không mát")) {
            severity = "Thấp";
            possible_causes = [
                "Lọc gió điều hòa bị tắc nghẽn do bụi bẩn tích tụ lâu ngày",
                "Hệ thống điều hòa bị hao hụt ga lạnh do rò rỉ khớp nối",
                "Lốc nén điều hòa gặp trục trặc hoạt động không ổn định"
            ];
            recommendation = "Mở cửa gió ngoài hoặc hạ kính khi di chuyển để thông thoáng cabin. Bạn có thể vệ sinh lọc gió tạm thời hoặc qua garage AGM để kiểm tra rò rỉ ga và nạp ga lạnh mới.";
        } else if (textLower.includes("động cơ") || textLower.includes("check engine") || textLower.includes("cá vàng") || textLower.includes("giật giật") || textLower.includes("rung lắc")) {
            severity = "Trung bình";
            possible_causes = [
                "Bugi đánh lửa bị mòn hoặc cuộn đánh lửa (bobbin) hoạt động kém",
                "Nhiên liệu bẩn hoặc tắc lọc xăng làm máy bị bỏ máy (misfire)",
                "Cảm biến khí thải (Oxy) hoặc cảm biến lưu lượng khí nạp (MAF) báo lỗi"
            ];
            recommendation = "Có thể di chuyển chậm đến garage. Tránh đạp ga thốc. Cần cắm máy đọc lỗi chuyên dụng OBD2 tại xưởng của AGM để xác định mã lỗi chính xác.";
        }

        setAiIssueResult({ possible_causes, severity, recommendation });
        setIsAnalyzingIssue(false);
    };

    const activeCategories = useMemo(() => {
        return dbCategories.filter((c: any) => c.is_active !== false);
    }, [dbCategories]);

    const activeDbServices = useMemo(() => {
        return dbServices.filter((s: any) => s.is_active !== false);
    }, [dbServices]);

    // Map dbServices to ServiceItem list
    const mappedServices: ServiceItem[] = useMemo(() => {
        return activeDbServices.map((s: any) => {
            const priceValue = s.total_price || s.labor_price || s.price || s.base_price || 0;
            const discountPercent = s.discount_percentage || 0;
            const originalPriceValue = discountPercent > 0 && priceValue > 0 ? Math.round(priceValue / (1 - discountPercent / 100)) : 0;
            const originalPriceStr = originalPriceValue > 0 ? `Từ ${originalPriceValue.toLocaleString("vi-VN")}đ` : "";

            const ratingVal = s.rating || 5.0;
            const reviewVal = s.review_count || 0;

            let detailsList = s.details || [];
            if (!Array.isArray(detailsList)) {
                detailsList = [detailsList];
            }
            if (detailsList.length === 0) {
                detailsList = [s.description || "Chi tiết dịch vụ chưa được cập nhật."];
            }

            return {
                id: s.id,
                title: s.service_name,
                desc: s.description || "",
                price: priceValue > 0 ? `Từ ${priceValue.toLocaleString("vi-VN")}đ` : "Miễn phí",
                numericPrice: priceValue,
                originalPrice: originalPriceStr || undefined,
                discountPercentage: discountPercent > 0 ? discountPercent : undefined,
                promoText: s.promo_text || "",
                rating: ratingVal,
                reviewCount: reviewVal,
                badge: s.badge || undefined,
                details: detailsList,
                category_id: s.category_id,
                sparePartName: s.sparePart ? s.sparePart.name : undefined
            };
        });
    }, [activeDbServices]);

    // Map current page services to ServiceItem list for rendering
    const mappedCurrentPageServices: ServiceItem[] = useMemo(() => {
        return currentPageServices.filter((s: any) => s.is_active !== false).map((s: any) => {
            const priceValue = s.total_price || s.labor_price || s.price || s.base_price || 0;
            const discountPercent = s.discount_percentage || 0;
            const originalPriceValue = discountPercent > 0 && priceValue > 0 ? Math.round(priceValue / (1 - discountPercent / 100)) : 0;
            const originalPriceStr = originalPriceValue > 0 ? `Từ ${originalPriceValue.toLocaleString("vi-VN")}đ` : "";

            const ratingVal = s.rating || 5.0;
            const reviewVal = s.review_count || 0;

            let detailsList = s.details || [];
            if (!Array.isArray(detailsList)) {
                detailsList = [detailsList];
            }
            if (detailsList.length === 0) {
                detailsList = [s.description || "Chi tiết dịch vụ chưa được cập nhật."];
            }

            return {
                id: s.id,
                title: s.service_name,
                desc: s.description || "",
                price: priceValue > 0 ? `Từ ${priceValue.toLocaleString("vi-VN")}đ` : "Miễn phí",
                numericPrice: priceValue,
                originalPrice: originalPriceStr || undefined,
                discountPercentage: discountPercent > 0 ? discountPercent : undefined,
                promoText: s.promo_text || "",
                rating: ratingVal,
                reviewCount: reviewVal,
                badge: s.badge || undefined,
                details: detailsList,
                category_id: s.category_id,
                sparePartName: s.sparePart ? s.sparePart.name : undefined
            };
        });
    }, [currentPageServices]);



    const hasInitialized = useRef(false);

    // Parse params on URL
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initialServiceId = searchParams.get('serviceId');
        const initialComboId = searchParams.get('comboId');

        if (initialComboId) {
            setBookingFlow('SPECIFIC');
            setServiceSubtype('combo');
            setSelectedComboId(parseInt(initialComboId, 10));
        } else if (initialServiceId) {
            setBookingFlow('SPECIFIC');
            setServiceSubtype('service');
            setSelectedServiceIds([parseInt(initialServiceId, 10)]);
        }
    }, [searchParams]);

    // Setup active selection tóm tắt
    const activeSelection = useMemo(() => {
        if (bookingFlow === 'CONSULTATION') {
            const subItems = [];
            if (consultationType === 'AI_DIAGNOSIS') {
                subItems.push(`Hình thức: Phân tích lỗi bằng AI`);
                if (issueDescription) subItems.push(`Mô tả: ${issueDescription}`);
                if (aiIssueResult) {
                    subItems.push(`Mức độ: ${aiIssueResult.severity}`);
                }
            } else {
                subItems.push(`Hình thức: Gọi Video trực tiếp (SOS)`);
            }

            return {
                title: consultationType === 'AI_DIAGNOSIS' ? 'AI chẩn đoán lỗi xe' : 'Gọi điện tư vấn trực tiếp',
                price: 'Miễn phí',
                numericPrice: 0,
                originalPrice: undefined,
                discountPercentage: undefined,
                promoText: consultationType === 'AI_DIAGNOSIS' ? 'Nhận kết quả chẩn đoán tức thì từ trợ lý AI' : 'CSKH liên hệ tư vấn trong 15 phút',
                subItems: subItems.length > 0 ? subItems : ['Chưa nhập thông tin yêu cầu'],
            };
        }
        if (serviceCategoryMode === 'REPAIR') {
            return {
                title: 'Sửa chữa lỗi xe',
                price: 'Liên hệ',
                numericPrice: 0,
                originalPrice: undefined,
                discountPercentage: undefined,
                promoText: 'Kỹ thuật viên sẽ kiểm tra trực tiếp',
                subItems: issueDescription ? [`Mô tả: ${issueDescription}`] : ['Chưa có mô tả'],
            };
        }
        if (serviceSubtype === 'service') {
            if (selectedServiceIds.length === 0) return null;
            const selected = mappedServices.filter(x => selectedServiceIds.includes(x.id));
            const totalPrice = selected.reduce((sum, s) => sum + s.numericPrice, 0);
            const title = selected.length === 1
                ? selected[0].title
                : `${selected.length} dịch vụ đã chọn`;
            return {
                title,
                price: totalPrice > 0 ? `Từ ${totalPrice.toLocaleString('vi-VN')}đ` : 'Liên hệ',
                numericPrice: totalPrice,
                originalPrice: undefined,
                discountPercentage: undefined,
                promoText: selected.length > 1 ? `Bao gồm: ${selected.map(s => s.title).join(', ')}` : selected[0]?.promoText,
                subItems: selectedSubItems,
            };
        } else if (serviceSubtype === 'combo') {
            const c = dbCombos.find(x => x.id === selectedComboId);
            if (!c) return null;
            const serviceIds = c.service_ids || [];
            const original = (c as any).originalPrice || 0;
            const subNames = serviceIds.map(id => {
                const s = mappedServices.find(x => x.id === id);
                return s ? s.title : "Dịch vụ của gara";
            });
            return {
                title: c.combo_name,
                price: original > 0 ? `Từ ${original.toLocaleString("vi-VN")}đ` : `Miễn phí`,
                numericPrice: original,
                originalPrice: undefined,
                discountPercentage: undefined,
                promoText: undefined,
                subItems: subNames,
            };
        }
        return null;
    }, [bookingFlow, serviceCategoryMode, serviceSubtype, selectedServiceIds, selectedComboId, mappedServices, dbCombos, selectedSubItems, issueDescription, consultationType, aiIssueResult]);

    // Handle subitems customize default fill — merge details of all selected services
    useEffect(() => {
        if (bookingFlow === 'SPECIFIC' && serviceCategoryMode === 'SERVICES' && serviceSubtype === 'service' && selectedServiceIds.length > 0) {
            const allDetails = selectedServiceIds.flatMap(id => {
                const service = mappedServices.find(s => s.id === id);
                return service?.details ?? [];
            });
            const newDetails = [...new Set(allDetails)];
            if (JSON.stringify(newDetails) !== JSON.stringify(selectedSubItems)) {
                setSelectedSubItems(newDetails);
            }
        } else {
            if (selectedSubItems.length > 0) {
                setSelectedSubItems([]);
            }
        }
    }, [bookingFlow, serviceCategoryMode, serviceSubtype, selectedServiceIds, mappedServices, selectedSubItems]);

    const timeSlots = useMemo(() => {
        // Tính tổng thời gian dự kiến
        let totalDurationMinutes = 0;
        if (bookingFlow === 'SPECIFIC') {
            if (serviceSubtype === 'service') {
                selectedServiceIds.forEach(id => {
                    const service = dbServices.find(s => s.id === id);
                    if (service && service.estimated_duration) {
                        totalDurationMinutes += parseInt(service.estimated_duration, 10);
                    } else {
                        totalDurationMinutes += 30; // Mặc định 30p
                    }
                });
            } else if (serviceSubtype === 'combo' && selectedComboId) {
                const combo = dbCombos.find(c => c.id === selectedComboId);
                if (combo && combo.service_ids) {
                    combo.service_ids.forEach(catalogId => {
                        const service = dbServices.find(s => s.id === catalogId);
                        if (service && service.estimated_duration) {
                            totalDurationMinutes += parseInt(service.estimated_duration, 10);
                        } else {
                            totalDurationMinutes += 30; // Mặc định 30p
                        }
                    });
                }
            }
        }

        const slots: { time: string; label: string; isFull: boolean }[] = [];
        shifts.forEach(shift => {
            const [startH, startM] = (shift.start_time || "").split(':').map(Number);
            const [endH, endM] = (shift.end_time || "").split(':').map(Number);
            if (isNaN(startH) || isNaN(endH)) return;

            let currentMinutes = startH * 60 + (startM || 0);
            const endMinutes = endH * 60 + (endM || 0);

            while (currentMinutes < endMinutes) {
                const h = Math.floor(currentMinutes / 60);
                const m = currentMinutes % 60;
                const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                const label = h < 12 ? t('booking.timeSlots.morning', 'Sáng') : t('booking.timeSlots.afternoon', 'Chiều');

                let isFull = false;

                if (totalDurationMinutes === 0) {
                    const utcHour = (h - 7 + 24) % 24;
                    isFull = (bookedCounts[utcHour] || 0) >= garageCapacity;
                } else {
                    const endTotalMinutes = currentMinutes + totalDurationMinutes;
                    let calculatedEndH = Math.floor(endTotalMinutes / 60);

                    if (endTotalMinutes % 60 === 0 && calculatedEndH > h) {
                        calculatedEndH -= 1;
                    }

                    for (let checkH = h; checkH <= calculatedEndH; checkH++) {
                        const utcHour = (checkH - 7 + 24) % 24;
                        if ((bookedCounts[utcHour] || 0) >= garageCapacity) {
                            isFull = true;
                            break;
                        }
                    }
                }

                slots.push({ time: timeStr, label, isFull });
                currentMinutes += bufferMinutes;
            }
        });

        // Nếu là ngày hôm nay, đánh dấu những khung giờ đã qua (hoặc sắp tới trong vòng 30 phút) là Kín lịch thay vì ẩn đi
        if (bookingDate === minDateStr) {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            return slots.map(slot => {
                const [slotH, slotM] = slot.time.split(':').map(Number);
                const slotMinutes = slotH * 60 + slotM;
                if (slotMinutes < nowMinutes + 30) {
                    return { ...slot, isFull: true };
                }
                return slot;
            });
        }

        return slots;
    }, [shifts, bufferMinutes, t, bookingDate, minDateStr, bookedCounts, garageCapacity, bookingFlow, serviceSubtype, selectedServiceIds, selectedComboId, dbServices, dbCombos]);

    // Reset bookingTime if it becomes invalid under new date or current time constraints
    useEffect(() => {
        if (bookingTime && !timeSlots.some(slot => slot.time === bookingTime)) {
            setBookingTime('');
        }
    }, [bookingDate, timeSlots, bookingTime]);

    const validateStep = (currentStep: number) => {
        switch (currentStep) {
            case 1:
                if (bookingFlow === 'CONSULTATION') {
                    if (consultationType === 'AI_DIAGNOSIS') {
                        return issueDescription.trim().length > 0;
                    } else {
                        return true;
                    }
                }
                if (bookingFlow === 'SPECIFIC') {
                    if (vehicleInputMode === 'EXISTING') {
                        return selectedCustomerVehicleId !== null;
                    }
                    const parsedYear = parseInt(vehicleYear, 10);
                    const currentYear = new Date().getFullYear();
                    const isYearValid = !isNaN(parsedYear) && parsedYear >= 1900 && parsedYear <= currentYear + 1;
                    return (
                        vehicleBrand.trim() !== '' &&
                        vehicleModel.trim() !== '' &&
                        vehiclePlate.trim() !== '' &&
                        isYearValid &&
                        plateError === '' &&
                        !isCheckingPlate
                    );
                }
                return false;
            case 2:
                if (bookingFlow === 'CONSULTATION') return bookingDate !== '' && bookingTime !== '';
                if (bookingFlow === 'SPECIFIC') {
                    if (serviceCategoryMode === 'REPAIR') {
                        return issueDescription.trim().length > 0;
                    }
                    return selectedServiceIds.length > 0 || selectedComboId !== null;
                }
                return false;
            case 3:
                if (bookingFlow === 'CONSULTATION') return false;
                return bookingDate !== '' && bookingTime !== '';
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (!validateStep(step)) {
            alert(t('booking.alerts.validationError', 'Vui lòng điền đầy đủ và đúng thông tin yêu cầu của bước hiện tại.'));
            return;
        }
        const maxSteps = bookingFlow === 'CONSULTATION' ? 2 : 3;
        if (step < maxSteps) {
            setStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            navigate(-1);
        }
    };

    const submitToBackend = async () => {
        setIsSubmitting(true);
        try {
            let finalNotes = notes;
            if (bookingFlow === 'CONSULTATION') {
                if (consultationType === 'AI_DIAGNOSIS') {
                    finalNotes = `[Chẩn đoán lỗi AI]\n- Mô tả lỗi của khách hàng: ${issueDescription}\n`;
                    if (aiIssueResult) {
                        finalNotes += `- Mức độ nghiêm trọng: ${aiIssueResult.severity}\n`;
                        finalNotes += `- Nguyên nhân tiềm ẩn: ${aiIssueResult.possible_causes.join(', ')}\n`;
                        finalNotes += `- Khuyến nghị: ${aiIssueResult.recommendation}`;
                    } else {
                        finalNotes += `- Kết quả: Chưa thực hiện phân tích lỗi bằng AI`;
                    }
                } else {
                    finalNotes = `[Yêu cầu Gọi Video Trực tiếp SOS] Khách hàng sẽ kết nối Video qua hệ thống.`;
                }
            } else if (bookingFlow === 'SPECIFIC' && serviceCategoryMode === 'REPAIR') {
                finalNotes = `[Yêu cầu sửa chữa lỗi]\n- Mô tả lỗi của khách hàng: ${issueDescription}\n` + (notes ? `\n- Ghi chú thêm: ${notes}` : '');
            }

            let finalBookingType: string = bookingFlow; // CONSULTATION
            if (bookingFlow === 'SPECIFIC') {
                finalBookingType = serviceCategoryMode === 'SERVICES' ? 'CUSTOMER_SPECIFIC' : 'CUSTOMER_REPAIR';
            }

            const payload = {
                vehicle_id: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'EXISTING' ? selectedCustomerVehicleId : null,
                booking_type: finalBookingType,
                scheduled_time: new Date(`${bookingDate}T${bookingTime}:00`).toISOString(),
                notes: finalNotes || null,
                service_ids: bookingFlow === 'SPECIFIC' && serviceCategoryMode === 'SERVICES' && selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
                combo_ids: bookingFlow === 'SPECIFIC' && serviceCategoryMode === 'SERVICES' && selectedComboId ? [selectedComboId] : undefined,
                vehicle_brand: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'NEW' ? vehicleBrand : null,
                vehicle_model: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'NEW' ? vehicleModel : null,
                vehicle_plate: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'NEW' ? vehiclePlate : null,
                vehicle_year: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'NEW' ? parseInt(vehicleYear, 10) : null,
                vehicle_color: bookingFlow === 'SPECIFIC' && vehicleInputMode === 'NEW' ? (vehicleColor.trim() || null) : null,
                payment_amount: activeSelection?.numericPrice || 0,
            };

            const response = await fetchPrivate(APPOINTMENT_API_ENDPOINTS.CREATE_APPOINTMENT, 'POST', payload);
            if (response && response.success) {
                const amount = activeSelection?.numericPrice || 0;
                if (amount > 0 && response.data?.serviceOrder?.id) {
                    setBookingCode(response.data.serviceOrder.id.toString());
                    setIsPendingPayment(true);
                } else {
                    setIsPendingPayment(false);
                    setIsSuccess(true);
                }
            } else {
                alert(response.message || "Đặt lịch thất bại. Vui lòng thử lại.");
            }
        } catch (error: any) {
            console.error("Lỗi đặt lịch:", error);
            alert(error.message || "Đã xảy ra lỗi trong quá trình đặt lịch. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };
    // Poll payment status every 5 seconds
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;
        if (isPendingPayment && bookingCode) {
            intervalId = setInterval(async () => {
                try {
                    const amount = activeSelection?.numericPrice || 0;
                    const res = await fetchPublic(`${API_BASE_URL}/api/payment/check-status?bookingCode=${bookingCode}&amount=${amount}`);
                    if (res && res.success && res.isPaid) {
                        clearInterval(intervalId);
                        setIsPendingPayment(false);
                        setIsSuccess(true);
                    }
                } catch (error) {
                    console.error("Lỗi khi kiểm tra thanh toán:", error);
                }
            }, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isPendingPayment, bookingCode, fetchPublic, API_BASE_URL, activeSelection]);

    const handleSubmit = async () => {
        await submitToBackend();
    };

    const inputClass = 'w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl md:rounded-2xl p-2.5 md:p-4 text-xs md:text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue';

    if (isPendingPayment) {
        const amount = activeSelection?.numericPrice || 0;
        const qrUrl = amount > 0
            ? `https://vietqr.app/img?acc=${import.meta.env.VITE_SEPAY_ACC}&bank=${import.meta.env.VITE_SEPAY_BANK}&amount=${amount}&template=compact&showinfo=true&addInfo=AGM-${bookingCode}`
            : null;

        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-left">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-gray-100 text-center"
                >
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-brand-blue font-display">Thanh toán đơn hàng</h2>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed text-center">
                            Đơn đặt lịch của bạn đã được ghi nhận. Vui lòng thanh toán để hoàn tất.
                        </p>
                    </div>

                    {qrUrl && (
                        <div className="mt-6 flex flex-col items-center justify-center border-t border-slate-100 pt-6">
                            <img src={qrUrl} alt="VietQR Payment" className="w-56 h-56 rounded-xl shadow-md border border-slate-200" />
                            <p className="text-[10px] text-gray-400 mt-2 text-center leading-relaxed">Sử dụng App Ngân hàng hoặc Ví điện tử để quét mã.<br />Nội dung chuyển khoản mặc định sẽ bao gồm mã đặt lịch của bạn.</p>
                        </div>
                    )}

                    <div className="pt-4 flex flex-col gap-2">
                        <button
                            onClick={() => submitToBackend()}
                            disabled={isSubmitting}
                            className={`w-full py-3 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${isSubmitting ? 'bg-slate-300 text-slate-500' : 'bg-[#F9A11B] text-[#00285E] hover:bg-[#E08F12]'}`}
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Tôi đã thanh toán'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-left">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full space-y-8 bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl border border-gray-100 text-center"
                >
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-100 shadow-inner">
                        <Check className="h-10 w-10 text-emerald-600" strokeWidth={3} />
                    </div>
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-brand-blue font-display">{t('booking.success.title', 'Đặt lịch thành công!')}</h2>
                        <p className="mt-3 text-sm text-gray-500 leading-relaxed text-center">
                            {t('booking.success.desc', 'Mã đặt lịch của bạn là {{code}}. Chúng tôi đã gửi email xác nhận chi tiết lịch hẹn của bạn. Bộ phận chăm sóc khách hàng sẽ liên hệ với bạn trong vòng 15 phút.', { code: `AGM-${bookingCode}` })}
                        </p>
                        <p className="text-xs text-amber-500 font-bold mt-2">
                            Tự động chuyển về trang chủ trong 5 giây...
                        </p>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left text-xs space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Hình thức:</span>
                            <span className="font-bold text-brand-blue">
                                {bookingFlow === 'CONSULTATION' ? t('booking.directConsultation', 'Tư vấn trực tiếp') : t('booking.serviceBooking', 'Đặt lịch dịch vụ')}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.serviceLabel', 'Dịch vụ:')}</span>
                            <span className="font-bold text-brand-blue">{activeSelection?.title}</span>
                        </div>
                        {activeSelection?.subItems && activeSelection.subItems.length > 0 && (
                            <div className="pl-3 border-l-2 border-[#F9A11B] py-0.5 space-y-1 my-1">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    {bookingFlow === 'CONSULTATION' ? 'Yêu cầu tư vấn:' : (serviceSubtype === 'service' ? t('booking.summary.itemsLabel', 'Hạng mục thực hiện:') : 'Dịch vụ đi kèm:')}
                                </div>
                                {activeSelection.subItems.map((item, idx) => (
                                    <div key={idx} className="text-slate-600 font-medium text-[11px] leading-relaxed">
                                        • {item}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.timeLabel', 'Thời gian:')}</span>
                            <span className="font-bold text-brand-blue">{bookingTime} - {bookingDate}</span>
                        </div>
                        {bookingFlow !== 'CONSULTATION' && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">{t('booking.summary.plateLabel', 'Biển số xe:')}</span>
                                    <span className="font-bold text-brand-blue">{vehiclePlate || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Năm sản xuất:</span>
                                    <span className="font-bold text-brand-blue">{vehicleYear || 'N/A'}</span>
                                </div>
                                {vehicleColor && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Màu sắc:</span>
                                        <span className="font-bold text-brand-blue">{vehicleColor}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.customerLabel', 'Khách hàng:')}</span>
                            <span className="font-bold text-brand-blue">{profileName || 'Khách hàng'}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200/50 pt-2 font-bold text-brand-blue">
                            <span>Thành tiền:</span>
                            <span style={{ color: COLORS.orange }}>{activeSelection?.price}</span>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-3 bg-[#00285E] text-white rounded-xl text-xs font-bold shadow-md hover:bg-[#00285E]/90 transition-all cursor-pointer"
                        >
                            {t('booking.success.goHome', 'Về trang chủ')}
                        </button>
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedServiceIds([]);
                                setSelectedComboId(null);
                                setSelectedCategoryId(null);
                                setBookingDate('');
                                setBookingTime('');
                                setVehicleBrand('');
                                setVehicleModel('');
                                setSelectedMakeId(null);
                                setVehiclePlate('');
                                setVehicleYear('');
                                setVehicleColor('');
                                setNotes('');
                                setIsSuccess(false);
                                setBookingCode(null);
                            }}
                            className="w-full py-3 bg-slate-50 border border-slate-200 text-gray-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                            {t('booking.success.bookAnother', 'Đặt dịch vụ khác')}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 text-left" style={{ backgroundColor: '#F8F9FF' }}>
            {/* ── HEADER ───────────────────────────────────────── */}
            <section className="pt-12 pb-16 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-display mb-4 text-brand-blue">
                        {t('booking.heroTitle', 'Đặt lịch dịch vụ')}
                    </h1>
                    <p className="max-w-2xl text-gray-500 leading-relaxed text-left">
                        {t('booking.heroDesc', 'Trải nghiệm quy trình dịch vụ bảo dưỡng tối giản, đặt lịch trong 1 phút để nhận hỗ trợ kỹ thuật tận tâm tại hệ thống AGM Intelligent.')}
                    </p>

                    {/* ── STEP INDICATOR ── */}
                    <div className="mt-16 flex items-center justify-between max-w-3xl mx-auto relative px-4">
                        {/* Track */}
                        <div className="absolute top-1/2 left-0 w-full h-[2px] -translate-y-1/2 z-0 bg-gray-200" />
                        {/* Progress */}
                        <div
                            className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 z-0 transition-all duration-500"
                            style={{ width: `${(step - 1) * (100 / (steps.length - 1))}%`, backgroundColor: COLORS.orange }}
                        />

                        {steps.map((s) => {
                            const isDone = s.id < step;
                            const isActive = s.id === step;
                            return (
                                <div key={s.id} className="relative z-10 flex flex-col items-center">
                                    <div
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-sm md:text-base transition-all duration-300 shadow-sm border border-slate-100 animate-none"
                                        style={{
                                            backgroundColor: isDone || isActive ? COLORS.orange : '#FFFFFF',
                                            color: isDone || isActive ? COLORS.navy : '#8A96B3',
                                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                                        }}
                                    >
                                        {isDone ? <Check size={18} strokeWidth={3} /> : s.id}
                                    </div>
                                    <span
                                        className="text-[9px] md:text-[10px] font-bold mt-3 tracking-wider uppercase hidden sm:inline"
                                        style={{ color: isActive ? COLORS.navy : '#8A96B3' }}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ── MAIN FORM CONTAINER ──────────────────────── */}
                    <div className="lg:col-span-2 space-y-8 text-left">
                        <AnimatePresence mode="wait">
                            {/* STEP 1: SELECT BOOKING FLOW & NOTES (CONSULTATION) OR VEHICLE INFO (SPECIFIC) */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="p-6 md:p-10 rounded-3xl bg-white border border-gray-100 shadow-xs text-left"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                                            {bookingFlow === 'CONSULTATION' ? <Settings size={20} /> : <Car size={20} />}
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">{t('booking.selectBookingMode', 'Chọn hình thức đặt lịch')}</h2>
                                    </div>

                                    {/* Flow Switcher (Consultation vs Specific Service) */}
                                    <div className="flex flex-col sm:flex-row p-1 bg-slate-100/80 rounded-2xl mb-8 max-w-2xl border border-slate-200/40 gap-1">
                                        <button
                                            type="button"
                                            onClick={() => { setBookingFlow('CONSULTATION'); setConsultationType('AI_DIAGNOSIS'); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${bookingFlow === 'CONSULTATION' && consultationType === 'AI_DIAGNOSIS' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                }`}
                                        >
                                            <Sparkles size={14} />
                                            {t('booking.aiConsultation', 'Tham khảo tư vấn AI')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setBookingFlow('CONSULTATION'); setConsultationType('CALL_BACK'); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${bookingFlow === 'CONSULTATION' && consultationType === 'CALL_BACK' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                }`}
                                        >
                                            <Phone size={14} />
                                            Gọi điện tư vấn
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setBookingFlow('SPECIFIC'); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${bookingFlow === 'SPECIFIC' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                }`}
                                        >
                                            <Settings size={14} />
                                            {t('booking.serviceBooking', 'Đặt lịch dịch vụ')}
                                        </button>
                                    </div>

                                    {/* CONSULTATION FLOW */}
                                    {bookingFlow === 'CONSULTATION' && (
                                        <div className="space-y-6">

                                            {/* Option 1: AI Diagnosis */}
                                            {consultationType === 'AI_DIAGNOSIS' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                                            Mô tả tình trạng lỗi/hỏng hóc của xe <span className="text-red-500">*</span>
                                                        </label>
                                                        <textarea
                                                            value={issueDescription}
                                                            onChange={(e) => setIssueDescription(e.target.value)}
                                                            placeholder="Ví dụ: Khi tôi đi vào đường gồ ghề, phía gầm trước có tiếng kêu lục cục rất rõ..."
                                                            className="w-full h-32 bg-[#F8FAFC] border border-blue-50/50 rounded-2xl p-4 text-xs md:text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue"
                                                        />
                                                    </div>

                                                    {/* Issue image upload */}
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-700 mb-2">
                                                            Ảnh chụp khu vực gặp lỗi (Tùy chọn)
                                                        </label>

                                                        {isAnalyzingImage && (
                                                            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-2xl border border-amber-100 mb-4 animate-pulse">
                                                                <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-3"></div>
                                                                <span className="text-amber-800 font-bold text-sm">AI đang siêu soi ảnh của bạn...</span>
                                                            </div>
                                                        )}

                                                        {!issueImagePreview ? (
                                                            <div>
                                                                <input
                                                                    type="file"
                                                                    id="issueImageUpload"
                                                                    accept="image/*"
                                                                    onChange={handleIssueImageUpload}
                                                                    className="hidden"
                                                                />
                                                                <label
                                                                    htmlFor="issueImageUpload"
                                                                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400/80 bg-white/50 hover:bg-white p-6 rounded-2xl transition-all cursor-pointer group"
                                                                >
                                                                    <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-amber-50/50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors mb-2">
                                                                        <Upload size={18} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                                                        Tải ảnh lỗi xe lên (Nếu có)
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 mt-1">
                                                                        Ảnh rò dầu, xước sơn, nứt kính, đèn check engine...
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className={`relative ${aiImageDamageResult ? 'w-full' : 'w-40'} h-auto rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 group`}>
                                                                    <img
                                                                        src={issueImagePreview}
                                                                        alt="Lỗi xe"
                                                                        className="w-full h-auto object-contain cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                                                        onClick={() => setIsImageFullScreen(true)}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleRemoveIssueImage}
                                                                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full border-none cursor-pointer backdrop-blur-sm"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>

                                                                {aiImageDamageResult && aiImageDamageResult.chi_tiet_loi.length > 0 && (
                                                                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-amber-500/30 relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl"></div>

                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                                                                <AlertTriangle className="text-amber-400" size={20} />
                                                                            </div>
                                                                            <h4 className="text-white font-bold text-base">Báo cáo </h4>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            {aiImageDamageResult.chi_tiet_loi.map((loi, idx) => (
                                                                                <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10 relative z-10">
                                                                                    <div className="flex justify-between items-start mb-2">
                                                                                        <span className="text-amber-400 font-bold text-sm">{loi.loi_phat_hien}</span>
                                                                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-md">
                                                                                            {loi.muc_do_nghiem_trong}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                                                        <div className="bg-black/20 rounded-lg p-2">
                                                                                            <span className="block text-slate-400 text-[10px] uppercase tracking-wider mb-1">Chi phí dự kiến</span>
                                                                                            <span className="text-white font-bold text-xs">{loi.chi_phi_uoc_tinh}</span>
                                                                                        </div>
                                                                                        <div className="bg-black/20 rounded-lg p-2">
                                                                                            <span className="block text-slate-400 text-[10px] uppercase tracking-wider mb-1">Thời gian sửa</span>
                                                                                            <span className="text-white font-bold text-xs">{loi.thoi_gian_du_kien}</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="space-y-1">
                                                                                        <span className="text-slate-400 text-[10px] uppercase tracking-wider">Khuyến nghị xử lý:</span>
                                                                                        <ul className="list-disc list-inside text-slate-300 text-xs space-y-1">
                                                                                            {loi.quy_trinh_xu_ly.map((qt, i) => (
                                                                                                <li key={i}>{qt}</li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Analyze Button */}
                                                    <div className="pt-2">
                                                        <button
                                                            type="button"
                                                            disabled={!issueDescription.trim() || isAnalyzingIssue}
                                                            onClick={handleAnalyzeIssue}
                                                            className={`py-3 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border-none ${!issueDescription.trim() || isAnalyzingIssue
                                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-md cursor-pointer'
                                                                }`}
                                                        >
                                                            {isAnalyzingIssue ? (
                                                                <>
                                                                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                                                                    AI đang phân tích tình trạng xe...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles size={14} />
                                                                    Phân tích và chẩn đoán lỗi bằng AI
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* AI Issue Result Displays */}
                                                    {aiIssueResult && (
                                                        <div className="bg-amber-50/20 border border-amber-100/50 p-5 rounded-2xl space-y-4">
                                                            <div className="flex justify-between items-center border-b border-amber-100/40 pb-3">
                                                                <span className="text-sm font-bold text-brand-blue flex items-center gap-1.5 font-display">
                                                                    <Sparkles size={16} className="text-amber-500" />
                                                                    Kết quả chẩn đoán sơ bộ của AI
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400 font-medium">Mức độ:</span>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${aiIssueResult.severity === 'Cao'
                                                                        ? 'bg-rose-50 border border-rose-100 text-rose-600'
                                                                        : aiIssueResult.severity === 'Trung bình'
                                                                            ? 'bg-amber-50 border border-amber-100 text-amber-700'
                                                                            : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                                                                        }`}>
                                                                        {aiIssueResult.severity}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Các nguyên nhân có thể xảy ra:</span>
                                                                <ul className="space-y-1.5 pl-0 m-0">
                                                                    {aiIssueResult.possible_causes.map((cause, idx) => (
                                                                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5 leading-relaxed text-left">
                                                                            <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                                                                            <span>{cause}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>

                                                            <div className="space-y-1 bg-white p-3 rounded-xl border border-amber-50">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Lời khuyên và khuyến nghị từ AI:</span>
                                                                <p className="text-xs text-slate-600 leading-relaxed m-0 text-left">{aiIssueResult.recommendation}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Option 2: Callback Request (SOS Video Call Only) */}
                                            {consultationType === 'CALL_BACK' && (
                                                <div className="space-y-4 max-w-md">
                                                    {/* Nút SOS Video Call */}
                                                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 justify-between relative overflow-hidden mt-2">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                                                        <div className="flex items-start gap-3 relative z-10 text-left">
                                                            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5 animate-pulse">
                                                                <Video size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-red-700 font-bold text-sm mb-1">Cần hỗ trợ khẩn cấp (SOS)?</h4>
                                                                <p className="text-xs text-red-600/80 leading-relaxed m-0">
                                                                    Gọi Video trực tiếp với Lễ tân để quay trực tiếp tình trạng xe của bạn qua Camera.
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleStartVideoCall}
                                                            className="shrink-0 w-full md:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 border-none cursor-pointer relative z-10"
                                                        >
                                                            <Video size={14} />
                                                            Gọi Video Ngay
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* SPECIFIC SERVICE FLOW: VEHICLE INFO */}
                                    {bookingFlow === 'SPECIFIC' && (
                                        <div className="space-y-6 text-left">
                                            {customerVehicles.length > 0 && (
                                                <div className="flex gap-2 p-1 bg-slate-100/60 rounded-xl max-w-sm border border-slate-200/20">
                                                    <button
                                                        type="button"
                                                        onClick={() => setVehicleInputMode('EXISTING')}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${vehicleInputMode === 'EXISTING'
                                                            ? 'bg-[#00285E] text-white shadow-xs'
                                                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                                            }`}
                                                    >
                                                        {t('booking.savedVehicle', 'Chọn xe đã lưu')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVehicleInputMode('NEW');
                                                            setSelectedCustomerVehicleId(null);
                                                            setVehicleBrand('');
                                                            setVehicleModel('');
                                                            setVehiclePlate('');
                                                            setVehicleYear('');
                                                            setVehicleColor('');
                                                        }}
                                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${vehicleInputMode === 'NEW'
                                                            ? 'bg-[#00285E] text-white shadow-xs'
                                                            : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                                            }`}
                                                    >
                                                        {t('booking.addNewVehicle', 'Thêm xe mới')}
                                                    </button>
                                                </div>
                                            )}

                                            {vehicleInputMode === 'EXISTING' && customerVehicles.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {customerVehicles.map((v) => (
                                                        <div
                                                            key={v.id}
                                                            onClick={() => {
                                                                if (v.isDisabled) return;
                                                                setSelectedCustomerVehicleId(v.id);
                                                                setVehicleBrand(v.model?.make?.make_name || '');
                                                                setVehicleModel(v.model?.model_name || '');
                                                                setVehiclePlate(v.license_plate || '');
                                                                setVehicleYear(v.year?.toString() || '');
                                                                setVehicleColor(v.color || '');
                                                            }}
                                                            className={`p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${v.isDisabled ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50' :
                                                                selectedCustomerVehicleId === v.id
                                                                    ? 'border-amber-400 bg-amber-50/30 shadow-md cursor-pointer'
                                                                    : 'border-slate-100 bg-white hover:border-amber-200 hover:bg-slate-50 cursor-pointer'
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className={`font-bold text-sm m-0 ${v.isDisabled ? 'text-slate-500' : 'text-brand-blue'}`}>
                                                                    {v.model?.make?.make_name} {v.model?.model_name}
                                                                </h3>
                                                                {selectedCustomerVehicleId === v.id && !v.isDisabled && (
                                                                    <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center text-white">
                                                                        <Check size={12} strokeWidth={3} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500 space-y-1">
                                                                <p className="m-0">Biển số: <span className="font-semibold text-slate-700">{v.license_plate}</span></p>
                                                                <p className="m-0">Năm SX: {v.year} {v.color && `• Màu: ${v.color}`}</p>
                                                                {v.isDisabled && (
                                                                    <p className="m-0 mt-2 text-rose-500 font-bold bg-rose-50 border border-rose-100 inline-block px-2 py-0.5 rounded text-[10px]">
                                                                        {v.disableReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-6 text-left">
                                                    {/* Mode Selector Tab Pills */}
                                                    <div className="flex gap-2 bg-slate-100/60 p-1 rounded-xl max-w-xs border border-slate-200/20">
                                                        <button
                                                            type="button"
                                                            onClick={() => setColorInputMode('TEXT')}
                                                            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all border-none cursor-pointer ${colorInputMode === 'TEXT'
                                                                ? 'bg-white text-brand-blue shadow-xs'
                                                                : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                                                }`}
                                                        >
                                                            Nhập trực tiếp
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setColorInputMode('IMAGE')}
                                                            className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${colorInputMode === 'IMAGE'
                                                                ? 'bg-white text-brand-blue shadow-xs'
                                                                : 'text-slate-500 hover:text-slate-800 bg-transparent'
                                                                }`}
                                                        >
                                                            <Sparkles size={10} className="text-amber-500" />
                                                            Tải ảnh xe (AI)
                                                        </button>
                                                    </div>

                                                    {/* Mode 2: AI Photo Upload UI (at the top) */}
                                                    {colorInputMode === 'IMAGE' && (
                                                        <div className="space-y-3">
                                                            {colorImagePreviews.length === 0 ? (
                                                                <div>
                                                                    <input
                                                                        type="file"
                                                                        id="colorImageUpload"
                                                                        accept="image/*"
                                                                        multiple
                                                                        onChange={handleColorImageUpload}
                                                                        className="hidden"
                                                                    />
                                                                    <label
                                                                        htmlFor="colorImageUpload"
                                                                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-amber-400/80 bg-white/50 hover:bg-white p-6 rounded-2xl transition-all cursor-pointer group"
                                                                    >
                                                                        <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-amber-50/50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors mb-2">
                                                                            <Upload size={18} />
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                                                            Chọn nhiều ảnh xe (tối đa 3 ảnh)
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400 mt-1 text-center">
                                                                            Bạn có thể tải ảnh mặt trước, mặt ngang và mặt sau.<br />
                                                                            AI sẽ tổng hợp các góc ảnh để phân tích chính xác nhất!
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-xs space-y-3">
                                                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                                                        <div className="flex gap-2 shrink-0">
                                                                            {colorImagePreviews.map((url, idx) => (
                                                                                <div key={idx} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity" onClick={() => setFullScreenImageUrl(url)}>
                                                                                    <img src={url} alt={`Xem trước ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                                                                </div>
                                                                            ))}
                                                                            <button
                                                                                type="button"
                                                                                onClick={handleRemoveColorImage}
                                                                                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full border-none cursor-pointer z-10"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex-grow space-y-2 w-full text-xs">
                                                                            <div className="font-bold text-slate-700">Ảnh đã tải lên</div>
                                                                            <div className="text-gray-500">Các thông tin xe đã được AI phân tích và tự động điền vào các ô bên dưới.</div>
                                                                            <div className="mt-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={handleRemoveColorImage}
                                                                                    className="text-amber-500 hover:text-amber-600 font-bold underline bg-transparent border-none cursor-pointer text-[10px]"
                                                                                >
                                                                                    Tải ảnh khác
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {aiDetectionResult && aiDetectionResult.rawText && (
                                                                        <div className="pt-3 border-t border-slate-200/60 text-xs space-y-2 text-left">
                                                                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                                                                                <Sparkles size={12} className="text-amber-500" />
                                                                                Chi tiết xe do AI nhận diện:
                                                                            </div>
                                                                            <div className="bg-white p-3.5 rounded-xl border border-slate-100/80 text-slate-600 leading-relaxed whitespace-pre-line text-left">
                                                                                {aiDetectionResult.rawText}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* AI Loading State */}
                                                            {isAnalyzingColor && (
                                                                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50/50 px-3 py-2.5 rounded-xl border border-amber-100/50 animate-pulse mt-2">
                                                                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                                                    <span>AI đang phân tích hình ảnh để nhận diện thông số xe...</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Form fields grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="relative" ref={brandRef}>
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                                {t('booking.step3.brandLabel', 'Hãng xe')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={t('booking.step3.brandPlaceholder', 'Ví dụ: Toyota, BMW, Mazda...')}
                                                                value={vehicleBrand}
                                                                onChange={(e) => {
                                                                    setVehicleBrand(e.target.value);
                                                                    setSelectedMakeId(null);
                                                                    setShowBrandSuggestions(true);
                                                                }}
                                                                onFocus={() => {
                                                                    setShowBrandSuggestions(true);
                                                                }}
                                                                className={inputClass}
                                                            />
                                                            {showBrandSuggestions && brandSuggestions.length > 0 && (
                                                                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-100 shadow-lg max-h-48 overflow-y-auto">
                                                                    {brandSuggestions.map((brand) => (
                                                                        <div
                                                                            key={brand.id}
                                                                            className="p-3 hover:bg-slate-50 cursor-pointer text-sm text-brand-blue border-b border-gray-50 last:border-none"
                                                                            onClick={() => {
                                                                                setVehicleBrand(brand.make_name);
                                                                                setSelectedMakeId(brand.id);
                                                                                setShowBrandSuggestions(false);
                                                                            }}
                                                                        >
                                                                            {brand.make_name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="relative" ref={modelRef}>
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                                {t('booking.step3.modelLabel', 'Dòng xe (Model)')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={t('booking.step3.modelPlaceholder', 'Ví dụ: Camry, 320i, CX-5...')}
                                                                value={vehicleModel}
                                                                onChange={(e) => {
                                                                    setVehicleModel(e.target.value);
                                                                    setShowModelSuggestions(true);
                                                                }}
                                                                onFocus={() => {
                                                                    setShowModelSuggestions(true);
                                                                }}
                                                                className={inputClass}
                                                            />
                                                            {showModelSuggestions && modelSuggestions.length > 0 && (
                                                                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-gray-100 shadow-lg max-h-48 overflow-y-auto">
                                                                    {modelSuggestions.map((model) => (
                                                                        <div
                                                                            key={model.id}
                                                                            className="p-3 hover:bg-slate-50 cursor-pointer text-sm text-brand-blue border-b border-gray-50 last:border-none"
                                                                            onClick={() => {
                                                                                setVehicleModel(model.model_name);
                                                                                setShowModelSuggestions(false);
                                                                                if (model.make_id && model.make) {
                                                                                    setVehicleBrand(model.make.make_name);
                                                                                    setSelectedMakeId(model.make_id);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {model.model_name} <span className="text-gray-400 text-xs ml-1">({model.make?.make_name})</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                                {t('booking.step3.plateLabel', 'Biển số xe')}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder={t('booking.step3.platePlaceholder', 'Ví dụ: 30A-123.45 hoặc 51F-999.99')}
                                                                value={vehiclePlate}
                                                                onChange={(e) => setVehiclePlate(e.target.value)}
                                                                className={inputClass + (plateError ? ' !border-red-500 focus:!border-red-500' : '')}
                                                            />
                                                            {isCheckingPlate && <p className="text-[10px] text-gray-500 mt-1 italic">Đang kiểm tra biển số...</p>}
                                                            {plateError && <p className="text-[10px] text-red-500 mt-1 font-semibold">{plateError}</p>}
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                                Năm sản xuất
                                                            </label>
                                                            <input
                                                                type="number"
                                                                placeholder="Ví dụ: 2020, 2022..."
                                                                value={vehicleYear}
                                                                onChange={(e) => setVehicleYear(e.target.value)}
                                                                className={inputClass}
                                                                min="1900"
                                                                max={new Date().getFullYear() + 1}
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                                Màu sắc (Tùy chọn)
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Ví dụ: Đỏ, Đen, Trắng..."
                                                                    value={vehicleColor}
                                                                    onChange={(e) => setVehicleColor(e.target.value)}
                                                                    className={inputClass}
                                                                    disabled={isAnalyzingColor}
                                                                />
                                                                {vehicleColor && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setVehicleColor('')}
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 border-none bg-transparent cursor-pointer"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 2: SELECT SERVICE / COMBO / CATEGORY (SPECIFIC FLOW) */}
                            {step === 2 && bookingFlow === 'SPECIFIC' && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="p-6 md:p-10 rounded-3xl bg-white border border-gray-100 shadow-xs text-left"
                                >
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                                            <Settings size={20} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">{t('booking.selectServiceOrRepair', 'Chọn dịch vụ hoặc Sửa chữa lỗi')}</h2>
                                    </div>

                                    {/* Category Mode Switcher */}
                                    <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-8 max-w-xl border border-slate-200/40">
                                        <button
                                            type="button"
                                            onClick={() => setServiceCategoryMode('SERVICES')}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceCategoryMode === 'SERVICES' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'}`}
                                        >
                                            <Settings size={14} />
                                            {t('booking.selectService', 'Chọn dịch vụ')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setServiceCategoryMode('REPAIR')}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceCategoryMode === 'REPAIR' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'}`}
                                        >
                                            <Wrench size={14} />
                                            {t('booking.checkAndRepair', 'Kiểm tra và sửa chữa lỗi')}
                                        </button>
                                    </div>

                                    {serviceCategoryMode === 'SERVICES' ? (
                                        <>
                                            {/* Subtype Switcher */}
                                            <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-8 max-w-xl border border-slate-200/40">
                                                <button
                                                    type="button"
                                                    onClick={() => { setServiceSubtype('combo'); setServicePage(1); }}
                                                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceSubtype === 'combo' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                        }`}
                                                >
                                                    <Sparkles size={14} />
                                                    {t('booking.comboPackage', 'Gói Combo')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setServiceSubtype('service'); setServicePage(1); }}
                                                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${serviceSubtype === 'service' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                        }`}
                                                >
                                                    <Settings size={14} />
                                                    {t('booking.singleService', 'Dịch vụ lẻ')}
                                                </button>
                                            </div>

                                            {/* List Display according to type */}
                                            {serviceSubtype === 'service' && (
                                                <SingleServicesSelector
                                                    mappedServices={mappedCurrentPageServices}
                                                    activeCategories={activeCategories}
                                                    selectedServiceIds={selectedServiceIds}
                                                    setSelectedServiceIds={setSelectedServiceIds}
                                                    COLORS={COLORS}
                                                    t={t as any}
                                                    selectedCategoryId={selectedCategoryId}
                                                    setSelectedCategoryId={setSelectedCategoryId}
                                                    servicePage={servicePage}
                                                    setServicePage={setServicePage}
                                                    serviceTotalPages={serviceTotalPages}
                                                    searchText={serviceSearch}
                                                    setSearchText={setServiceSearch}
                                                    dbCombos={dbCombos}
                                                    selectedComboId={selectedComboId}
                                                />
                                            )}

                                            {serviceSubtype === 'combo' && (
                                                <ComboServicesSelector
                                                    dbCombos={dbCombos}
                                                    setDbCombos={setDbCombos}
                                                    selectedComboId={selectedComboId}
                                                    setSelectedComboId={setSelectedComboId}
                                                    mappedServices={mappedServices}
                                                    COLORS={COLORS}
                                                    selectedServiceIds={selectedServiceIds}
                                                    setSelectedServiceIds={setSelectedServiceIds}
                                                />
                                            )}

                                            {serviceSubtype === 'service' && selectedServiceIds.length > 0 && activeSelection && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-8 pt-8 border-t border-gray-100 text-left"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-xs font-bold text-[#00285E] uppercase tracking-wider">
                                                            {t('booking.step1.customizeTasks', 'Tùy chỉnh hạng mục công việc')}
                                                        </h4>
                                                        <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-lg">
                                                            {selectedSubItems.length} hạng mục
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-400 mb-4">
                                                        {t('booking.step1.customizeTasksDesc', 'Chọn hoặc bỏ chọn các hạng mục cụ thể bạn mong muốn thực hiện trong gói dịch vụ.')}
                                                    </p>
                                                    <div className="space-y-2">
                                                        {/* Merge & dedupe details across all selected services */}
                                                        {[...new Set(
                                                            selectedServiceIds.flatMap(id => {
                                                                const s = mappedServices.find(x => x.id === id);
                                                                return s?.details ?? [];
                                                            })
                                                        )].map((detail, index) => {
                                                            const isChecked = selectedSubItems.includes(detail);
                                                            return (
                                                                <label
                                                                    key={index}
                                                                    className="flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none hover:bg-slate-50/50"
                                                                    style={{
                                                                        borderColor: isChecked ? 'rgba(249,161,27,0.3)' : '#F1F5F9',
                                                                        backgroundColor: isChecked ? 'rgba(249,161,27,0.02)' : 'transparent',
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => {
                                                                            if (isChecked) {
                                                                                if (selectedSubItems.length > 1) {
                                                                                    setSelectedSubItems(prev => prev.filter(item => item !== detail));
                                                                                } else {
                                                                                    alert(t('booking.alerts.minOneTask', 'Bạn phải chọn ít nhất một hạng mục công việc.'));
                                                                                }
                                                                            } else {
                                                                                setSelectedSubItems(prev => [...prev, detail]);
                                                                            }
                                                                        }}
                                                                        className="mt-0.5 accent-[#F9A11B] rounded cursor-pointer shrink-0"
                                                                    />
                                                                    <span className="text-xs text-slate-700 leading-relaxed">
                                                                        {detail}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                                    Mô tả tình trạng lỗi/hỏng hóc của xe để đặt lịch sửa chữa <span className="text-red-500">*</span>
                                                </label>
                                                <textarea
                                                    value={issueDescription}
                                                    onChange={(e) => setIssueDescription(e.target.value)}
                                                    placeholder="Ví dụ: Xe bị xước móp ở cửa trước bên phải, cần phục hồi và sơn lại..."
                                                    className="w-full h-40 bg-[#F8FAFC] border border-blue-50/50 rounded-2xl p-4 text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* STEP 3 (or STEP 2 for CONSULTATION): DATE & TIME SELECTOR */}
                            {((step === 2 && bookingFlow === 'CONSULTATION') || (step === 3 && bookingFlow === 'SPECIFIC')) && (
                                <motion.div
                                    key="stepTime"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="p-6 md:p-10 rounded-3xl bg-white border border-gray-100 shadow-xs text-left"
                                >
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                                            <Calendar size={20} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">{t('booking.step2.title', 'Chọn thời gian hẹn')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 text-left">
                                                {t('booking.step2.dateLabel', 'Chọn ngày hẹn')}
                                            </label>
                                            <div className="relative w-full">
                                                <InlineCalendar 
                                                    selectedDate={bookingDate}
                                                    onChange={setBookingDate}
                                                    minDate={minDateStr}
                                                    maxDate={maxDateStr}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 px-1 text-left">
                                                {t('booking.step2.timeLabel', 'Chọn khung giờ')}
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {timeSlots.map((slot) => {
                                                    const isSelected = bookingTime === slot.time;
                                                    return (
                                                        <div
                                                            key={slot.time}
                                                            onClick={() => !slot.isFull && setBookingTime(slot.time)}
                                                            className={`p-3.5 rounded-xl border text-center transition-all ${slot.isFull
                                                                ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                    ? 'border-brand-orange bg-amber-50/20 text-brand-orange font-bold shadow-xs cursor-pointer'
                                                                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70 text-brand-blue cursor-pointer'
                                                                }`}
                                                        >
                                                            <div className={`text-sm font-mono ${slot.isFull ? 'line-through decoration-gray-400' : ''}`}>{slot.time}</div>
                                                            <div className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">
                                                                {slot.isFull ? 'Kín lịch' : slot.label}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4/3: CONTACT INFORMATION REMOVED - RESOLVED BY BACKEND SESSION */}
                        </AnimatePresence>

                        {/* Navigation controls */}
                        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                            <button
                                onClick={handleBack}
                                className={`flex items-center gap-2 px-6 py-3 font-bold text-xs rounded-xl border border-gray-200 text-gray-600 transition-all ${step === 1 ? 'opacity-40 cursor-not-allowed border-gray-100 text-gray-300' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <ArrowLeft size={16} /> {t('booking.buttons.back', 'Quay lại')}
                            </button>

                            <button
                                disabled={isSubmitting || isAnalyzingColor || isAnalyzingIssue}
                                onClick={handleNext}
                                className={`flex items-center gap-2 px-6 py-3 text-white font-bold text-xs rounded-xl transition-all shadow-md ${isSubmitting || isAnalyzingColor || isAnalyzingIssue
                                    ? 'bg-[#00285E]/50 opacity-40 cursor-not-allowed'
                                    : 'bg-[#00285E] hover:bg-[#00285E]/90 cursor-pointer'
                                    }`}
                            >
                                {isAnalyzingColor || isAnalyzingIssue ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 shrink-0" />
                                        Đang nhận diện...
                                    </>
                                ) : isSubmitting ? (
                                    t('booking.buttons.processing', 'Đang xử lý...')
                                ) : step === (bookingFlow === 'CONSULTATION' ? 2 : 3) ? (
                                    t('booking.buttons.confirm', 'Xác nhận đặt lịch')
                                ) : (
                                    t('booking.buttons.next', 'Tiếp theo')
                                )}
                                {!(isAnalyzingColor || isAnalyzingIssue) && step < (bookingFlow === 'CONSULTATION' ? 2 : 3) && <ChevronRight size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* ── SIDEBAR SUMMARY ──────────────────────────── */}
                    <aside className="text-left">
                        <div className="p-8 rounded-3xl shadow-xl text-white sticky top-24 overflow-hidden"
                            style={{ backgroundColor: '#00285E' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00285E] via-[#00285E] to-[#001C43] z-0" />
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl z-0" />

                            <h3 className="text-xl font-bold mb-8 border-b border-white/10 pb-6 relative z-10 font-display">
                                {t('booking.sidebar.title', 'Tóm tắt đặt lịch')}
                            </h3>

                            <div className="space-y-6 relative z-10 text-left">
                                {/* Selected Booking Entity */}
                                {/* Selected Booking Entity */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                        {bookingFlow === 'CONSULTATION' ? (
                                            <Sparkles size={18} style={{ color: COLORS.orange }} />
                                        ) : serviceSubtype === 'service' ? (
                                            <Settings size={18} style={{ color: COLORS.orange }} />
                                        ) : (
                                            <Sparkles size={18} style={{ color: COLORS.orange }} />
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                                            {bookingFlow === 'CONSULTATION'
                                                ? t('booking.consultationBooking', 'Đặt lịch tư vấn')
                                                : serviceSubtype === 'service'
                                                    ? t('booking.singleService', 'Dịch vụ lẻ')
                                                    : t('booking.comboPackage', 'Gói Combo')}
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-bold text-xs md:text-sm">
                                                {activeSelection ? activeSelection.title : t('booking.sidebar.notSelected', 'Chưa chọn')}
                                            </span>
                                            {activeSelection && (
                                                ((bookingFlow === 'CONSULTATION' && step > 1) ||
                                                    (bookingFlow === 'SPECIFIC' && step > 2))
                                            ) && (
                                                    <button onClick={() => setStep(bookingFlow === 'CONSULTATION' ? 1 : 2)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-brand-orange border-none bg-transparent cursor-pointer">
                                                        <Edit2 size={13} />
                                                    </button>
                                                )}
                                        </div>
                                        {activeSelection && activeSelection.subItems && activeSelection.subItems.length > 0 && (
                                            <div className="mt-2.5 pl-2 border-l border-[#F9A11B]/40 space-y-1">
                                                <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-0.5">
                                                    {bookingFlow === 'CONSULTATION'
                                                        ? 'Yêu cầu tư vấn'
                                                        : serviceSubtype === 'service'
                                                            ? 'Hạng mục đã chọn'
                                                            : 'Dịch vụ đi kèm'}
                                                </div>
                                                {activeSelection.subItems.map((item, idx) => (
                                                    <div key={idx} className="text-[10px] text-slate-300 leading-snug flex items-start gap-1">
                                                        <span className="text-[#F9A11B] shrink-0">•</span>
                                                        <span>{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Appointment Time */}
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                        <Calendar size={18} style={{ color: COLORS.orange }} />
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{t('booking.sidebar.timeLabel', 'Thời gian hẹn')}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-bold text-xs md:text-sm">
                                                {bookingDate && bookingTime ? `${bookingTime} - ${bookingDate}` : t('booking.sidebar.notSelected', 'Chưa chọn')}
                                            </span>
                                            {bookingDate && bookingTime && step > 2 && (
                                                <button onClick={() => setStep(2)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-brand-orange border-none bg-transparent cursor-pointer">
                                                    <Edit2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Vehicle information */}
                                {bookingFlow !== 'CONSULTATION' && (
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                            <Car size={18} style={{ color: COLORS.orange }} />
                                        </div>
                                        <div className="flex-grow">
                                            <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{t('booking.sidebar.vehicleLabel', 'Phương tiện')}</div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="font-bold text-xs md:text-sm">
                                                    {vehicleBrand && vehicleModel ? (
                                                        <>
                                                            {vehicleBrand} {vehicleModel}
                                                            <div className="text-[10px] text-white/60 font-normal mt-0.5">
                                                                Biển số: {vehiclePlate || 'N/A'}
                                                                {vehicleYear ? ` • Đời: ${vehicleYear}` : ''}
                                                                {vehicleColor ? ` • Màu: ${vehicleColor}` : ''}
                                                            </div>
                                                        </>
                                                    ) : t('booking.sidebar.notEntered', 'Chưa nhập')}
                                                </span>
                                                {vehicleBrand && vehicleModel && step > 1 && (
                                                    <button onClick={() => setStep(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-brand-orange border-none bg-transparent cursor-pointer">
                                                        <Edit2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Total calculations */}
                            <div className="mt-8 pt-6 border-t border-white/10 space-y-4 relative z-10">
                                {activeSelection && activeSelection.originalPrice && (
                                    <div className="flex justify-between text-xs text-white/60">
                                        <span>Giá gốc:</span>
                                        <span className="font-mono text-white/50 line-through">{activeSelection.originalPrice}</span>
                                    </div>
                                )}
                                {activeSelection && activeSelection.discountPercentage && (
                                    <div className="flex justify-between text-xs text-red-400 font-bold">
                                        <span>{t('services.promoBadge', 'Khuyến mãi')}</span>
                                        <span>-{activeSelection.discountPercentage}%</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>{t('booking.sidebar.servicePrice', 'Giá dịch vụ')}</span>
                                    <span className="font-mono text-white">{activeSelection ? activeSelection.price : '0đ'}</span>
                                </div>
                                {serviceCategoryMode === 'REPAIR' && (
                                    <div className="flex justify-between text-xs text-white/60 mt-1">
                                        <span>{t('booking.sidebar.installationFee', 'Công lắp đặt / kiểm tra')}</span>
                                        <span className="font-mono text-white">{t('booking.sidebar.free', 'Miễn phí')}</span>
                                    </div>
                                )}
                                
                                {activeSelection && activeSelection.promoText && (
                                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-[10px] text-[#F9A11B] font-semibold leading-relaxed flex items-start gap-1.5">
                                        <span className="shrink-0 mt-0.5">🎁</span>
                                        <span>{activeSelection.promoText}</span>
                                    </div>
                                )}

                                <div className="pt-6 flex justify-between items-end border-t border-white/5">
                                    <div>
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{t('booking.sidebar.total', 'Tổng cộng')}</div>
                                        <div className="text-2xl md:text-3xl font-bold font-display" style={{ color: COLORS.orange }}>
                                            {activeSelection ? activeSelection.price : '0đ'}
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-white/20 italic mb-1">{t('booking.sidebar.estimatedNote', '* Giá tạm tính')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Hotline support */}
                        <div className="mt-6 p-6 bg-white rounded-3xl border border-gray-100 flex items-center gap-4 shadow-xs text-left">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue shadow-inner">
                                <Phone size={20} />
                            </div>
                            <div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{t('booking.hotline.title', 'Cần tư vấn trực tiếp?')}</div>
                                <div className="font-bold tracking-tight text-brand-blue hover:text-brand-orange transition-colors">{t('booking.hotline.value', 'Hotline: 1900 1234')}</div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Modal phóng to ảnh (Lightbox) */}
            <AnimatePresence>
                {isImageFullScreen && issueImagePreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
                        onClick={() => setIsImageFullScreen(false)}
                    >
                        {/* Nút đóng */}
                        <button
                            className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsImageFullScreen(false);
                            }}
                        >
                            <X size={24} />
                        </button>

                        {/* Ảnh phóng to */}
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={issueImagePreview}
                            alt="Phóng to lỗi xe"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal phóng to ảnh chung (General Lightbox) */}
            <AnimatePresence>
                {fullScreenImageUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
                        onClick={() => setFullScreenImageUrl(null)}
                    >
                        <button
                            className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenImageUrl(null);
                            }}
                        >
                            <X size={24} />
                        </button>

                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            src={fullScreenImageUrl}
                            alt="Phóng to ảnh"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}