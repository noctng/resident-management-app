import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
} from '../../components/icons';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../components/ui';

interface ContractListPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  
  
  
  onViewContract: (contract: any) => void;

}

const ContractListPage: React.FC<ContractListPageProps> = ({ onNavigate, onBack, onViewContract }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const data = await api.get<any[]>('/contracts');
      // Sort by created_at desc
      const sorted = data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setContracts(sorted);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await api.download('/reports/contracts', {}, 'GET');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Danh_sach_hop_dong.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Xuất báo cáo thất bại: ' + (error.message || 'Lỗi server'));
    } finally {
      setExporting(false);
    }
  };

  const filteredContracts = contracts.filter(
    (c) =>
      c.contract_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apartments?.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DEPOSIT: 'bg-brand-warning-soft text-brand-warning',
      SIGNED: 'bg-brand-success-soft text-brand-success',
      PAYING: 'bg-brand-success-soft text-brand-success',
      COMPLETED: 'bg-brand-teal-soft text-brand-teal',
      CANCELLED: 'bg-brand-danger-soft text-brand-danger',
    };
    const labels: Record<string, string> = {
      DEPOSIT: 'Đặt cọc',
      SIGNED: 'Đã ký',
      PAYING: 'Đang thanh toán',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
    };
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-surface-alt text-ink-soft'}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
      <CrmSubNav current="contracts" title="Danh Sách Hợp Đồng Mua Bán" subtitle="Theo dõi toàn bộ HĐMB 18 điều khoản, tiến độ 10 đợt & chuyển nhượng" onNavigate={onNavigate} onBack={onBack} />

      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 hover:bg-accent-soft/40 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-ink">Danh sách Hợp đồng</h1>
            <p className="text-sm text-ink-soft">
              Quản lý toàn bộ hợp đồng mua bán căn hộ
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, tên KH..."
              className="pl-10 pr-4 py-2 w-full sm:w-64 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] transition-all duration-200 bg-accent text-white hover:bg-accent-hover hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Xuất Excel"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      <div className="bg-surface border border-brand-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft border-b border-brand-border">
              <tr>
                <th className="px-6 py-4">Mã Hợp đồng</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Căn hộ</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Tổng giá trị</th>
                <th className="px-6 py-4">Ngày ký</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-ink-soft">
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center mb-3">
                        <BuildingOfficeIcon className="w-8 h-8 text-ink-faint" />
                      </div>
                      <p className="text-ink-soft text-lg">Không tìm thấy hợp đồng nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="hover:bg-surface-alt/60 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <td className="px-6 py-4 font-mono font-semibold text-ink">
                      {contract.contract_code}
                    </td>
                    <td className="px-6 py-4 text-ink">
                      <div className="font-medium">{contract.customers?.name}</div>
                      <div className="text-xs text-ink-soft font-mono">{contract.customers?.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-ink font-mono font-semibold">
                      {contract.apartments?.code}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4 text-right font-mono tabular-nums font-bold text-ink text-base">
                      {Number(contract.total_value).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-ink-soft text-sm font-mono tabular-nums">
                      {contract.signed_date ? formatDate(contract.signed_date) : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onViewContract(contract)}
                        className="text-accent hover:bg-accent-soft font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors duration-150 border border-brand-border focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractListPage;
