import { useNavigate } from "react-router-dom";

export const useFetchClient = () => {
  const navigate = useNavigate();

  // ==========================================
  // LOẠI 1: PUBLIC (Không Token - Dùng cho Login, Register)
  // ==========================================
  const fetchPublic = async (
    url: string,
    method: string = "GET",
    bodyData: any = null,
  ) => {
    const options: RequestInit = {
      method: method,
      headers: { "Content-Type": "application/json" },
    };

    if (bodyData) {
      options.body = JSON.stringify(bodyData);
    }

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra từ máy chủ");
      }
      return data;
    } catch (error) {
      console.error("Lỗi Public API:", error);
      throw error;
    }
  };

  // ==========================================
  // LOẠI 2: PRIVATE JSON (Có Token + Bảo vệ)
  // Dùng cho: Xem xe, Đặt lịch... (Nơi cần quyền, body là JSON)
  // ==========================================
  const fetchPrivate = async <T>(
    url: string,
    method: string = "GET",
    bodyData: any = null,
  ) => {
    const token = localStorage.getItem("token");
    const options: RequestInit = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
    };

    if (bodyData) options.body = JSON.stringify(bodyData);

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.status === 401) {
        console.warn("Lỗi 401: Token hết hạn hoặc bay màu. Đá về Login!");
        localStorage.removeItem("token");
        navigate("/login");
        throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra từ máy chủ");
      }

      return data;
    } catch (error) {
      console.error("Lỗi Private API:", error);
      throw error;
    }
  };

  // ==========================================
  // LOẠI 3: PRIVATE FORM (Có Token + Body là FormData)
  // Dùng cho: Upload avatar, cập nhật profile có file
  //
  // ⚠️ QUAN TRỌNG: KHÔNG set Content-Type thủ công.
  // Khi body là FormData, trình duyệt tự set
  // "multipart/form-data; boundary=----..." với đúng boundary.
  // Nếu tự set Content-Type thì multer trên BE không parse được.
  // ==========================================
  const fetchPrivateForm = async (
    url: string,
    method: string = "POST",
    formData: FormData,
  ) => {
    const token = localStorage.getItem("token");

    const options: RequestInit = {
      method: method,
      headers: {
        // KHÔNG có Content-Type ở đây — để browser tự xử lý
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: formData,
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.status === 401) {
        console.warn("Lỗi 401: Token hết hạn hoặc bay màu. Đá về Login!");
        localStorage.removeItem("token");
        navigate("/login");
        throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }

      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra từ máy chủ");
      }

      return data;
    } catch (error) {
      console.error("Lỗi Private Form API:", error);
      throw error;
    }
  };

  return { fetchPublic, fetchPrivate, fetchPrivateForm };
};