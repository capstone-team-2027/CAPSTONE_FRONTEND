import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Phone, 
  Star, 
  Clock, 
  User, 
  Search, 
  ShieldCheck, 
  AlertCircle,
  CalendarDays
} from 'lucide-react';
import { RECEPTION_API } from '../../../constants/reception/receptionApiEndpoint';
import { useFetchClient_v2 } from '../../../hook/useFetchClient';

const ReceptionTechnicianList = () => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { fetchPrivate } = useFetchClient_v2();

  useEffect(() => {
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
  }, [fetchPrivate]);

  const filteredTechnicians = useMemo(() => {
    return technicians.filter(tech => 
      (tech.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tech.phoneNumber || '').includes(searchQuery)
    );
  }, [technicians, searchQuery]);

  // Framer Motion Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as any, stiffness: 300, damping: 24 } }
  };

  const getLevelColor = (level: number) => {
    if (level >= 3) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (level === 2) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getLevelLabel = (level: number) => {
    if (level >= 3) return 'Senior';
    if (level === 2) return 'Mid-level';
    return 'Junior';
  };

  const SkeletonLoader = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-slate-200 rounded-full shrink-0"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-px bg-slate-100 w-full my-2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-slate-200 rounded w-20"></div>
              <div className="h-8 bg-slate-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00285E] to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Wrench size={20} className="text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Kỹ thuật viên làm việc hôm nay
            </h1>
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-2 font-medium">
            <CalendarDays size={16} />
            Danh sách nhân sự kỹ thuật có mặt tại Gara trong ngày
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-full pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00285E]/20 focus:border-[#00285E] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* CONTENT SECTION */}
      {loading ? (
        <SkeletonLoader />
      ) : (
        <AnimatePresence mode="wait">
          {filteredTechnicians.length > 0 ? (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {filteredTechnicians.map((tech) => {
                const isLeader = tech.role?.roleCode === 'TECHNICIAN_LEADER';
                const avatarInitial = tech.fullName ? tech.fullName.charAt(0).toUpperCase() : 'T';
                
                return (
                  <motion.div 
                    key={tech.id} 
                    variants={itemVariants}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative group overflow-hidden"
                  >
                    {/* Top Right Decoration */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors"></div>

                    <div className="flex items-start gap-4 mb-5 relative z-10">
                      <div className="relative">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shadow-inner ${isLeader ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'}`}>
                          {avatarInitial}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 truncate" title={tech.fullName}>
                          {tech.fullName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isLeader ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              <ShieldCheck size={12} />
                              Tổ trưởng
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Kỹ thuật viên
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-500">
                          <Phone size={14} className="text-slate-400" />
                          {tech.phoneNumber || 'Chưa cập nhật'}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border ${getLevelColor(tech.skillLevel)}`}>
                          <Star size={12} className={tech.skillLevel >= 3 ? 'fill-amber-500 text-amber-500' : ''} />
                          {getLevelLabel(tech.skillLevel)}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-slate-100/80">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          <Clock size={14} />
                          Ca làm việc hôm nay
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {tech.shifts && tech.shifts.length > 0 ? (
                            tech.shifts.map((shift: any) => (
                              <div 
                                key={shift.id} 
                                className="flex items-center gap-1.5 text-xs font-bold bg-[#F4F7FC] text-[#00285E] px-3 py-1.5 rounded-lg border border-[#D2E2FF] shadow-sm"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {shift.slot_name}: {shift.start_time?.substring(0,5)} - {shift.end_time?.substring(0,5)}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic flex items-center gap-1">
                              <AlertCircle size={12} /> Không có ca chi tiết
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-dashed border-slate-200"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <User size={32} className="text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy Kỹ thuật viên</h3>
              <p className="text-slate-500 max-w-sm">
                {searchQuery 
                  ? `Không có kết quả nào phù hợp với từ khóa "${searchQuery}"`
                  : "Hiện tại không có kỹ thuật viên nào được phân công lịch làm việc trong ngày hôm nay."}
              </p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Xóa bộ lọc
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ReceptionTechnicianList;
