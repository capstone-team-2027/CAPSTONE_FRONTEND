import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetchClient_v2 as useFetchClient } from '../../../hook/useFetchClient';
import { TASK_ASSIGNMENT_ENDPOINTS } from '../../../constants/technician/taskAssignmentEndpoint';
import { ChevronLeft, Loader2, Calendar, User, Car, CheckSquare, Clock } from 'lucide-react';

export default function TechnicianAssignmentsDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchPrivate } = useFetchClient();

  const [detailData, setDetailData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        if (id) {
          const response = await fetchPrivate(TASK_ASSIGNMENT_ENDPOINTS.GET_SERVICE_ORDER_DETAIL(id));
          setDetailData(response);
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết lệnh sửa chữa:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id, fetchPrivate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <Loader2 size={48} className="mb-4 text-[#0E4D40] animate-spin" />
        <p className="text-lg font-semibold mb-1 text-slate-700">Đang tải chi tiết lệnh sửa chữa...</p>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <p className="text-lg font-semibold mb-1 text-slate-700">Không tìm thấy dữ liệu.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-[#0E4D40] hover:underline">Quay lại</button>
      </div>
    );
  }

  const { vehicle, appointment, tasks } = detailData;
  const customer = vehicle?.customer;

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl w-full mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#0E4D40] tracking-tight leading-none mb-2">
            Chi tiết Lệnh sửa chữa #{detailData.id}
          </h1>
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <Clock size={14} />
            Ngày tạo: {new Date(detailData.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* THÔNG TIN KHÁCH HÀNG & XE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User size={20} className="text-[#D97706]" />
            Thông tin Khách hàng
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 font-medium block">Họ tên</span>
              <span className="text-slate-800 font-semibold">{customer?.name || customer?.user?.fullName || 'Khách vãng lai'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Số điện thoại</span>
              <span className="text-slate-800 font-semibold">{customer?.phone || customer?.user?.phoneNumber || '--'}</span>
            </div>
          </div>
          <hr className="border-slate-100" />
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pt-2">
            <Car size={20} className="text-[#3B82F6]" />
            Thông tin Xe
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 font-medium block">Biển số xe</span>
              <span className="text-slate-800 font-bold">{vehicle?.license_plate || '--'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Dòng xe</span>
              <span className="text-slate-800 font-semibold">
                {vehicle?.model?.make?.make_name} {vehicle?.model?.model_name}
              </span>
            </div>
          </div>
        </div>

        {/* THÔNG TIN LỊCH HẸN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-[#10B981]" />
            Thông tin Lịch hẹn
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400 font-medium block">Trạng thái hẹn</span>
              <span className="text-slate-800 font-bold px-2 py-1 bg-[#E8F5F0] text-[#0E4D40] rounded-lg inline-block mt-1">
                {appointment?.status || 'Đã xác nhận'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 font-medium block">Thời gian hẹn</span>
              <span className="text-slate-800 font-semibold">
                {appointment?.scheduled_time ? new Date(appointment.scheduled_time).toLocaleString('vi-VN') : '--'}
              </span>
            </div>
            {appointment?.notes && (
              <div className="col-span-2">
                <span className="text-slate-400 font-medium block">Ghi chú của khách</span>
                <span className="text-slate-600 bg-amber-50 p-3 rounded-lg block mt-1 border border-amber-100/50">
                  {appointment.notes}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÔNG VIỆC */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CheckSquare size={20} className="text-[#8B5CF6]" />
          Danh sách Công việc (Tasks)
        </h2>
        {tasks && tasks.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="py-3 px-4 border-b border-slate-100">Mã Task</th>
                  <th className="py-3 px-4 border-b border-slate-100">Dịch vụ</th>
                  <th className="py-3 px-4 border-b border-slate-100">Thời gian (Phút)</th>
                  <th className="py-3 px-4 border-b border-slate-100">Trạng thái</th>
                  <th className="py-3 px-4 border-b border-slate-100">Thợ đảm nhận</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: any) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4 font-bold text-[#0E4D40]">#{task.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{task.catalog?.service_name || '--'}</td>
                    <td className="py-3 px-4 text-slate-600">{task.catalog?.estimated_duration || 0}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {task.assignments?.map((a: any) => (
                          <span key={a.id} className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                            {a.technician?.fullName}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Không có công việc nào trong lệnh sửa chữa này.</p>
        )}
      </div>

    </div>
  );
}
