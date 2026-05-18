import { motion } from 'motion/react';
import { Plus, Wrench, History } from 'lucide-react';

export default function VehiclesTab() {
  const vehicleStats = [
    { label: 'Mức dầu', value: '85%', width: 'w-[85%]', color: 'bg-brand-blue' },
    { label: 'Áp suất lốp', value: '32 PSI', width: 'w-[90%]', color: 'bg-brand-orange' },
    { label: 'Má phanh', value: '60%', width: 'w-[60%]', color: 'bg-brand-blue' },
    { label: 'Tình trạng ắc quy', value: 'Tốt', width: 'w-full', color: 'bg-brand-blue' },
  ];

  const bmwStats = [
    { label: 'Mức dầu', value: '15%', width: 'w-[15%]', color: 'bg-red-600', valueClass: 'text-red-600' },
    { label: 'Áp suất lốp', value: '30 PSI', width: 'w-[85%]', color: 'bg-brand-orange' },
    { label: 'Má phanh', value: '45%', width: 'w-[45%]', color: 'bg-brand-blue' },
    { label: 'Tình trạng ắc quy', value: 'Trung bình', width: 'w-[60%]', color: 'bg-brand-orange' },
  ];

  const renderStatBar = (
    stats: typeof vehicleStats,
    defaultValueClass = 'text-brand-blue'
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {stats.map((stat) => (
        <div key={stat.label}>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-gray-500">{stat.label}</span>
            <span className={`font-bold ${'valueClass' in stat ? (stat as any).valueClass : defaultValueClass}`}>
              {stat.value}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`${stat.width} h-full ${stat.color} rounded-full`} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#F8FAFC] pb-2">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">Xe sở hữu</h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý đội xe và theo dõi tình trạng bảo trì của bạn.
          </p>
        </div>
        <button
          onClick={() => alert('Tính năng thêm xe mới đang được khởi tạo...')}
          className="inline-flex items-center gap-2 bg-brand-orange text-brand-blue font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm hover:bg-brand-orange-hover transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Thêm xe mới
        </button>
      </div>

      {/* Porsche Card */}
      <motion.div
        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(10,35,87,0.14)', borderColor: 'rgba(10,35,87,0.2)' }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch cursor-pointer"
      >
        <div className="w-full md:w-[42%] relative shrink-0 min-h-[260px] bg-[#050B18]">
          <img
            src="public/images/Porsche911.png"
            alt="Porsche 911 Carrera"
            className="w-full h-full object-cover mix-blend-lighten absolute inset-0"
          />
          <div className="absolute top-3 left-3 bg-brand-blue text-white px-3 py-1 rounded-lg font-mono font-bold text-xs tracking-wider shadow-md">
            29A-123.45
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <h3 className="text-xl font-display font-bold text-brand-blue">Porsche 911 Carrera</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Hoạt động tốt
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-4">Đời xe: 2023 • Màu: Bạc GT Silver</p>
            <div className="border-t border-gray-100 my-4" />
            <div className="flex items-center gap-1.5 text-brand-blue font-bold text-xs mb-3">
              <Wrench className="w-3.5 h-3.5 text-brand-blue" />
              <span>Tình trạng linh kiện</span>
            </div>
            {renderStatBar(vehicleStats)}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-gray-100/80">
            <button
              onClick={() => alert('Đang tải dữ liệu toàn bộ lịch sử bảo trì...')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-brand-blue hover:bg-blue-100 font-bold text-xs rounded-xl transition-all"
            >
              <History className="w-3.5 h-3.5" /> Xem lịch sử bảo trì
            </button>
            <button
              onClick={() => alert('Hiển thị trang thông số kỹ thuật chi tiết của xe...')}
              className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs rounded-xl transition-all"
            >
              Chi tiết xe
            </button>
          </div>
        </div>
      </motion.div>

      {/* BMW Card */}
      <motion.div
        whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(10,35,87,0.14)', borderColor: 'rgba(10,35,87,0.2)' }}
        transition={{ type: 'spring', stiffness: 280, damping: 18 }}
        className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row items-stretch cursor-pointer"
      >
        <div className="w-full md:w-[42%] relative shrink-0 min-h-[260px] bg-[#050B18]">
          <img
            src="public/images/BMWM4.png"
            alt="BMW M4"
            className="w-full h-full object-cover mix-blend-lighten absolute inset-0"
          />
          <div className="absolute top-3 left-3 bg-brand-blue text-white px-3 py-1 rounded-lg font-mono font-bold text-xs tracking-wider shadow-md">
            30H-999.88
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
              <h3 className="text-xl font-display font-bold text-brand-blue">BMW M4</h3>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-[#D97706] font-bold text-xs border border-amber-100">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Cần bảo trì sớm
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-4">Đời xe: 2022 • Màu: Xanh Portimao Blue</p>
            <div className="border-t border-gray-100 my-4" />
            <div className="flex items-center gap-1.5 text-brand-blue font-bold text-xs mb-3">
              <Wrench className="w-3.5 h-3.5 text-brand-blue" />
              <span>Tình trạng linh kiện</span>
            </div>
            {renderStatBar(bmwStats)}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-gray-100/80">
            <button
              onClick={() => alert('Đang tải dữ liệu toàn bộ lịch sử bảo trì...')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-brand-blue hover:bg-blue-100 font-bold text-xs rounded-xl transition-all"
            >
              <History className="w-3.5 h-3.5" /> Xem lịch sử bảo trì
            </button>
            <button
              onClick={() => alert('Hệ thống chuyển sang quy trình đặt lịch trực tuyến nhanh...')}
              className="px-4 py-2 bg-brand-blue text-white hover:bg-brand-blue/90 font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              Đặt lịch ngay
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
