import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Calendar, Car, User, Settings,
    Check, ChevronRight, Phone, Clock, Edit2, ArrowLeft,
    Sparkles
} from 'lucide-react';
import { COLORS } from '../../../components/share/Color';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';
import SingleServicesSelector from './SingleServicesSelector';
import ComboServicesSelector from './ComboServicesSelector';

export interface ServiceCombo {
    id: number;
    combo_name: string;
    category_id: number;
    service_ids: number[];
    discount_percentage: number;
    is_active: boolean;
    createdAt: string;
}

export interface ServiceItem {
    id: number;
    title: string;
    desc: string;
    price: string;
    numericPrice: number;
    badge?: string;
    rating: number;
    reviewCount: number;
    details?: string[];
    originalPrice?: string;
    discountPercentage?: number;
    promoText?: string;
    category_id?: number;
}

// Fallbacks
const fallbackCategories = [
    { id: 1, category_name: 'Bảo dưỡng định kỳ' },
    { id: 2, category_name: 'Sửa chữa động cơ' },
    { id: 3, category_name: 'Dịch vụ lốp & phanh' },
    { id: 4, category_name: 'Chăm sóc nội thất' },
    { id: 5, category_name: 'Chẩn đoán điện tử' },
    { id: 6, category_name: 'Cứu hộ 24/7' }
];

const fallbackServices = [
    { id: 1, service_name: 'Bảo Dưỡng Định Kỳ Cấp 1', description: 'Kiểm tra tổng quát, thay dầu động cơ, vệ sinh lọc gió, lọc điều hòa.', category_id: 1 },
    { id: 2, service_name: 'Bảo Dưỡng Định Kỳ Cấp 2', description: 'Bảo dưỡng phanh 4 bánh, đảo lốp, thay nhớt lọc nhớt, vệ sinh họng hút.', category_id: 1 },
    { id: 3, service_name: 'Sửa Chữa Động Cơ Chuyên Sâu', description: 'Xử lý rung giật, hao nước, yếu máy, rò rỉ dầu nhớt xi lanh.', category_id: 2 },
    { id: 4, service_name: 'Cân Chỉnh Thước Lái 3D', description: 'Cân chỉnh góc đặt bánh xe bằng máy Hunter hiện đại chống ăn mòn lốp.', category_id: 3 },
    { id: 5, service_name: 'Dọn Nội Thất Toàn Diện', description: 'Vệ sinh ghế da, giặt trần nỉ, dưỡng bóng taplo tapbi, khử trùng ozon.', category_id: 4 },
    { id: 6, service_name: 'Cứu Hộ Ắc Quy & Kích Bình', description: 'Hỗ trợ khẩn cấp tại chỗ kích nổ bình ắc quy xe bị hết điện.', category_id: 6 }
];

