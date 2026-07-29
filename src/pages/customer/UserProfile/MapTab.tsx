import { motion } from 'framer-motion';
import { MapTracking } from '../../../components/share/MapTracking';
import ProfileSectionHeader from './ProfileSectionHeader';

export default function MapTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6 text-left h-full"
    >
      <div className="border-b border-gray-100 pb-5">
        <ProfileSectionHeader
          title="Bản đồ Cứu hộ & Vị trí"
          description="Chia sẻ vị trí xe hỏng của bạn để gọi xe cứu hộ từ AGM Intelligent Garage."
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col min-h-[600px]"
      >
        <MapTracking />
      </motion.div>
    </motion.div>
  );
}
