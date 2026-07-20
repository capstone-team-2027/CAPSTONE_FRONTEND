import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/reception/notificationEndpoints';

// Biến global để giữ kết nối socket duy nhất toàn ứng dụng
let socketInstance: Socket | null = null;

// Tạo (hoặc lấy) socket dùng chung. Gọi lúc render để mọi hook nhận ngay,
// không phải đợi effect chạy xong mới có.
const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance?.id);
    });
    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });
  }
  return socketInstance;
};

export const useSocket = (): Socket => {
  // Khởi tạo ngay ở lần render đầu -> không bao giờ trả về null
  const [socket] = useState<Socket>(() => getSocket());

  useEffect(() => {
    // Đảm bảo đã kết nối (autoConnect có thể bị tắt ở lần dùng khác)
    if (!socket.connected) socket.connect();
  }, [socket]);

  return socket;
};