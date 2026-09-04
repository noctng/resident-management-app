import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CrmSubNav } from '../../components/crm/CrmSubNav';
import { PdfViewerModal } from '../../components/crm/PdfViewerModal';
import { api } from '../../services/api';
import { useToast, useConfirm } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import {
  FolderIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '../../components/icons';
import { StatCard } from '../../components/ui/Card';

interface ContractDocumentHubPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ContractDocumentHubPage: React.FC<ContractDocumentHubPageProps> = ({ onNavigate, onBack }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    totalDocs: 0,
    totalSize: 0,
    uniqueContracts: 0,
  });

  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Upload Form State
  const [contractsList, setContractsList] = useState<any[]>([]);
  const [uploadContractId, setUploadContractId] = useState('');
  const [uploadDocType, setUploadDocType] = useState('HDMB_SCAN');
  const [uploadDocName, setUploadDocName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadContracts();
  }, [docTypeFilter, searchQuery]);

  // Handle contract_id query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cId = params.get('contract_id');
    if (cId) {
      setUploadContractId(cId);
      setIsUploadModalOpen(true);
    }
  }, [location.search]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(docTypeFilter !== 'ALL' ? { doc_type: docTypeFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      const res: any = await api.get(`/crm/documents?${params.toString()}`);
      if (res && res.success) {
        setDocuments(res.documents || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải tài liệu scan:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const res: any = await api.get('/crm/contracts');
      if (res && (res.contracts || Array.isArray(res))) {
        setContractsList(res.contracts || res);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hợp đồng:', err);
    }
  };

  const handleOpenViewer = (doc: any) => {
    setViewingDoc(doc);
    setIsViewerOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!uploadDocName) {
        setUploadDocName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Vui lòng chọn file scan PDF cần tải lên');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('contract_id', uploadContractId);
      formData.append('document_name', uploadDocName || selectedFile.name);
      formData.append('doc_type', uploadDocType);
      formData.append('notes', uploadNotes);

      const res: any = await api.post('/crm/documents/upload', formData);

      if (res && res.success) {
        toast.success('Tải lên bản scan PDF thành công!');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setUploadDocName('');
        setUploadNotes('');
        loadDocuments();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải lên file scan');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string, name: string) => {
    const ok = await confirm({
      title: 'Xóa Bản Scan',
      description: `Bạn có chắc chắn muốn xóa bản scan "${name}" khỏi hệ thống không?`,
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res: any = await api.delete(`/crm/documents/${id}`);
      if (res && res.success) {
        toast.success(res.message || 'Đã xóa bản scan');
        loadDocuments();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa bản scan');
    }
  };

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'HDMB_SCAN':
        return { label: 'Bản Scan HĐMB', bg: 'bg-accent-soft text-accent-ink' };
      case 'DEPOSIT_RECEIPT_SCAN':
        return { label: 'Phiếu Thu Cọc PDC', bg: 'bg-brand-success-soft text-brand-success' };
      case 'TRANSFER_AGREEMENT_SCAN':
        return { label: 'HĐ Chuyển Nhượng', bg: 'bg-brand-warning-soft text-brand-warning' };
      case 'TITLE_DEED_SCAN':
        return { label: 'Sổ Đỏ / Sổ Hồng', bg: 'bg-brand-success-soft text-brand-success' };
      case 'CUSTOMER_ID_SCAN':
        return { label: 'CCCD / Hộ Chiếu', bg: 'bg-surface-alt text-ink-soft' };
      case 'TAX_RECEIPT_SCAN':
        return { label: 'Biên Lai Thuế', bg: 'bg-surface-alt text-ink-soft' };
      case 'HANDOVER_MINUTES_SCAN':
        return { label: 'Biên Bản Bàn Giao', bg: 'bg-accent-soft text-accent-ink' };
      case 'AMENDMENT_SCAN':
        return { label: 'Phụ Lục HĐ', bg: 'bg-surface-alt text-ink-soft' };
      default:
        return { label: 'Khác', bg: 'bg-surface-alt text-ink-soft' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <CrmSubNav
        current="documents"
        title="Quản Lý Hồ Sơ & Bản Scan PDF (CRM)"
        subtitle="Lưu trữ số hóa các bản cứng HĐMB, Phiếu đặt cọc, HĐ chuyển nhượng, Sổ đỏ và xem trực tiếp"
        onNavigate={onNavigate}
        onBack={onBack}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink flex items-center gap-2">
            <FolderIcon className="w-7 h-7 text-accent" />
            <span>Kho Lưu Trữ Bản Scan Hợp Đồng & Hồ Sơ Pháp Lý</span>
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Lưu trữ và xem trực tiếp file PDF các bản cứng hợp đồng đã ký kết, công chứng và đóng dấu
          </p>
        </div>

        <button
          onClick={() => {
            setIsUploadModalOpen(true);
            setSelectedFile(null);
            setUploadDocName('');
          }}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <DocumentArrowUpIcon className="w-4 h-4" />
          <span>+ Tải Lên Bản Scan PDF Mới</span>
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng số bản scan lưu trữ"
          value={stats.totalDocs || 0}
          unit="tài liệu"
          icon={DocumentTextIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent"
          subValue="Tất cả định dạng PDF / ảnh"
          subTone="neutral"
        />
        <StatCard
          label="Hợp đồng đã có bản scan"
          value={stats.uniqueContracts || 0}
          unit="HĐMB"
          icon={BuildingOfficeIcon}
          iconBg="bg-brand-success-soft"
          iconColor="text-brand-success"
          valueTone="success"
          subValue="Đã số hóa bản cứng"
          subTone="success"
        />
        <StatCard
          label="Tổng dung lượng lưu trữ"
          value={((stats.totalSize || 0) / (1024 * 1024)).toFixed(2)}
          unit="MB"
          icon={FolderIcon}
          iconBg="bg-accent-soft"
          iconColor="text-accent"
          valueTone="accent"
          subValue="Dung lượng ổ đĩa sử dụng"
          subTone="neutral"
        />
        <StatCard
          label="Bản scan HĐMB gốc"
          value={documents.filter((d) => d.doc_type === 'HDMB_SCAN').length}
          unit="bản"
          icon={ClockIcon}
          iconBg="bg-brand-warning-soft"
          iconColor="text-brand-warning"
          valueTone="warning"
          subValue="HĐMB chính thức"
          subTone="warning"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
          >
            <option value="ALL">-- Tất cả loại bản scan --</option>
            <option value="HDMB_SCAN">Bản Scan HĐ Mua Bán</option>
            <option value="DEPOSIT_RECEIPT_SCAN">Phiếu Thu Đặt Cọc (PDC)</option>
            <option value="TRANSFER_AGREEMENT_SCAN">HĐ Chuyển Nhượng</option>
            <option value="TITLE_DEED_SCAN">Giấy Chứng Nhận (Sổ Đỏ)</option>
            <option value="CUSTOMER_ID_SCAN">CCCD / Hộ Chiếu</option>
            <option value="TAX_RECEIPT_SCAN">Biên Lai Thuế TNCN</option>
            <option value="HANDOVER_MINUTES_SCAN">Biên Bản Bàn Giao</option>
            <option value="AMENDMENT_SCAN">Phụ Lục Hợp Đồng</option>
          </select>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Tên tài liệu, Mã HĐ, Mã Căn, Tên Khách..."
            className="px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-xs text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent min-w-[280px]"
          />
        </div>
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="p-16 text-center text-ink-soft bg-surface rounded-xl border border-brand-border">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
          <p>Đang tải danh sách bản scan...</p>
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          tone="neutral"
          title="Chưa có bản scan PDF nào"
          description="Bấm + Tải Lên Bản Scan PDF Mới để lưu trữ bản cứng HĐMB, phiếu đặt cọc hoặc hồ sơ chuyển nhượng."
          size="md"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const badge = getDocTypeBadge(doc.doc_type);

            return (
              <div
                key={doc.id}
                className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="font-mono text-[11px] text-ink-soft">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-accent-soft text-accent rounded-xl shrink-0">
                      <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div className="overflow-hidden">
                      <h2 className="font-bold text-ink text-sm truncate" title={doc.document_name}>
                        {doc.document_name}
                      </h2>
                      <p className="text-[11px] text-ink-soft font-mono">
                        {doc.contracts?.contract_code || 'Không gắn HĐ cụ thể'}
                      </p>
                      {doc.contracts?.apartments?.code && (
                        <p className="text-[11px] text-ink font-semibold">
                          Căn: <strong>{doc.contracts.apartments.code}</strong> • {doc.contracts?.customers?.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {doc.notes && (
                    <p className="text-[11px] text-ink-soft bg-surface-alt p-2 rounded-lg italic">
                      {doc.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-brand-border flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-ink-soft">
                    {new Date(doc.uploaded_at).toLocaleDateString('vi-VN')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenViewer(doc)}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                      title="Xem trực tiếp PDF"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      <span>Xem File</span>
                    </button>

                    <a
                      href={doc.file_url}
                      download={doc.document_name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-surface-alt hover:bg-brand-border text-ink rounded-lg transition-colors cursor-pointer"
                      title="Tải về"
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id, doc.document_name)}
                      className="p-1.5 text-ink-soft hover:text-brand-danger hover:bg-brand-danger-soft rounded-lg transition-colors cursor-pointer"
                      title="Xóa bản scan"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: UPLOAD SCAN ── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h2 className="font-bold text-ink text-base flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5 text-accent" />
                <span>Tải Lên Bản Scan PDF Cứng</span>
              </h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn file scan PDF <span className="text-brand-danger">*</span>
                </label>
                <div className="p-6 border-2 border-dashed border-brand-border rounded-xl text-center hover:border-accent transition-colors bg-surface-alt/50 relative">
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <DocumentArrowUpIcon className="w-10 h-10 mx-auto text-accent mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-ink text-sm">{selectedFile.name}</p>
                      <p className="text-ink-soft text-[11px]">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-ink">Kéo thả file PDF vào đây hoặc bấm để chọn</p>
                      <p className="text-ink-soft text-[11px] mt-0.5">Hỗ trợ định dạng PDF, PNG, JPG (Tối đa 50MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Tên tài liệu / Ghi chú <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="VD: HĐMB Bản Đóng Dấu Đỏ Cantata CT-01"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Loại bản scan</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="HDMB_SCAN">Bản Scan HĐ Mua Bán</option>
                    <option value="DEPOSIT_RECEIPT_SCAN">Phiếu Thu Đặt Cọc (PDC)</option>
                    <option value="TRANSFER_AGREEMENT_SCAN">HĐ Chuyển Nhượng</option>
                    <option value="TITLE_DEED_SCAN">Giấy Chứng Nhận (Sổ Đỏ)</option>
                    <option value="CUSTOMER_ID_SCAN">CCCD / Hộ Chiếu</option>
                    <option value="TAX_RECEIPT_SCAN">Biên Lai Thuế TNCN</option>
                    <option value="HANDOVER_MINUTES_SCAN">Biên Bản Bàn Giao</option>
                    <option value="AMENDMENT_SCAN">Phụ Lục HĐ</option>
                    <option value="OTHER">Tài Liệu Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink-soft mb-1">Gắn với Hợp đồng</label>
                  <select
                    value={uploadContractId}
                    onChange={(e) => setUploadContractId(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent cursor-pointer"
                  >
                    <option value="">-- Không gắn HĐ --</option>
                    {contractsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contract_code} ({c.apartments?.code || 'Căn'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Ghi chú lưu trữ</label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Ghi chú người ký, vị trí lưu bản cứng tại tủ hồ sơ..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5" aria-label="Đóng">
                  {uploading && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                  <span>{uploading ? 'Đang tải lên...' : 'Lưu Bản Scan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DIRECT PDF VIEWER ── */}
      <PdfViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={viewingDoc}
      />
    </div>
  );
};

export default ContractDocumentHubPage;
