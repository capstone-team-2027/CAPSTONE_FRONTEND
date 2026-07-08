export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BANNED";
export type MembershipTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "NONE";
export type CustomerType = "REGISTERED" | "GUEST";

export interface CustomerVehicle {
  id: number;
  model: string;
  plateNumber: string;
  color: string;
}

export interface CustomerAppointment {
  id: number;
  date: string;
  category: string;
  notes: string;
  status: "COMPLETED" | "PENDING" | "CANCELLED" | string;
  cost: number;
  vehicle?: {
    model: string;
    plate: string;
  } | null;
  details?: {
    name: string;
    description: string;
    duration: number;
    type: "CATALOG" | "COMBO";
    subItems?: string[];
  }[];
}

export interface BehaviorPrediction {
  frequentViews: { serviceName: string; count: number }[];
  lastViewedDate: string;
  conversionProbability: number; // 0 to 100
  recommendedService: string;
  salesTip: string;
}

export interface ChatLog {
  id: number;
  date: string;
  platform: "WEBSITE" | "FACEBOOK" | "ZALO" | "TELEGRAM" | "PHONE";
  summary: string;
  lastMessage: string;
}

export interface UsedPart {
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

export interface CustomerData {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  membership_tier: MembershipTier;
  loyalty_points: number;
  status: CustomerStatus;
  createdAt: string;
  avatar: string;
  type: CustomerType;
  vehicles: CustomerVehicle[];
  appointments: CustomerAppointment[];
  prediction: BehaviorPrediction;
  chatHistory: ChatLog[];
  usedParts: UsedPart[];
}

export const TIER_CONFIG: Record<MembershipTier, { label: string; color: string; bg: string; border: string; iconColor: string }> = {
  BRONZE: { label: "Đồng", color: "text-[#B87333]", bg: "bg-[#B87333]/10", border: "border-[#B87333]/20", iconColor: "#B87333" },
  SILVER: { label: "Bạc", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20", iconColor: "#94A3B8" },
  GOLD: { label: "Vàng", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", iconColor: "#F59E0B" },
  PLATINUM: { label: "Bạch Kim", color: "text-teal-400", bg: "bg-teal-400/10", border: "border-teal-400/20", iconColor: "#2DD4BF" },
  NONE: { label: "Không hạng", color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", iconColor: "#64748B" },
};

export const STATUS_CONFIG: Record<CustomerStatus, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: "Đang hoạt động", bg: "bg-emerald-50 text-emerald-600 border border-emerald-100", text: "text-emerald-600" },
  INACTIVE: { label: "Tạm khóa", bg: "bg-amber-50 text-amber-600 border border-amber-100", text: "text-amber-600" },
  BANNED: { label: "Bị cấm", bg: "bg-rose-50 text-rose-600 border border-rose-100", text: "text-rose-600" }
};

export const getWarrantyStatus = (part: UsedPart) => {
  if (part.warrantyMonths === 0) {
    return { status: "NO_WARRANTY", label: "Không bảo hành", colorClass: "text-slate-500 bg-slate-100 border-slate-200" };
  }
  const today = new Date();
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
