import React, { useState } from 'react';
import { ContractLifecycleEvent } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PencilIcon, ArrowPathIcon, BanknotesIcon, KeyIcon } from '../icons';
import { formatDate } from '../../utils/formatters';

interface Props {
  events: ContractLifecycleEvent[];
  onRefresh: () => void;
}

const ContractLifecycleTimeline: React.FC<Props> = ({ events, onRefresh }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'DEPOSIT':
        return (
          <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center">
            <BanknotesIcon className="w-5 h-5 text-accent-ink" />
          </div>
        );
      case 'SIGNED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-success-soft flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 text-brand-success" />
          </div>
        );
      case 'AMENDED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-warning-soft flex items-center justify-center">
            <PencilIcon className="w-5 h-5 text-brand-warning" />
          </div>
        );
      case 'TRANSFERRED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-teal-soft flex items-center justify-center">
            <ArrowPathIcon className="w-5 h-5 text-brand-teal" />
          </div>
        );
      case 'PAYMENT_RECEIVED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-success-soft flex items-center justify-center border border-brand-success/30">
            <BanknotesIcon className="w-5 h-5 text-brand-success" />
          </div>
        );
      case 'HANDOVER':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-teal-soft flex items-center justify-center">
            <KeyIcon className="w-5 h-5 text-brand-teal" />
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-success-soft flex items-center justify-center">
            <CheckCircleIcon className="w-5 h-5 text-brand-success" />
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="w-8 h-8 rounded-full bg-brand-danger-soft flex items-center justify-center">
            <XCircleIcon className="w-5 h-5 text-brand-danger" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-surface-alt flex items-center justify-center">
            <ClockIcon className="w-5 h-5 text-ink-soft" />
          </div>
        );
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      DEPOSIT: 'Đặt cọc',
      SIGNED: 'Ký hợp đồng',
      AMENDED: 'Phụ lục điều chỉnh',
      TRANSFERRED: 'Chuyển nhượng',
      PAYMENT_RECEIVED: 'Thanh toán',
      HANDOVER: 'Bàn giao',
      COMPLETED: 'Hoàn tất',
      CANCELLED: 'Hủy bỏ',
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-ink">Lịch sử Hợp đồng</h3>
        <button
          onClick={onRefresh}
          className="text-sm text-accent hover:text-accent-hover cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded transition-colors duration-200"
        >
          Làm mới
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-ink-soft">Chưa có sự kiện nào</div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 border-l-2 border-brand-border/60"></div>

          {/* Events */}
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">{getEventIcon(event.event_type)}</div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="bg-surface rounded-lg border border-brand-border p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-semibold text-ink">
                        {getEventLabel(event.event_type)}
                      </h4>
                      <span className="font-mono text-xs text-ink-soft">
                        {formatDate(event.event_date)}
                      </span>
                    </div>

                    {event.notes && (
                      <p className="text-sm text-ink-soft mb-2">{event.notes}</p>
                    )}

                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-surface-alt rounded text-xs">
                        <pre className="text-ink-soft overflow-x-auto">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div className="mt-2 font-mono text-xs text-ink-soft">
                      {new Date(event.event_date).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractLifecycleTimeline;
