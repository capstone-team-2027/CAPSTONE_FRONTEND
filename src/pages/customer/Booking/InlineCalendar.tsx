import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InlineCalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
}

export default function InlineCalendar({ selectedDate, onChange, minDate, maxDate }: InlineCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate ? new Date(selectedDate) : new Date());

  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate));
    }
  }, [selectedDate]);

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(year, month, day);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;

    if (minDate && formatted < minDate) return;
    if (maxDate && formatted > maxDate) return;

    onChange(formatted);
  };

  const renderDays = () => {
    const days = [];
    const minD = minDate ? minDate : '0000-00-00';
    const maxD = maxDate ? maxDate : '9999-99-99';

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-[34px] h-[34px]"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const current = new Date(year, month, i);
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const formatted = `${y}-${m}-${d}`;

      const isSelected = selectedDate === formatted;
      const isDisabled = formatted < minD || formatted > maxD;
      const isToday = formatted === new Date().toISOString().split('T')[0];

      days.push(
        <button
          key={i}
          onClick={() => handleDateClick(i)}
          disabled={isDisabled}
          className={`w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] transition-all mx-auto
            ${isSelected ? 'bg-[#3b82f6] text-white font-bold' : ''}
            ${!isSelected && !isDisabled ? 'hover:bg-gray-100 text-gray-700' : ''}
            ${isDisabled ? 'text-gray-300 cursor-not-allowed' : ''}
            ${isToday && !isSelected ? 'text-[#3b82f6] font-bold' : ''}
          `}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleClear = () => {
    onChange('');
  }

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    const formatted = `${y}-${m}-${d}`;
    if (minDate && formatted < minDate) return;
    if (maxDate && formatted > maxDate) return;

    onChange(formatted);
  }

  return (
    <div className="w-full flex flex-col gap-2 relative">
      {/* Date Header matching the input field */}
      <div className="w-full bg-[#F8FAFC] border border-blue-50/50 rounded-xl md:rounded-2xl p-4 text-xs md:text-sm outline-none transition-all text-brand-blue flex justify-between items-center">
        <span>{selectedDate ? `${selectedDate.split('-')[1]}/${selectedDate.split('-')[2]}/${selectedDate.split('-')[0]}` : 'MM/DD/YYYY'}</span>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
      </div>

      <div className="w-full max-w-[320px] bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-4 font-sans select-none">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="font-bold text-[14px] text-gray-800">{monthNames[month]} {year}</span>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-[11px] font-bold text-gray-400 tracking-wide">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 gap-x-1">
          {renderDays()}
        </div>

        <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 px-1 text-[13px] text-[#3b82f6] font-semibold">
          <button onClick={handleClear} className="hover:text-blue-800 transition-colors">Clear</button>
          <button onClick={handleToday} className="hover:text-blue-800 transition-colors">Today</button>
        </div>
      </div>
    </div>
  );
}
