import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { PlusIcon, UserIcon, ArrowLeftIcon, MagnifyingGlassIcon } from '../../components/icons';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../components/ui';
import { EmptyState } from '../../components/ui';

interface CustomerListPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
  
  
  
  onViewCustomer: (customer: Customer) => void;

}

const CustomerListPage: React.FC<CustomerListPageProps> = ({ onNavigate, onBack, onViewCustomer }) => {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    id_number: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.get<Customer[]>('/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      setIsAddModalOpen(false);
      setNewCustomer({
        name: '',
        phone_number: '',
        email: '',
        address: '',
        id_number: '',
        notes: '',
      });
      loadCustomers();
    } catch (err) {
      console.error('Failed to add customer:', err);
      toast.error('Không thể thêm khách hàng. Vui lòng kiểm tra lại dữ liệu.');
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone_number.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <CrmSubNav current="customers" title="Danh Sách Khách Hàng CRM" subtitle="Hồ sơ khách hàng, phân hạng tiềm năng & lịch sử tương tác" onNavigate={onNavigate} onBack={onBack} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 hover:bg-accent-soft/40 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40" aria-label="Đóng">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              Danh sách Khách hàng
            </h1>
            <p className="text-sm text-ink-soft">
              Quản lý thông tin và lịch sử khách hàng
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-2.5 rounded-lg transition-all duration-200 font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Thêm Khách hàng</span>
        </button>
      </div>

      <div className="bg-surface border border-brand-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-brand-border">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-ink-faint" aria-hidden="true" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo tên, số điện thoại hoặc email..."
              className="block w-full pl-10 pr-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft border-b border-brand-border">
              <tr>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Địa chỉ</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="rounded-full h-6 w-6 border-2 border-accent/70"></div>
                      <span className="ml-2 text-ink-soft">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-soft">
                    <EmptyState
                      icon={UserIcon}
                      tone="neutral"
                      title="Chưa có khách hàng nào"
                      description="Thêm khách hàng đầu tiên để bắt đầu quản lý CRM"
                      size="md"
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-surface-alt/60 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent-ink font-bold shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-ink group-hover:text-accent transition-colors">
                            {customer.name}
                          </div>
                          <div className="text-xs text-ink-soft font-mono tabular-nums">
                            {customer.id_number || 'Chưa có CMND/CCCD'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-ink font-medium font-mono tabular-nums">
                        {customer.phone_number}
                      </div>
                      <div className="text-ink-soft text-xs font-mono">{customer.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-soft max-w-xs truncate">
                      {customer.address || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-soft font-mono tabular-nums">
                      {customer.created_at ? formatDate(customer.created_at) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onViewCustomer(customer)}
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

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-surface border border-brand-border rounded-xl shadow-elevation-raised w-full max-w-2xl overflow-hidden transition-all duration-200">
            <div className="px-6 py-4 border-b border-brand-border flex justify-between items-center bg-surface-alt/60">
              <h2 className="text-base font-bold text-ink">
                Thêm Khách hàng mới
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-soft hover:text-accent transition-colors p-1.5 rounded-lg border border-transparent hover:border-brand-border focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <PlusIcon className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form
              onSubmit={handleAddCustomer}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  Tên khách hàng <span className="text-brand-danger">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  Số điện thoại <span className="text-brand-danger">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono tabular-nums focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
                  value={newCustomer.phone_number}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
                  value={newCustomer.email || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  CMND/CCCD
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono tabular-nums focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
                  value={newCustomer.id_number || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, id_number: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow"
                  value={newCustomer.address || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-ink-soft mb-1">
                  Ghi chú
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink h-24 focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none transition-shadow resize-none"
                  value={newCustomer.notes || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-brand-border bg-surface text-ink hover:border-accent/40 hover:shadow-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all duration-200 font-semibold shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  Lưu Khách hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;
