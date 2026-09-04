import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer, Contract } from '../../types';
import { api } from '../../services/api';
import {
  ArrowLeftIcon,
  PlusIcon,
  UserIcon,
  BuildingOfficeIcon,
  PencilIcon,
  ArrowRightIcon,
} from '../../components/icons';
import AddContractModal from '../../components/AddContractModal';
import EditCustomerModal from '../../components/EditCustomerModal';
import ConvertToResidentModal from '../../components/ConvertToResidentModal';
import { EmptyState } from '../../components/ui';

interface CustomerDetailPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  

}

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ onNavigate, onBack }) => {
  const { id: customerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<(Customer & { contracts: Contract[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const data = await api.get<Customer & { contracts: Contract[] }>(`/customers/${customerId}`);
      setCustomer(data);
    } catch (err) {
      console.error('Failed to load customer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (customerId: string, customerData: Partial<Customer>) => {
    try {
      await api.put(`/customers/${customerId}`, customerData);
      await loadCustomer();
    } catch (err) {
      console.error('Failed to update customer:', err);
      throw err;
    }
  };

  const handleConvertToResident = async (
    contractId?: string
  ): Promise<{
    existingResidents: any[];
    warnings: string[];
    hasPhoneNumber: boolean;
    isNewResident: boolean;
    accountCreated: boolean;
  }> => {
    try {
      const response = await api.post(`/customers/${customer!.id}/convert-to-resident`, {
        contractId,
      });
      return response as any;
    } catch (err: any) {
      // api.ts already extracts the backend message into err.message
      throw new Error(err.message || 'Có lỗi xảy ra');
    }
  };

  const hasCompletedContract = customer?.contracts.some((c) => c.status === 'COMPLETED');

  if (loading) return <div className="p-10 text-center text-ink-soft">Đang tải dữ liệu khách hàng...</div>;
  if (!customer) return <div className="p-10 text-center text-ink-soft">Không tìm thấy khách hàng.</div>;

  return (
    <div className="space-y-6">
      <CrmSubNav current="customers" title="Chi Tiết Khách Hàng" subtitle="Hồ sơ cá nhân, lịch sử tư vấn & danh sách căn quan tâm" onNavigate={onNavigate} onBack={onBack} />

      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-1.5 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 hover:bg-accent-soft/40 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40" aria-label="Đóng">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="font-serif text-2xl font-bold text-ink">Chi tiết Khách hàng</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        {/* Profile Card */}
        <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col items-center relative">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-0 right-0 p-1.5 border border-transparent text-ink-soft hover:text-accent hover:border-brand-border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
              title="Chỉnh sửa thông tin"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 mb-4 rounded-full bg-accent-soft text-accent-ink font-bold flex items-center justify-center shadow-sm">
              <span className="text-xl">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-bold text-ink text-center">
              {customer.name}
            </h2>
            <p className="text-ink-soft font-medium font-mono tabular-nums">{customer.phone_number}</p>
          </div>

          <div className="space-y-4 pt-6 border-t border-brand-border">
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <label className="text-xs uppercase text-ink-soft font-bold self-center">Số ĐT</label>
              <p className="text-ink text-sm font-medium font-mono tabular-nums">
                {customer.phone_number}
              </p>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <label className="text-xs uppercase text-ink-soft font-bold self-center">Email</label>
              <p className="text-ink text-sm font-medium truncate font-mono">
                {customer.email || 'N/A'}
              </p>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <label className="text-xs uppercase text-ink-soft font-bold self-center">
                CMND/CCCD
              </label>
              <p className="text-ink text-sm font-medium font-mono tabular-nums">
                {customer.id_number || 'N/A'}
              </p>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <label className="text-xs uppercase text-ink-soft font-bold self-center">
                Địa chỉ
              </label>
              <p className="text-ink text-sm font-medium">
                {customer.address || 'N/A'}
              </p>
            </div>
            <div className="grid grid-cols-[100px_1fr] gap-2 items-start">
              <label className="text-xs uppercase text-ink-soft font-bold mt-0.5">Ghi chú</label>
              <p className="text-ink-soft italic text-sm bg-surface-alt p-2 rounded-lg">
                {customer.notes || 'Không có ghi chú'}
              </p>
            </div>
          </div>

          {/* Convert to Resident Button */}
          {hasCompletedContract && (
            <div className="pt-4 border-t border-brand-border">
              <button
                onClick={() => setIsConvertModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <ArrowRightIcon className="w-5 h-5" />
                <span>Chuyển thành Cư dân</span>
              </button>
            </div>
          )}
        </div>

        {/* Contracts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface border border-brand-border rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-soft rounded-lg text-accent-ink">
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink">Hợp đồng sở hữu</h3>
              </div>
              <button
                onClick={() => setIsAddContractModalOpen(true)}
                className="flex items-center gap-2 text-sm bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-all duration-200 font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Tạo Hợp đồng</span>
              </button>
            </div>

            <div className="space-y-4">
              {customer.contracts.length === 0 ? (
                <EmptyState
                  icon={BuildingOfficeIcon}
                  tone="neutral"
                  title="Khách hàng chưa có hợp đồng nào"
                  description="Tạo hợp đồng đầu tiên để bắt đầu theo dõi giao dịch"
                  size="md"
                />
              ) : (
                customer.contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="group p-4 border border-brand-border rounded-xl bg-surface hover:border-accent/40 hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
                    onClick={() => navigate(`/crm/contracts/${contract.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surface-alt rounded-lg flex items-center justify-center text-ink-soft group-hover:bg-accent-soft group-hover:text-accent-ink transition-colors">
                          <BuildingOfficeIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-ink group-hover:text-accent transition-colors">
                            Hợp đồng #<span className="font-mono font-semibold">{contract.contract_code}</span>
                          </div>
                          <div className="text-sm text-ink-soft font-medium pt-0.5">
                            Căn hộ:{' '}
                            <span className="text-ink font-mono font-semibold">
                              {contract.apartments?.code}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-ink text-base font-mono tabular-nums">
                          {Number(contract.total_value).toLocaleString('vi-VN')}
                          <span className="text-xs font-normal text-ink-soft ml-1">VNĐ</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1.5 rounded-full text-xs font-semibold ${
                            contract.status === 'COMPLETED'
                              ? 'bg-brand-teal-soft text-brand-teal'
                              : contract.status === 'CANCELLED'
                                ? 'bg-brand-danger-soft text-brand-danger'
                                : contract.status === 'PAYING'
                                  ? 'bg-brand-success-soft text-brand-success'
                                  : contract.status === 'SIGNED'
                                    ? 'bg-brand-success-soft text-brand-success'
                                    : 'bg-brand-warning-soft text-brand-warning'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {contract.status === 'COMPLETED'
                            ? 'Hoàn thành'
                            : contract.status === 'CANCELLED'
                              ? 'Đã hủy'
                              : contract.status === 'PAYING'
                                ? 'Đang thanh toán'
                                : contract.status === 'SIGNED'
                                  ? 'Đã ký'
                                  : 'Đặt cọc'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <AddContractModal
        isOpen={isAddContractModalOpen}
        onClose={() => setIsAddContractModalOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
        onContractCreated={loadCustomer}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onUpdateCustomer={handleUpdateCustomer}
      />

      <ConvertToResidentModal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        customer={customer}
        onConvert={handleConvertToResident}
      />
    </div>
  );
};

export default CustomerDetailPage;
