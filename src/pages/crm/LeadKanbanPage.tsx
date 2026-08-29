import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { CrmLead, LeadStatus, RealEstatePhase } from '../../types';
import { useToast } from '../../components/ui';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '../../components/icons';

interface LeadKanbanPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  

}

const STAGES: Array<{ key: LeadStatus; label: string }> = [
  { key: 'NEW', label: '1. Mới Tiếp Nhận' },
  { key: 'CONTACTED', label: '2. Đã Tiếp Cận' },
  { key: 'INTERESTED', label: '3. Quan Tâm' },
  { key: 'SITE_VISIT', label: '4. Xem Thực Tế' },
  { key: 'QUALIFIED', label: '5. Đủ Điều Kiện' },
];

export const LeadKanbanPage: React.FC<LeadKanbanPageProps> = ({ onNavigate, onBack, onNavigate: _onNavigate }) => {
  const toast = useToast();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLead, setNewLead] = useState<Partial<CrmLead>>({
    name: '',
    phone_number: '',
    email: '',
    source: 'WALK_IN',
    phase_interest: 'TESLA',
    budget_range: '6 - 8 Tỷ',
    lead_score: 'HOT',
    notes: '',
  });

  useEffect(() => {
    loadLeads();
  }, [phaseFilter]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(phaseFilter !== 'ALL' ? { phase: phaseFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {}),
      });

      const res: any = await api.get(`/crm/leads?${params.toString()}`);
      if (res && res.success) {
        setLeads(res.leads || []);
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post('/crm/leads', newLead);
      if (res && res.success) {
        setIsAddModalOpen(false);
        setNewLead({
          name: '',
          phone_number: '',
          email: '',
          source: 'WALK_IN',
          phase_interest: 'TESLA',
          budget_range: '6 - 8 Tỷ',
          lead_score: 'HOT',
          notes: '',
        });
        loadLeads();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo Lead');
    }
  };

  const handleUpdateStatus = async (leadId: string, nextStatus: LeadStatus) => {
    try {
      await api.put(`/crm/leads/${leadId}`, { status: nextStatus });
      loadLeads();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const getScoreBadge = (score?: string) => {
    switch (score) {
      case 'HOT': return { badge: 'bg-brand-danger-soft text-brand-danger', dot: 'bg-brand-danger' };
      case 'WARM': return { badge: 'bg-brand-warning-soft text-brand-warning', dot: 'bg-brand-warning' };
      default: return { badge: 'bg-surface-alt text-ink-soft', dot: 'bg-ink-soft' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <CrmSubNav current="leads" title="Phễu Khách Hàng (Leads)" subtitle="Quản lý 3 tầng phễu: Mới tiếp cận, Đang tư vấn, Đã chốt" onNavigate={onNavigate} onBack={onBack} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-primary-600" />
            Phễu Khách Hàng Tiềm Năng (CRM Lead Pipeline)
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Quản trị luồng khách hàng 3 tầng: Lead ➔ Cơ hội gắn căn ➔ Hợp đồng Mua bán
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors duration-200 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Thêm Lead Mới</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-brand-border flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft font-medium">Phân khu quan tâm:</span>
          <div className="flex items-center bg-surface-alt p-1 rounded-xl">
            {['ALL', 'TESLA', 'CANTATA', 'NOXH'].map((p) => (
              <button
                key={p}
                onClick={() => setPhaseFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer ${
                  phaseFilter === p
                    ? 'bg-surface text-accent shadow-xs'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {p === 'ALL' ? 'Tất cả' : p}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <MagnifyingGlassIcon className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
          />
        </div>
      </div>

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="bg-surface p-16 rounded-xl border border-brand-border text-center text-ink-soft">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-3" />
          <p className="text-sm font-medium">Đang tải danh sách khách hàng tiềm năng...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAGES.map((col) => {
            const columnLeads = leads.filter((l) => (l.status || 'NEW') === col.key);

            return (
              <div
                key={col.key}
                className="bg-surface-alt/50 rounded-xl p-3 flex flex-col min-h-[480px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-3">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                    {col.label}
                  </span>
                  <span className="text-xs font-bold text-ink-soft bg-surface px-2 py-0.5 rounded-full shadow-xs">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Lead Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnLeads.map((lead) => {
                    const scoreBadge = getScoreBadge(lead.lead_score);
                    return (
                      <div
                        key={lead.id}
                        className="bg-surface border border-brand-border rounded-lg shadow-xs p-3 hover:shadow-md transition-shadow duration-200 cursor-pointer space-y-2 relative"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-ink leading-tight">
                            {lead.name}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadge.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${scoreBadge.dot}`} />
                            {lead.lead_score || 'HOT'}
                          </span>
                        </div>

                        <div className="text-[11px] text-ink-soft space-y-1">
                          <div className="flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3 text-ink-faint" />
                            <span className="font-mono">{lead.phone_number}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="bg-surface-alt text-ink rounded-full px-1.5 py-0.5 font-semibold">
                              {lead.phase_interest || 'TESLA'}
                            </span>
                            <span className="text-ink-soft">{lead.budget_range || '5 - 8 Tỷ'}</span>
                          </div>
                        </div>

                        {lead.notes && (
                          <p className="text-[10px] text-ink-soft italic bg-surface-alt p-1.5 rounded line-clamp-2">
                            "{lead.notes}"
                          </p>
                        )}

                        {/* Move to next stage button */}
                        <div className="pt-2 border-t border-brand-border flex items-center justify-between">
                          <span className="text-[9px] text-ink-soft">Sale: {lead.assigned_to || 'Admin'}</span>
                          
                          {col.key !== 'QUALIFIED' && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentIndex = STAGES.findIndex((s) => s.key === col.key);
                                if (currentIndex < STAGES.length - 1) {
                                  handleUpdateStatus(lead.id, STAGES[currentIndex + 1].key);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-ink bg-accent-soft px-2 py-0.5 rounded-full transition-colors duration-150 cursor-pointer hover:brightness-95"
                            >
                              Tiếp
                              <ArrowRightIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-raised border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base">
                + Thêm Khách Hàng Tiềm Năng (Lead)
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 transition-colors duration-150 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Họ và tên <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: Nguyễn Văn Nam"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số điện thoại <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLead.phone_number}
                    onChange={(e) => setNewLead({ ...newLead, phone_number: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: 0912345678"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Phân khu quan tâm
                  </label>
                  <select
                    value={newLead.phase_interest}
                    onChange={(e) => setNewLead({ ...newLead, phase_interest: e.target.value as RealEstatePhase })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="TESLA">Phân khu TESLA (Mặt đất)</option>
                    <option value="CANTATA">Phân khu CANTATA (Mặt đất)</option>
                    <option value="NOXH">Phân khu NOXH (Cao tầng)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Khoảng ngân sách
                  </label>
                  <input
                    type="text"
                    value={newLead.budget_range}
                    onChange={(e) => setNewLead({ ...newLead, budget_range: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                    placeholder="VD: 6 - 8 Tỷ"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Nhu cầu & Ghi chú tư vấn
                </label>
                <textarea
                  rows={3}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="Ghi chú sở thích, hướng nhà, tiến độ quan tâm..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer"
                >
                  Tạo Lead Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadKanbanPage;
