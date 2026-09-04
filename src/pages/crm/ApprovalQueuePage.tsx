import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ApprovalWorkflow } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../../components/icons';
import { useToast, useConfirm } from '../../components/ui';
import { EmptyState } from '../../components/ui';

interface Props {
  onBack: () => void;
}

const ApprovalQueuePage: React.FC<Props> = ({ onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalWorkflow | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const data = await api.get<ApprovalWorkflow[]>('/approvals/pending');
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!(await confirm({ title: 'Phê duyệt yêu cầu', description: 'Bạn có chắc muốn phê duyệt yêu cầu này?', variant: 'primary' }))) return;

    try {
      setProcessing(true);
      await api.post(`/approvals/${id}/approve`, {});
      toast.success('Đã phê duyệt thành công');
      loadApprovals();
      setSelectedApproval(null);
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Lỗi phê duyệt');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/approvals/${id}/reject`, { reason: rejectionReason });
      toast.success('Đã từ chối yêu cầu');
      loadApprovals();
      setSelectedApproval(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error('Lỗi từ chối');
    } finally {
      setProcessing(false);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      EXTENSION: 'Gia hạn thanh toán',
      DISCOUNT: 'Giảm giá',
      TRANSFER: 'Chuyển nhượng',
      CANCELLATION: 'Hủy hợp đồng',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-success-soft text-brand-success rounded-full text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success"></span>
            Đã duyệt
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-danger-soft text-brand-danger rounded-full text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-danger"></span>
            Từ chối
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-warning-soft text-brand-warning rounded-full text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-warning"></span>
            Chờ duyệt
          </span>
        );
    }
  };

  const filteredApprovals = approvals.filter((a) => filter === 'ALL' || a.status === filter);

  if (loading) {
    return (
      <div className="p-12 text-center text-ink-soft">
        <div className="mx-auto mb-3 w-8 h-8 border-2 border-brand-border border-t-accent rounded-full animate-spin"></div>
        Đang tải danh sách phê duyệt...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Hàng đợi Phê duyệt</h1>
          <p className="text-sm text-ink-soft mt-1">
            Quản lý và xử lý các yêu cầu thay đổi hợp đồng
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-ink bg-surface border border-brand-border hover:bg-surface-alt rounded-lg shadow-sm transition-colors duration-200 text-sm font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Quay lại
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-1 bg-surface-alt rounded-xl w-fit">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              filter === f
                ? 'bg-surface text-accent shadow-sm ring-1 ring-accent/30'
                : 'text-ink-soft hover:text-ink hover:bg-surface'
            }`}
          >
            {f === 'ALL'
              ? 'Tất cả'
              : f === 'PENDING'
                ? 'Chờ duyệt'
                : f === 'APPROVED'
                  ? 'Đã duyệt'
                  : 'Từ chối'}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      <div className="space-y-4">
        {filteredApprovals.length === 0 ? (
          <EmptyState
            icon={ClockIcon}
            tone="neutral"
            title="Không có yêu cầu nào"
            description={
              filter === 'ALL'
                ? 'Không có yêu cầu phê duyệt nào trong hệ thống.'
                : 'Không có yêu cầu nào phù hợp với bộ lọc hiện tại.'
            }
            size="md"
          />
        ) : (
          filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              className="bg-surface rounded-xl border border-brand-border shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200 p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-bold text-ink">
                      {getRequestTypeLabel(approval.request_type)}
                    </h2>
                    {getStatusBadge(approval.status)}
                  </div>
                  <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-soft"></span>
                      Yêu cầu bởi:{' '}
                      <span className="font-medium text-ink">{approval.requested_by}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink-soft"></span>
                      Thời gian:{' '}
                      <span className="font-medium text-ink">
                        {new Date(approval.requested_at).toLocaleString('vi-VN')}
                      </span>
                    </span>
                  </div>
                </div>
                {approval.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg shadow-sm text-sm font-medium transition-colors duration-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Phê duyệt
                    </button>
                    <button
                      onClick={() => setSelectedApproval(approval)}
                      disabled={processing}
                      className="px-4 py-2 bg-brand-danger text-white hover:brightness-95 rounded-lg shadow-sm text-sm font-medium transition-all duration-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Từ chối
                    </button>
                  </div>
                )}
              </div>

              {approval.request_data && (
                <div className="mt-4 bg-surface-alt rounded-lg border border-brand-border overflow-hidden">
                  <div className="px-4 py-2 bg-surface-alt/60 border-b border-brand-border">
                    <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                      Chi tiết yêu cầu
                    </p>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs text-ink-soft font-mono tabular-nums">
                      {JSON.stringify(approval.request_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {approval.status === 'REJECTED' && approval.rejection_reason && (
                <div className="mt-4 p-4 bg-brand-danger-soft rounded-lg border border-brand-danger/20 flex gap-3">
                  <div className="text-brand-danger mt-0.5">
                    <XCircleIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-brand-danger mb-1">Lý do từ chối</p>
                    <p className="text-sm text-brand-danger">{approval.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Rejection Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface rounded-xl shadow-elevation-raised w-full max-w-md overflow-hidden transition-all">
            <div className="p-6">
              <h2 className="text-lg font-bold text-ink mb-2">Từ chối yêu cầu</h2>
              <p className="text-sm text-ink-soft mb-4">
                Vui lòng nhập lý do từ chối yêu cầu này. Lý do sẽ được gửi thông báo đến người yêu
                cầu.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all duration-200"
                rows={4}
                placeholder="Nhập lý do từ chối..."
                autoFocus
              />
            </div>
            <div className="bg-surface-alt px-6 py-4 flex gap-3 justify-end border-t border-brand-border">
              <button
                onClick={() => {
                  setSelectedApproval(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 bg-surface border border-brand-border text-ink hover:bg-surface-alt rounded-lg text-sm font-medium transition-colors duration-200 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleReject(selectedApproval.id)}
                disabled={processing}
                className="px-4 py-2 bg-brand-danger text-white hover:brightness-95 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueuePage;
