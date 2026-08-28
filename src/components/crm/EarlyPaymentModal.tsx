import React, { useState, useMemo } from 'react';
import { BoltIcon, CalculatorIcon } from '../icons';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ContractPayment } from '../../types';
import Modal from '../ui/Modal';

interface EarlyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (discountPercent: number) => Promise<void>;
  remainingPayments: ContractPayment[];
  contractCode?: string;
}

const EarlyPaymentModal: React.FC<EarlyPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  remainingPayments,
  contractCode,
}) => {
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [processing, setProcessing] = useState(false);

  const { totalAmount, discountAmount, finalAmount } = useMemo(() => {
    const total = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const discount = Math.floor(total * (discountPercent / 100));
    return {
      totalAmount: total,
      discountAmount: discount,
      finalAmount: total - discount,
    };
  }, [remainingPayments, discountPercent]);

  const handleConfirm = async () => {
    try {
      setProcessing(true);
      await onConfirm(discountPercent);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh Toán Sớm Hợp Đồng">
      <div className="space-y-4">
        <div className="bg-brand-warning-soft p-3 rounded-lg text-sm text-brand-warning border border-brand-warning/30 flex items-start gap-2">
          <BoltIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>
            Bạn đang thực hiện thanh toán sớm cho <b>{remainingPayments.length}</b> đợt còn lại của
            hợp đồng <b>{contractCode}</b>.
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto border border-brand-border rounded-lg divide-y divide-brand-border/60 custom-scrollbar">
          {remainingPayments.map((p) => (
            <div key={p.id} className="p-2.5 flex justify-between items-center text-sm">
              <div>
                <div className="font-medium text-ink">
                  Đợt {p.installment}
                </div>
                <div className="font-mono text-xs text-ink-soft">Hạn: {formatDate(p.due_date)}</div>
              </div>
              <div className="font-mono tabular-nums font-semibold text-ink">
                {formatCurrency(p.amount)}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-soft">Tổng tiền gốc:</span>
            <span className="font-mono tabular-nums font-bold text-ink">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="bg-surface-alt p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-ink">
              <div className="flex items-center gap-1">
                <CalculatorIcon className="w-4 h-4" />
                Chiết khấu thanh toán sớm:
              </div>
              <span className="text-accent font-mono tabular-nums font-bold">{discountPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full h-2 bg-surface-alt rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <div className="flex justify-between font-mono text-xs text-ink-soft">
              <span>0%</span>
              <span>5%</span>
              <span>10%</span>
            </div>
          </div>

          <div className="flex justify-between text-sm text-brand-success">
            <span>Số tiền giảm:</span>
            <span className="font-mono tabular-nums">- {formatCurrency(discountAmount)}</span>
          </div>

          <div className="pt-3 border-t border-brand-border flex justify-between items-center">
            <span className="text-base font-bold text-ink">
              Tổng thanh toán:
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-accent">
              {formatCurrency(finalAmount)}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-ink bg-surface border border-brand-border hover:bg-surface-alt rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            onClick={onClose}
            disabled={processing}
          >
            Hủy
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleConfirm}
            disabled={processing}
          >
            {processing ? 'Đang xử lý...' : 'Xác Nhận Thanh Toán'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EarlyPaymentModal;
