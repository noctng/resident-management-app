import { CrmSubNav } from '../../components/crm/CrmSubNav';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PdfViewerModal } from '../../components/crm/PdfViewerModal';
import { api } from '../../services/api';
import { useToast } from '../../components/ui';
import { EmptyState } from '../../components/ui';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  XMarkIcon,
  PrinterIcon,
  SparklesIcon,
  QrCodeIcon,
  BanknotesIcon,
  FolderIcon,
  DocumentArrowUpIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  EyeIcon,
} from '../../components/icons';

interface ContractDetailPageProps {
  onNavigate?: (route: string) => void;
  onBack?: () => void;
}

export const ContractDetailPage: React.FC<ContractDetailPageProps> = ({ onNavigate, onBack }) => {
  const { id: contractId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'articles' | 'schedule' | 'transfer' | 'documents'>('articles');
  const [contractDocs, setContractDocs] = useState<any[]>([]);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocForm, setUploadDocForm] = useState({
    document_name: '',
    doc_type: 'HDMB_SCAN',
    notes: '',
  });

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    new_customer_name: '',
    new_customer_phone: '',
    new_customer_id_number: '',
    new_customer_address: '',
    notary_office: 'Văn phòng Công chứng Buôn Ma Thuột',
    notary_number: '',
    notary_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // QR Modal
  const [selectedPaymentForQr, setSelectedPaymentForQr] = useState<any>(null);

  // Accountant Confirm Payment State
  const [selectedPaymentForConfirm, setSelectedPaymentForConfirm] = useState<any>(null);
  const [confirmPaymentForm, setConfirmPaymentForm] = useState({
    paid_amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'BANK_TRANSFER',
    payment_reference: '',
    notes: '',
  });

  useEffect(() => {
    loadContract();
    loadContractDocs();
  }, [contractId]);

  const loadContractDocs = async () => {
    if (!contractId) return;
    try {
      const res: any = await api.get(`/crm/documents?contract_id=${contractId}`);
      if (res && res.success) {
        setContractDocs(res.documents || []);
      }
    } catch (err) {
      console.error('Lỗi tải tài liệu scan HĐ:', err);
    }
  };

  const handleUploadDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocFile) {
      toast.error('Vui lòng chọn file scan PDF');
      return;
    }
    try {
      setUploadingDoc(true);
      const formData = new FormData();
      formData.append('file', selectedDocFile);
      formData.append('contract_id', contractId || '');
      formData.append('document_name', uploadDocForm.document_name || selectedDocFile.name);
      formData.append('doc_type', uploadDocForm.doc_type);
      formData.append('notes', uploadDocForm.notes);

      const res: any = await api.post('/crm/documents/upload', formData);

      if (res && res.success) {
        toast.success('Đã tải lên bản scan PDF thành công!');
        setIsUploadDocModalOpen(false);
        setSelectedDocFile(null);
        setUploadDocForm({ document_name: '', doc_type: 'HDMB_SCAN', notes: '' });
        loadContractDocs();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tải lên bản scan');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string, _name?: string) => {
    try {
      const res: any = await api.delete(`/crm/documents/${docId}`);
      if (res && res.success) {
        toast.success('Đã xóa bản scan');
        loadContractDocs();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xóa bản scan');
    }
  };


  const loadContract = async () => {
    try {
      setLoading(true);
      const res: any = await api.get(`/crm/sales-contracts/${contractId}/full`);
      if (res && res.success) {
        setContract(res.contract);
      }
    } catch (err) {
      console.error('Failed to load contract:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmPayment = (p: any) => {
    const totalDue = Number(p.totalDueNow || p.amount || 0);
    setSelectedPaymentForConfirm(p);
    setConfirmPaymentForm({
      paid_amount: totalDue,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: 'BANK_TRANSFER',
      payment_reference: p.qr_payment_memo || '',
      notes: `Kế toán xác nhận thu tiền đợt ${p.installment} HĐ ${contract?.contract_code}`,
    });
  };

  const handleConfirmPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForConfirm) return;
    try {
      await api.put(`/contracts/payments/${selectedPaymentForConfirm.id}`, {
        status: 'PAID',
        paid_amount: Number(confirmPaymentForm.paid_amount),
        payment_date: confirmPaymentForm.payment_date,
      });
      toast.success(`Đã xác nhận thu tiền đợt ${selectedPaymentForConfirm.installment} thành công!`);
      setSelectedPaymentForConfirm(null);
      loadContract();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xác nhận thanh toán');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res: any = await api.post(`/crm/sales-contracts/${contract.id}/transfer-inherit`, transferForm);
      if (res && res.success) {
        toast.success(res.message || 'Chuyển nhượng thành công');
        setIsTransferModalOpen(false);
        loadContract();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi chuyển nhượng hợp đồng');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-ink-soft">
      <CrmSubNav current="contracts" title="Chi Tiết Hợp Đồng Mua Bán" subtitle="Toàn văn 18 điều khoản HĐMB, bảng tiến độ 10 đợt & lịch sử giao dịch" onNavigate={onNavigate} onBack={onBack} />

        <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-accent mb-2" />
        <p className="text-sm font-medium">Đang tải hồ sơ hợp đồng mua bán...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-16 text-center text-ink-soft">
        <p className="text-base font-bold">Không tìm thấy hợp đồng mua bán</p>
        <button
          onClick={() => (onBack ? onBack() : navigate('/admin/crm/contracts'))}
          className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const subtotal = Number(contract.land_price || 0) + Number(contract.construction_price || 0);
  const vatAmount = Number(contract.vat_amount || 0);
  const maintenanceFee = Number(contract.maintenance_fee || 0);
  const grandTotal = subtotal + vatAmount + maintenanceFee;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (onBack ? onBack() : navigate('/admin/crm/contracts'))}
            className="p-1.5 border border-brand-border text-ink-soft hover:text-accent hover:border-accent/40 hover:bg-accent-soft/40 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-accent">
                {contract.contract_code}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-success-soft text-brand-success rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {contract.status === 'SIGNED' ? 'ĐÃ KÝ HĐMB' : contract.status}
              </span>
            </div>
            <p className="text-sm text-ink-soft mt-0.5">
              Khách hàng: <strong className="text-ink">{contract.customers?.name}</strong> • Căn: <strong className="text-ink font-mono">{contract.apartments?.code}</strong> ({contract.apartments?.phase_code || 'CANTATA'})
            </p>
          </div>
        </div>

        {/* Action Buttons & Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-surface border border-brand-border rounded-xl text-xs font-bold text-ink flex items-center gap-1.5 transition-all duration-200 hover:border-accent/40 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <PrinterIcon className="w-4 h-4" />
            <span>In HĐMB</span>
          </button>

          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-brand-warning-soft hover:bg-brand-warning/20 text-brand-warning rounded-xl text-xs font-bold border border-brand-warning/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 flex items-center gap-1.5"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Chuyển Nhượng HĐ (Kế Thừa)
          </button>
        </div>
      </div>

      {/* Clause 18 Violation Alert Banner if triggered */}
      {contract.clause18Alert && (
        <div className="p-4 bg-brand-danger-soft border border-brand-danger/30 rounded-2xl flex items-start gap-3 text-brand-danger animate-pulse">
          <ClockIcon className="w-5 h-5 text-brand-danger flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="font-bold block text-sm">{contract.clause18Alert.message}</strong>
            <span className="text-[11px] text-brand-danger/80 mt-0.5 block">
              Theo quy định tại Điều 18 HĐMB Thành Phố Cà Phê, hợp đồng đã quá 3 ngày chưa nộp đủ Đợt 1. Ban Giám Đốc có quyền kích hoạt thanh lý và giải phóng căn về kho bán.
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-brand-border space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('articles')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            activeTab === 'articles'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>Văn Bản HĐMB (18 Điều + 3 Phụ Lục)</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            activeTab === 'schedule'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Lịch Tiến Độ Thanh Toán (LTT 10 Đợt & Lãi Phạt 0.05%)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('documents');
            loadContractDocs();
          }}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            activeTab === 'documents'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <FolderIcon className="w-4 h-4" />
          <span>Bản Scan & Hồ Sơ PDF ({contractDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfer')}
          className={`pb-3 transition cursor-pointer border-b-2 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-accent/40 ${
            activeTab === 'transfer'
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <ArrowPathIcon className="w-4 h-4" />
          <span>Lịch Sử Chuyển Nhượng Kế Thừa ({contract.contract_transfers?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: 18 ARTICLES & 3 ANNEXES FULL TEXT */}
      {activeTab === 'articles' && (
        <div className="bg-surface rounded-2xl border border-brand-border p-8 shadow-sm space-y-6 text-ink text-xs leading-relaxed max-w-5xl mx-auto print:p-0 print:border-none print:shadow-none">
          
          {/* Header Legal Form */}
          <div className="text-center space-y-1 border-b border-brand-border pb-5">
            <h2 className="text-sm font-bold tracking-wider uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
            <p className="text-xs italic text-ink-soft">Độc lập - Tự do - Hạnh phúc</p>
            <div className="pt-3">
              <h1 className="text-base font-black text-ink uppercase tracking-wide">
                HỢP ĐỒNG MUA BÁN NHÀ Ở
              </h1>
              <p className="font-mono text-xs text-accent font-semibold">
                Số: {contract.contract_code}
              </p>
              <p className="text-[11px] text-ink-soft italic">
                (Dự án: Khu Đô Thị Thành Phố Cà Phê, Phường Tân Lợi, TP. Buôn Ma Thuột, Tỉnh Đắk Lắk)
              </p>
            </div>
          </div>

          {/* Parties Section */}
          <div className="space-y-4 bg-surface-alt p-4 rounded-xl">
            <div>
              <h3 className="font-bold text-ink uppercase text-xs">BÊN BÁN (BÊN A): CÔNG TY CỔ PHẦN ĐẦU TƯ TRUNG NGUYÊN</h3>
              <p className="text-[11px] text-ink-soft">
                Địa chỉ: 82-84 Bùi Thị Xuân, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh • MST: 0303254427
              </p>
            </div>
            <div>
              <h3 className="font-bold text-ink uppercase text-xs">
                BÊN MUA (BÊN B): ÔNG/BÀ {contract.customers?.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-ink-soft mt-1">
                <div>Số CCCD/MST: <strong className="text-ink">{contract.customers?.id_number || 'N/A'}</strong></div>
                <div>Số điện thoại: <strong className="text-ink font-mono">{contract.customers?.phone_number}</strong></div>
                <div>Địa chỉ: <span className="text-ink">{contract.customers?.address || 'TP. Buôn Ma Thuột'}</span></div>
              </div>
            </div>
          </div>

          {/* 18 ARTICLES TEXT */}
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-ink text-xs">ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG</h4>
              <p className="text-ink-soft mt-0.5">
                Bên A đồng ý bán và Bên B đồng ý mua căn nhà ở gắn liền với quyền sử dụng đất tại:
                Căn/Lô số: <strong>{contract.apartments?.code}</strong>, Phân khu: <strong>{contract.apartments?.phase_code || 'CANTATA'}</strong>, Dãy: <strong>{contract.apartments?.block_code || 'N/A'}</strong>.
                Diện tích đất: <strong>{contract.apartments?.land_area || contract.apartments?.area} m²</strong>, Diện tích sàn xây dựng: <strong>{contract.apartments?.construction_area || (contract.apartments?.area * 0.85).toFixed(1)} m²</strong>.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-ink text-xs">ĐIỀU 2: GIÁ BÁN VÀ PHƯƠNG THỨC THANH TOÁN (PHỤ LỤC 02)</h4>
              <div className="p-3 bg-surface-alt rounded-xl border border-brand-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>1. Giá quyền sử dụng đất (chưa VAT):</span>
                  <strong className="font-mono tabular-nums">{Number(contract.land_price || 4500000000).toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                <div className="flex justify-between">
                  <span>2. Giá xây dựng nhà ở (chưa VAT):</span>
                  <strong className="font-mono tabular-nums">{Number(contract.construction_price || 2500000000).toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                <div className="flex justify-between">
                  <span>3. Thuế GTGT ({contract.vat_rate || 8}%):</span>
                  <strong className="font-mono tabular-nums">{vatAmount.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                <div className="flex justify-between">
                  <span>4. Kinh phí bảo trì 2% (thu tại đợt nhận bàn giao):</span>
                  <strong className="font-mono tabular-nums">{maintenanceFee.toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                <div className="pt-1.5 border-t border-brand-border flex justify-between font-bold text-accent text-sm">
                  <span>TỔNG GIÁ TRỊ HỢP ĐỒNG (BAO GỒM VAT + PBT):</span>
                  <span className="font-mono tabular-nums text-base">{grandTotal.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-ink text-xs">ĐIỀU 3 ĐẾN ĐIỀU 10: TIÊU CHUẨN XÂY DỰNG, BÀN GIAO VÀ BẢO HÀNH</h4>
              <p className="text-ink-soft mt-0.5">
                Bên A có trách nhiệm bàn giao nhà ở theo đúng tiêu chuẩn thiết kế ({contract.finish_standard || 'Hoàn thiện mặt ngoài'}), hỗ trợ Bên B làm thủ tục cấp Giấy chứng nhận quyền sử dụng đất và bảo hành kết cấu khung sàn trong vòng 24 tháng kể từ ngày bàn giao.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-ink text-xs">ĐIỀU 11: TRÁCH NHIỆM DO VI PHẠM HỢP ĐỒNG & LÃI CHẬM TRẢ 0,05%/NGÀY</h4>
              <p className="text-ink-soft mt-0.5">
                Nếu Bên B chậm thanh toán bất kỳ khoản tiền nào đến hạn theo Lịch tiến độ thanh toán (LTT), Bên B phải trả cho Bên A tiền lãi phạt chậm nộp tính theo mức <strong>0,05%/ngày (tương đương 18,25%/năm)</strong> trên tổng số tiền chậm nộp nhân với số ngày chậm nộp thực tế.
              </p>
            </div>

            <div className="p-3 bg-brand-warning-soft rounded-xl border border-brand-warning/30">
              <h4 className="font-bold text-brand-warning text-xs">ĐIỀU 18: ĐIỀU KHOẢN ĐẶC THÙ THÀNH PHỐ CÀ PHÊ (GIÁM SÁT ĐỢT 1)</h4>
              <p className="text-ink mt-0.5 text-[11px]">
                Trong vòng <strong>03 (ba) ngày</strong> kể từ ngày ký kết Hợp đồng này, Bên B có nghĩa vụ thanh toán đủ 100% số tiền của Đợt 1. Quá thời hạn trên, Hợp đồng này đương nhiên chấm dứt hiệu lực và Bên A có toàn quyền giữ lại toàn bộ số tiền đặt cọc mà Bên B đã nộp.
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-6 border-t border-brand-border grid grid-cols-2 text-center text-xs">
            <div>
              <strong className="block uppercase font-bold text-ink">ĐẠI DIỆN BÊN BÁN (BÊN A)</strong>
              <p className="text-ink-faint italic text-[11px] mt-1">(Ký, ghi rõ họ tên và đóng dấu)</p>
            </div>
            <div>
              <strong className="block uppercase font-bold text-ink">ĐẠI DIỆN BÊN MUA (BÊN B)</strong>
              <p className="text-ink-faint italic text-[11px] mt-1">(Ký và ghi rõ họ tên)</p>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: 10-STAGE PAYMENT SCHEDULE & 0.05% PENALTY CALCULATOR */}
      {activeTab === 'schedule' && (
        <div className="bg-surface rounded-2xl border border-brand-border shadow-sm overflow-hidden">
          <div className="p-4 bg-surface-alt border-b border-brand-border flex justify-between items-center text-xs">
            <div>
              <h3 className="font-bold text-ink text-sm">
                Lịch Tiến Độ Thanh Toán 10 Đợt Chuẩn (LTT)
              </h3>
              <p className="text-ink-soft text-[11px]">
                Lãi phạt chậm trả 0.05%/ngày tự động tính theo Điều 11.1.1 cho các đợt quá hạn
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt text-[11px] uppercase tracking-wider text-ink-soft font-bold border-b border-brand-border">
                <tr>
                  <th className="py-3 px-4">Đợt</th>
                  <th className="py-3 px-4">Nội dung / Sự kiện kích hoạt</th>
                  <th className="py-3 px-4">Ngày đến hạn</th>
                  <th className="py-3 px-4 text-right">Tỷ lệ</th>
                  <th className="py-3 px-4 text-right">Số tiền đợt</th>
                  <th className="py-3 px-4 text-right">Đã nộp</th>
                  <th className="py-3 px-4 text-center">Trễ hạn</th>
                  <th className="py-3 px-4 text-right">Phạt 0.05%</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {contract.contract_payments?.map((p: any) => {
                  const isPaid = p.status === 'PAID';
                  const isOverdue = !isPaid && p.lateDays > 0;

                  return (
                    <tr key={p.id} className="hover:bg-surface-alt/60 transition-colors duration-150">
                      <td className="py-3 px-4 font-bold font-mono">Đợt {p.installment}</td>
                      <td className="py-3 px-4">
                        <strong className="text-ink block">{p.milestone_event || p.description}</strong>
                        {p.installment === 1 && Number(contract.deposit_deducted_amount) > 0 && (
                          <span className="text-[10px] text-brand-success">
                            (Đã trừ tiền cọc: {Number(contract.deposit_deducted_amount).toLocaleString('vi-VN')} VNĐ)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-ink-soft">
                        {new Date(p.due_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">{p.percentage || 10}%</td>
                      <td className="py-3 px-4 text-right font-bold text-ink font-mono tabular-nums">
                        {Number(p.amount).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-brand-success font-mono tabular-nums">
                        {Number(p.paid_amount || 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 bg-brand-danger-soft text-brand-danger font-bold rounded-full text-[10px] inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {p.lateDays} ngày
                          </span>
                        ) : (
                          <span className="text-ink-faint">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-brand-danger font-mono tabular-nums">
                        {p.latePenalty > 0 ? `+${Number(p.latePenalty).toLocaleString('vi-VN')} VNĐ` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isPaid
                              ? 'bg-brand-success-soft text-brand-success'
                              : isOverdue
                              ? 'bg-brand-danger-soft text-brand-danger'
                              : 'bg-brand-warning-soft text-brand-warning'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {isPaid ? 'Đã thu' : isOverdue ? 'Quá hạn' : 'Chờ thu'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isPaid ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmPayment(p)}
                              className="px-2.5 py-1 bg-brand-success hover:bg-brand-success/90 text-white rounded-lg text-[10px] font-bold transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-success/40 inline-flex items-center gap-1 shadow-xs"
                              title="Kế toán xác nhận đã thu tiền"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Xác Nhận Thu
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPaymentForQr(p)}
                              className="px-2.5 py-1 bg-accent-soft hover:bg-accent/30 text-accent-ink rounded-lg text-[10px] font-bold border border-accent/30 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40 inline-flex items-center gap-1"
                            >
                              <QrCodeIcon className="w-3.5 h-3.5" />
                              VietQR
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-brand-success font-semibold inline-flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            {p.payment_date ? new Date(p.payment_date).toLocaleDateString('vi-VN') : 'Đã thu'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSFER HISTORY & INHERITANCE */}
      {activeTab === 'transfer' && (
        <div className="bg-surface rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-ink text-sm">
                Lịch Sử Chuyển Nhượng Kế Thừa Nghĩa Vụ HĐMB
              </h3>
              <p className="text-sm text-ink-soft">
                Tuân thủ Điều 7.3 Luật Kinh doanh BĐS 2023: Kế thừa 100% LTT và số tiền đã thanh toán của chủ cũ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/admin/crm/transfers?contract_id=' + contract.id)}
                className="px-3 py-2 bg-surface hover:bg-surface-alt border border-brand-border text-ink rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
              >
                <span>Mở Trung Tâm Chuyển Nhượng</span>
              </button>

              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                + Thực Hiện Chuyển Nhượng Nhanh
              </button>
            </div>
          </div>

          {(!contract.contract_transfers || contract.contract_transfers.length === 0) ? (
            <EmptyState
              icon={ArrowRightIcon}
              tone="neutral"
              title="Chưa có giao dịch chuyển nhượng nào"
              description="Hợp đồng này vẫn thuộc sở hữu của khách hàng ban đầu."
              size="md"
            />
          ) : (
            <div className="space-y-3">
              {contract.contract_transfers.map((trf: any) => (
                <div
                  key={trf.id}
                  className="p-4 bg-surface-alt rounded-xl border border-brand-border space-y-2 text-xs hover:border-accent/40 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-ink text-sm inline-flex items-center gap-1">
                        Chuyển từ: {trf.old_customer?.name} <ArrowRightIcon className="w-3.5 h-3.5 text-ink-faint" /> Sang: {trf.new_customer?.name}
                      </span>
                      <p className="text-[11px] text-ink-soft">
                        Ngày chuyển: {new Date(trf.transfer_date).toLocaleDateString('vi-VN')} • Công chứng: {trf.notary_office || 'Buôn Ma Thuột'} (Số: {trf.notary_number || 'N/A'})
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-success-soft text-brand-success rounded-full font-semibold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {trf.approval_status || 'ĐÃ DUYỆT'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface rounded-lg border border-brand-border flex justify-between font-mono tabular-nums text-[11px] text-ink">
                    <span>Số tiền kế thừa đã đóng: <strong>{Number(trf.inherited_paid_amount || 0).toLocaleString('vi-VN')} VNĐ</strong></span>
                    <span>Dư nợ còn lại chuyển giao: <strong>{Number(trf.remaining_debt_amount || 0).toLocaleString('vi-VN')} VNĐ</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {/* TAB 4: SCANNED DOCUMENTS & HARD COPIES */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-brand-border shadow-xs">
            <div>
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-accent" />
                <span>Hồ Sơ & Bản Scan PDF của Hợp Đồng {contract.contract_code}</span>
              </h3>
              <p className="text-sm text-ink-soft mt-0.5">
                Lưu trữ các bản cứng có dấu đỏ: HĐMB, Phiếu đặt cọc, Văn bản chuyển nhượng, Sổ đỏ và Giấy tờ tùy thân.
              </p>
            </div>

            <button
              onClick={() => {
                setIsUploadDocModalOpen(true);
                setSelectedDocFile(null);
                setUploadDocForm({ document_name: '', doc_type: 'HDMB_SCAN', notes: '' });
              }}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              <span>+ Tải Lên Bản Scan PDF</span>
            </button>
          </div>

          {contractDocs.length === 0 ? (
            <div className="p-12 text-center text-ink-soft bg-surface rounded-xl border border-dashed border-brand-border space-y-3">
              <FolderIcon className="w-12 h-12 mx-auto text-ink-faint" />
              <p className="font-bold text-ink text-base">Hợp đồng này chưa có bản scan PDF nào</p>
              <p className="text-sm text-ink-soft max-w-md mx-auto">
                Bấm "+ Tải Lên Bản Scan PDF" để đính kèm bản scan HĐMB đã ký đóng dấu, phiếu thu tiền hoặc hồ sơ pháp lý.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contractDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-surface rounded-2xl p-5 border border-brand-border shadow-xs hover:shadow-md hover:border-accent/40 transition-all duration-200 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent-ink uppercase">
                        {doc.doc_type === 'HDMB_SCAN'
                          ? 'Bản Scan HĐMB'
                          : doc.doc_type === 'DEPOSIT_RECEIPT_SCAN'
                          ? 'Phiếu Cọc PDC'
                          : doc.doc_type === 'TRANSFER_AGREEMENT_SCAN'
                          ? 'HĐ Chuyển Nhượng'
                          : doc.doc_type === 'TITLE_DEED_SCAN'
                          ? 'Sổ Đỏ / Sổ Hồng'
                          : doc.doc_type === 'CUSTOMER_ID_SCAN'
                          ? 'CCCD / Hộ Chiếu'
                          : doc.doc_type === 'TAX_RECEIPT_SCAN'
                          ? 'Biên Lai Thuế'
                          : 'Tài Liệu Đính Kèm'}
                      </span>
                      <span className="font-mono text-[11px] text-ink-soft">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : ''}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <DocumentTextIcon className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-ink text-sm truncate" title={doc.document_name}>
                          {doc.document_name}
                        </h4>
                        <p className="text-[11px] text-ink-soft">
                          Tải lên bởi: <strong>{doc.uploaded_by || 'Admin'}</strong>
                        </p>
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
                        onClick={() => {
                          setViewingDoc({ ...doc, contracts: contract, apartments: contract.apartments });
                          setIsPdfViewerOpen(true);
                        }}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
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
                        title="Xóa"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Transfer Contract Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-brand-border rounded-xl shadow-elevation-raised w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 text-accent" />
                Chuyển Nhượng Hợp Đồng <span className="font-mono">{contract.contract_code}</span>
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1.5 text-ink-soft hover:text-accent hover:border-accent/40 rounded-lg border border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-accent-soft rounded-xl text-accent-ink text-[11px]">
                Khách hàng mới sẽ <strong>kế thừa 100% LTT và các khoản tiền đã nộp</strong> của bên chuyển nhượng mà không cần lập hợp đồng mới từ đầu.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Tên Bên Nhận Chuyển Nhượng <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transferForm.new_customer_name}
                    onChange={(e) => setTransferForm({ ...transferForm, new_customer_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                    placeholder="VD: Nguyễn Đức Minh"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số điện thoại <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={transferForm.new_customer_phone}
                    onChange={(e) => setTransferForm({ ...transferForm, new_customer_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                    placeholder="VD: 0903112233"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số CCCD / MST
                  </label>
                  <input
                    type="text"
                    value={transferForm.new_customer_id_number}
                    onChange={(e) => setTransferForm({ ...transferForm, new_customer_id_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink font-mono tabular-nums placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Số văn bản công chứng
                  </label>
                  <input
                    type="text"
                    value={transferForm.notary_number}
                    onChange={(e) => setTransferForm({ ...transferForm, notary_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                    placeholder="VD: 1289/2026/TPCP"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Văn phòng công chứng
                </label>
                <input
                  type="text"
                  value={transferForm.notary_office}
                  onChange={(e) => setTransferForm({ ...transferForm, notary_office: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-surface text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30 focus:border-accent focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border rounded-xl font-bold text-ink hover:border-accent/40 hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  Xác Nhận Chuyển Nhượng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {selectedPaymentForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-brand-border rounded-xl shadow-elevation-raised w-full max-w-sm overflow-hidden text-center p-6 space-y-4 animate-scale-up">
            <h3 className="font-bold text-ink text-base">
              Thanh Toán Đợt {selectedPaymentForQr.installment}
            </h3>
            <p className="text-sm text-ink-soft">
              Căn <span className="font-mono font-semibold">{contract.apartments?.code}</span> • HĐ: <span className="font-mono">{contract.contract_code}</span>
            </p>

            <div className="p-4 bg-surface-alt rounded-2xl inline-block border border-brand-border">
              {/* VietQR Quick Image Generator */}
              <img
                src={`https://img.vietqr.io/image/970436-1028746193-compact2.png?amount=${selectedPaymentForQr.totalDueNow || selectedPaymentForQr.amount}&addInfo=${encodeURIComponent(selectedPaymentForQr.qr_payment_memo || 'HDMB')}&accountName=${encodeURIComponent('TRUNG NGUYEN LEGEND')}`}
                alt="VietQR Payment"
                className="w-56 h-auto mx-auto rounded-xl shadow-xs"
              />
            </div>

            <div className="text-xs space-y-1">
              <div className="text-ink-soft">Số tiền cần nộp:</div>
              <div className="text-base font-bold text-accent font-mono tabular-nums">
                {(selectedPaymentForQr.totalDueNow || selectedPaymentForQr.amount).toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="text-[10px] text-ink-faint font-mono">
                Nội dung CK: <strong>{selectedPaymentForQr.qr_payment_memo}</strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedPaymentForQr(null)}
              className="w-full py-2 bg-surface border border-brand-border hover:border-accent/40 rounded-xl font-bold text-xs text-ink transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Accountant Confirm Payment Modal */}
      {selectedPaymentForConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-brand-success-soft flex items-center justify-between">
              <h3 className="font-bold text-brand-success text-base flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Xác Nhận Thu Tiền Đợt {selectedPaymentForConfirm.installment}</span>
              </h3>
              <button
                onClick={() => setSelectedPaymentForConfirm(null)}
                className="p-1.5 rounded-lg border border-brand-border text-ink-soft hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPaymentSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-surface-alt rounded-xl border border-brand-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Hợp đồng:</span>
                  <strong className="font-mono text-ink">{contract.contract_code}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Căn hộ / Lô:</span>
                  <strong className="font-mono text-ink">{contract.apartments?.code}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Khách hàng:</span>
                  <strong className="text-ink">{contract.customers?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Nội dung đợt:</span>
                  <span className="text-ink font-medium">{selectedPaymentForConfirm.milestone_event || selectedPaymentForConfirm.description}</span>
                </div>
                <div className="flex justify-between border-t border-brand-border pt-1.5">
                  <span className="text-ink-soft">Số tiền gốc đợt:</span>
                  <strong className="font-mono text-ink">{Number(selectedPaymentForConfirm.amount).toLocaleString('vi-VN')} VNĐ</strong>
                </div>
                {selectedPaymentForConfirm.latePenalty > 0 && (
                  <div className="flex justify-between text-brand-danger">
                    <span>Phạt chậm trả (0.05%/ngày):</span>
                    <strong className="font-mono">+{Number(selectedPaymentForConfirm.latePenalty).toLocaleString('vi-VN')} VNĐ</strong>
                  </div>
                )}
                <div className="flex justify-between border-t border-brand-border pt-1.5 text-sm font-bold text-accent">
                  <span>Tổng cần thu:</span>
                  <span className="font-mono">{(selectedPaymentForConfirm.totalDueNow || selectedPaymentForConfirm.amount).toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Số tiền thực tế đã thu (VNĐ) <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={confirmPaymentForm.paid_amount}
                  onChange={(e) => setConfirmPaymentForm({ ...confirmPaymentForm, paid_amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink font-mono tabular-nums text-right font-bold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Ngày thu tiền <span className="text-brand-danger">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={confirmPaymentForm.payment_date}
                    onChange={(e) => setConfirmPaymentForm({ ...confirmPaymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1">
                    Phương thức
                  </label>
                  <select
                    value={confirmPaymentForm.payment_method}
                    onChange={(e) => setConfirmPaymentForm({ ...confirmPaymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản (VietQR/Bank)</option>
                    <option value="CASH">Tiền mặt tại quầy</option>
                    <option value="POS">Thẻ POS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-soft mb-1">
                  Mã giao dịch / Ghi chú kế toán
                </label>
                <input
                  type="text"
                  value={confirmPaymentForm.notes}
                  onChange={(e) => setConfirmPaymentForm({ ...confirmPaymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-ink-faint"
                  placeholder="VD: UNC Techcombank FT260827..."
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentForConfirm(null)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors duration-150 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-success hover:bg-brand-success/90 text-white rounded-xl font-bold transition-colors duration-150 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Xác Nhận Đã Thu Tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Scan Modal */}
      {isUploadDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-md overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-brand-border bg-surface-alt flex items-center justify-between">
              <h3 className="font-bold text-ink text-base flex items-center gap-2">
                <DocumentArrowUpIcon className="w-5 h-5 text-accent" />
                <span>Tải Lên Bản Scan PDF Cho HĐ {contract.contract_code}</span>
              </h3>
              <button onClick={() => setIsUploadDocModalOpen(false)} className="p-1.5 text-ink-soft hover:text-ink rounded-lg transition-colors cursor-pointer">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Chọn file scan PDF <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setSelectedDocFile(f);
                      if (!uploadDocForm.document_name) {
                        setUploadDocForm({ ...uploadDocForm, document_name: f.name.replace(/\.[^/.]+$/, '') });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">
                  Tên bản scan / Mô tả <span className="text-brand-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={uploadDocForm.document_name}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, document_name: e.target.value })}
                  placeholder="VD: HĐMB Bản Đóng Dấu Đỏ Đầy Đủ"
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-soft mb-1">Loại bản scan</label>
                <select
                  value={uploadDocForm.doc_type}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, doc_type: e.target.value })}
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
                <label className="block font-semibold text-ink-soft mb-1">Ghi chú lưu trữ</label>
                <textarea
                  rows={2}
                  value={uploadDocForm.notes}
                  onChange={(e) => setUploadDocForm({ ...uploadDocForm, notes: e.target.value })}
                  placeholder="Vị trí lưu bản cứng tại tủ hồ sơ..."
                  className="w-full px-3 py-2 bg-surface-alt border border-brand-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadDocModalOpen(false)}
                  className="px-4 py-2 bg-surface border border-brand-border text-ink rounded-xl font-bold hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold transition-colors cursor-pointer shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5" aria-label="Đóng">
                  {uploadingDoc && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                  <span>{uploadingDoc ? 'Đang tải...' : 'Lưu Bản Scan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        document={viewingDoc}
      />

    </div>
  );
};

export default ContractDetailPage;
