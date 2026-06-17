import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  Pencil,
  X,
  Award,
  Download,
  AlertTriangle,
  Search,
  CheckCircle,
  TrendingUp,
  Mail,
  Phone,
  Calendar,
  Car,
  Clock,
  ShieldAlert,
  Coins,
  Eye,
  Sparkles,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { useOutletContext } from "react-router-dom";

type CustomerStatus = "ACTIVE" | "INACTIVE" | "BANNED";
type MembershipTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

interface CustomerVehicle {
  id: number;
  model: string;
  plateNumber: string;
  color: string;
}

interface CustomerAppointment {
  id: number;
  date: string;
  category: string;
  notes: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED";
  cost: number;
}

interface BehaviorPrediction {
  frequentViews: { serviceName: string; count: number }[];
  lastViewedDate: string;
  conversionProbability: number; // 0 to 100
  recommendedService: string;
  salesTip: string;
}

interface ChatLog {
  id: number;
  date: string;
  platform: "WEBSITE" | "FACEBOOK" | "ZALO" | "TELEGRAM" | "PHONE";
  summary: string;
  lastMessage: string;
}

interface UsedPart {
  id: number;
  partName: string;
  vehicleModel: string;
  vehiclePlate: string;
  installDate: string;
  quantity: string;
  warrantyMonths: number; // 0 means no warranty
  expiryDate: string; // YYYY-MM-DD
  appointmentId: number;
}

interface CustomerData {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  membership_tier: MembershipTier;
  loyalty_points: number;
  status: CustomerStatus;
  createdAt: string;
  avatar: string;
  vehicles: CustomerVehicle[];
  appointments: CustomerAppointment[];
  prediction: BehaviorPrediction;
  chatHistory: ChatLog[];
  usedParts: UsedPart[];
}

