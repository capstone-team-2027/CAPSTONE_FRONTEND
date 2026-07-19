import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Plus, Wrench, History, Loader2 } from 'lucide-react';

interface VehicleItem {
  id: number;
  license_plate?: string;
  vin_number?: string;
  color?: string;
  year?: number;
  model?: {
    model_name?: string;
    make?: {
      make_name?: string;
    };
  };
}

interface VehiclesTabProps {
  vehicles: VehicleItem[];
  isLoading?: boolean;
}

export default function VehiclesTab({ vehicles, isLoading = false }: VehiclesTabProps) {
  const { t } = useTranslation();

  const renderStatBar = () => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      <div>
        <div className="flex justify-between items-center text-[10px] mb-1">
          <span className="text-gray-500 truncate mr-1">{t('vehicles.plate', 'Biển số')}</span>
          <span className="font-bold text-brand-blue">{t('profile.good', 'Tốt')}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="w-full h-full bg-brand-blue rounded-full" />
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center text-[10px] mb-1">
          <span className="text-gray-500 truncate mr-1">{t('vehicles.engine', 'Động cơ')}</span>
          <span className="font-bold text-brand-blue">{t('profile.good', 'Tốt')}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="w-full h-full bg-brand-orange rounded-full" />
        </div>
      </div>
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
          <h2 className="text-2xl font-display font-bold text-brand-blue tracking-tight">
            {t('profile.myCar', 'Xe sở hữu')}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('vehicles.desc', 'Quản lý đội xe và theo dõi tình trạng bảo trì của bạn.')}
          </p>
        </div>
        <button
          onClick={() => alert(t('vehicles.initAddVehicle', 'Tính năng thêm xe mới đang được khởi tạo...'))}
          className="inline-flex items-center gap-2 bg-brand-orange text-brand-blue font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm hover:bg-brand-orange-hover transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> {t('vehicles.addNew', 'Thêm xe mới')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="sm:col-span-2 flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-sm text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('vehicles.loading', 'Đang tải thông tin xe...')}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            {t('vehicles.empty', 'Bạn chưa có xe nào trong hồ sơ.')}
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const modelName = vehicle.model?.model_name || t('vehicles.unknownModel', 'Không xác định');
            const makeName = vehicle.model?.make?.make_name || t('vehicles.unknownMake', 'Không xác định');
            const plate = vehicle.license_plate || t('vehicles.noPlate', 'Chưa có biển số');
            const yearText = vehicle.year ? `${vehicle.year}` : t('vehicles.noYear', 'Năm không xác định');
            const colorText = vehicle.color || t('vehicles.noColor', 'Màu không xác định');

            return (
              <motion.div
                key={vehicle.id}
                whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(10,35,87,0.14)', borderColor: 'rgba(10,35,87,0.2)' }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="w-full relative shrink-0 aspect-[16/10] bg-[#050B18]">
                  <img
                    src="/images/Porsche911.png"
                    alt={modelName}
                    className="w-full h-full object-cover mix-blend-lighten absolute inset-0"
                  />
                  <div className="absolute top-3 left-3 bg-brand-blue text-white px-3 py-1 rounded-lg font-mono font-bold text-xs tracking-wider shadow-md">
                    {plate}
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center gap-2 mb-1">
                      <h3 className="text-lg font-display font-bold text-brand-blue truncate">{`${makeName} ${modelName}`}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] border border-emerald-100 shrink-0">
                        {t('vehicles.statusGood', 'Hoạt động tốt')}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium mb-3">
                      {t('vehicles.details', 'Năm sản xuất: {{year}} • Màu: {{color}}', { year: yearText, color: colorText })}
                    </p>
                    <div className="border-t border-gray-100 my-3" />
                    <div className="flex items-center gap-1.5 text-brand-blue font-bold text-xs mb-2">
                      <Wrench className="w-3.5 h-3.5 text-brand-blue" />
                      <span>{t('vehicles.partsStatus', 'Tình trạng linh kiện')}</span>
                    </div>
                    {renderStatBar()}
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-gray-100/80">
                    <button
                      onClick={(e) => { e.stopPropagation(); alert(t('vehicles.loadingHistory', 'Đang tải dữ liệu toàn bộ lịch sử bảo trì...')); }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 bg-blue-50 text-brand-blue hover:bg-blue-100 font-bold text-[10px] rounded-xl transition-all"
                    >
                      <History className="w-3 h-3" /> {t('profile.tabs.history', 'Lịch sử')}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); alert(t('vehicles.loadingDetails', 'Hiển thị trang thông số kỹ thuật chi tiết của xe...')); }}
                      className="flex-1 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-[10px] rounded-xl transition-all text-center"
                    >
                      {t('common.details', 'Chi tiết')}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
