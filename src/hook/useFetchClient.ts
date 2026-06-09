import { useNavigate } from "react-router-dom";

export const useFetchClient = () => {
  const navigate = useNavigate();

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

  const fetchPrivate = async <T, B = unknown>(
    url: string,
    method: string = "GET",
    bodyData: B | null = null,
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

  const fetchPrivateFormGeneric = async <T = any>(
    url: string,
    method: string = "POST",
    body: unknown,
  ): Promise<T> => {
    const token = localStorage.getItem("token");

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(body),
    };

    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.status === 401) {
        console.warn("Lỗi 401: Token hết hạn. Đá về Login!");
        localStorage.removeItem("token");
        navigate("/login");
        throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
      }
      if (!response.ok) {
        throw new Error(data.message || "Có lỗi xảy ra từ máy chủ");
      }
      return data as T;
    } catch (error) {
      console.error("Lỗi Private Form API:", error);
      throw error;
    }
  };

  return {
    fetchPublic,
    fetchPrivate,
    fetchPrivateForm,
    fetchPrivateFormGeneric,
  };
};