export default function BookingPage() {
    const { t } = useTranslation();
    const [step, setStep] = useState(1);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { fetchPublic } = useFetchClient();

    // Booking Type State: 'service' | 'combo'
    const [bookingType, setBookingType] = useState<'service' | 'combo'>('service');

    // Form States
    const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
    const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [servicePage, setServicePage] = useState(1);
    const [selectedSubItems, setSelectedSubItems] = useState<string[]>([]);

    const [bookingDate, setBookingDate] = useState('');
    const [bookingTime, setBookingTime] = useState('');

    const [vehicleBrand, setVehicleBrand] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');

    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Dynamic Data States
    const [dbServices, setDbServices] = useState<any[]>([]);
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [dbCombos, setDbCombos] = useState<ServiceCombo[]>([]);
    const [_, setIsLoading] = useState(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    // Generate random booking code once per submission success
    const bookingCode = useMemo(() => Math.floor(100000 + Math.random() * 900000), [isSuccess]);

    const steps = [
        { id: 1, label: t('booking.steps.service', 'Dịch vụ'), icon: <Settings size={20} /> },
        { id: 2, label: t('booking.steps.time', 'Thời gian'), icon: <Clock size={20} /> },
        { id: 3, label: t('booking.steps.vehicle', 'Thông tin xe'), icon: <Car size={20} /> },
        { id: 4, label: t('booking.steps.contact', 'Liên hệ'), icon: <User size={20} /> },
    ];

    // Load dynamic categories & services from backend
    useEffect(() => {
        const loadDbData = async () => {
            setIsLoading(true);
            try {
                // Fetch Categories
                const catRes = await fetchPublic(SERVICE_API_ENDPOINTS.GET_CATEGORIES);
                if (catRes && catRes.data) {
                    setDbCategories(catRes.data);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu categories từ backend:", error);
            }

            try {
                // Fetch Services (Catalogs)
                const svcRes = await fetchPublic(SERVICE_API_ENDPOINTS.GET_SERVICES);
                if (svcRes && svcRes.data) {
                    setDbServices(svcRes.data);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu services từ backend:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadDbData();
    }, []);

    const getServicePriceValue = (id: number): number => {
        try {
            const storedPrices = localStorage.getItem("service_prices");
            if (storedPrices) {
                const prices = JSON.parse(storedPrices);
                if (prices[id] !== undefined) return prices[id];
            }
        } catch (e) { }

        const priceMap: Record<number, number> = {
            1: 500000,
            2: 1200000,
            3: 400000,
            4: 800000,
            5: 300000,
            6: 0
        };
        return priceMap[id] ?? 300000;
    };

    const getServiceDiscount = (_serviceName: string, categoryName: string): number => {
        const lowerC = (categoryName || "").toLowerCase();
        if (lowerC.includes("bảo dưỡng")) return 10;
        if (lowerC.includes("động cơ") || lowerC.includes("sửa chữa")) return 15;
        if (lowerC.includes("lốp") || lowerC.includes("phanh")) return 20;
        if (lowerC.includes("nội thất") || lowerC.includes("chăm sóc")) return 12;
        if (lowerC.includes("điện") || lowerC.includes("chẩn đoán")) return 15;
        return 0;
    };

    const getServicePromoText = (serviceName: string, _categoryName: string): string => {
        const lowerS = serviceName.toLowerCase();
        if (lowerS.includes("cấp 1")) return "Tặng nước rửa kính cao cấp & kiểm tra lốp miễn phí";
        if (lowerS.includes("cấp 2")) return "Tặng nước rửa kính cao cấp & vệ sinh lọc gió động cơ";
        if (lowerS.includes("cấp 3")) return "Tặng nước rửa kính cao cấp & cân bằng động bánh xe miễn phí";
        if (lowerS.includes("kim phun")) return "Giảm 15% gói vệ sinh kim phun buồng đốt đi kèm";
        if (lowerS.includes("lốp") || lowerS.includes("bánh xe")) return "Miễn phí cân bằng động khi thay từ 2 lốp Michelin";
        if (lowerS.includes("nội thất")) return "Tặng gói khử mùi cabin Ozon trị giá 200.000đ";
        if (lowerS.includes("obd") || lowerS.includes("mã lỗi")) return "Miễn phí chẩn đoán lỗi OBD nhanh bằng máy chuyên dụng";
        if (lowerS.includes("cứu hộ")) return "Hỗ trợ khẩn cấp 24/7 toàn khu vực nội thành";
        return "";
    };

    const getServiceDetails = (serviceName: string): string[] => {
        const lowerS = serviceName.toLowerCase();
        if (lowerS.includes("cấp 1")) return [
            "Thay nhớt động cơ chính hãng phù hợp thông số xe.",
            "Kiểm tra và làm sạch lọc gió động cơ, lọc gió cabin.",
            "Kiểm tra hệ thống phanh, má phanh, đĩa phanh.",
            "Kiểm tra bình ắc quy và hệ thống chiếu sáng.",
            "Đọc lỗi lỗi hộp đen (OBD) bằng thiết bị chuyên dụng."
        ];
        if (lowerS.includes("cấp 2")) return [
            "Thay nhớt & lọc nhớt động cơ chính hãng.",
            "Kiểm tra, làm sạch lọc gió động cơ & lọc gió điều hòa.",
            "Tháo bánh xe, vệ sinh và dưỡng hệ thống phanh 4 bánh.",
            "Đảo lốp và kiểm tra độ mòn của gai lốp.",
            "Kiểm tra tổng quát gầm xe, các khớp nối, rotuyn."
        ];
        if (lowerS.includes("cấp 3")) return [
            "Thay nhớt, lọc nhớt, thay lọc gió động cơ & điều hòa.",
            "Thay bugi đánh lửa (nếu cần), vệ sinh bướm ga.",
            "Vệ sinh phanh 4 bánh chuyên sâu, tra mỡ ắc phanh.",
            "Kiểm tra cân bằng động lốp xe và cân chỉnh góc đặt bánh xe.",
            "Kiểm tra toàn bộ hệ thống làm mát, dầu phanh, dầu trợ lực lái."
        ];
        if (lowerS.includes("kim phun")) return [
            "Đo áp suất buồng đốt, kiểm tra tỉ số nén động cơ.",
            "Xử lý hiện tượng rò rỉ dầu máy, hao nước làm mát.",
            "Cân chỉnh cam, khắc phục tiếng gõ động cơ lạ.",
            "Đại tu động cơ chuyên nghiệp theo tiêu chuẩn hãng.",
            "Vệ sinh kim phun, họng hút và buồng đốt bằng máy chuyên dụng."
        ];
        if (lowerS.includes("lốp") || lowerS.includes("bánh xe") || lowerS.includes("phanh")) return [
            "Cân chỉnh thước lái 3D tiên tiến nhất hiện nay.",
            "Cân bằng động lốp xe triệt tiêu hiện tượng rung vô lăng.",
            "Láng đĩa phanh trực tiếp không cần tháo rời.",
            "Thay mới má phanh chính hãng nhập khẩu.",
            "Kiểm tra toàn bộ đường ống dẫn dầu và cụm heo phanh."
        ];
        if (lowerS.includes("nội thất")) return [
            "Dọn nội thất toàn diện, hút bụi và giặt thảm sàn.",
            "Vệ sinh bề mặt da ghế bằng dung dịch chuyên sâu bảo vệ da.",
            "Khử trùng hệ thống điều hòa và khử mùi ozon cabin.",
            "Dưỡng bóng táp-lô, táp-pi cửa chống lão hóa tia UV.",
            "Làm sạch trần nỉ và cốp sau tỉ mỉ."
        ];
        if (lowerS.includes("obd") || lowerS.includes("lỗi")) return [
            "Quét toàn bộ lỗi hệ thống điện thân xe, hộp điều khiển.",
            "Chẩn đoán lỗi cảm biến ABS, ESP, túi khí SRS.",
            "Kiểm tra tình trạng máy phát điện, máy khởi động.",
            "Cập nhật phần mềm hệ thống (ECU flashing) nếu có.",
            "Xóa các mã lỗi ảo phát sinh do sụt điện."
        ];
        if (lowerS.includes("cứu hộ") || lowerS.includes("kích bình")) return [
            "Hỗ trợ kích nổ ắc quy tại chỗ nhanh chóng.",
            "Hỗ trợ thay lốp dự phòng khẩn cấp.",
            "Cung cấp nhiên liệu khẩn cấp trên đường.",
            "Xe cẩu kéo chuyên dụng đưa về trung tâm dịch vụ.",
            "Đội ngũ cứu hộ túc trực sẵn sàng 24 giờ mỗi ngày."
        ];
        return [
            "Kiểm tra tổng quát tình trạng hoạt động thực tế.",
            "Sử dụng phụ tùng và linh kiện chính hãng 100%.",
            "Bảo hành kỹ thuật dài hạn và tư vấn miễn phí.",
            "Thực hiện nhanh chóng bởi kỹ thuật viên lành nghề."
        ];
    };

    // Active categories & services use module-level fallbacks if database data is not loaded yet

    const activeCategories = useMemo(() => {
        const raw = dbCategories.length > 0 ? dbCategories : fallbackCategories;
        return raw.filter((c: any) => c.is_active !== false);
    }, [dbCategories]);

    const activeDbServices = useMemo(() => {
        const raw = dbServices.length > 0 ? dbServices : fallbackServices;
        return raw.filter((s: any) => s.is_active !== false);
    }, [dbServices]);

    // Map dbServices to ServiceItem list
    const mappedServices: ServiceItem[] = useMemo(() => {
        return activeDbServices.map((s: any) => {
            const cat = activeCategories.find(c => String(c.id) === String(s.category_id));
            const categoryName = cat ? cat.category_name : "";
            const discountPercent = getServiceDiscount(s.service_name, categoryName);
            const priceValue = getServicePriceValue(s.id);
            const originalPriceValue = discountPercent > 0 ? Math.round(priceValue / (1 - discountPercent / 100)) : 0;
            const originalPriceStr = originalPriceValue > 0 ? `Từ ${originalPriceValue.toLocaleString("vi-VN")}đ` : "";

            // Rating details simulator
            const ratingVal = 4.7 + ((s.id * 3) % 4) * 0.1;
            const reviewVal = 50 + (s.id * 17) % 250;

            return {
                id: s.id,
                title: s.service_name,
                desc: s.description || "",
                price: priceValue > 0 ? `Từ ${priceValue.toLocaleString("vi-VN")}đ` : "Liên hệ",
                numericPrice: priceValue,
                originalPrice: originalPriceStr || undefined,
                discountPercentage: discountPercent > 0 ? discountPercent : undefined,
                promoText: getServicePromoText(s.service_name, categoryName),
                rating: parseFloat(ratingVal.toFixed(1)),
                reviewCount: reviewVal,
                badge: s.service_name.toLowerCase().includes("cứu hộ") ? "Khẩn cấp" : undefined,
                details: getServiceDetails(s.service_name),
                category_id: s.category_id
            };
        });
    }, [activeDbServices, activeCategories]);



    const hasInitialized = useRef(false);

    // Parse params on URL
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const initialServiceId = searchParams.get('serviceId');
        const initialComboId = searchParams.get('comboId');

        if (initialComboId) {
            setBookingType('combo');
            setSelectedComboId(parseInt(initialComboId, 10));
        } else if (initialServiceId) {
            setBookingType('service');
            setSelectedServiceIds([parseInt(initialServiceId, 10)]);
        }
    }, [searchParams]);

    // Setup active selection tóm tắt
    const activeSelection = useMemo(() => {
        if (bookingType === 'service') {
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
        } else if (bookingType === 'combo') {
            const c = dbCombos.find(x => x.id === selectedComboId);
            if (!c) return null;
            const serviceIds = c.service_ids || [];
            const original = serviceIds.reduce((sum, id) => sum + getServicePriceValue(id), 0);
            const discounted = Math.round(original * (1 - c.discount_percentage / 100));
            const subNames = serviceIds.map(id => {
                const s = mappedServices.find(x => x.id === id);
                return s ? s.title : "Dịch vụ của gara";
            });
            return {
                title: c.combo_name,
                price: `Từ ${discounted.toLocaleString("vi-VN")}đ`,
                numericPrice: discounted,
                originalPrice: `Từ ${original.toLocaleString("vi-VN")}đ`,
                discountPercentage: c.discount_percentage,
                promoText: `Tiết kiệm ${c.discount_percentage}% khi đặt theo gói combo`,
                subItems: subNames,
            };
        }
        return null;
    }, [bookingType, selectedServiceIds, selectedComboId, mappedServices, dbCombos, selectedSubItems]);

    // Handle subitems customize default fill — merge details of all selected services
    useEffect(() => {
        if (bookingType === 'service' && selectedServiceIds.length > 0) {
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
    }, [bookingType, selectedServiceIds, mappedServices, selectedSubItems]);

    const timeSlots = [
        { time: '08:00', label: t('booking.timeSlots.morning', 'Sáng') },
        { time: '09:30', label: t('booking.timeSlots.morning', 'Sáng') },
        { time: '11:00', label: t('booking.timeSlots.morning', 'Sáng') },
        { time: '13:30', label: t('booking.timeSlots.afternoon', 'Chiều') },
        { time: '15:00', label: t('booking.timeSlots.afternoon', 'Chiều') },
        { time: '16:30', label: t('booking.timeSlots.afternoon', 'Chiều') },
    ];

    const validateStep = (currentStep: number) => {
        switch (currentStep) {
            case 1:
                if (bookingType === 'service') return selectedServiceIds.length > 0;
                if (bookingType === 'combo') return selectedComboId !== null;
                return false;
            case 2:
                return bookingDate !== '' && bookingTime !== '';
            case 3:
                return vehicleBrand.trim() !== '' && vehicleModel.trim() !== '' && vehiclePlate.trim() !== '';
            case 4:
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
                return contactName.trim() !== '' && phoneRegex.test(contactPhone) && emailRegex.test(contactEmail);
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (!validateStep(step)) {
            alert(t('booking.alerts.validationError', 'Vui lòng điền đầy đủ và đúng thông tin yêu cầu của bước hiện tại.'));
            return;
        }
        if (step < 4) {
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

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
        }, 1500);
    };

    const inputClass = 'w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl md:rounded-2xl p-2.5 md:p-4 text-xs md:text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue';

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
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-left text-xs space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.serviceLabel', 'Dịch vụ:')}</span>
                            <span className="font-bold text-brand-blue">{activeSelection?.title}</span>
                        </div>
                        {activeSelection?.subItems && activeSelection.subItems.length > 0 && (
                            <div className="pl-3 border-l-2 border-[#F9A11B] py-0.5 space-y-1 my-1">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    {bookingType === 'service' ? t('booking.summary.itemsLabel', 'Hạng mục thực hiện:') : 'Dịch vụ đi kèm:'}
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
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.plateLabel', 'Biển số xe:')}</span>
                            <span className="font-bold text-brand-blue">{vehiclePlate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">{t('booking.summary.customerLabel', 'Khách hàng:')}</span>
                            <span className="font-bold text-brand-blue">{contactName}</span>
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
                                setVehiclePlate('');
                                setContactName('');
                                setContactPhone('');
                                setContactEmail('');
                                setIsSuccess(false);
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
                            style={{ width: `${(step - 1) * 33.33}%`, backgroundColor: COLORS.orange }}
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
                            {/* STEP 1: SELECT SERVICE / COMBO / CATEGORY */}
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
                                            <Settings size={20} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">Chọn hình thức bảo dưỡng</h2>
                                    </div>

                                    {/* Segmented Control Switcher */}
                                    <div className="flex p-1 bg-slate-100/80 rounded-2xl mb-8 max-w-xl border border-slate-200/40">
                                        <button
                                            type="button"
                                            onClick={() => { setBookingType('service'); setServicePage(1); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${bookingType === 'service' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                }`}
                                        >
                                            <Settings size={14} />
                                            Dịch vụ lẻ
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setBookingType('combo'); setServicePage(1); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${bookingType === 'combo' ? 'bg-[#00285E] text-white shadow-md shadow-blue-900/10' : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                                                }`}
                                        >
                                            <Sparkles size={14} />
                                            Gói Combo
                                        </button>
                                    </div>

                                    {/* List Display according to type */}
                                    {bookingType === 'service' && (
                                        <SingleServicesSelector
                                            mappedServices={mappedServices}
                                            activeCategories={activeCategories}
                                            selectedServiceIds={selectedServiceIds}
                                            setSelectedServiceIds={setSelectedServiceIds}
                                            COLORS={COLORS}
                                            t={t as any}
                                            selectedCategoryId={selectedCategoryId}
                                            setSelectedCategoryId={setSelectedCategoryId}
                                            servicePage={servicePage}
                                            setServicePage={setServicePage}
                                        />
                                    )}

                                    {bookingType === 'combo' && (
                                        <ComboServicesSelector
                                            dbCombos={dbCombos}
                                            setDbCombos={setDbCombos}
                                            selectedComboId={selectedComboId}
                                            setSelectedComboId={setSelectedComboId}
                                            mappedServices={mappedServices}
                                            getServicePriceValue={getServicePriceValue}
                                            COLORS={COLORS}
                                        />
                                    )}

                                    {bookingType === 'service' && selectedServiceIds.length > 0 && activeSelection && (
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
                                </motion.div>
                            )}

                            {/* STEP 2: DATE & TIME SELECTOR */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
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
                                            <input
                                                type="date"
                                                value={bookingDate}
                                                onChange={(e) => setBookingDate(e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl md:rounded-2xl p-4 text-xs md:text-sm outline-none transition-all focus:border-amber-400 focus:bg-white text-brand-blue"
                                            />
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
                                                            onClick={() => setBookingTime(slot.time)}
                                                            className={`p-3.5 rounded-xl border text-center cursor-pointer transition-all ${isSelected
                                                                ? 'border-brand-orange bg-amber-50/20 text-brand-orange font-bold shadow-xs'
                                                                : 'border-slate-100 bg-slate-50 hover:bg-slate-100/70 text-brand-blue'
                                                                }`}
                                                        >
                                                            <div className="text-sm font-mono">{slot.time}</div>
                                                            <div className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">{slot.label}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: VEHICLE INFORMATION */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="p-6 md:p-10 rounded-3xl bg-white border border-gray-100 shadow-xs text-left"
                                >
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                                            <Car size={20} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">{t('booking.step3.title', 'Thông tin phương tiện')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step3.brandLabel', 'Hãng xe')}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('booking.step3.brandPlaceholder', 'Ví dụ: Toyota, BMW, Mazda...')}
                                                value={vehicleBrand}
                                                onChange={(e) => setVehicleBrand(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step3.modelLabel', 'Dòng xe (Model)')}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('booking.step3.modelPlaceholder', 'Ví dụ: Camry, 320i, CX-5...')}
                                                value={vehicleModel}
                                                onChange={(e) => setVehicleModel(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step3.plateLabel', 'Biển số xe')}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('booking.step3.platePlaceholder', 'Ví dụ: 30A-123.45 hoặc 51F-999.99')}
                                                value={vehiclePlate}
                                                onChange={(e) => setVehiclePlate(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4: CONTACT INFORMATION */}
                            {step === 4 && (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="p-6 md:p-10 rounded-3xl bg-white border border-gray-100 shadow-xs text-left"
                                >
                                    <div className="flex items-center gap-3 mb-8">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                                            <User size={20} />
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-brand-blue font-display">{t('booking.step4.title', 'Thông tin liên hệ')}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step4.nameLabel', 'Họ và tên')}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('booking.step4.namePlaceholder', 'Nguyễn Văn A')}
                                                value={contactName}
                                                onChange={(e) => setContactName(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step4.phoneLabel', 'Số điện thoại')}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={t('booking.step4.phonePlaceholder', '0912345678')}
                                                value={contactPhone}
                                                onChange={(e) => setContactPhone(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1 text-left">
                                                {t('booking.step4.emailLabel', 'Địa chỉ Email')}
                                            </label>
                                            <input
                                                type="email"
                                                placeholder={t('booking.step4.emailPlaceholder', 'khachhang@example.com')}
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
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
                                disabled={isSubmitting}
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-3 bg-[#00285E] hover:bg-[#00285E]/90 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                            >
                                {isSubmitting
                                    ? t('booking.buttons.processing', 'Đang xử lý...')
                                    : step === 4
                                        ? t('booking.buttons.confirm', 'Xác nhận đặt lịch')
                                        : t('booking.buttons.next', 'Tiếp theo')}
                                {step < 4 && <ChevronRight size={16} />}
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
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                        {bookingType === 'service' ? <Settings size={18} style={{ color: COLORS.orange }} /> : <Sparkles size={18} style={{ color: COLORS.orange }} />}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                                            {bookingType === 'service' ? 'Dịch vụ lẻ' : 'Gói Combo'}
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-bold text-xs md:text-sm">
                                                {activeSelection ? activeSelection.title : t('booking.sidebar.notSelected', 'Chưa chọn')}
                                            </span>
                                            {activeSelection && step > 1 && (
                                                <button onClick={() => setStep(1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-brand-orange border-none bg-transparent cursor-pointer">
                                                    <Edit2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                        {activeSelection && activeSelection.subItems && activeSelection.subItems.length > 0 && (
                                            <div className="mt-2.5 pl-2 border-l border-[#F9A11B]/40 space-y-1">
                                                <div className="text-[8px] text-white/30 font-bold uppercase tracking-wider mb-0.5">
                                                    {bookingType === 'service' ? 'Hạng mục đã chọn' : 'Dịch vụ đi kèm'}
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
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
                                        <Car size={18} style={{ color: COLORS.orange }} />
                                    </div>
                                    <div className="flex-grow">
                                        <div className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{t('booking.sidebar.vehicleLabel', 'Phương tiện')}</div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="font-bold text-xs md:text-sm">
                                                {vehicleBrand && vehicleModel ? `${vehicleBrand} ${vehicleModel} (${vehiclePlate || 'N/A'})` : t('booking.sidebar.notEntered', 'Chưa nhập')}
                                            </span>
                                            {vehicleBrand && vehicleModel && step > 3 && (
                                                <button onClick={() => setStep(3)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-brand-orange border-none bg-transparent cursor-pointer">
                                                    <Edit2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                                <div className="flex justify-between text-xs text-white/60">
                                    <span>{t('booking.sidebar.installationFee', 'Công lắp đặt / kiểm tra')}</span>
                                    <span className="font-mono text-white">{t('booking.sidebar.free', 'Miễn phí')}</span>
                                </div>

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
        </div>
    );
}