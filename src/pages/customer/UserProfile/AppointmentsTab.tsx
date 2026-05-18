import { motion } from 'motion/react';
import {
  Car,
  Wrench,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  FileText,
  ShieldCheck,
  Settings,
} from 'lucide-react';

const SERVICES_MAP: Record<string, { title: string; price: number; time: string }> = {
  thaynhot: { title: 'Thay nhớt', price: 1500000, time: '60 phút' },
  canchinh: { title: 'Cân chỉnh lốp', price: 800000, time: '45 phút' },
  tongquat: { title: 'Kiểm tra tổng quát', price: 2200000, time: '120 phút' },
};

const TIME_SLOTS = [
  { time: '08:00 AM', status: 'available' },
  { time: '10:30 AM', status: 'available' },
  { time: '02:00 PM', status: 'available' },
  { time: '04:30 PM', status: 'disabled' },
];

const CALENDAR_DAYS = [28, 29, 30, 1, 2, 3, 4];

interface AppointmentsTabProps {
  selectedVehicle: string;
  selectedService: string;
  selectedDate: number;
  selectedTimeSlot: string;
  isAccepted: boolean;
  onSelectVehicle: (v: string) => void;
  onSelectService: (s: string) => void;
  onSelectDate: (d: number) => void;
  onSelectTimeSlot: (t: string) => void;
  onAccept: () => void;
  onReset: () => void;
  onNavigateBack: () => void;
}

