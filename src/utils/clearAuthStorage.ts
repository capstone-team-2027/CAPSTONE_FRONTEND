// Xoá sạch dấu vết phiên đăng nhập ở cả localStorage lẫn sessionStorage.
// Trước đây mỗi nơi logout chỉ xoá 'token' và 'userAvatar', bỏ sót 'user'/'accessToken'/
// 'refreshToken' — khi user chuyển sang lưu ở localStorage thì phần bỏ sót đó sẽ còn lại
// sau khi đăng xuất. Giữ lại 'rememberedPhone' vì đó là tiện ích tự điền SĐT, không phải phiên.
const AUTH_KEYS = ['token', 'accessToken', 'refreshToken', 'user', 'userAvatar'];

export const clearAuthStorage = () => {
  AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};
