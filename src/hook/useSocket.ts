import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../constants/reception/notificationEndpoints';

// Biến global để giữ kết nối socket duy nhất toàn ứng dụng
let socketInstance: Socket | null = null;

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(socketInstance);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(API_BASE_URL, {
        transports: ['websocket', 'polling'], // Ưu tiên websocket
        autoConnect: true,
      });

      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected:', socketInstance?.id);
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });
    }

    // Tùy chọn: Xóa kết nối khi unmount toàn bộ app (thường không cần thiết vì ta muốn giữ kết nối)
    // return () => {
    //   socketInstance?.disconnect();
    //   socketInstance = null;
    // };
  }, []);

  return socket;
};
