import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Trang mặc định của từng vai trò sau khi đăng nhập — trùng với điều hướng trong Login.tsx.
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin/statistics',
  RECEPTIONIST: '/reception',
  TECHNICIAN: '/technician',
  INVENTORY_MANAGER: '/inventory',
  TECHNICIAN_LEADER: '/leader',
};

const extractRoleCode = (rawRole: unknown): string | null => {
  if (!rawRole) return null;
  if (typeof rawRole === 'string') return rawRole;
  if (typeof rawRole === 'object' && 'roleCode' in rawRole) {
    const roleCode = (rawRole as { roleCode?: unknown }).roleCode;
    return typeof roleCode === 'string' ? roleCode : null;
  }
  return null;
};

// Mở lại tab (token còn hạn) thì trình duyệt tải URL cũ, thường là "/" — trang của khách hàng.
// Component này đưa nhân viên về đúng khu vực của họ, nhưng CHỈ chạy đúng một lần lúc app khởi
// động và chỉ khi đang đứng ở trang chủ; nhờ vậy nhân viên vẫn tự do bấm vào trang khách hàng
// trong lúc dùng mà không bị đá ngược trở lại.
// Cờ đặt NGOÀI component: useRef bị reset khi React remount (StrictMode ở dev mount 2 lần,
// hoặc cây route thay đổi), khiến việc chuyển hướng chạy lại và nhân viên không vào nổi trang
// khách hàng. Biến module-level sống suốt vòng đời trang nên chỉ cho chạy đúng một lần.
let hasRedirected = false;

export default function InitialRoleRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasRedirected) return;
    hasRedirected = true;

    if (location.pathname !== '/') return;
    if (!localStorage.getItem('token')) return;

    try {
      const stored = localStorage.getItem('user');
      if (!stored) return;
      const role = extractRoleCode(JSON.parse(stored)?.role);
      const target = role ? ROLE_HOME[role.toUpperCase()] : null;
      if (target) navigate(target, { replace: true });
    } catch {
      // user trong storage hỏng thì bỏ qua, cứ để ở trang chủ.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
