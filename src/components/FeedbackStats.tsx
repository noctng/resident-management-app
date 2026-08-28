import React, { useMemo } from 'react';
import { Feedback } from '../types';
import { ChatBubbleBottomCenterTextIcon, CheckCircleIcon } from './icons';

interface FeedbackStatsProps {
  feedbackList: Feedback[];
  onFilterChange: (status: 'ALL' | 'SUBMITTED' | 'RESOLVED') => void;
  currentFilter: 'ALL' | 'SUBMITTED' | 'RESOLVED';
}

const FeedbackStats: React.FC<FeedbackStatsProps> = ({
  feedbackList,
  onFilterChange,
  currentFilter,
}) => {
  const stats = useMemo(() => {
    const submitted = feedbackList.filter((f) => f.status === 'SUBMITTED').length;
    const resolved = feedbackList.filter((f) => f.status === 'RESOLVED').length;
    return { submitted, resolved };
  }, [feedbackList]);

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div
        onClick={() => onFilterChange('SUBMITTED')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFilterChange('SUBMITTED')}
        className={`bg-surface rounded-xl shadow-xs p-4 flex items-center justify-between cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 border-2 ${currentFilter === 'SUBMITTED' ? 'border-accent ring-2 ring-accent/20' : 'border-brand-border hover:border-accent/40'}`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-brand-warning-soft text-brand-warning">
            <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-soft">Đã gửi</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-ink">{stats.submitted}</p>
          </div>
        </div>
      </div>

      <div
        onClick={() => onFilterChange('RESOLVED')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFilterChange('RESOLVED')}
        className={`bg-surface rounded-xl shadow-xs p-4 flex items-center justify-between cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 border-2 ${currentFilter === 'RESOLVED' ? 'border-accent ring-2 ring-accent/20' : 'border-brand-border hover:border-accent/40'}`}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-brand-success-soft text-brand-success">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink-soft">Đã xử lý</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-ink">{stats.resolved}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackStats;
