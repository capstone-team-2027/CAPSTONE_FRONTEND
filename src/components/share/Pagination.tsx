import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-1.5 mt-8">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
          currentPage === 1
            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
        }`}
      >
        {t('common.prev', 'Trước')}
      </button>
      {Array.from({ length: totalPages }).map((_, index) => {
        const pageNumber = index + 1;
        return (
          <button
            type="button"
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`w-8 h-8 rounded-xl text-[11px] font-bold transition-all ${
              currentPage === pageNumber
                ? 'bg-brand-blue text-white shadow-md shadow-blue-900/10'
                : 'bg-white text-brand-blue border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {pageNumber}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
          currentPage === totalPages
            ? 'text-gray-300 bg-gray-50/50 border border-gray-100 cursor-not-allowed'
            : 'text-brand-blue bg-white border border-gray-200 hover:bg-gray-50'
        }`}
      >
        {t('common.next', 'Sau')}
      </button>
    </div>
  );
}