const TIER_CONFIG: Record<MembershipTier, { label: string; color: string; bg: string; border: string; iconColor: string }> = {
  BRONZE: { label: "Đồng", color: "text-[#B87333]", bg: "bg-[#B87333]/10", border: "border-[#B87333]/20", iconColor: "#B87333" },
  SILVER: { label: "Bạc", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", iconColor: "#94A3B8" },
  GOLD: { label: "Vàng", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", iconColor: "#F59E0B" },
  PLATINUM: { label: "Bạch Kim", color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20", iconColor: "#2DD4BF" },
};

const STATUS_CONFIG: Record<CustomerStatus, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Đang hoạt động", bg: "bg-emerald-50 text-emerald-600 border border-emerald-100", text: "text-emerald-600" },
  INACTIVE: { label: "Tạm khóa", bg: "bg-amber-50 text-amber-600 border border-amber-100", text: "text-amber-600" },
  BANNED: { label: "Bị cấm", bg: "bg-rose-50 text-rose-600 border border-rose-100", text: "text-rose-600" }
};

// Initial realistic mock database
const INITIAL_CUSTOMERS: CustomerData[] = [
  {
    id: 1,
    fullName: "Phạm Văn A",
    phoneNumber: "0888888888",
    email: "customer.a@gmail.com",
    membership_tier: "GOLD",
    loyalty_points: 1250,
    status: "ACTIVE",
    createdAt: "2025-10-12",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    vehicles: [
      { id: 101, model: "Mazda 3", plateNumber: "30A-567.89", color: "Đỏ Pha Lê" },
      { id: 102, model: "Kia Seltos", plateNumber: "30G-123.45", color: "Trắng" }
    ],
    appointments: [
      { id: 1001, date: "2026-05-18", category: "Bảo dưỡng định kỳ", notes: "Thay nhớt động cơ và lọc gió", status: "COMPLETED", cost: 1250000 },
      { id: 1002, date: "2026-05-24", category: "Chăm sóc & Làm sạch xe", notes: "Phủ ceramic cao cấp toàn bộ thân xe", status: "COMPLETED", cost: 8500000 }
    ],
    prediction: {
      frequentViews: [
        { serviceName: "Phủ Ceramic Pro", count: 12 },
        { serviceName: "Đánh bóng sơn xe 3 bước", count: 7 },
        { serviceName: "Vệ sinh khoang động cơ", count: 4 }
      ],
      lastViewedDate: "2026-06-01 18:45",
      conversionProbability: 85,
      recommendedService: "Combo Phủ Ceramic Nano X9 & Dưỡng Nhựa Nội Thất",
      salesTip: "Khách hàng rất yêu xe Mazda 3 màu đỏ pha lê mới mua, cực kỳ chú trọng ngoại thất bóng bảy. Sale nên gọi điện thoại tư vấn gói phủ bảo vệ định kỳ trước mùa mưa, có thể áp dụng thẻ vàng VIP để giảm giá 10%."
    },
    chatHistory: [
      {
        id: 1,
        date: "2026-05-28 10:15",
        platform: "FACEBOOK",
        summary: "Hỏi giá và chương trình khuyến mãi phủ Ceramic",
        lastMessage: "Khách hàng: \"Gói phủ Ceramic Pro bên em bảo hành mấy năm thế? Có được tặng dọn nội thất không?\""
      },
      {
        id: 2,
        date: "2026-05-29 14:30",
        platform: "WEBSITE",
        summary: "Tìm hiểu thông số độ cứng Ceramic 9H",
        lastMessage: "Hệ thống: \"Chào anh, lớp phủ Ceramic bên em đạt độ cứng chuẩn 9H trên thang Mohs, cam kết chống trầy xước nhẹ cực tốt.\""
      },
      {
        id: 3,
        date: "2026-05-30 09:00",
        platform: "PHONE",
        summary: "Đặt hẹn mang xe qua Gara kiểm tra bề mặt sơn",
        lastMessage: "Sale (Ghi chú): \"Khách gọi hotline xác nhận lịch hẹn 9h sáng chủ nhật qua đo độ dày sơn xe trước khi phủ.\""
      }
    ],
    usedParts: [
      {
        id: 10001,
        partName: "Lọc gió động cơ Mazda 3 chính hãng",
        vehicleModel: "Mazda 3",
        vehiclePlate: "30A-567.89",
        installDate: "2026-05-18",
        quantity: "1 chiếc",
        warrantyMonths: 3,
        expiryDate: "2026-08-18",
        appointmentId: 1001
      },
      {
        id: 10002,
        partName: "Dầu động cơ Castrol Edge 5W-30",
        vehicleModel: "Mazda 3",
        vehiclePlate: "30A-567.89",
        installDate: "2026-05-18",
        quantity: "4 lít",
        warrantyMonths: 0,
        expiryDate: "2026-05-18",
        appointmentId: 1001
      },
      {
        id: 10003,
        partName: "Lớp phủ Ceramic bóng Pro 9H",
        vehicleModel: "Mazda 3",
        vehiclePlate: "30A-567.89",
        installDate: "2026-05-24",
        quantity: "1 gói",
        warrantyMonths: 24,
        expiryDate: "2028-05-24",
        appointmentId: 1002
      }
    ]
  },
  {
    id: 2,
    fullName: "Nguyễn Thị Bình",
    phoneNumber: "0912345678",
    email: "binh.nguyen@gmail.com",
    membership_tier: "SILVER",
    loyalty_points: 480,
    status: "ACTIVE",
    createdAt: "2026-01-20",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    vehicles: [
      { id: 201, model: "Hyundai Accent", plateNumber: "30E-888.12", color: "Đen" }
    ],
    appointments: [
      { id: 2001, date: "2026-05-10", category: "Sửa chữa hệ thống phanh", notes: "Láng đĩa phanh và thay má phanh trước", status: "COMPLETED", cost: 1800000 },
      { id: 2002, date: "2026-06-03", category: "Bảo dưỡng định kỳ", notes: "Kiểm tra tổng quát chuẩn bị đi xa", status: "PENDING", cost: 600000 }
    ],
    prediction: {
      frequentViews: [
        { serviceName: "Bảo dưỡng hệ thống phanh", count: 9 },
        { serviceName: "Cân chỉnh độ chụm thước lái 3D", count: 5 },
        { serviceName: "Thay dầu động cơ Castrol", count: 3 }
      ],
      lastViewedDate: "2026-05-31 21:10",
      conversionProbability: 70,
      recommendedService: "Combo Cân mâm bấm chì & Căn chỉnh thước lái 3D Hunter",
      salesTip: "Khách hàng di chuyển đường dài thường xuyên nên rất chú trọng đến độ êm ái, an toàn hệ thống gầm lái. Nên nhắn Zalo chào gói kiểm tra gầm miễn phí."
    },
    chatHistory: [
      {
        id: 11,
        date: "2026-05-25 16:20",
        platform: "ZALO",
        summary: "Hỏi giá má phanh trước Hyundai Accent chính hãng",
        lastMessage: "Khách hàng: \"Báo giá cho chị má phanh trước Accent 2021 nhé, hàng Mobis Hàn Quốc hay loại nào em nhỉ?\""
      },
      {
        id: 12,
        date: "2026-05-26 08:45",
        platform: "WEBSITE",
        summary: "Tư vấn chính sách bảo hành phụ tùng phanh xe",
        lastMessage: "Hệ thống: \"Chào chị, má phanh chính hãng lắp đặt tại AGM được bảo hành 6 tháng hoặc 10.000 km tùy điều kiện nào đến trước ạ.\""
      }
    ],
    usedParts: [
      {
        id: 20001,
        partName: "Má phanh trước Mobis Hàn Quốc",
        vehicleModel: "Hyundai Accent",
        vehiclePlate: "30E-888.12",
        installDate: "2026-05-10",
        quantity: "1 bộ",
        warrantyMonths: 6,
        expiryDate: "2026-11-10",
        appointmentId: 2001
      },
      {
        id: 20002,
        partName: "Đĩa phanh đúc thông gió Brembo chính hãng",
        vehicleModel: "Hyundai Accent",
        vehiclePlate: "30E-888.12",
        installDate: "2026-05-10",
        quantity: "2 chiếc",
        warrantyMonths: 12,
        expiryDate: "2027-05-10",
        appointmentId: 2001
      }
    ]
  },
  {
    id: 3,
    fullName: "Trần Văn Cường",
    phoneNumber: "0987654321",
    email: "cuong.tran@gmail.com",
    membership_tier: "PLATINUM",
    loyalty_points: 3500,
    status: "ACTIVE",
    createdAt: "2025-05-08",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    vehicles: [
      { id: 301, model: "Mercedes-Benz C200", plateNumber: "30F-999.99", color: "Trắng" },
      { id: 302, model: "Ford Ranger Wildtrak", plateNumber: "29C-456.78", color: "Cam" }
    ],
    appointments: [
      { id: 3001, date: "2026-04-15", category: "Sửa chữa hệ thống treo", notes: "Thay cao su tăm bu và giảm xóc sau", status: "COMPLETED", cost: 12400000 },
      { id: 3002, date: "2026-05-29", category: "Thay lốp chuyên nghiệp", notes: "Thay 4 lốp Michelin Pilot Sport 4", status: "COMPLETED", cost: 16800000 }
    ],
    prediction: {
      frequentViews: [
        { serviceName: "Phủ bóng gầm chống sét cao cấp", count: 15 },
        { serviceName: "Đồ chơi xe bán tải Ford Ranger", count: 11 },
        { serviceName: "Thay nhớt cao cấp Mobil 1 Gold", count: 8 }
      ],
      lastViewedDate: "2026-06-01 11:20",
      conversionProbability: 90,
      recommendedService: "Xịt phủ gầm chống rỉ sét gốc cao su non LIQUI MOLY",
      salesTip: "Khách VIP, sở hữu Mercedes và bán tải Ranger độ nhiều đồ chơi, ngân sách lớn và chỉ thích dùng sản phẩm cao cấp chính hãng. Nên tiếp cận qua Zalo bằng cách gửi ảnh các xe bán tải đã xịt phủ gầm cực kỳ gọn gàng tại gara để kích thích nhu cầu."
    },
    chatHistory: [
      {
        id: 21,
        date: "2026-05-20 11:15",
        platform: "ZALO",
        summary: "Hỏi thông số lốp Michelin Pilot Sport 4 cho bán tải",
        lastMessage: "Khách hàng: \"Bên em có sẵn cỡ lốp Ranger Wildtrak không? Báo giá Zalo sớm để anh sắp xếp đánh xe qua thay luôn.\""
      },
      {
        id: 22,
        date: "2026-05-22 09:30",
        platform: "PHONE",
        summary: "Gọi điện chốt báo giá và nhận cọc chuyển khoản thay lốp",
        lastMessage: "Sale (Ghi chú): \"Khách đã chuyển khoản đặt cọc 2 triệu đồng mua lốp Michelin. Lịch hẹn thi công vào thứ 6 tuần này.\""
      }
    ],
    usedParts: [
      {
        id: 30001,
        partName: "Giảm xóc khí nén Sachs sau",
        vehicleModel: "Mercedes-Benz C200",
        vehiclePlate: "30F-999.99",
        installDate: "2026-04-15",
        quantity: "2 chiếc",
        warrantyMonths: 12,
        expiryDate: "2027-04-15",
        appointmentId: 3001
      },
      {
        id: 30002,
        partName: "Lốp xe Michelin Pilot Sport 4 SUV",
        vehicleModel: "Ford Ranger Wildtrak",
        vehiclePlate: "29C-456.78",
        installDate: "2026-05-29",
        quantity: "4 quả",
        warrantyMonths: 36,
        expiryDate: "2029-05-29",
        appointmentId: 3002
      },
      {
        id: 30003,
        partName: "Bugi Denso Iridium cao cấp",
        vehicleModel: "Mercedes-Benz C200",
        vehiclePlate: "30F-999.99",
        installDate: "2025-06-05",
        quantity: "4 chiếc",
        warrantyMonths: 6,
        expiryDate: "2025-12-05",
        appointmentId: 3001
      }
    ]
  },
  {
    id: 4,
    fullName: "Lê Thị Dung",
    phoneNumber: "0905556666",
    email: "dung.le@gmail.com",
    membership_tier: "BRONZE",
    loyalty_points: 150,
    status: "ACTIVE",
    createdAt: "2026-04-05",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    vehicles: [
      { id: 401, model: "Honda City", plateNumber: "30H-234.56", color: "Xanh Đậm" }
    ],
    appointments: [
      { id: 4001, date: "2026-04-10", category: "Vệ sinh giàn lạnh", notes: "Khử mùi điều hòa nội thất", status: "COMPLETED", cost: 950000 }
    ],
    prediction: {
      frequentViews: [
        { serviceName: "Khử trùng diệt khuẩn nội thất", count: 6 },
        { serviceName: "Vệ sinh nội thất chuyên sâu", count: 4 },
        { serviceName: "Lọc gió điều hòa carbon", count: 3 }
      ],
      lastViewedDate: "2026-05-30 15:40",
      conversionProbability: 65,
      recommendedService: "Gói Dọn Vệ Sinh Nội Thất Toàn Diện & Khử Trùng Ozone",
      salesTip: "Khách hàng có con nhỏ hay bị dị ứng phấn hoa, bụi bẩn trên xe. Rất chú trọng vệ sinh cabin sạch sẽ không mùi hôi. Tư vấn nhấn mạnh công nghệ Ozone diệt khuẩn không hóa chất độc hại sẽ dễ chốt."
    },
    chatHistory: [
      {
        id: 31,
        date: "2026-04-09 13:40",
        platform: "WEBSITE",
        summary: "Tư vấn công nghệ vệ sinh giàn lạnh nội soi không tháo taplo",
        lastMessage: "Khách hàng: \"Vệ sinh giàn lạnh nội soi này có phải tháo tung taplo ra không em? Chị sợ tháo ra lắp lại bị lỏng lẻo kêu rè rè lắm.\""
      },
      {
        id: 32,
        date: "2026-04-10 10:15",
        platform: "FACEBOOK",
        summary: "Đặt hẹn lọc gió điều hòa cabin Honda City",
        lastMessage: "Khách hàng: \"Ok thế thay luôn cho chị lọc gió cabin mới nhé. Chiều chị đánh xe qua làm cả hai.\""
      }
    ],
    usedParts: [
      {
        id: 40001,
        partName: "Lọc gió điều hòa Carbon hoạt tính OEM",
        vehicleModel: "Honda City",
        vehiclePlate: "30H-234.56",
        installDate: "2026-04-10",
        quantity: "1 chiếc",
        warrantyMonths: 3,
        expiryDate: "2026-07-10",
        appointmentId: 4001
      }
    ]
  },
  {
    id: 5,
    fullName: "Hoàng Văn Em",
    phoneNumber: "0933444555",
    email: "em.hoang@gmail.com",
    membership_tier: "BRONZE",
    loyalty_points: 0,
    status: "INACTIVE",
    createdAt: "2026-05-28",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
    vehicles: [],
    appointments: [],
    prediction: {
      frequentViews: [
        { serviceName: "Dịch vụ cứu hộ 24/7 khẩn cấp", count: 4 },
        { serviceName: "Cứu hộ ắc quy lưu động", count: 2 }
      ],
      lastViewedDate: "2026-05-28 09:20",
      conversionProbability: 40,
      recommendedService: "Gói bảo hiểm liên kết cứu hộ AGM SOS năm 2026",
      salesTip: "Tài khoản mới tạo khi tìm hiểu thông tin cứu hộ dọc đường cao tốc. Nên nhắn tin giới thiệu tổng đài cứu hộ miễn phí của gara và tặng voucher giảm giá 15% cho lần sửa chữa đầu tiên."
    },
    chatHistory: [
      {
        id: 41,
        date: "2026-05-28 09:12",
        platform: "WEBSITE",
        summary: "Hỏi giá kéo xe cứu hộ từ Trạm thu phí Pháp Vân về Gara",
        lastMessage: "Khách hàng: \"Cho hỏi chi phí kéo xe 5 chỗ số tự động bị chết máy từ Pháp Vân về Gara bên mình giá bao nhiêu thế em?\""
      }
    ],
    usedParts: []
  },
  {
    id: 6,
    fullName: "Vũ Thị Hương",
    phoneNumber: "0977888999",
    email: "huong.vu@gmail.com",
    membership_tier: "GOLD",
    loyalty_points: 820,
    status: "BANNED",
    createdAt: "2025-12-01",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    vehicles: [
      { id: 601, model: "VinFast VF8", plateNumber: "30K-987.65", color: "Xanh lá cực đẹp" }
    ],
    appointments: [
      { id: 6001, date: "2026-03-20", category: "Sửa chữa hệ thống điện", notes: "Kiểm tra lỗi sạc pin", status: "COMPLETED", cost: 0 },
      { id: 6002, date: "2026-04-01", category: "Đánh bóng xe chuyên sâu", notes: "Nghi ngờ gian lận thông tin thanh toán bảo hành", status: "CANCELLED", cost: 0 }
    ],
    prediction: {
      frequentViews: [
        { serviceName: "Kiểm tra hệ thống pin VF8", count: 8 },
        { serviceName: "Dán phim cách nhiệt 3M Crystalline", count: 3 }
      ],
      lastViewedDate: "2026-04-01 16:30",
      conversionProbability: 0,
      recommendedService: "Chưa thể tư vấn (Tài khoản bị khóa)",
      salesTip: "Khách hàng bị khóa tài khoản do phát hiện lịch sử khai báo gian lận chính sách bảo hành bảo dưỡng liên kết hãng. Hiện không thực hiện chào hàng."
    },
    chatHistory: [
      {
        id: 51,
        date: "2026-04-01 15:40",
        platform: "ZALO",
        summary: "Tranh cãi gay gắt về hạng mục bảo hành pin VinFast VF8",
        lastMessage: "Khách hàng: \"Tại sao kiểm tra pin lỗi do nhà sản xuất mà bên em đòi thu phí sửa chữa liên kết phần cứng ngoài hãng? Giải thích lại rõ ràng cho tôi!\""
      },
      {
        id: 52,
        date: "2026-04-01 16:30",
        platform: "TELEGRAM",
        summary: "Khai báo biên bản cảnh cáo và đình chỉ tài khoản khách hàng",
        lastMessage: "Pháp chế Gara: \"Gửi chị Hương, tài khoản của chị tạm thời bị tạm ngưng giao dịch trên hệ thống để ban pháp chế gara đối soát hóa đơn cứu hộ khẩn cấp ngày 28/03.\""
      }
    ],
    usedParts: []
  }
];

const getWarrantyStatus = (part: UsedPart) => {
  if (part.warrantyMonths === 0) {
    return { status: "NO_WARRANTY", label: "Không bảo hành", colorClass: "text-slate-500 bg-slate-100 border-slate-200" };
  }
  const today = new Date("2026-06-01");
  const expiry = new Date(part.expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) {
    let text = "";
    if (diffDays >= 30) {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      text = `Còn ${months} tháng${days > 0 ? ` ${days} ngày` : ""}`;
    } else {
      text = `Còn ${diffDays} ngày`;
    }
    return {
      status: "ACTIVE",
      label: "Còn bảo hành",
      detail: text,
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
      daysLeft: diffDays
    };
  } else {
    const absDiffDays = Math.abs(diffDays);
    let text = "";
    if (absDiffDays >= 30) {
      const months = Math.floor(absDiffDays / 30);
      const days = absDiffDays % 30;
      text = `Hết hạn ${months} tháng${days > 0 ? ` ${days} ngày` : ""} trước`;
    } else {
      text = `Hết hạn ${absDiffDays} ngày trước`;
    }
    return {
      status: "EXPIRED",
      label: "Hết bảo hành",
      detail: text,
      colorClass: "text-rose-600 bg-rose-50 border-rose-100",
      daysLeft: diffDays
    };
  }
};

export default function AdminCustomerManagement() {
  const { showToast } = useOutletContext<{
    searchQuery: string;
    showToast: (text: string, type?: "success" | "info" | "warning") => void;
  }>();

  // Primary State
  const [customers, setCustomers] = useState<CustomerData[]>(INITIAL_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");

  // Selection & Modal State
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"profile" | "parts" | "behavior" | "chat">("profile");

  // New Customer Form State
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustTier, setNewCustTier] = useState<MembershipTier>("BRONZE");
  const [newCustPoints, setNewCustPoints] = useState(0);

  // Edit Customer Form State
  const [editCustName, setEditCustName] = useState("");
  const [editCustPhone, setEditCustPhone] = useState("");
  const [editCustEmail, setEditCustEmail] = useState("");
  const [editCustTier, setEditCustTier] = useState<MembershipTier>("BRONZE");
  const [editCustPoints, setEditCustPoints] = useState(0);
  const [editCustStatus, setEditCustStatus] = useState<CustomerStatus>("ACTIVE");

  // Computed Global Statistics
  const statistics = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === "ACTIVE").length;
    const banned = customers.filter(c => c.status === "BANNED").length;
    
    let totalPoints = 0;
    let totalSpendVal = 0;
    
    customers.forEach(c => {
      totalPoints += c.loyalty_points;
      c.appointments.forEach(app => {
        if (app.status === "COMPLETED") {
          totalSpendVal += app.cost;
        }
      });
    });

    const avgPoints = total > 0 ? Math.round(totalPoints / total) : 0;

    // Tiers count
    const tiersBreakdown = {
      BRONZE: customers.filter(c => c.membership_tier === "BRONZE").length,
      SILVER: customers.filter(c => c.membership_tier === "SILVER").length,
      GOLD: customers.filter(c => c.membership_tier === "GOLD").length,
      PLATINUM: customers.filter(c => c.membership_tier === "PLATINUM").length,
    };

    return { total, active, banned, avgPoints, totalSpendVal, tiersBreakdown };
  }, [customers]);

  // Filtering Logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
      const matchesTier = tierFilter === "ALL" || c.membership_tier === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [customers, searchTerm, statusFilter, tierFilter]);

  // Actions
  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    setEditCustName(customer.fullName);
    setEditCustPhone(customer.phoneNumber);
    setEditCustEmail(customer.email);
    setEditCustTier(customer.membership_tier);
    setEditCustPoints(customer.loyalty_points);
    setEditCustStatus(customer.status);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editCustName.trim() || !editCustPhone.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Số điện thoại", "warning");
      return;
    }
    
    setCustomers(prev => 
      prev.map(c => 
        c.id === editingCustomer?.id 
          ? {
              ...c,
              fullName: editCustName,
              phoneNumber: editCustPhone,
              email: editCustEmail,
              membership_tier: editCustTier,
              loyalty_points: Number(editCustPoints),
              status: editCustStatus
            }
          : c
      )
    );
    
    // Sync current selected customer detail if open
    if (selectedCustomer && selectedCustomer.id === editingCustomer?.id) {
      setSelectedCustomer(prev => prev ? {
        ...prev,
        fullName: editCustName,
        phoneNumber: editCustPhone,
        email: editCustEmail,
        membership_tier: editCustTier,
        loyalty_points: Number(editCustPoints),
        status: editCustStatus
      } : null);
    }

    setIsEditModalOpen(false);
    setEditingCustomer(null);
    showToast("Cập nhật thông tin khách hàng thành công", "success");
  };

  const handleAddCustomer = () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Số điện thoại", "warning");
      return;
    }

    const newCust: CustomerData = {
      id: Date.now(),
      fullName: newCustName,
      phoneNumber: newCustPhone,
      email: newCustEmail || `${newCustPhone}@agm-client.com`,
      membership_tier: newCustTier,
      loyalty_points: Number(newCustPoints),
      status: "ACTIVE",
      createdAt: new Date().toISOString().split("T")[0],
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      vehicles: [],
      appointments: [],
      prediction: {
        frequentViews: [
          { serviceName: "Thay nhớt định kỳ", count: 1 }
        ],
        lastViewedDate: new Date().toISOString().split("T")[0] + " 10:00",
        conversionProbability: 50,
        recommendedService: "Bảo dưỡng cơ bản",
        salesTip: "Khách hàng mới tạo trực tiếp. Nên giới thiệu gói quà tặng rửa xe miễn phí để xây dựng thiện cảm."
      },
      chatHistory: [
        {
          id: Date.now() + 1,
          date: new Date().toISOString().split("T")[0] + " 09:30",
          platform: "WEBSITE",
          summary: "Tạo tài khoản khách hàng mới tại quầy",
          lastMessage: "Sale (Ghi chú): \"Khách hàng đăng ký trực tiếp tại quầy dịch vụ của gara.\""
        }
      ],
      usedParts: []
    };

    setCustomers(prev => [newCust, ...prev]);
    setIsAddModalOpen(false);
    
    // Reset form
    setNewCustName("");
    setNewCustPhone("");
    setNewCustEmail("");
    setNewCustTier("BRONZE");
    setNewCustPoints(0);

    showToast("Thêm khách hàng mới thành công", "success");
  };

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      showToast("Không có dữ liệu khách hàng để xuất báo cáo", "warning");
      return;
    }

    const headers = ["ID", "Họ và Tên", "Số điện thoại", "Email", "Hạng thành viên", "Điểm tích lũy", "Số lượt đặt lịch", "Trạng thái", "Ngày tham gia"];
    const rows = filteredCustomers.map(c => [
      c.id,
      c.fullName,
      c.phoneNumber,
      c.email,
      c.membership_tier,
      c.loyalty_points,
      c.appointments.length,
      c.status === "ACTIVE" ? "Đang hoạt động" : c.status === "INACTIVE" ? "Tạm ngưng" : "Bị cấm",
      c.createdAt
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh-sach-khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast("Xuất danh sách khách hàng ra CSV thành công", "success");
  };

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            Quản lý Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm">
            Xem hồ sơ, lịch sử dịch vụ, hạng thành viên và thống kê toàn bộ khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            <span>Xuất báo cáo</span>
          </button>
          
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md shadow-[#F9A11B]/20 hover:bg-[#E08F12] transition-all transform hover:translate-y-[-1px]"
          >
            <UserPlus size={16} />
            <span>Thêm khách hàng</span>
          </button>
        </div>
      </div>

      {/* STATISTICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI CARD: TOTAL CUSTOMERS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng số khách hàng
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.total}
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: ACTIVE CUSTOMERS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Khách hàng hoạt động
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.active}
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: TOTAL SPEND */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-[#EDF3FF] flex items-center justify-center text-[#00285E] shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Tổng doanh thu dịch vụ
            </span>
            <span className="text-lg font-black text-[#00285E] tracking-tight block mt-1">
              {statistics.totalSpendVal.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </motion.div>

        {/* KPI CARD: AVG LOYALTY POINTS */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center gap-4 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Điểm tích lũy TB
            </span>
            <span className="text-2xl font-black text-slate-900 tracking-tight block mt-0.5">
              {statistics.avgPoints} pts
            </span>
          </div>
        </motion.div>
      </div>

      {/* MEMBERSHIP TIERS BAR CHART SUMMARY */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Award className="text-[#F9A11B]" size={18} />
            Phân bố hạng thành viên
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Tự động tính từ điểm tích lũy</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(TIER_CONFIG) as MembershipTier[]).map(tier => {
            const count = statistics.tiersBreakdown[tier];
            const pct = statistics.total > 0 ? Math.round((count / statistics.total) * 100) : 0;
            const config = TIER_CONFIG[tier];
            return (
              <div key={tier} className={`p-4 rounded-xl border ${config.border} ${config.bg} flex flex-col justify-between h-24`}>
                <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>{config.label}</span>
                <div className="flex items-baseline justify-between mt-auto">
                  <span className="text-2xl font-black text-slate-800">{count}</span>
                  <span className="text-xs font-bold text-slate-500">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full`} style={{ width: `${pct}%`, backgroundColor: config.iconColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & DATA TABLE SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        {/* FILTERS BAR */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, điện thoại, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="ALL">Tất cả</option>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Tạm khóa</option>
                <option value="BANNED">Bị cấm</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng:</span>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00285E]/10"
              >
                <option value="ALL">Tất cả</option>
                <option value="BRONZE">Đồng</option>
                <option value="SILVER">Bạc</option>
                <option value="GOLD">Vàng</option>
                <option value="PLATINUM">Bạch Kim</option>
              </select>
            </div>
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-4 px-6">Khách hàng</th>
                <th className="py-4 px-4">Số điện thoại</th>
                <th className="py-4 px-4">Hạng thành viên</th>
                <th className="py-4 px-4 text-center">Điểm</th>
                <th className="py-4 px-4 text-center">Lượt đặt</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-sm font-semibold">
                    Không tìm thấy khách hàng nào khớp với điều kiện lọc...
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const tier = TIER_CONFIG[customer.membership_tier];
                  const statusInfo = STATUS_CONFIG[customer.status];
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setActiveDetailTab("profile");
                      }}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-all cursor-pointer group"
                    >
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={customer.avatar}
                          alt={customer.fullName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200/80"
                        />
                        <div>
                          <span className="font-bold text-[#00285E] text-sm block group-hover:text-blue-600 transition-colors">
                            {customer.fullName}
                          </span>
                          <span className="text-xs text-slate-400 font-medium block mt-0.5">
                            {customer.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 text-sm font-semibold">
                        {customer.phoneNumber}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${tier.bg} ${tier.color} border ${tier.border}`}>
                          <Award size={12} style={{ color: tier.iconColor }} />
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700 font-bold text-sm">
                        {customer.loyalty_points}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-500 font-bold text-sm">
                        {customer.appointments.length}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="p-2 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center justify-center border border-transparent hover:border-blue-100"
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL SIDE DRAWER (MODAL OVERLAY STYLE) */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Drawer Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-[#F8FAFC] h-full shadow-2xl border-l border-slate-200 overflow-y-auto flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-slate-100 sticky top-0 flex items-center justify-between z-10 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDF3FF] flex items-center justify-center text-[#00285E]">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Hồ sơ khách hàng</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Mã số: KH-{selectedCustomer.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 p-6 space-y-5">
                {/* Profile Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4 flex flex-col items-center text-center">
                  <div className="relative">
                    <img
                      src={selectedCustomer.avatar}
                      alt={selectedCustomer.fullName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-[#EDF3FF] shadow-sm"
                    />
                    <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white bg-emerald-500"></span>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-lg text-slate-800">{selectedCustomer.fullName}</h4>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2 ${TIER_CONFIG[selectedCustomer.membership_tier].bg} ${TIER_CONFIG[selectedCustomer.membership_tier].color} border ${TIER_CONFIG[selectedCustomer.membership_tier].border}`}>
                      <Award size={12} />
                      Hạng {TIER_CONFIG[selectedCustomer.membership_tier].label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-100">
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Điểm tích lũy</span>
                      <span className="text-lg font-black text-amber-500 block mt-1">{selectedCustomer.loyalty_points} pts</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Đặt lịch hoàn thành</span>
                      <span className="text-lg font-black text-[#00285E] block mt-1">{selectedCustomer.appointments.filter(a => a.status === "COMPLETED").length} lượt</span>
                    </div>
                  </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-xs sticky top-0 z-10">
                  <button
                    onClick={() => setActiveDetailTab("profile")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === "profile" ? "bg-[#00285E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Hồ sơ & Xe
                  </button>
                  <button
                    onClick={() => setActiveDetailTab("parts")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === "parts" ? "bg-[#00285E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Linh kiện & BH
                  </button>
                  <button
                    onClick={() => setActiveDetailTab("behavior")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === "behavior" ? "bg-[#00285E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Dự đoán hành vi
                  </button>
                  <button
                    onClick={() => setActiveDetailTab("chat")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeDetailTab === "chat" ? "bg-[#00285E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Lịch sử chat
                  </button>
                </div>

                {/* Tab content: Profile & Vehicles */}
                {activeDetailTab === "profile" && (
                  <div className="space-y-5">
                    {/* Contact Info */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Thông tin liên hệ</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Phone size={16} className="text-slate-400" />
                        <span className="font-semibold">{selectedCustomer.phoneNumber}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Mail size={16} className="text-slate-400" />
                        <span>{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Calendar size={16} className="text-slate-400" />
                        <span>Ngày gia nhập: {new Date(selectedCustomer.createdAt).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <ShieldAlert size={16} className="text-slate-400" />
                        <span className={`font-bold ${STATUS_CONFIG[selectedCustomer.status].text}`}>
                          Trạng thái: {STATUS_CONFIG[selectedCustomer.status].label}
                        </span>
                      </div>
                    </div>

                    {/* Vehicles Owned */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Phương tiện sở hữu ({selectedCustomer.vehicles.length})</h4>
                        <Car size={16} className="text-[#00285E]" />
                      </div>
                      
                      {selectedCustomer.vehicles.length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic text-center py-2">Khách hàng chưa đăng ký phương tiện nào</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedCustomer.vehicles.map(vehicle => (
                            <div key={vehicle.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00285E] flex items-center justify-center font-bold">
                                  <Car size={14} />
                                </div>
                                <div>
                                  <span className="text-xs font-bold text-slate-800 block">{vehicle.model}</span>
                                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Màu sắc: {vehicle.color}</span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded bg-[#00285E]/5 text-[#00285E] text-xs font-black tracking-wide">{vehicle.plateNumber}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Booking History */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lịch sử sửa chữa ({selectedCustomer.appointments.length})</h4>
                        <Clock size={16} className="text-amber-500" />
                      </div>
                      
                      {selectedCustomer.appointments.length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic text-center py-2">Khách hàng chưa có lịch sử đặt hẹn nào</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedCustomer.appointments.map(app => (
                            <div key={app.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800 block">{app.category}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  app.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : app.status === "PENDING" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                                }`}>
                                  {app.status === "COMPLETED" ? "Đã xong" : app.status === "PENDING" ? "Chờ phục vụ" : "Hủy hẹn"}
                                </span>
                              </div>
                              
                              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold italic">Yêu cầu: {app.notes}</p>
                              
                              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-200/50 pt-2 mt-1">
                                <span>Ngày đặt: {new Date(app.date).toLocaleDateString("vi-VN")}</span>
                                {app.cost > 0 && <span className="text-slate-950 font-black">Giá trị: {app.cost.toLocaleString("vi-VN")} đ</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab content: Used Parts & Warranty */}
                {activeDetailTab === "parts" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Lịch sử linh kiện & Phụ tùng
                      </h4>
                      <span className="text-[10px] text-[#00285E] font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50">
                        {selectedCustomer.usedParts ? selectedCustomer.usedParts.length : 0} phụ tùng
                      </span>
                    </div>

                    {!selectedCustomer.usedParts || selectedCustomer.usedParts.length === 0 ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                          <Wrench size={20} />
                        </div>
                        <p className="text-xs text-slate-400 font-semibold italic">
                          Chưa có lịch sử lắp đặt linh kiện cho khách hàng này
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {selectedCustomer.usedParts.map((part) => {
                          const warranty = getWarrantyStatus(part);
                          return (
                            <div
                              key={part.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 hover:shadow-sm transition-all"
                            >
                              {/* Part Name & Quantity */}
                              <div className="flex justify-between items-start gap-3">
                                <div className="space-y-1">
                                  <span className="text-xs font-black text-slate-800 leading-snug block">
                                    {part.partName}
                                  </span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                                    <span className="flex items-center gap-1">
                                      <Car size={11} />
                                      {part.vehicleModel}
                                    </span>
                                    <span>•</span>
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                                      {part.vehiclePlate}
                                    </span>
                                  </div>
                                </div>
                                <span className="shrink-0 text-[10px] bg-[#EDF3FF] text-[#00285E] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-100/50">
                                  SL: {part.quantity}
                                </span>
                              </div>

                              {/* Installation Date & Warranty period info */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 pt-2 border-t border-slate-100/60">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={12} className="text-slate-400" />
                                  <span>Lắp đặt: {new Date(part.installDate).toLocaleDateString("vi-VN")}</span>
                                </div>
                                <div className="flex items-center gap-1.5 justify-end">
                                  <Clock size={12} className="text-slate-400" />
                                  <span>BH: {part.warrantyMonths > 0 ? `${part.warrantyMonths} tháng` : "Không BH"}</span>
                                </div>
                              </div>

                              {/* Warranty Status Banner */}
                              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${warranty.colorClass}`}>
                                <div className="flex items-center gap-2">
                                  {warranty.status === "ACTIVE" ? (
                                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                                  ) : warranty.status === "EXPIRED" ? (
                                    <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                                  ) : (
                                    <ShieldAlert size={16} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="text-[11px] font-extrabold">{warranty.label}</span>
                                </div>
                                {warranty.detail && (
                                  <span className="text-[10px] font-semibold text-right leading-none">
                                    {warranty.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab content: Behavior & Predictions */}
                {activeDetailTab === "behavior" && (
                  <div className="space-y-5">
                    {/* Conversion Probability Box */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Khả năng chốt hóa đơn dịch vụ tiếp theo</h4>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          selectedCustomer.prediction.conversionProbability >= 80 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          selectedCustomer.prediction.conversionProbability >= 50 ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-slate-50 text-slate-500 border border-slate-200"
                        }`}>
                          {selectedCustomer.prediction.conversionProbability}%
                        </span>
                      </div>
                      
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            selectedCustomer.prediction.conversionProbability >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-600" :
                            selectedCustomer.prediction.conversionProbability >= 50 ? "bg-gradient-to-r from-amber-500 to-orange-600" :
                            "bg-slate-400"
                          }`}
                          style={{ width: `${selectedCustomer.prediction.conversionProbability}%` }}
                        />
                      </div>
                      
                      <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Dựa trên lịch sử xem, lịch sử trò chuyện và hoạt động sửa chữa gần đây, xác suất khách hàng đồng ý nâng cấp hoặc đăng ký dịch vụ mới đạt mức{" "}
                        <span className="font-bold text-slate-800">
                          {selectedCustomer.prediction.conversionProbability >= 80 ? "Rất cao" : selectedCustomer.prediction.conversionProbability >= 50 ? "Khá tốt" : "Thấp"}
                        </span>.
                      </p>
                    </div>

                    {/* Frequently Viewed Services */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Eye size={14} className="text-blue-500" />
                        Dịch vụ quan tâm nhiều nhất
                      </h4>
                      
                      <div className="space-y-2">
                        {selectedCustomer.prediction.frequentViews.map((view, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="text-xs font-bold text-slate-700">{view.serviceName}</span>
                            <span className="text-[10px] bg-slate-200/60 text-slate-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Eye size={10} />
                              {view.count} lượt xem
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-[10px] text-slate-400 font-bold flex justify-between pt-1">
                        <span>Lần cuối xem: {selectedCustomer.prediction.lastViewedDate}</span>
                      </div>
                    </div>

                    {/* AI Recommendation Pitch */}
                    <div className="bg-gradient-to-br from-[#00285E] to-[#043370] text-white p-5 rounded-2xl border border-[#00285E]/20 shadow-md space-y-3">
                      <div className="flex items-center gap-2 text-[#F9A11B]">
                        <Sparkles size={16} fill="currentColor" />
                        <h4 className="text-xs font-bold uppercase tracking-widest">Gợi ý tư vấn dịch vụ</h4>
                      </div>
                      
                      <div>
                        <span className="text-[10px] text-slate-300 font-bold block">DỊCH VỤ NÊN CHÀO BÁN:</span>
                        <span className="text-sm font-black text-[#F9A11B] block mt-0.5">{selectedCustomer.prediction.recommendedService}</span>
                      </div>
                      
                      <div className="pt-2.5 border-t border-white/10 space-y-1">
                        <span className="text-[10px] text-slate-300 font-bold block">MẸO TIẾP CẬN DÀNH CHO SALE:</span>
                        <p className="text-xs text-slate-150 leading-relaxed font-semibold">{selectedCustomer.prediction.salesTip}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content: Chat History with Platform Icons */}
                {activeDetailTab === "chat" && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Lịch sử hội thoại liên hệ</h4>
                    
                    {selectedCustomer.chatHistory.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold italic text-center py-6 bg-white rounded-2xl border border-slate-150">Chưa có lịch sử trò chuyện nào trên hệ thống</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedCustomer.chatHistory.map((chat) => {
                          let platformLabel = "";
                          let platformBg = "";
                          let platformText = "";
                          
                          switch(chat.platform) {
                            case "WEBSITE":
                              platformLabel = "Hệ thống (Web Chat)";
                              platformBg = "bg-emerald-50 border-emerald-100";
                              platformText = "text-emerald-600";
                              break;
                            case "FACEBOOK":
                              platformLabel = "Messenger (Mạng xã hội)";
                              platformBg = "bg-indigo-50 border-indigo-100";
                              platformText = "text-indigo-600";
                              break;
                            case "ZALO":
                              platformLabel = "Zalo (Nền tảng chat Việt)";
                              platformBg = "bg-blue-50 border-blue-100";
                              platformText = "text-blue-600";
                              break;
                            case "TELEGRAM":
                              platformLabel = "Telegram (Mạng xã hội)";
                              platformBg = "bg-sky-50 border-sky-100";
                              platformText = "text-sky-600";
                              break;
                            case "PHONE":
                              platformLabel = "Hotline (Cuộc gọi trực tiếp)";
                              platformBg = "bg-slate-50 border-slate-200";
                              platformText = "text-slate-600";
                              break;
                          }
                          
                          return (
                            <div key={chat.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3 hover:shadow-sm transition-shadow">
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${platformBg} ${platformText}`}>
                                  {platformLabel}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{chat.date}</span>
                              </div>
                              
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">{chat.summary}</span>
                                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 leading-relaxed font-semibold italic">
                                  {chat.lastMessage}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-10 shadow-md">
                <button
                  onClick={() => handleOpenEdit(selectedCustomer)}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#00285E]/15 hover:bg-[#062047] transition-all"
                >
                  <Pencil size={15} />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT CUSTOMER MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Chỉnh sửa thông tin</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Thay đổi thông tin hạng, điểm và trạng thái khách hàng</p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên</label>
                    <input
                      type="text"
                      value={editCustName}
                      onChange={(e) => setEditCustName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={editCustPhone}
                      onChange={(e) => setEditCustPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="0901234567"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email</label>
                  <input
                    type="email"
                    value={editCustEmail}
                    onChange={(e) => setEditCustEmail(e.target.value)}
                    placeholder="customer@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hạng thành viên</label>
                    <select
                      value={editCustTier}
                      onChange={(e) => setEditCustTier(e.target.value as MembershipTier)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800"
                    >
                      <option value="BRONZE">Đồng (Bronze)</option>
                      <option value="SILVER">Bạc (Silver)</option>
                      <option value="GOLD">Vàng (Gold)</option>
                      <option value="PLATINUM">Bạch Kim (Platinum)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Điểm tích lũy</label>
                    <input
                      type="number"
                      value={editCustPoints}
                      onChange={(e) => setEditCustPoints(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Trạng thái tài khoản</label>
                  <select
                    value={editCustStatus}
                    onChange={(e) => setEditCustStatus(e.target.value as CustomerStatus)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800"
                  >
                    <option value="ACTIVE">Hoạt động (Active)</option>
                    <option value="INACTIVE">Tạm khóa (Inactive)</option>
                    <option value="BANNED">Bị khóa vĩnh viễn (Banned)</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2.5 bg-[#00285E] text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#062047] transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CUSTOMER MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Thêm khách hàng mới</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tạo tài khoản hồ sơ khách hàng mới trực tiếp tại gara</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Họ và tên</label>
                    <input
                      type="text"
                      value={newCustName}
                      onChange={(e) => setNewCustName(e.target.value)}
                      placeholder="Nguyễn Văn B"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Số điện thoại</label>
                    <input
                      type="text"
                      value={newCustPhone}
                      onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="0911223344"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email (Tùy chọn)</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="customer.b@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Hạng thành viên</label>
                    <select
                      value={newCustTier}
                      onChange={(e) => setNewCustTier(e.target.value as MembershipTier)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-bold text-slate-800"
                    >
                      <option value="BRONZE">Đồng (Bronze)</option>
                      <option value="SILVER">Bạc (Silver)</option>
                      <option value="GOLD">Vàng (Gold)</option>
                      <option value="PLATINUM">Bạch Kim (Platinum)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Điểm tích lũy ban đầu</label>
                    <input
                      type="number"
                      value={newCustPoints}
                      onChange={(e) => setNewCustPoints(Number(e.target.value))}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00285E]/10 focus:border-[#00285E] transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddCustomer}
                  className="px-6 py-2.5 bg-[#F9A11B] text-[#00285E] rounded-xl text-sm font-bold shadow-md hover:bg-[#E08F12] transition-all"
                >
                  Tạo khách hàng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
