import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useSocket } from '../../hook/useSocket';

export default function VideoCallRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const zpRef = useRef<any>(null);

    const user = useSelector((state: RootState) => state.user.user as any);
    const socket = useSocket();

    useEffect(() => {
        if (!socket || !roomId) return;

        const showGlobalToast = (message: string) => {
            const toast = document.createElement('div');
            toast.className = "fixed top-10 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 bg-rose-600 text-white rounded-2xl shadow-2xl font-bold flex items-center gap-3 transition-all duration-500";
            toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="m14 9.9 5.76-3.84a2 2 0 0 1 3.24 1.56v8.38a2 2 0 0 1-1.3.18"/><path d="M22 22A2 2 0 0 1 20 24H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5"/><path d="M7 2h7c1.1 0 2 .9 2 2v2.5"/></svg> ${message}`;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 500);
            }, 5000);
        };

        const forceStopMedia = () => {
            const mediaElements = document.querySelectorAll('video, audio');
            mediaElements.forEach((el: any) => {
                if (el.srcObject) {
                    el.srcObject.getTracks().forEach((track: any) => track.stop());
                }
            });
        };

        const handleCallEnded = (data: any) => {
            if (data.roomId === roomId) {
                showGlobalToast('Bên kia đã kết thúc cuộc gọi!');
                forceStopMedia();
                navigate(-1);
            }
        };

        socket.on('end-video-call', handleCallEnded);

        return () => {
            socket.off('end-video-call', handleCallEnded);
        };
    }, [socket, roomId, navigate]);

    useEffect(() => {
        if (!roomId || !containerRef.current) return;

        let isMounted = true;

        const initMeeting = async () => {
            try {
                // Lấy AppID và ServerSecret từ biến môi trường
                const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID || '0');
                const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET || '';

                if (!appID || !serverSecret) {
                    console.error("Chưa cấu hình VITE_ZEGO_APP_ID hoặc VITE_ZEGO_SERVER_SECRET trong .env");
                    alert("Hệ thống Video Call chưa được cấu hình!");
                    return;
                }

                // Tạo một User ID ngẫu nhiên cho phiên này
                const userId = Date.now().toString();
                // Lấy tên thật từ Redux (Nếu đã đăng nhập)
                let userName = "Khách_" + userId.slice(-4);
                if (user && user.fullName) {
                    const roleCode = typeof user.role === 'object' ? user.role?.roleCode : user.role;
                    if (roleCode === 'RECEPTIONIST' || roleCode === 'receptionist') {
                        userName = "Lễ tân: " + user.fullName;
                    } else {
                        userName = user.fullName;
                    }
                }

                // Tạo Token cho Zego
                const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                    appID,
                    serverSecret,
                    roomId,
                    userId,
                    userName
                );

                // Khởi tạo Zego UI Kit
                const zp = ZegoUIKitPrebuilt.create(kitToken);
                zpRef.current = zp;

                // Biến lưu trữ hẹn giờ
                let callTimeout: ReturnType<typeof setTimeout> | null = null;

                // Cấu hình UI và tham gia phòng
                if (isMounted) {
                    zp.joinRoom({
                        container: containerRef.current,
                        sharedLinks: [
                            {
                                name: 'Copy đường dẫn phòng',
                                url: window.location.origin + window.location.pathname
                            }
                        ],
                        scenario: {
                            mode: ZegoUIKitPrebuilt.OneONoneCall, // Giao diện gọi 1-1 tối ưu
                        },
                        showPreJoinView: false, // Bỏ qua màn test thiết bị, vào gọi ngay
                        turnOnCameraWhenJoining: true,
                        turnOnMicrophoneWhenJoining: true,
                        showLeaveRoomConfirmDialog: false,
                        onJoinRoom: () => {
                            // Bắt đầu đếm ngược 30 giây khi vào phòng
                            callTimeout = setTimeout(() => {
                                socket?.emit('end-video-call', { roomId });
                                // Tự render toast bằng DOM
                                const toast = document.createElement('div');
                                toast.className = "fixed top-10 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 bg-rose-600 text-white rounded-2xl shadow-2xl font-bold transition-all duration-500";
                                toast.innerText = "Lễ tân hiện đang bận. Vui lòng thử lại sau!";
                                document.body.appendChild(toast);
                                setTimeout(() => toast.remove(), 5000);

                                navigate(-1);
                            }, 30000);
                        },
                        onUserJoin: () => {
                            // Có người (Lễ tân/Khách) vào phòng -> Hủy đếm ngược
                            if (callTimeout) {
                                clearTimeout(callTimeout);
                                callTimeout = null;
                            }
                        },
                        onLeaveRoom: () => {
                            // Báo cho phía bên kia biết mình đã thoát
                            socket?.emit('end-video-call', { roomId });
                            // Khi khách hàng/lễ tân bấm nút đỏ "Kết thúc cuộc gọi"
                            navigate(-1); // Trở lại trang trước đó
                        }
                    });
                }
            } catch (err: any) {
                console.error("Lỗi khởi tạo Zego Room:", err);
                if (err?.message?.includes('Permission denied')) {
                    alert("Trình duyệt chặn truy cập Camera/Micro. Vui lòng cấp quyền để gọi Video!");
                }
            }
        };

        initMeeting();

        return () => {
            isMounted = false;
            if (zpRef.current) {
                try {
                    zpRef.current.destroy();
                } catch (e) { }
                zpRef.current = null;
            }

            // Đảm bảo phần cứng Camera/Micro phải được tắt hoàn toàn
            setTimeout(() => {
                const mediaElements = document.querySelectorAll('video, audio');
                mediaElements.forEach((el: any) => {
                    if (el.srcObject) {
                        el.srcObject.getTracks().forEach((track: any) => track.stop());
                    }
                });
            }, 500);
        };
    }, [roomId, navigate]); // Bỏ 'user' khỏi dependency để không bị re-render khi user update

    return (
        <div className="w-full h-screen bg-[#1c1f2e] flex flex-col items-center justify-center relative">
            {/* Vùng chứa giao diện Video Call của Zego */}
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ width: '100vw', height: '100vh' }}
            />
        </div>
    );
}
