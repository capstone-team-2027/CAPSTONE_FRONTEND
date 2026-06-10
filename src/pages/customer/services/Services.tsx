import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings, Wrench, Zap, Car, ShieldCheck,
    Droplets, Plus, Package, Wallet, UserCheck, Search, X, Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/share/Color';
import { Button } from '../../../components/share/Button';
import { useNavigate } from 'react-router-dom';
import { useFetchClient } from '../../../hook/useFetchClient';
import { SERVICE_API_ENDPOINTS } from '../../../constants/customer/serviceApiEndpoints';


interface ServiceCombo {
    id: number;
    combo_name: string;
    category_id: number;
    service_ids: number[];
    discount_percentage: number;
    is_active: boolean;
    createdAt: string;
}

interface ServiceItem {
    id: number;
    title: string;
    desc: string;
    icon: React.ReactNode;
    price: string;
    category: string;
    image: string;
    duration?: string;
    details?: string[];
    originalPrice?: string;
    discountPercentage?: number;
    promoText?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const getCategoryIcon = (categoryName: string) => {
    const lower = (categoryName || "").toLowerCase();
    if (lower.includes("tất cả")) return <Package size={16} />;
    if (lower.includes("bảo dưỡng")) return <Settings size={16} />;
    if (lower.includes("sửa chữa") || lower.includes("động cơ")) return <Wrench size={16} />;
    if (lower.includes("lốp") || lower.includes("phanh")) return <Car size={16} />;
    if (lower.includes("nội thất") || lower.includes("chăm sóc")) return <Droplets size={16} />;
    if (lower.includes("điện") || lower.includes("chẩn đoán")) return <Zap size={16} />;
    if (lower.includes("cứu hộ")) return <ShieldCheck size={16} />;
    return <Settings size={16} />;
};

export default function Services() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { fetchPublic } = useFetchClient();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
    const [combos, setCombos] = useState<ServiceCombo[]>([]);
    const [dbServices, setDbServices] = useState<any[]>([]);
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [_, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    useEffect(() => {
        const loadDbData = async () => {
            setIsLoading(true);
            try {
                const catRes = await fetchPublic(SERVICE_API_ENDPOINTS.GET_CATEGORIES);
                const svcRes = await fetchPublic(SERVICE_API_ENDPOINTS.GET_SERVICES);
                const comboRes = await fetchPublic(SERVICE_API_ENDPOINTS.GET_COMBOS);
                if (catRes && catRes.data) {
                    setDbCategories(catRes.data);
                }
                if (svcRes && svcRes.data) {
                    setDbServices(svcRes.data);
                }
                if (comboRes && comboRes.data && comboRes.data.length > 0) {
                    const mappedCombos = comboRes.data.map((c: any) => ({
                        id: c.id,
                        combo_name: c.combo_name,
                        category_id: c.catalogs?.[0]?.category_id || 1,
                        service_ids: c.catalogs?.map((cat: any) => cat.id) || [],
                        discount_percentage: c.discount_percentage || 10,
                        is_active: c.is_active,
                        createdAt: c.createdAt,
                    }));
                    setCombos(mappedCombos);
                }
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu dịch vụ từ backend:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadDbData();
    }, []);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("service_combos");
            if (stored) {
                setCombos(JSON.parse(stored));
            } else {
                const defaultCombos: ServiceCombo[] = [
                    {
                        id: 10001,
                        combo_name: "Combo Bảo dưỡng Định kỳ Cơ bản",
                        category_id: 1,
                        service_ids: [1, 2, 3],
                        discount_percentage: 10,
                        is_active: true,
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 10002,
                        combo_name: "Combo Chăm sóc & Làm đẹp Toàn diện",
                        category_id: 4,
                        service_ids: [3, 4],
                        discount_percentage: 15,
                        is_active: true,
                        createdAt: new Date().toISOString(),
                    },
                ];
                setCombos(defaultCombos);
            }
        } catch (e) {
            console.error(e);
        }
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

    const calculateComboPrices = (serviceIds: number[], discount: number) => {
        const totalOriginal = serviceIds.reduce((sum, id) => {
            return sum + getServicePriceValue(id);
        }, 0);
        const discounted = totalOriginal * (1 - discount / 100);
        return { totalOriginal, discounted };
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

    const getServiceIcon = (serviceName: string, categoryName: string) => {
        const lowerS = serviceName.toLowerCase();
        const lowerC = (categoryName || "").toLowerCase();
        if (lowerS.includes("cứu hộ") || lowerS.includes("kích bình") || lowerS.includes("lốp dự phòng")) return <Zap size={18} />;
        if (lowerC.includes("lốp") || lowerC.includes("phanh") || lowerS.includes("lốp") || lowerS.includes("phanh")) return <Car size={18} />;
        if (lowerC.includes("nội thất") || lowerS.includes("nội thất") || lowerS.includes("khử mùi") || lowerS.includes("ozon")) return <Droplets size={18} />;
        if (lowerC.includes("chẩn đoán") || lowerC.includes("điện") || lowerS.includes("obd") || lowerS.includes("điều hòa")) return <Zap size={18} />;
        if (lowerC.includes("sửa chữa") || lowerS.includes("sửa chữa") || lowerS.includes("động cơ") || lowerS.includes("kim phun") || lowerS.includes("curoa")) return <Wrench size={18} />;
        return <Settings size={18} />;
    };

    const getServiceImage = (serviceName: string, categoryName: string) => {
        const lowerS = serviceName.toLowerCase();
        const lowerC = (categoryName || "").toLowerCase();
        if (lowerS.includes("cứu hộ") || lowerS.includes("kích bình") || lowerS.includes("lốp dự phòng")) return '/images/Performance Tuning.png';
        if (lowerC.includes("lốp") || lowerC.includes("phanh") || lowerS.includes("lốp") || lowerS.includes("phanh")) return '/images/Vehicle Protection.png';
        if (lowerC.includes("nội thất") || lowerS.includes("nội thất") || lowerS.includes("khử mùi") || lowerS.includes("ozon")) return '/images/Elite Detailing.png';
        if (lowerC.includes("chẩn đoán") || lowerC.includes("điện") || lowerS.includes("obd") || lowerS.includes("điều hòa")) return '/images/Digital Diagnostics.png';
        if (lowerC.includes("sửa chữa") || lowerS.includes("sửa chữa") || lowerS.includes("động cơ") || lowerS.includes("kim phun") || lowerS.includes("curoa")) return '/images/Advanced Repair.png';
        return '/images/Precision Maintenance (1).png';
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

    const categories = dbCategories.length > 0
        ? [
            { id: 'all', label: t('common.all', 'Tất cả') },
            ...dbCategories.map(cat => ({
                id: String(cat.id),
                label: cat.category_name
            }))
        ]
        : [
            { id: 'all', label: t('common.all', 'Tất cả') },
            { id: 'maintenance', label: t('services.categories.maintenance', 'Bảo dưỡng') },
            { id: 'repair', label: t('services.categories.repair', 'Sửa chữa') },
        ];

    const services: ServiceItem[] = dbServices.length > 0
        ? dbServices.map((s: any) => {
            const categoryName = s.category?.category_name || "";
            const discountPercent = getServiceDiscount(s.service_name, categoryName);
            const priceValue = getServicePriceValue(s.id);
            const originalPriceValue = discountPercent > 0 ? Math.round(priceValue / (1 - discountPercent / 100)) : 0;
            const originalPriceStr = originalPriceValue > 0 ? `Từ ${originalPriceValue.toLocaleString("vi-VN")}đ` : "";
            return {
                id: s.id,
                title: s.service_name,
                desc: s.description || "",
                icon: getServiceIcon(s.service_name, categoryName),
                price: priceValue > 0 ? `Từ ${priceValue.toLocaleString("vi-VN")}đ` : "Liên hệ",
                originalPrice: originalPriceStr,
                discountPercentage: discountPercent > 0 ? discountPercent : undefined,
                promoText: getServicePromoText(s.service_name, categoryName),
                category: String(s.category_id),
                image: getServiceImage(s.service_name, categoryName),
                duration: s.estimated_duration ? `${s.estimated_duration} phút` : undefined,
                details: getServiceDetails(s.service_name),
            };
        })
        : [
            {
                id: 1,
                title: t('services.list.periodic.title', 'Bảo Dưỡng Định Kỳ'),
                desc: t('services.list.periodic.desc', 'Kiểm tra tổng quát và thay thế linh kiện hao mòn định kỳ để xe luôn vận hành êm ái.'),
                icon: <Settings size={18} />,
                price: t('services.list.periodic.price', 'Từ 500.000đ'),
                originalPrice: t('services.list.periodic.originalPrice', 'Từ 550.000đ'),
                discountPercentage: 10,
                promoText: t('services.list.periodic.promoText', 'Tặng nước rửa kính cao cấp & kiểm tra lốp miễn phí'),
                category: 'maintenance',
                image: '/images/Precision Maintenance (1).png',
                duration: t('services.list.periodic.duration', '60 - 120 phút'),
                details: [
                    t('services.list.periodic.details.0', 'Thay nhớt động cơ chính hãng phù hợp thông số xe.'),
                    t('services.list.periodic.details.1', 'Kiểm tra và làm sạch lọc gió động cơ, lọc gió cabin.'),
                    t('services.list.periodic.details.2', 'Kiểm tra hệ thống phanh, má phanh, đĩa phanh.'),
                    t('services.list.periodic.details.3', 'Kiểm tra bình ắc quy và hệ thống chiếu sáng.'),
                    t('services.list.periodic.details.4', 'Đọc lỗi lỗi hộp đen (OBD) bằng thiết bị chuyên dụng.')
                ]
            },
            {
                id: 2,
                title: t('services.list.engine.title', 'Sửa Chữa Động Cơ'),
                desc: t('services.list.engine.desc', 'Xử lý triệt để các vấn đề phức tạp của động cơ bởi các chuyên gia dày dạn kinh nghiệm.'),
                icon: <Wrench size={18} />,
                price: t('services.list.engine.price', 'Từ 1.200.000đ'),
                originalPrice: t('services.list.engine.originalPrice', 'Từ 1.400.000đ'),
                discountPercentage: 15,
                promoText: t('services.list.engine.promoText', 'Giảm 15% gói vệ sinh kim phun buồng đốt đi kèm'),
                category: 'repair',
                image: '/images/Advanced Repair.png',
                duration: t('services.list.engine.duration', 'Buổi hoặc ngày (tùy tình trạng)'),
                details: [
                    t('services.list.engine.details.0', 'Đo áp suất buồng đốt, kiểm tra tỉ số nén động cơ.'),
                    t('services.list.engine.details.1', 'Xử lý hiện tượng rò rỉ dầu máy, hao nước làm mát.'),
                    t('services.list.engine.details.2', 'Cân chỉnh cam, khắc phục tiếng gõ động cơ lạ.'),
                    t('services.list.engine.details.3', 'Đại tu động cơ chuyên nghiệp theo tiêu chuẩn hãng.'),
                    t('services.list.engine.details.4', 'Vệ sinh kim phun, họng hút và buồng đốt bằng máy chuyên dụng.')
                ]
            },
            {
                id: 3,
                title: t('services.list.tireBrake.title', 'Dịch Vụ Lốp & Phanh'),
                desc: t('services.list.tireBrake.desc', 'Đảm bảo an toàn tối đa với dịch vụ kiểm tra lốp, cân bằng động và bảo dưỡng hệ thống phanh.'),
                icon: <Car size={18} />,
                price: t('services.list.tireBrake.price', 'Từ 400.000đ'),
                originalPrice: t('services.list.tireBrake.originalPrice', 'Từ 500.000đ'),
                discountPercentage: 20,
                promoText: t('services.list.tireBrake.promoText', 'Miễn phí cân bằng động khi thay từ 2 lốp Michelin'),
                category: 'maintenance',
                image: '/images/Vehicle Protection.png',
                duration: t('services.list.tireBrake.duration', '30 - 60 phút'),
                details: [
                    t('services.list.tireBrake.details.0', 'Cân chỉnh thước lái 3D tiên tiến nhất hiện nay.'),
                    t('services.list.tireBrake.details.1', 'Cân bằng động lốp xe triệt tiêu hiện tượng rung vô lăng.'),
                    t('services.list.tireBrake.details.2', 'Láng đĩa phanh trực tiếp không cần tháo rời.'),
                    t('services.list.tireBrake.details.3', 'Thay mới má phanh chính hãng nhập khẩu.'),
                    t('services.list.tireBrake.details.4', 'Kiểm tra toàn bộ đường ống dẫn dầu và cụm heo phanh.')
                ]
            },
            {
                id: 4,
                title: t('services.list.detailing.title', 'Chăm Sóc Nội Thất'),
                desc: t('services.list.detailing.desc', 'Làm sạch sâu, khử mùi và bảo dưỡng các bề mặt da, nhựa bên trong xe như mới.'),
                icon: <Droplets size={18} />,
                price: t('services.list.detailing.price', 'Từ 800.000đ'),
                originalPrice: t('services.list.detailing.originalPrice', 'Từ 900.000đ'),
                discountPercentage: 12,
                promoText: t('services.list.detailing.promoText', 'Tặng gói khử mùi cabin Ozon trị giá 200.000đ'),
                category: 'maintenance',
                image: '/images/Elite Detailing.png',
                duration: t('services.list.detailing.duration', '120 - 240 phút'),
                details: [
                    t('services.list.detailing.details.0', 'Dọn nội thất toàn diện, hút bụi và giặt thảm sàn.'),
                    t('services.list.detailing.details.1', 'Vệ sinh bề mặt da ghế bằng dung dịch chuyên sâu bảo vệ da.'),
                    t('services.list.detailing.details.2', 'Khử trùng hệ thống điều hòa và khử mùi ozon cabin.'),
                    t('services.list.detailing.details.3', 'Dưỡng bóng táp-lô, táp-pi cửa chống lão hóa tia UV.'),
                    t('services.list.detailing.details.4', 'Làm sạch trần nỉ và cốp sau tỉ mỉ.')
                ]
            },
            {
                id: 5,
                title: t('services.list.electronics.title', 'Chẩn Đoán Điện Tử'),
                desc: t('services.list.electronics.desc', 'Sử dụng máy quét chuyên dụng để phát hiện chính xác mọi lỗi hệ thống điện tử trên xe.'),
                icon: <Zap size={18} />,
                price: t('services.list.electronics.price', 'Từ 300.000đ'),
                originalPrice: t('services.list.electronics.originalPrice', 'Từ 350.000đ'),
                discountPercentage: 15,
                promoText: t('services.list.electronics.promoText', 'Miễn phí chẩn đoán lỗi OBD nhanh bằng máy chuyên dụng'),
                category: 'repair',
                image: '/images/Digital Diagnostics.png',
                duration: t('services.list.electronics.duration', '30 - 45 phút'),
                details: [
                    t('services.list.electronics.details.0', 'Quét toàn bộ lỗi hệ thống điện thân xe, hộp điều khiển.'),
                    t('services.list.electronics.details.1', 'Chẩn đoán lỗi cảm biến ABS, ESP, túi khí SRS.'),
                    t('services.list.electronics.details.2', 'Kiểm tra tình trạng máy phát điện, máy khởi động.'),
                    t('services.list.electronics.details.3', 'Cập nhật phần mềm hệ thống (ECU flashing) nếu có.'),
                    t('services.list.electronics.details.4', 'Xóa các mã lỗi ảo phát sinh do sụt điện.')
                ]
            },
            {
                id: 6,
                title: t('services.list.rescue.title', 'Cứu Hộ 24/7'),
                desc: t('services.list.rescue.desc', 'Hỗ trợ khẩn cấp mọi lúc, mọi nơi khi xe gặp sự cố bất ngờ trên đường.'),
                icon: <Zap size={18} />,
                price: t('services.list.rescue.price', 'Liên hệ'),
                originalPrice: '',
                promoText: t('services.list.rescue.promoText', 'Hỗ trợ khẩn cấp 24/7 toàn khu vực nội thành'),
                category: 'repair',
                image: '/images/Performance Tuning.png',
                duration: t('services.list.rescue.duration', 'Phản hồi trong 15 - 30 phút'),
                details: [
                    t('services.list.rescue.details.0', 'Hỗ trợ kích nổ ắc quy tại chỗ nhanh chóng.'),
                    t('services.list.rescue.details.1', 'Hỗ trợ thay lốp dự phòng khẩn cấp.'),
                    t('services.list.rescue.details.2', 'Cung cấp nhiên liệu khẩn cấp trên đường.'),
                    t('services.list.rescue.details.3', 'Xe cẩu kéo chuyên dụng đưa về trung tâm gần nhất.'),
                    t('services.list.rescue.details.4', 'Đội ngũ cứu hộ túc trực sẵn sàng 24 giờ mỗi ngày.')
                ]
            }
        ];

    const filteredServices = services.filter(service => {
        const matchesCategory = activeTab === 'all' || service.category === activeTab;
        const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredServices.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);

    const handleBookNow = (serviceId: number) => {
        navigate(`/phone-service?serviceId=${serviceId}`);
    };

    const handleBookCombo = (comboId: number) => {
        navigate(`/phone-service?comboId=${comboId}`);
    };

    return (
        <div className="bg-white text-left">
            {/* ── HERO ─────────────────────────────────────────── */}
            <section className="relative h-[240px] md:h-[600px] flex items-center overflow-hidden" style={{ backgroundColor: COLORS.navy }}>
                <div className="absolute inset-0">
                    <img src="/images/div.w-full.png" alt="Service Workshop" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0" style={{ backgroundColor: `${COLORS.navy}66` }} />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 w-full">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl text-center md:text-left">
                        <h1 className="text-3xl md:text-6xl font-bold font-display text-white mb-2 md:mb-6 leading-tight">
                            {t('services.heroTitle', 'Dịch vụ chuyên nghiệp')}
                        </h1>
                        <p className="hidden md:block text-lg text-white/90 max-w-xl mb-12 leading-relaxed">
                            {t('services.heroDesc', 'Nâng tầm trải nghiệm bảo dưỡng xe với đội ngũ kỹ thuật viên tay nghề cao và công nghệ chẩn đoán tiên tiến nhất. Chúng tôi cam kết mang lại sự an toàn tuyệt đối cho mọi hành trình của bạn.')}
                        </p>

                        <div className="hidden md:flex flex-wrap gap-4">
                            <Button
                                to="/phone-service"
                                size="md"
                                bg={COLORS.orange}
                                color={COLORS.navy}
                                icon={null}
                                className="uppercase text-sm rounded-md font-bold"
                            >
                                {t('nav.booking', 'Đặt lịch ngay')}
                            </Button>

                            <Button
                                size="md"
                                bg="transparent"
                                color={COLORS.white}
                                icon={null}
                                className="uppercase text-sm rounded-md font-bold"
                                style={{ border: `1px solid ${COLORS.white}` }}
                                onClick={() => {
                                    window.open('tel:19001234');
                                }}
                            >
                                {t('services.emergencyConsult', 'Tư vấn nhanh')}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── SERVICES LIST ─────────────────────────────────── */}
            <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F8FAFC' }}>
                {/* Header Row: Title on Left with Accent Line, Search on Right with premium focus hover states */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-200/60 pb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[#F9A11B] to-[#00285E]" />
                        <div>
                            <span className="font-bold text-[10px] md:text-xs tracking-widest uppercase mb-1 block" style={{ color: COLORS.orange }}>
                                {t('services.forYourCar', 'DÀNH CHO XE CỦA BẠN')}
                            </span>
                            <h2 className="text-2xl md:text-4xl font-bold font-display text-brand-blue">
                                {t('services.catalogTitle', 'Danh mục dịch vụ')}
                            </h2>
                        </div>
                    </div>

                    {/* Premium Search Input */}
                    <div className="relative w-full md:max-w-md group">
                        <input
                            type="text"
                            placeholder={t('services.searchPlaceholder', 'Tìm kiếm dịch vụ bảo dưỡng...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 bg-slate-50/50 text-sm text-brand-blue placeholder-gray-400 focus:outline-none focus:border-[#F9A11B] focus:bg-white focus:ring-4 focus:ring-[#F9A11B]/10 shadow-xs hover:border-gray-300 transition-all duration-300"
                        />
                        <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isSearchFocused ? 'text-[#F9A11B]' : 'text-gray-400'}`} />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="p-1 hover:bg-gray-100 rounded-full absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Row: Premium Horizontal Categories slider with indicator trượt & dynamic icons */}
                <div className="relative w-full mb-10">
                    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-none pb-2 pt-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                        {categories.map((cat) => {
                            const isActive = activeTab === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`relative px-4 py-2.5 rounded-2xl font-bold text-xs md:text-sm transition-colors duration-300 flex items-center gap-2 z-10 shrink-0 select-none ${isActive
                                            ? 'text-white'
                                            : 'text-brand-blue/70 bg-white border border-gray-200/80 hover:border-brand-blue/30 hover:bg-brand-blue/5'
                                        }`}
                                >
                                    {getCategoryIcon(cat.label)}
                                    <span>{cat.label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeCategoryBg"
                                            className="absolute inset-0 bg-[#00285E] rounded-2xl -z-10 shadow-md shadow-blue-900/15"
                                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {filteredServices.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center max-w-lg mx-auto"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100 shadow-inner">
                            <Search className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-brand-blue mb-1">{t('services.noResults', 'Không tìm thấy kết quả')}</h3>
                        <p className="text-xs text-gray-400 max-w-xs leading-relaxed px-4 text-center">
                            {t('services.noResultsDesc', 'Không tìm thấy dịch vụ nào phù hợp với từ khóa "{{query}}". Vui lòng thử từ khóa khác hoặc thiết lập lại bộ lọc.', { query: searchQuery })}
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
                            className="mt-6 px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-blue/90 transition-all cursor-pointer"
                        >
                            {t('services.resetFilters', 'Thiết lập lại bộ lọc')}
                        </button>
                    </motion.div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                            {currentItems.map((service) => {
                                const isRescue = service.title.toLowerCase().includes("cứu hộ");
                                return (
                                    <motion.div
                                        layout
                                        key={service.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -6, boxShadow: '0 15px 30px rgba(10,35,87,0.12)', borderColor: 'rgba(10,35,87,0.2)' }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-200/80 flex flex-col cursor-pointer"
                                        onClick={() => setSelectedService(service)}
                                    >
                                        <div className="relative aspect-[16/11] overflow-hidden bg-slate-950">
                                            <img src={service.image} alt={service.title} className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" />
                                            {service.discountPercentage && (
                                                <div className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow-md z-10">
                                                    {t('services.discountLabel', 'Giảm {{percent}}%', { percent: service.discountPercentage })}
                                                </div>
                                            )}
                                            <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md text-white text-[11px] font-bold shadow-md"
                                                style={{ backgroundColor: `${COLORS.navy}F0` }}>
                                                {service.price}
                                            </div>
                                        </div>

                                        <div className="p-4 md:p-5 flex-grow flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-brand-blue bg-blue-50 p-1.5 rounded-lg shrink-0 [&>svg]:w-4 [&>svg]:h-4">{service.icon}</span>
                                                    <h3 className="text-sm font-extrabold text-brand-blue line-clamp-1">{service.title}</h3>
                                                </div>
                                                <p className="text-[11px] text-gray-500 leading-normal mb-3 flex-grow line-clamp-2">
                                                    {service.desc}
                                                </p>

                                                {/* Price & Promo Info */}
                                                <div className="mb-4 py-2 px-3 bg-slate-50 rounded-xl border border-gray-100 flex flex-col gap-1 text-left">
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                            {service.originalPrice ? t('services.originalPriceLabel', 'Giá gốc:') : ''}
                                                        </span>
                                                        <div className="flex items-baseline gap-1.5">
                                                            {service.originalPrice && (
                                                                <span className="text-[10px] text-gray-400 line-through font-medium">
                                                                    {service.originalPrice}
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-black text-brand-blue">
                                                                {service.price}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {service.promoText && (
                                                        <div className="flex items-start gap-1 text-[10px] text-amber-700 font-semibold bg-amber-50/50 p-1 rounded-lg border border-amber-100/50">
                                                            <span className="inline-block shrink-0">🎁</span>
                                                            <span className="line-clamp-2 leading-tight">
                                                                {service.promoText}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-auto">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedService(service); }}
                                                    className="flex-1 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 font-bold text-[11px] rounded-xl transition-all"
                                                >
                                                    {t('common.details', 'Chi tiết')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleBookNow(service.id); }}
                                                    className="flex-1 py-1.5 bg-brand-blue text-white hover:bg-brand-blue/90 font-bold text-[11px] rounded-xl transition-all shadow-sm"
                                                >
                                                    {isRescue ? t('services.callRescue', 'Gọi cứu hộ') : t('services.bookService', 'Đặt dịch vụ')}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-1.5 mt-12">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${currentPage === 1
                                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('common.prev', 'Trước')}
                                </button>
                                {Array.from({ length: totalPages }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    return (
                                        <button
                                            key={pageNumber}
                                            onClick={() => setCurrentPage(pageNumber)}
                                            className={`w-8 h-8 rounded-xl text-[11px] font-bold transition-all ${currentPage === pageNumber
                                                    ? 'bg-brand-blue text-white shadow-md shadow-blue-900/10'
                                                    : 'bg-white text-brand-blue border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNumber}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${currentPage === totalPages
                                            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
                                            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('common.next', 'Sau')}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>

            {/* ── SERVICE COMBOS ─────────────────────────────────── */}
            <section className="py-20 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="text-center mb-16">
                    <span className="font-bold text-sm tracking-widest uppercase mb-4 block" style={{ color: COLORS.orange }}>
                        {t('services.comboSubtitle', 'TIẾT KIỆM HƠN CHO BẠN')}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold font-display text-[#00285E]">
                        {t('services.comboTitle', 'Gói Combo Dịch vụ')}
                    </h2>
                    <p className="text-slate-500 text-sm mt-3 max-w-xl mx-auto font-medium">
                        Tích hợp các gói chăm sóc, bảo dưỡng định kỳ xe ô tô chuyên nghiệp với chi phí ưu đãi tốt nhất.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {combos.filter(c => c.is_active).map((combo) => {
                        const { totalOriginal, discounted } = calculateComboPrices(combo.service_ids, combo.discount_percentage);
                        return (
                            <motion.div
                                key={combo.id}
                                whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(10,35,87,0.12)' }}
                                className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/60 shadow-xs flex flex-col justify-between relative overflow-hidden"
                            >
                                {/* Discount badge */}
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-md">
                                    Giảm {combo.discount_percentage}%
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F9A11B] bg-amber-50 border border-amber-100/50 px-2.5 py-1 rounded-md inline-block">
                                            Gói Đặc Biệt
                                        </span>
                                        <h3 className="text-lg md:text-xl font-bold text-[#00285E] line-clamp-1">{combo.combo_name}</h3>
                                    </div>

                                    {/* Included services list */}
                                    <div className="space-y-3 pt-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block text-left">Dịch vụ đi kèm:</span>
                                        <div className="space-y-2">
                                            {combo.service_ids.map((id) => {
                                                const s = services.find(srv => srv.id === id);
                                                const sName = s?.title || "Dịch vụ của gara";
                                                return (
                                                    <div key={id} className="flex items-start gap-2.5 text-xs text-slate-600 font-semibold text-left">
                                                        <span className="text-emerald-500 shrink-0 mt-0.5">✓</span>
                                                        <span>{sName}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Price & Button */}
                                <div className="pt-8 mt-6 border-t border-slate-100 space-y-4">
                                    <div className="flex justify-between items-baseline">
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giá gốc</span>
                                            <span className="text-xs text-slate-400 line-through font-bold">{totalOriginal.toLocaleString("vi-VN")}đ</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Giá Combo</span>
                                            <span className="text-lg font-black text-[#00285E]">{discounted.toLocaleString("vi-VN")}đ</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleBookCombo(combo.id)}
                                        className="w-full py-3 bg-[#00285E] text-white hover:bg-[#00285E]/95 font-bold text-xs rounded-xl transition-all shadow-md shadow-[#00285E]/10 tracking-wider uppercase text-center block"
                                    >
                                        Đặt lịch combo
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* ── WHY CHOOSE US ─────────────────────────────────── */}
            <section className="py-32" style={{ backgroundColor: '#EDF3FF' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold font-display mb-10 relative inline-block" style={{ color: COLORS.navy }}>
                        {t('services.whyChooseUsTitle', 'Tại sao chọn AGM Intelligent?')}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full"
                            style={{ backgroundColor: COLORS.navy }} />
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mt-10 md:mt-24">
                        {[
                            { title: t('services.whyChooseUs.techs.title', 'Kỹ thuật viên'), desc: t('services.whyChooseUs.techs.desc', 'Đội ngũ chuyên gia được đào tạo bài bản và giàu kinh nghiệm thực tế.'), icon: <UserCheck size={32} /> },
                            { title: t('services.whyChooseUs.parts.title', 'Phụ tùng chính hãng'), desc: t('services.whyChooseUs.parts.desc', 'Cam kết sử dụng 100% linh kiện chính hãng, rõ ràng nguồn gốc xuất xứ.'), icon: <Package size={32} /> },
                            { title: t('services.whyChooseUs.pricing.title', 'Giá cả minh bạch'), desc: t('services.whyChooseUs.pricing.desc', 'Báo giá chi tiết trước khi thực hiện, không phát sinh chi phí ẩn.'), icon: <Wallet size={32} /> },
                            { title: t('services.whyChooseUs.warranty.title', 'Bảo hành dài hạn'), desc: t('services.whyChooseUs.warranty.desc', 'Chính sách bảo hành uy tín cho mọi hạng mục sửa chữa và phụ tùng.'), icon: <ShieldCheck size={32} /> },
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -6, scale: 1.03, boxShadow: '0 16px 32px rgba(10,35,87,0.12)' }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                                className="bg-white p-4 md:p-12 rounded-2xl shadow-sm border border-transparent cursor-pointer flex flex-col justify-between"
                            >
                                <motion.div
                                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                                    transition={{ duration: 0.4 }}
                                    className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4 md:mb-10 [&>svg]:w-5 [&>svg]:h-5 md:[&>svg]:w-8 md:[&>svg]:h-8"
                                    style={{ color: COLORS.navy }}
                                >
                                    {item.icon}
                                </motion.div>
                                <h4 className="text-xs md:text-xl font-bold mb-2 md:mb-4 line-clamp-1 md:line-clamp-none" style={{ color: COLORS.navy }}>{item.title}</h4>
                                <p className="text-[10px] md:text-sm leading-normal md:leading-relaxed font-medium line-clamp-2 md:line-clamp-none" style={{ color: `${COLORS.navy}80` }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────── */}
            <section className="py-40 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold font-display mb-20 text-center uppercase tracking-tighter"
                    style={{ color: COLORS.navy }}>
                    {t('services.faqTitle', 'Câu Hỏi Thường Gặp')}
                </h2>
                <div className="space-y-6">
                    {[
                        t('services.faq.q1', 'Thời gian bảo dưỡng định kỳ mất bao lâu?'),
                        t('services.faq.q2', 'Tôi có cần đặt lịch trước không?'),
                        t('services.faq.q3', 'AGM Intelligent có hỗ trợ xe mượn khi sửa chữa lâu không?')
                    ].map((q, i) => (
                        <div key={i} className="bg-[#F8FAFC] border border-gray-100 rounded-lg overflow-hidden">
                            <motion.button
                                whileHover={{ backgroundColor: `${COLORS.navy}08` }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full p-8 text-left flex justify-between items-center group transition-colors"
                            >
                                <span className="font-bold text-base" style={{ color: `${COLORS.navy}CC` }}>{q}</span>
                                <Plus size={20} style={{ color: COLORS.navy }} className="group-hover:rotate-45 transition-transform" />
                            </motion.button>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── SERVICE DETAIL MODAL ──────────────────────────── */}
            <AnimatePresence>
                {selectedService && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedService(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                        />

                        {/* Modal content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', duration: 0.5 }}
                            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 max-w-2xl w-full relative z-10 text-left flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header Image */}
                            <div className="relative h-48 md:h-64 bg-slate-950 shrink-0">
                                <img src={selectedService.image} alt={selectedService.title} className="w-full h-full object-cover opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                                <button
                                    onClick={() => setSelectedService(null)}
                                    className="absolute top-4 right-4 p-2 bg-slate-950/60 hover:bg-slate-950/80 text-white rounded-full transition-colors border border-white/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                <div className="absolute bottom-4 left-6 right-6 text-white">
                                    <span className="px-2.5 py-1 bg-brand-orange text-brand-blue font-bold text-[10px] rounded-md tracking-wider uppercase inline-block mb-2">
                                        {selectedService.category === 'maintenance'
                                            ? t('services.categories.maintenance', 'BẢO DƯỠNG')
                                            : t('services.categories.repair', 'SỬA CHỮA')}
                                    </span>
                                    <h3 className="text-xl md:text-2xl font-bold font-display">{selectedService.title}</h3>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-grow">
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg text-brand-blue">
                                        <Clock className="w-4 h-4 text-brand-blue" />
                                        <span>{t('services.modal.duration', 'Thời gian: {{duration}}', { duration: selectedService.duration || '60 - 90 phút' })}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg text-amber-800 border border-amber-100/50">
                                        <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span className="text-amber-900">{t('services.modal.priceLabel', 'Giá dự kiến:')}</span>
                                        {selectedService.originalPrice && (
                                            <span className="text-amber-700/60 line-through font-medium">{selectedService.originalPrice}</span>
                                        )}
                                        <span className="text-amber-950 font-extrabold">{selectedService.price}</span>
                                        {selectedService.discountPercentage && (
                                            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 font-extrabold text-[10px] rounded-md uppercase">
                                                {t('services.discountLabel', 'Giảm {{percent}}%', { percent: selectedService.discountPercentage })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {selectedService.promoText && (
                                    <div className="flex items-start gap-3 bg-amber-50/40 p-4 rounded-2xl border border-amber-100/30 text-xs text-amber-900 leading-relaxed text-left">
                                        <span className="text-lg shrink-0 mt-0.5">🎁</span>
                                        <div>
                                            <h5 className="font-bold text-amber-950 mb-0.5">{t('services.promoBadge', 'Khuyến mãi')}</h5>
                                            <p className="font-medium text-amber-800/90">{selectedService.promoText}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-brand-blue uppercase tracking-wider">{t('services.modal.descriptionLabel', 'Mô tả dịch vụ')}</h4>
                                    <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
                                        {selectedService.desc}
                                    </p>
                                </div>

                                {selectedService.details && selectedService.details.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-brand-blue uppercase tracking-wider">{t('services.modal.itemsLabel', 'Các hạng mục công việc')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                                            {selectedService.details.map((detail, index) => (
                                                <div key={index} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                    <span className="w-1.5 h-1.5 bg-brand-orange rounded-full shrink-0 mt-1.5" />
                                                    <span>{detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-50 text-[11px] text-gray-500 leading-relaxed">
                                    <ShieldCheck className="w-5 h-5 text-brand-blue shrink-0" />
                                    <span>{t('services.modal.guarantee', 'Tất cả dịch vụ được thực hiện bởi kỹ thuật viên tay nghề cao và bảo hành chính hãng tối thiểu 6 tháng tại hệ thống AGM Intelligent.')}</span>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setSelectedService(null)}
                                    className="flex-1 py-3 border border-gray-200 text-gray-600 hover:bg-gray-100 font-bold text-xs rounded-xl transition-all"
                                >
                                    {t('history.close', 'Đóng')}
                                </button>
                                <button
                                    onClick={() => {
                                        const id = selectedService.id;
                                        setSelectedService(null);
                                        handleBookNow(id);
                                    }}
                                    className="flex-1 py-3 bg-brand-blue hover:bg-brand-blue/90 text-white font-bold text-xs rounded-xl transition-all shadow-md text-center"
                                >
                                    {t('nav.booking', 'Đặt lịch ngay')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}