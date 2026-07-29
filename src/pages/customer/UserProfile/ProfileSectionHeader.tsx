import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface ProfileSectionHeaderProps {
  title: string;
  description?: string;
}

export default function ProfileSectionHeader({ title, description }: ProfileSectionHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Quay lại"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#00285E] hover:bg-gray-50 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div>
        <h2 className="text-2xl font-display font-bold text-[#00285E] tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
