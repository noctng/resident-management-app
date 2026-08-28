import React, { useState } from 'react';
import { HandoverChecklistItem } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../icons';

interface Props {
  checklist: HandoverChecklistItem[];
  onUpdateItem: (itemId: string, isCompleted: boolean, notes?: string) => Promise<void>;
  onCreateChecklist: () => Promise<void>;
  eligibility?: {
    eligible: boolean;
    conditions: any;
  };
}

const HandoverChecklistView: React.FC<Props> = ({
  checklist,
  onUpdateItem,
  onCreateChecklist,
  eligibility,
}) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const handleToggle = async (item: HandoverChecklistItem) => {
    setUpdating(item.id);
    try {
      await onUpdateItem(item.id, !item.is_completed, item.notes);
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveNotes = async (item: HandoverChecklistItem) => {
    setUpdating(item.id);
    try {
      await onUpdateItem(item.id, item.is_completed, noteText);
      setEditingNotes(null);
      setNoteText('');
    } finally {
      setUpdating(null);
    }
  };

  const completedCount = checklist.filter((i) => i.is_completed).length;
  const requiredCount = checklist.filter((i) => i.is_required).length;
  const completedRequired = checklist.filter((i) => i.is_required && i.is_completed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">Checklist Bàn giao</h3>
        {checklist.length === 0 && (
          <button
            onClick={onCreateChecklist}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 text-sm"
          >
            Tạo Checklist
          </button>
        )}
      </div>

      {/* Progress */}
      {checklist.length > 0 && (
        <div className="bg-surface-alt rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">
              Tiến độ: {completedCount}/{checklist.length} mục
            </span>
            <span className="text-sm text-ink-soft">
              Bắt buộc: {completedRequired}/{requiredCount}
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-200"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Eligibility Status */}
      {eligibility && (
        <div
          className={`p-4 rounded-lg border ${
            eligibility.eligible
              ? 'bg-brand-success-soft border border-brand-success/30'
              : 'bg-brand-warning-soft border border-brand-warning/30'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {eligibility.eligible ? (
              <CheckCircleIcon className="w-5 h-5 text-brand-success" />
            ) : (
              <XCircleIcon className="w-5 h-5 text-brand-warning" />
            )}
            <span
              className={`font-semibold ${
                eligibility.eligible
                  ? 'text-brand-success'
                  : 'text-brand-warning'
              }`}
            >
              {eligibility.eligible ? 'Đủ điều kiện bàn giao' : 'Chưa đủ điều kiện'}
            </span>
          </div>
          <div className="text-sm space-y-1 ml-7">
            <div
              className={
                eligibility.conditions.paymentComplete
                  ? 'text-brand-success'
                  : 'text-brand-danger'
              }
            >
              • Thanh toán: {eligibility.conditions.paymentPercentage}%
              {eligibility.conditions.paymentComplete ? ' ✓' : ' (cần ≥ 95%)'}
            </div>
            <div
              className={
                eligibility.conditions.checklistComplete
                  ? 'text-brand-success'
                  : 'text-brand-danger'
              }
            >
              • Checklist: {eligibility.conditions.completedItemsTotal}/
              {eligibility.conditions.requiredItemsTotal}
              {eligibility.conditions.checklistComplete ? ' ✓' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklist.map((item) => (
          <div
            key={item.id}
            className="bg-surface rounded-lg border border-brand-border p-4"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => handleToggle(item)}
                disabled={updating === item.id}
                aria-label={item.is_completed ? 'Đánh dấu chưa hoàn tất' : 'Đánh dấu hoàn tất'}
                className="mt-0.5 flex-shrink-0 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
              >
                {item.is_completed ? (
                  <CheckCircleIcon className="w-5 h-5 text-brand-success" />
                ) : (
                  <span className="block w-5 h-5 rounded-full border-2 border-brand-border" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      item.is_completed
                        ? 'text-ink-soft line-through'
                        : 'text-ink'
                    }`}
                  >
                    {item.item_name}
                  </span>
                  {item.is_required && (
                    <span className="text-xs bg-brand-danger-soft text-brand-danger px-2 py-0.5 rounded-full">
                      Bắt buộc
                    </span>
                  )}
                </div>

                {item.is_completed && item.completed_at && (
                  <div className="font-mono text-xs text-ink-soft mt-1">
                    Hoàn tất: {new Date(item.completed_at).toLocaleString('vi-VN')}
                  </div>
                )}

                {item.notes && (
                  <div className="mt-2 text-sm text-ink-soft bg-surface-alt p-2 rounded">
                    {item.notes}
                  </div>
                )}

                {editingNotes === item.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="w-full px-3 py-2 border border-brand-border rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
                      rows={2}
                      placeholder="Ghi chú..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveNotes(item)}
                        disabled={updating === item.id}
                        className="px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => {
                          setEditingNotes(null);
                          setNoteText('');
                        }}
                        className="px-3 py-1 bg-surface border border-brand-border text-ink rounded text-sm hover:bg-surface-alt transition-colors duration-200 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingNotes(item.id);
                      setNoteText(item.notes || '');
                    }}
                    className="mt-2 text-xs text-accent hover:text-accent-hover hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
                  >
                    {item.notes ? 'Sửa ghi chú' : 'Thêm ghi chú'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {checklist.length === 0 && (
        <div className="text-center py-8 text-ink-soft">
          Chưa có checklist. Nhấn "Tạo Checklist" để bắt đầu.
        </div>
      )}
    </div>
  );
};

export default HandoverChecklistView;
