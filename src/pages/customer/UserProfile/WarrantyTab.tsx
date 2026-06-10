import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';

interface WarrantyItem {
    id: string;
    vehicleName: string;
    vehiclePlate: string;
    partName: string;
    startDate: string;
    endDate: string;
    duration: string;
    status: 'Đang bảo hành' | 'Hết hạn';
}

export default function WarrantyTab() {
    const { t } = useTranslation();

    const [warrantyList] = useState<WarrantyItem[]>([
        {
            id: 'WR-911-0089',
            vehicleName: 'Porsche 911 Carrera',
            vehiclePlate: '29A-123.45',
            partName: t('warranty.parts.oilFilter', 'Lọc nhớt chính hãng OEM'),
            startDate: '15/10/2023',
            endDate: '15/04/2024',
            duration: t('warranty.durations.sixMonths', '6 tháng'),
            status: 'Đang bảo hành'
        },
        {
            id: 'WR-M4-0125',
            vehicleName: 'BMW M4 Competition',
            vehiclePlate: '30H-999.88',
            partName: t('warranty.parts.brakePads', 'Má phanh Ceramic Pro'),
            startDate: '02/09/2023',
            endDate: '02/09/2024',
            duration: t('warranty.durations.twelveMonths', '12 tháng'),
            status: 'Đang bảo hành'
        },
        {
            id: 'WR-911-0050',
            vehicleName: 'Porsche 911 Carrera',
            vehiclePlate: '29A-123.45',
            partName: t('warranty.parts.cabinFilter', 'Lọc gió carbon điều hòa'),
            startDate: '20/01/2023',
            endDate: '20/07/2023',
            duration: t('warranty.durations.sixMonths', '6 tháng'),
            status: 'Hết hạn'
        }
    ]);

    const getWarrantyStatusLabel = (status: string) => {
        switch (status) {
            case 'Đang bảo hành':
                return t('warranty.statusActive', 'Đang bảo hành');
            case 'Hết hạn':
                return t('warranty.statusExpired', 'Hết hạn');
            default:
                return status;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 text-left"
        >
            {/* Part 2: Active Warranty Policies */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-display font-bold text-brand-blue tracking-tight">
                        {t('warranty.infoTitle', 'Thông Tin Bảo Hành')}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        {t('warranty.infoDesc', 'Theo dõi chính sách và thời hạn bảo hành cho các linh kiện đã được thay thế tại xưởng dịch vụ.')}
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-gray-100 text-brand-blue font-bold text-[10px] uppercase tracking-wider">
                                    <th className="p-4">{t('warranty.policyId', 'Mã Bảo Hành')}</th>
                                    <th className="p-4">{t('warranty.partName', 'Linh Kiện')}</th>
                                    <th className="p-4">{t('history.vehicle', 'Xe')}</th>
                                    <th className="p-4">{t('warranty.activationDate', 'Ngày Kích Hoạt')}</th>
                                    <th className="p-4">{t('warranty.expirationDate', 'Hạn Bảo Hành')}</th>
                                    <th className="p-4">{t('warranty.duration', 'Thời Hạn')}</th>
                                    <th className="p-4">{t('history.status', 'Trạng Thái')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-slate-600 font-medium">
                                {warrantyList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-brand-blue">{item.id}</td>
                                        <td className="p-4 font-bold text-brand-blue">{item.partName}</td>
                                        <td className="p-4">
                                            <div>
                                                <div className="font-bold text-brand-blue">{item.vehicleName}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{item.vehiclePlate}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">{item.startDate}</td>
                                        <td className="p-4 font-mono font-bold">{item.endDate}</td>
                                        <td className="p-4">{item.duration}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                                                item.status === 'Đang bảo hành'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-gray-50 text-gray-400 border-gray-100'
                                            }`}>
                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                {getWarrantyStatusLabel(item.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

