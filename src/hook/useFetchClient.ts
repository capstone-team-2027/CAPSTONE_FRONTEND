import { useNavigate } from 'react-router-dom';

export const useFetchClient = () => {
    const navigate = useNavigate();

    // ==========================================
    // LOẠI 1: PUBLIC (Không Token - Dùng cho Login, Register)
    // Cứ gọi bình thường, lỗi thì báo lỗi, không đá đi đâu cả.
    // ==========================================
    // Thêm kiểu dữ liệu cho tham số: url (string), method (string), bodyData (any)
    const fetchPublic = async (url: string, method: string = 'GET', bodyData: any = null) => {

        // ⚡ FIX LỖI Ở ĐÂY: Thêm kiểu : RequestInit
        const options: RequestInit = {
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };

        // Nhờ có RequestInit, giờ TypeScript đã cho phép gán thêm body thoải mái
        if (bodyData) {
            options.body = JSON.stringify(bodyData);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra từ máy chủ');
            }
            return data;
        } catch (error) {
            console.error('🔥 Lỗi Public API:', error);
            throw error;
        }
    };

    // ==========================================
    // LOẠI 2: PRIVATE (Có Token + CÓ BẢO VỆ)
    // Dùng cho: Xem xe, Đặt lịch... (Nơi cần quyền)
    // ==========================================
    const fetchPrivate = async (url: string, method: string = 'GET', bodyData: any = null) => {
        const token = localStorage.getItem('token');

        // ⚡ FIX LỖI Ở ĐÂY: Thêm kiểu : RequestInit
        const options: RequestInit = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
            },
        };

        if (bodyData) options.body = JSON.stringify(bodyData);

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            // ⚡ KIỂM TRA QUYỀN TRUY CẬP (MẤU CHỐT Ở ĐÂY)
            if (response.status === 401) {
                console.warn("Lỗi 401: Token hết hạn hoặc bay màu. Đá về Login!");

                // 1. Xóa cái vé cũ bị hỏng đi
                localStorage.removeItem('token');

                // 2. Chuyển hướng
                navigate('/login');

                // 3. Quăng lỗi ra để component dừng chạy tiếp
                throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            }

            // Nếu là lỗi khác (như 400 sai dữ liệu, 404 không tìm thấy)
            if (!response.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra từ máy chủ');
            }

            return data;
        } catch (error) {
            console.error('🔥 Lỗi Private API:', error);
            throw error;
        }
    };

    return { fetchPublic, fetchPrivate };
};