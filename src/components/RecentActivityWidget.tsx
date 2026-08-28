import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  ClockIcon,
  UserIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  PlusIcon,
} from './icons';
import { formatDate } from '../utils/formatters';

interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  details: string;
  timestamp: string;
}

const ACTIVITY_CHIP_CLASSES = [
  'bg-accent-soft text-accent-ink',
  'bg-brand-teal-soft text-brand-teal',
  'bg-brand-warning-soft text-brand-warning',
];

const getActivityDotClass = (action: string) => {
  switch (action) {
    case 'CREATE':
    case 'CONFIRM_PAYMENT':
      return 'bg-brand-success';
    case 'UPDATE':
      return 'bg-brand-warning';
    case 'DELETE':
    case 'CANCEL_CONTRACT':
      return 'bg-brand-danger';
    case 'CONVERT_TO_RESIDENT':
    case 'SEND_EMAIL':
    case 'GỬI_EMAIL':
      return 'bg-brand-teal';
    default:
      return 'bg-ink-soft';
  }
};

const RecentActivityWidget: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const response = await api.get<{ logs: ActivityLog[] }>('/activity-logs?limit=10');
      setActivities(response.logs || []);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <PlusIcon className="w-4 h-4" />;
      case 'UPDATE':
        return <PencilIcon className="w-4 h-4" />;
      case 'DELETE':
        return <TrashIcon className="w-4 h-4" />;
      case 'CONFIRM_PAYMENT':
        return <CheckCircleIcon className="w-4 h-4" />;
      case 'CANCEL_CONTRACT':
        return <TrashIcon className="w-4 h-4" />;
      case 'CONVERT_TO_RESIDENT':
        return <UserIcon className="w-4 h-4" />;
      case 'SEND_EMAIL':
      case 'GỬI_EMAIL':
        return <EnvelopeIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getActivityText = (activity: ActivityLog) => {
    try {
      // Try to parse JSON details
      const parsed = JSON.parse(activity.details);
      if (parsed && typeof parsed === 'object') {
        // Structured log with message
        const message = parsed.message || activity.details;
        return (
          <>
            <span className="font-semibold text-ink">{activity.username}</span> - {message}
            {activity.targetName && (
              <span className="text-ink-soft"> ({activity.targetName})</span>
            )}
          </>
        );
      }
    } catch (e) {
      // Not JSON, use plain text
    }

    // Fallback to plain text details
    return (
      <>
        <span className="font-semibold text-ink">{activity.username}</span> - {activity.details}
        {activity.targetName && (
          <span className="text-ink-soft"> ({activity.targetName})</span>
        )}
      </>
    );
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDate(timestamp);
  };

  const handleActivityClick = (activity: ActivityLog) => {
    // Navigate based on target type
    if (activity.targetType === 'CONTRACT' && activity.targetId) {
      navigate(`/crm/contracts/${activity.targetId}`);
    } else if (activity.targetType === 'CUSTOMER' && activity.targetId) {
      navigate(`/crm/customers/${activity.targetId}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface p-6 rounded-2xl shadow-sm border border-brand-border">
        <div className="text-center text-ink-soft">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-brand-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-ink flex items-center gap-2">
          <ClockIcon className="w-5 h-5" />
          Hoạt động Gần đây
        </h3>
        <button
          onClick={loadActivities}
          className="text-sm text-accent hover:text-accent-hover font-semibold transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
        >
          Làm mới
        </button>
      </div>

      <div className="space-y-1">
        {activities.length === 0 ? (
          <div className="text-center text-ink-soft py-8">Chưa có hoạt động nào</div>
        ) : (
          activities.map((activity, idx) => (
            <div
              key={activity.id}
              onClick={() => handleActivityClick(activity)}
              className="group flex gap-3 p-3 rounded-lg hover:bg-surface-alt/70 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ACTIVITY_CHIP_CLASSES[idx % ACTIVITY_CHIP_CLASSES.length]}`}
                >
                  {getActivityIcon(activity.action)}
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-2 ring-surface ${getActivityDotClass(activity.action)}`}
                  ></span>
                </div>
                {idx < activities.length - 1 && (
                  <div className="w-px flex-1 min-h-[16px] my-1 border-l border-brand-border/60"></div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-ink">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-ink-faint mt-1">{getTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivityWidget;
