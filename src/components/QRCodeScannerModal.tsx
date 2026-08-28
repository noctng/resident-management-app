import React, { useRef, useEffect, useState } from 'react';
import Modal from './ui/Modal';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
}

const QRCodeScannerModal: React.FC<QRCodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Fix: Explicitly pass `undefined` as the initial value to `useRef` to resolve the "Expected 1 arguments, but got 0" error.
  const animationFrameId = useRef<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const cleanup = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    if (!('BarcodeDetector' in window)) {
      setError('Trình duyệt của bạn không hỗ trợ quét mã QR.');
      return;
    }

    const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    const startScan = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanFrame();
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Không thể truy cập camera. Vui lòng cấp quyền và thử lại.');
      }
    };

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameId.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        if (barcodes.length > 0) {
          onScanSuccess(barcodes[0].rawValue);
        } else {
          animationFrameId.current = requestAnimationFrame(scanFrame);
        }
      } catch (err) {
        console.warn('Barcode detection error:', err);
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    };

    startScan();

    return () => {
      cleanup();
    };
  }, [isOpen, onScanSuccess]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quét Mã QR Booking">
      <div className="relative w-full h-64 bg-sidebar-bg rounded-md">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-[200px] aspect-square border-4 border-dashed border-white/50 rounded-lg"></div>
        </div>
      </div>
      {error && <p className="text-center text-brand-danger mt-4">{error}</p>}
      <div className="mt-2 text-center text-sm text-ink-soft">
        Hướng camera về phía mã QR để quét
      </div>
    </Modal>
  );
};

export default QRCodeScannerModal;
