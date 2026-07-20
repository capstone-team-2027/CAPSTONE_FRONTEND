import React, { useEffect, useState } from 'react';
import { X, User, ShieldCheck, Star } from 'lucide-react';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (technicianId: number) => void;
  customerName: string;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({ isOpen, onClose, onAssign, customerName }) => {
  const { fetchPrivate } = useFetchClient_v2();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchTechnicians = async () => {
        setLoading(true);
        try {
          const result = await fetchPrivate(RECEPTION_API.TECHNICIANS_WORKING_TODAY);
          if (result && result.success) {
            setTechnicians(result.data);
          }
        } catch (error) {
          console.error("Error fetching technicians:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchTechnicians();
    }
  }, [isOpen, fetchPrivate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Phân công kỹ thuật viên</h3>
            <p className="text-sm text-slate-500">Cứu hộ cho: {customerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-500 py-8">Đang tải danh sách...</div>
          ) : technicians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {technicians.map(tech => {
                const isLeader = tech.role?.roleCode === 'TECHNICIAN_LEADER';
                return (
                  <div 
                    key={tech.id}
                    onClick={() => onAssign(tech.id)}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all bg-white"
                  >
                    <div className="flex gap-3 items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${isLeader ? 'bg-amber-500' : 'bg-slate-400'}`}>
                        {tech.fullName ? tech.fullName.charAt(0).toUpperCase() : 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-slate-800 text-sm truncate">{tech.fullName}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          {isLeader && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                              <ShieldCheck size={10} /> Tổ trưởng
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{tech.phoneNumber}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center text-amber-500">
                          <Star size={14} className="fill-amber-500" />
                          <span className="text-xs font-bold ml-1">{tech.skillLevel}</span>
                        </div>
                        <span className="text-xs text-blue-600 font-semibold hover:underline">Chọn</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">Không có kỹ thuật viên nào làm việc hôm nay.</div>
          )}
        </div>
      </div>
    </div>
  );
};
