import { ChangeEvent } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Award,
  Edit3,
  CheckCircle2,
  ChevronRight,
  FileText,
  Save,
  X,
  User,
  Check,
  Car,
  Calendar,
} from 'lucide-react';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

interface DashboardTabProps {
  avatarUrl: string;
  formData: FormData;
  isEditing: boolean;
  onAvatarUpdate: () => void;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onEditToggle: (val: boolean) => void;
}

export default function DashboardTab({
  avatarUrl,
  formData,
  isEditing,
  onAvatarUpdate,
  onInputChange,
  onSave,
  onEditToggle,
}: DashboardTabProps) {
  const inputClass = (editing: boolean) =>
    `w-full px-3 py-2 text-sm rounded-lg font-medium text-brand-blue transition-all ${
      editing
        ? 'bg-white border-2 border-brand-blue focus:outline-none shadow-xs'
        : 'bg-white border border-gray-200/80 cursor-default text-brand-blue/90'
    }`;

  return (
    <>
      {/* Top Profile Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-blue/5 shadow-inner bg-gray-100">
              <img src={avatarUrl} alt="User Profile" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={onAvatarUpdate}
              className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-1.5 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer"
              title="Thay đổi ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-display text-brand-blue tracking-tight">
              {formData.fullName}
            </h2>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold shadow-xs">
                <Award className="w-3.5 h-3.5 fill-current" />
                Thành viên Vàng
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Tham gia từ: 12/2022
              </span>
            </div>
          </div>
        </div>

        {/* Progress Tier */}
        <div className="w-full md:w-auto md:min-w-[320px] bg-[#F8FAFC] p-4 rounded-xl border border-gray-200/60 shadow-inner">
          <div className="flex justify-between items-center mb-2 font-medium text-xs text-brand-blue">
            <span>Tiến trình hạng: Bạch Kim</span>
            <span className="font-bold text-brand-blue">850 / 1000 pts</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '85%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-brand-blue rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-400 italic text-center">
            Còn 150 điểm để đạt hạng Bạch Kim
          </p>
        </div>
      </motion.div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Personal Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
          transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
          className="md:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-brand-blue font-bold text-base">
                <User className="w-4 h-4 text-brand-blue" />
                <span>Thông tin cá nhân</span>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditToggle(false)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Hủy
                  </button>
                  <button
                    onClick={onSave}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-sm flex items-center gap-1 animate-pulse"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onEditToggle(true)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Họ và Tên', name: 'fullName', type: 'text' },
                { label: 'Email', name: 'email', type: 'email' },
                { label: 'Số điện thoại', name: 'phone', type: 'text' },
                { label: 'Địa chỉ', name: 'address', type: 'text' },
              ].map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 block">{field.label}</label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name as keyof FormData]}
                    onChange={onInputChange}
                    disabled={!isEditing}
                    className={inputClass(isEditing)}
                  />
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <p className="text-[11px] text-brand-orange mt-4 italic">
              * Bạn có thể thay đổi các thông tin trên và nhấn nút Lưu để áp dụng.
            </p>
          )}
        </motion.div>

        {/* My Car Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, boxShadow: '0 16px 32px rgba(10,35,87,0.10)' }}
          transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          className="md:col-span-5 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-brand-blue font-bold text-base mb-4">
              <Car className="w-4 h-4 text-brand-blue" />
              <span>Xe của tôi</span>
            </div>

            <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4 bg-[#050B18] shadow-inner group">
              <img
                src="public/images/Porsche911.png"
                alt="Porsche 911 Carrera"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-lighten"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050B18]/90 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="font-display font-bold text-sm tracking-wide">Porsche 911 Carrera</div>
                <div className="text-xs text-white/80 font-mono tracking-wider font-medium">
                  BSX: 51H-123.45
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between items-center p-2.5 bg-[#F8FAFC] rounded-lg text-xs font-medium">
                <span className="text-gray-500">Tình trạng</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  <Check className="w-3 h-3 stroke-[3]" /> Tốt
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-[#F8FAFC] rounded-lg text-xs font-medium">
                <span className="text-gray-500">Bảo dưỡng tiếp</span>
                <span className="font-bold text-[#D97706]">2,450 km nữa</span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => alert('Chuyển đến trang quản lý thông số kỹ thuật xe chi tiết...')}
            className="w-full py-2.5 bg-brand-blue text-white rounded-lg font-bold text-xs shadow-md hover:bg-brand-blue/90 transition-all text-center"
          >
            Xem chi tiết xe
          </motion.button>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="pt-2"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-brand-blue tracking-wide">Hoạt động gần đây</h3>
          <button
            onClick={() => alert('Đang tải danh sách toàn bộ hoạt động lịch sử...')}
            className="text-xs font-bold text-brand-blue underline hover:text-brand-orange transition-colors"
          >
            Xem tất cả
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
          <div className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-blue">Thay dầu định kỳ</div>
                <div className="text-[11px] text-gray-400 mt-0.5">15/10/2023 • Hoàn thành</div>
              </div>
            </div>
            <div className="text-xs font-bold text-brand-blue">1,200,000 đ</div>
          </div>

          <div
            className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group"
            onClick={() => alert('Chi tiết đặt lịch kiểm tra tổng quát...')}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-[#D97706] shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-brand-blue group-hover:text-brand-orange transition-colors">
                  Kiểm tra tổng quát
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">28/10/2023 • Đã đặt lịch</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-blue group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </motion.div>
    </>
  );
}
