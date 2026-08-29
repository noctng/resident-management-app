import React, { useState, useRef, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
} from './icons';
import { api } from '../services/api';
import { useToast } from './ui';

interface ImportApartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportApartmentModal: React.FC<ImportApartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [result, setResult] = useState<{
    message: string;
    total: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    errors?: Array<{ row: number; code?: string; error: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !importing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, importing, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        !selectedFile.name.endsWith('.xlsx') &&
        !selectedFile.name.endsWith('.xls') &&
        !selectedFile.name.endsWith('.csv')
      ) {
        toast.warning('Vui lòng chọn định dạng file Excel (.xlsx, .xls) hoặc CSV!');
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/apartments/import/template', '_blank');
  };

  const handleUpload = async () => {
    if (!file) {
      toast.warning('Vui lòng chọn file Excel danh sách căn hộ để tải lên!');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('updateExisting', String(updateExisting));

      const res = await api.post<{
        message: string;
        total: number;
        insertedCount: number;
        updatedCount: number;
        errorCount: number;
        errors?: Array<{ row: number; code?: string; error: string }>;
      }>('/apartments/import', formData);

      if (res) {
        setResult(res);
        toast.success(res.message || 'Đã import danh sách căn hộ thành công!');
        onSuccess();
      }
    } catch (err: any) {
      console.error('Import apartments error:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi import danh sách căn hộ');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-apartment-modal-title"
    >
      <div className="bg-surface rounded-2xl shadow-elevation-overlay border border-brand-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header with Dark Green Brand Palette */}
        <div className="px-6 py-4 bg-sidebar-bg text-white flex items-center justify-between border-b border-sidebar-line shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center border border-secondary/30">
              <BuildingOfficeIcon className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 id="import-apartment-modal-title" className="font-bold text-base text-white flex items-center gap-2">
                <span>Import Danh Sách Căn Hộ / Bất Động Sản</span>
              </h3>
              <p className="text-xs text-sidebar-dim">
                Thêm mới hoặc cập nhật hàng loạt phân khu TESLA, CANTATA, NOXH
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 text-sidebar-dim hover:text-white rounded-lg hover:bg-white/10 transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Step 1: Download Template */}
          <div className="bg-surface-alt rounded-xl p-4 border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-mono">1</span>
                <span>File Mẫu Excel Chuẩn Hóa</span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed">
                Tải file mẫu Excel chuẩn để điền thông tin Mã căn, Phân khu, Block, Diện tích, Giá đất, Giá XD, v.v.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-4 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs shadow-sm transition-colors duration-200 flex items-center gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Tải File Mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: Upload File Box */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center text-[10px] font-mono">2</span>
              <span>Chọn File Excel Cần Import</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
              id="apartment-excel-file-input"
            />

            {!file ? (
              <label
                htmlFor="apartment-excel-file-input"
                className="flex flex-col items-center justify-center w-full min-h-[150px] p-6 border-2 border-dashed border-brand-border rounded-xl bg-surface-alt/70 hover:bg-surface-alt hover:border-secondary transition-colors duration-200 cursor-pointer text-center group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center mb-3 group-hover:bg-secondary group-hover:text-white transition-colors duration-200">
                  <DocumentArrowUpIcon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-ink mb-1">
                  Nhấp để chọn tệp hoặc kéo thả file Excel vào đây
                </span>
                <span className="text-xs text-ink-soft">
                  Hỗ trợ định dạng: .xlsx, .xls, .csv (Dung lượng tối đa 15MB)
                </span>
              </label>
            ) : (
              <div className="p-4 rounded-xl border border-brand-border bg-surface-alt flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-success-soft text-brand-success flex items-center justify-center shrink-0">
                    <DocumentArrowUpIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-ink truncate">{file.name}</h4>
                    <span className="text-xs text-ink-soft font-mono">
                      {(file.size / 1024).toFixed(1)} KB • Sẵn sàng import
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={importing}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-brand-border text-xs font-semibold text-ink-soft hover:text-ink transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Chọn lại
                </button>
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-surface-alt rounded-xl p-4 border border-brand-border space-y-3">
            <div className="text-xs font-bold text-ink uppercase tracking-wider">
              Tùy Chọn Xử Lý
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="w-4 h-4 text-secondary rounded border-brand-border focus:ring-secondary cursor-pointer"
              />
              <span className="text-xs text-ink font-medium">
                Cập nhật ghi đè thông tin nếu Mã Căn Hộ đã tồn tại trên hệ thống
              </span>
            </label>
          </div>

          {/* Result Feedback Banner */}
          {result && (
            <div
              className={`p-4 rounded-xl border space-y-2 ${
                result.errorCount === 0
                  ? 'bg-brand-success-soft/30 border-brand-success/30 text-brand-success'
                  : 'bg-brand-warning-soft/30 border-brand-warning/30 text-brand-warning'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-ink">
                <CheckCircleIcon className="w-5 h-5 text-brand-success shrink-0" />
                <span>{result.message}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-ink-soft">
                <span>Tổng số: <strong className="text-ink font-mono tabular-nums">{result.total}</strong></span>
                <span>Thêm mới: <strong className="text-brand-success font-mono tabular-nums">{result.insertedCount}</strong></span>
                <span>Cập nhật: <strong className="text-secondary font-mono tabular-nums">{result.updatedCount}</strong></span>
                {result.errorCount > 0 && (
                  <span>Lỗi: <strong className="text-brand-danger font-mono tabular-nums">{result.errorCount}</strong></span>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-xs max-h-28 overflow-y-auto bg-surface p-2.5 rounded-lg border border-brand-border font-mono space-y-1">
                  {result.errors.map((e, idx) => (
                    <div key={idx} className="text-brand-danger flex items-start gap-1">
                      <span>•</span>
                      <span>Dòng {e.row} {e.code ? `(${e.code})` : ''}: {e.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-alt border-t border-brand-border flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 bg-surface hover:bg-surface-alt border border-brand-border rounded-lg text-xs font-semibold text-ink-soft hover:text-ink transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || importing}
            className="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/90 text-white font-semibold text-xs shadow-sm transition-colors duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent/40" aria-label="Đóng">
            {importing ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Đang xử lý import...</span>
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="w-4 h-4" />
                <span>Thực Hiện Import</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ImportApartmentModal;