export default function AppointmentsTab({
  selectedVehicle,
  selectedService,
  selectedDate,
  selectedTimeSlot,
  isAccepted,
  onSelectVehicle,
  onSelectService,
  onSelectDate,
  onSelectTimeSlot,
  onAccept,
  onReset,
  onNavigateBack,
}: AppointmentsTabProps) {
  const currentSvc = SERVICES_MAP[selectedService];
  const vat = currentSvc.price * 0.1;
  const total = currentSvc.price + vat;
  const vehicleLabel =
    selectedVehicle === 'porsche' ? 'Porsche 911 Carrera' : 'BMW M4 Competition';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8 text-left"
    >
      <div>
        <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">
          Đặt lịch hẹn dịch vụ
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Hoàn thành các bước dưới đây để đặt lịch chăm sóc cho xế yêu của bạn.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="relative flex items-center justify-between max-w-3xl mx-auto w-full px-4 sm:px-8 mt-2 mb-4">
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200 z-0" />
        <div className="absolute top-5 left-[10%] w-[33%] h-0.5 bg-brand-blue z-0" />

        {[
          { num: 1, label: 'Chọn xe', color: 'bg-brand-blue', labelColor: 'text-brand-blue' },
          { num: 2, label: 'Chọn dịch vụ', color: 'bg-brand-orange', labelColor: 'text-brand-orange' },
          { num: 3, label: 'Chọn thời gian', color: 'bg-gray-100', labelColor: 'text-gray-400', textColor: 'text-gray-600' },
          { num: 4, label: 'Xác nhận', color: 'bg-gray-100', labelColor: 'text-gray-400', textColor: 'text-gray-600' },
        ].map((step) => (
          <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full ${step.color} ${step.textColor ?? 'text-white'} font-bold flex items-center justify-center text-sm shadow-sm border border-gray-200/80`}
            >
              {step.num}
            </div>
            <span className={`text-xs font-bold ${step.labelColor} whitespace-nowrap`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
          {/* 1. Select Vehicle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-blue font-bold text-sm">
              <Car className="w-4 h-4 text-brand-blue" />
              <span>Chọn phương tiện của bạn</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'porsche',
                  name: 'Porsche 911 Carrera',
                  plate: '911-LUX-2023',
                  img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=200&q=80',
                },
                {
                  id: 'bmw',
                  name: 'BMW M4 Competition',
                  plate: 'M4-FAST-2022',
                  img: 'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=200&q=80',
                },
              ].map((vehicle) => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => { onSelectVehicle(vehicle.id); }}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedVehicle === vehicle.id
                      ? 'border-brand-blue bg-blue-50/20 ring-2 ring-brand-blue/10'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="w-16 h-11 rounded-lg overflow-hidden bg-gray-900 shrink-0">
                    <img src={vehicle.img} alt={vehicle.id} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-brand-blue truncate">{vehicle.name}</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">{vehicle.plate}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Select Service */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-blue font-bold text-sm">
              <Wrench className="w-4 h-4 text-brand-blue" />
              <span>Chọn dịch vụ cần thiết</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'thaynhot', label: 'Thay nhớt', desc: 'Nhớt tổng hợp cao cấp', price: '1.500.000đ', icon: Wrench },
                { id: 'canchinh', label: 'Cân chỉnh lốp', desc: 'Kiểm tra áp suất & đảo lốp', price: '800.000đ', icon: Settings },
                { id: 'tongquat', label: 'Kiểm tra tổng quát', desc: '50 điểm kỹ thuật chi tiết', price: '2.200.000đ', icon: FileText, popular: true },
              ].map((svc) => {
                const isSelected = selectedService === svc.id;
                const IconCmp = svc.icon;
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => onSelectService(svc.id)}
                    className={`relative flex flex-col justify-between p-4 rounded-2xl border transition-all text-center h-48 overflow-hidden ${
                      isSelected
                        ? 'bg-brand-blue text-white border-brand-blue shadow-md'
                        : 'bg-white text-brand-blue border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {svc.popular && (
                      <div className="absolute top-0 right-0 bg-brand-orange text-brand-blue font-bold text-[8px] px-6 py-1 translate-x-4 translate-y-2 rotate-45 shadow-sm uppercase tracking-wider font-mono">
                        PHỔ BIẾN
                      </div>
                    )}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                          isSelected ? 'bg-white/10 text-white' : 'bg-blue-50 text-brand-blue'
                        }`}
                      >
                        <IconCmp className="w-5 h-5" />
                      </div>
                      <h5 className="font-bold text-xs">{svc.label}</h5>
                      <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {svc.desc}
                      </p>
                    </div>
                    <div>
                      <div className="font-bold text-sm mb-3">{svc.price}</div>
                      <div
                        className={`w-full py-1.5 rounded-lg font-bold text-xs transition-colors ${
                          isSelected
                            ? 'bg-white text-brand-blue'
                            : 'border border-brand-blue text-brand-blue hover:bg-blue-50'
                        }`}
                      >
                        {isSelected ? 'Đã chọn' : 'Chọn'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Select Time */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-brand-blue font-bold text-sm">
              <Clock className="w-4 h-4 text-brand-blue" />
              <span>Chọn thời gian phù hợp</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Calendar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="font-bold text-xs text-brand-blue">Tháng 10, 2023</span>
                  <div className="flex items-center gap-1 text-gray-400">
                    <button type="button" className="p-1 hover:text-brand-blue transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-1 hover:text-brand-blue transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-2">
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {CALENDAR_DAYS.map((day, idx) => {
                    const isCurrentMonth = day < 20;
                    const isSelected = day === selectedDate && isCurrentMonth;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isCurrentMonth}
                        onClick={() => { if (isCurrentMonth) onSelectDate(day); }}
                        className={`h-9 w-full rounded-lg flex items-center justify-center font-bold transition-all ${
                          isSelected
                            ? 'bg-brand-blue text-white shadow-sm'
                            : isCurrentMonth
                            ? 'text-brand-blue hover:bg-gray-50'
                            : 'text-gray-300 cursor-not-allowed font-normal'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  Khung giờ trống
                </span>
                <div className="flex flex-col gap-2">
                  {TIME_SLOTS.map((slot, i) => {
                    const isSelected = selectedTimeSlot === slot.time;
                    const isDisabled = slot.status === 'disabled';
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => onSelectTimeSlot(slot.time)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-brand-blue text-white shadow-sm'
                            : isDisabled
                            ? 'bg-gray-50 text-gray-300 border border-transparent cursor-not-allowed font-normal'
                            : 'bg-white text-brand-blue border border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <span>{slot.time}</span>
                        {isSelected && <Check className="w-4 h-4 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary Card */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
          <h3 className="text-lg font-display font-bold text-brand-blue">Tóm tắt dịch vụ</h3>

          <div className="flex flex-col gap-4">
            {[
              { icon: Car, label: 'Phương tiện', value: vehicleLabel },
              {
                icon: Calendar,
                label: 'Thời gian',
                value: `${selectedTimeSlot}, Thứ 3 - 0${selectedDate}/10/2023`,
              },
            ].map((item) => {
              const IconCmp = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-3">
                  <IconCmp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {item.label}
                    </span>
                    <span className="font-bold text-xs text-brand-blue mt-0.5">{item.value}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-3">
              <Wrench className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Dịch vụ đã chọn
                </span>
                <div className="flex justify-between items-start gap-2 mt-0.5 w-full">
                  <span className="font-bold text-xs text-brand-blue leading-tight">
                    {currentSvc.title}
                  </span>
                  <span className="font-bold text-xs text-brand-blue shrink-0">
                    {currentSvc.price.toLocaleString()}đ
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1">
                  Thuế (VAT 10%) {vat.toLocaleString()}đ
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Thời gian dự kiến:</span>
              <span className="font-bold text-brand-blue">⏱ {currentSvc.time}</span>
            </div>
            <div className="flex justify-between items-baseline mt-2">
              <span className="font-bold text-sm text-brand-blue">Tổng cộng:</span>
              <span className="text-2xl font-display font-bold text-brand-blue">
                {total.toLocaleString()}đ
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button
              type="button"
              onClick={() =>
                alert(
                  `Báo giá chi tiết:\n- ${currentSvc.title}: ${currentSvc.price.toLocaleString()}đ\n- Thuế VAT (10%): ${vat.toLocaleString()}đ\n=> TỔNG THÀNH TIỀN: ${total.toLocaleString()}đ`
                )
              }
              className="w-full py-2.5 rounded-xl border border-brand-blue font-bold text-xs text-brand-blue hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Xem báo giá
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onAccept}
                className={`py-2 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  isAccepted
                    ? 'bg-brand-orange text-brand-blue ring-2 ring-brand-orange/40 shadow-xs'
                    : 'bg-brand-orange hover:bg-brand-orange-hover text-brand-blue'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                {isAccepted ? 'Đã chấp nhận' : 'Chấp nhận'}
              </button>
              <button
                type="button"
                onClick={onReset}
                className={`py-2 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                  isAccepted
                    ? 'border border-gray-200 text-gray-300 cursor-default hover:bg-transparent'
                    : 'border border-red-500 text-red-500 hover:bg-red-50'
                }`}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" /> Từ chối
              </button>
            </div>

            <button
              type="button"
              disabled={!isAccepted}
              onClick={() =>
                alert('Hệ thống xác nhận và đặt lịch hẹn thành công! Xin cảm ơn quý khách.')
              }
              className={`w-full py-3 font-bold text-xs rounded-xl transition-all mt-4 flex items-center justify-center gap-2 group ${
                isAccepted
                  ? 'bg-brand-orange hover:bg-brand-orange-hover text-brand-blue shadow-md cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Tiếp theo</span>
              <ChevronRight
                className={`w-4 h-4 stroke-[2.5] ${isAccepted ? 'group-hover:translate-x-0.5 transition-transform' : ''}`}
              />
            </button>

            <button
              type="button"
              onClick={onNavigateBack}
              className="w-full py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-gray-100 text-[8px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>Đảm bảo bởi SmartGarage Professional</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
