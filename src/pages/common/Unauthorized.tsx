import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4 text-center">
      <div className="w-20 h-20 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
      </div>
      <h1 className="text-2xl font-extrabold text-[#00285E] mb-2">
        Bạn không có quyền truy cập trang này
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-8">
        Tài khoản của bạn không có đủ quyền hạn để xem nội dung này. Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
      </p>
      <Link
        to="/login"
        className="px-6 py-3 rounded-xl bg-[#00285E] text-white font-bold text-sm hover:bg-[#00285E]/90 transition-all"
      >
        Đăng nhập lại
      </Link>
    </div>
  );
}
