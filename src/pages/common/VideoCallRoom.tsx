import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { useSocket } from '../../hook/useSocket';
import { Menu, MapPin, X, PhoneOff, Loader2 } from 'lucide-react';
import { useFetchClient_v2 } from '../../hook/useFetchClient';
import { LOCATION_ENDPOINTS } from '../../constants/customer/locationEndpoints';

export default function VideoCallRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const zpRef = useRef<any>(null);
    const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const user = useSelector((state: RootState) => state.user.user as any);
    const socket = useSocket();

    const roleCodeStr = (typeof user?.role === 'object' ? user?.role?.roleCode : user?.role)?.toLowerCase();
    const isCustomer = roleCodeStr === 'customer';

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { fetchPrivate } = useFetchClient_v2();

    // Lễ tân chỉ tới trang này SAU KHI đã bấm "Nghe máy" (ReceptionLayout.tsx) nên vào phòng
    // ngay. Khách hàng phải chờ 'call-answered' — chưa bật camera/mic, chưa join Zego room.
    const [hasReceptionistAnswered, setHasReceptionistAnswered] = useState(!isCustomer);
    const [isTimedOut, setIsTimedOut] = useState(false);

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
                if (data.reason === 'rejected') {
                    showGlobalToast('Lễ tân đã từ chối cuộc gọi!');
                } else {
                    showGlobalToast('Bên kia đã kết thúc cuộc gọi!');
                }
                forceStopMedia();
                navigate(-1);
            }
        };

        const handleCallAnswered = (data: any) => {
            if (data.roomId === roomId) {
                // Trạng thái: Lễ tân ĐÃ NHẬN cuộc gọi.
                // Lập tức hủy đếm ngược để không bị báo "Lễ tân bận" oan, và cho phép join Zego.
                if (callTimeoutRef.current) {
                    clearTimeout(callTimeoutRef.current);
                    callTimeoutRef.current = null;
                }
                setHasReceptionistAnswered(true);
            }
        };

        socket.on('end-video-call', handleCallEnded);
        socket.on('call-answered', handleCallAnswered);

        return () => {
            socket.off('end-video-call', handleCallEnded);
            socket.off('call-answered', handleCallAnswered);
        };
    }, [socket, roomId, navigate]);

    // Đếm ngược 60s ngay khi khách vào màn chờ (KHÔNG phụ thuộc Zego room) — nếu lễ tân không
    // bấm "Nghe máy" kịp, báo "đang bận" và quay lại, chưa từng bật camera/mic của khách.
    useEffect(() => {
        if (!isCustomer || hasReceptionistAnswered) return;

        callTimeoutRef.current = setTimeout(() => {
            setIsTimedOut(true);
            socket?.emit('end-video-call', { roomId });
        }, 60000);

        return () => {
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }
        };
    }, [isCustomer, hasReceptionistAnswered, socket, roomId]);

    useEffect(() => {
        if (!roomId || !containerRef.current || !hasReceptionistAnswered) return;

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
                        // Không cần đếm ngược ở đây nữa — effect join Zego này chỉ chạy SAU KHI
                        // hasReceptionistAnswered đã true (lễ tân đã bấm nghe), đếm ngược 60s
                        // chờ lễ tân đã được xử lý ở effect riêng trước khi vào tới bước này.
                        onLeaveRoom: () => {
                            if (!isMounted) return;
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
            
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current);
                callTimeoutRef.current = null;
            }

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
    }, [roomId, navigate, hasReceptionistAnswered]); // Bỏ 'user' khỏi dependency để không bị re-render khi user update

    const handleUpdateLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    fetchPrivate(LOCATION_ENDPOINTS.UPDATE_LOCATION, "PATCH", {
                        latitude: lat,
                        longitude: lng
                    }).then(() => {
                        alert("Đã gửi vị trí GPS của bạn thành công. Lễ tân hiện đã có thể điều phối cứu hộ đến chỗ bạn!");
                    }).catch(err => {
                        console.error("Lỗi khi lưu vị trí", err);
                        alert("Cập nhật vị trí thất bại. Vui lòng thử lại!");
                    });
                },
                (error) => {
                    console.error("Lỗi lấy vị trí: ", error);
                    alert("Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập GPS trên trình duyệt hoặc điện thoại.");
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert("Trình duyệt/Thiết bị của bạn không hỗ trợ định vị GPS.");
        }
        setIsMenuOpen(false);
    };

    // Màn chờ hiển thị cho khách hàng TRƯỚC KHI lễ tân bấm "Nghe máy" — chưa bật camera/mic,
    // chưa vào phòng Zego thật sự.
    if (isCustomer && !hasReceptionistAnswered) {
        return (
            <div className="w-full h-screen bg-[#1c1f2e] flex flex-col items-center justify-center relative px-6 text-center">
                {isTimedOut ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
                            <PhoneOff size={36} className="text-rose-500" />
                        </div>
                        <h2 className="text-white text-xl font-bold mb-2">Lễ tân hiện đang bận</h2>
                        <p className="text-white/60 text-sm mb-8 max-w-sm">
                            Không có lễ tân nào tiếp nhận cuộc gọi. Vui lòng thử lại sau ít phút.
                        </p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors"
                        >
                            Quay lại
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 relative">
                            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                            <Loader2 size={36} className="text-red-500 animate-spin relative z-10" />
                        </div>
                        <h2 className="text-white text-xl font-bold mb-2">Đang chờ lễ tân tiếp nhận...</h2>
                        <p className="text-white/60 text-sm mb-8 max-w-sm">
                            Yêu cầu hỗ trợ khẩn cấp của bạn đã được gửi. Camera/micro sẽ chỉ bật khi lễ tân bắt đầu cuộc gọi.
                        </p>
                        <button
                            onClick={() => {
                                socket?.emit('end-video-call', { roomId });
                                navigate(-1);
                            }}
                            className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold transition-colors flex items-center gap-2"
                        >
                            <PhoneOff size={18} />
                            Huỷ yêu cầu
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-[#1c1f2e] flex flex-col items-center justify-center relative">
            {/* Vùng chứa giao diện Video Call của Zego */}
            <div
                ref={containerRef}
                className="w-full h-full"
                style={{ width: '100vw', height: '100vh' }}
            />

            {/* Menu chức năng mở rộng cho Customer */}
            {isCustomer && (
                <div className="absolute top-4 left-4 z-[10000]">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all shadow-lg"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-14 left-0 w-64 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
                            <button 
                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-white/20 text-white transition-all text-left"
                                onClick={handleUpdateLocation}
                            >
                                <MapPin size={20} />
                                <span className="font-medium text-sm">Cập nhật vị trí</span>
                            </button>
                            {/* Có thể thêm các tính năng khác tại đây */}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
