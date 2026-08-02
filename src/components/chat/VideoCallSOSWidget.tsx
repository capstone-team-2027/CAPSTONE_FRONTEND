import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../hook/useSocket';

export default function VideoCallSOSWidget() {
    const navigate = useNavigate();
    const socket = useSocket();
    const [isHovered, setIsHovered] = useState(false);

    const handleStartVideoCall = () => {
        const roomId = `sos_${Date.now()}`;
        if (socket) {
            socket.emit('request-video-call', {
                roomId,
                timestamp: new Date()
            });
        }
        navigate(`/video-call/${roomId}`);
    };

    return (
        <div
            className="fixed bottom-[168px] right-6 z-[9997] flex flex-col items-end"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="mb-3 w-72 bg-red-50 border border-red-100 rounded-2xl p-4 shadow-2xl flex items-start gap-3 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl"></div>
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-xl shrink-0 mt-0.5 relative z-10">
                            <Video size={20} />
                        </div>
                        <div className="relative z-10 text-left">
                            <h4 className="text-red-700 font-bold text-sm mb-1">Cần hỗ trợ khẩn cấp (SOS)?</h4>
                            <p className="text-xs text-red-600/80 leading-relaxed m-0">
                                Nhấn vào nút <Phone size={11} className="inline align-text-bottom mx-0.5" /> ở góc dưới bên phải màn hình để gọi Video trực tiếp với Lễ tân và quay tình trạng xe của bạn qua Camera.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStartVideoCall}
                className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(220,38,38,0.4)] transition-all z-50 group animate-pulse"
                style={{ backgroundColor: '#DC2626' }}
            >
                <Phone className="w-6 h-6 text-white" />
                <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: '#DC2626' }}></span>
            </motion.button>
        </div>
    );
}
