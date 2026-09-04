import React, { useState } from 'react';
import { useToast } from '../components/ui';

const VIETQR_API_BASE = 'https://api.vietqr.io/v2/business';

export interface TaxLookupResult {
  code?: string;
  desc?: string;
  data?: {
    id: string;
    name: string;
    internationalName?: string;
    shortName?: string;
    address?: string;
  };
}

export interface TaxLookupCompanyInfo {
  name: string;
  internationalName?: string;
  shortName?: string;
  address?: string;
}

/**
 * Tra cứu thông tin doanh nghiệp từ mã số thuế qua VietQR API.
 * Cache kết quả trong session để tránh gọi lại API khi cùng một mã số thuế được tra lại.
 */
const cache = new Map<string, TaxLookupCompanyInfo | null>();

export async function lookupTaxCode(taxCode: string): Promise<TaxLookupCompanyInfo | null> {
  const trimmed = taxCode.trim();
  if (!trimmed) return null;
  if (cache.has(trimmed)) {
    return cache.get(trimmed) ?? null;
  }

  try {
    const res = await fetch(`${VIETQR_API_BASE}/${encodeURIComponent(trimmed)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      cache.set(trimmed, null);
      return null;
    }

    const body: TaxLookupResult = await res.json();

    if (body.code !== '00' || !body.data) {
      cache.set(trimmed, null);
      return null;
    }

    const info: TaxLookupCompanyInfo = {
      name: body.data.name,
      internationalName: body.data.internationalName,
      shortName: body.data.shortName,
      address: body.data.address,
    };

    cache.set(trimmed, info);
    return info;
  } catch {
    cache.set(trimmed, null);
    return null;
  }
}

/**
 * Hook giúp tra cứu mã số thuế và tự động cập nhật trường trên form.
 * Trả về hàm `lookup` gọi async, và trạng thái `lookingUp`.
 */
export function useTaxLookup() {
  const toast = useToast();
  const [lookingUp, setLookingUp] = useState(false);

  const lookup = async (
    taxCode: string,
    setters: {
      setCompanyName?: (v: string) => void;
      setBuyerName?: (v: string) => void;
      setInvoiceAddress?: (v: string) => void;
    }
  ) => {
    const trimmed = taxCode.trim();
    if (!trimmed) return;

    setLookingUp(true);
    try {
      const info = await lookupTaxCode(trimmed);
      if (info) {
        setters.setCompanyName?.(info.name);
        setters.setBuyerName?.(info.internationalName ?? info.name);
        setters.setInvoiceAddress?.(info.address ?? '');
        toast.success('Đã điền thông tin doanh nghiệp từ mã số thuế');
      } else {
        toast.error('Không tìm thấy thông tin doanh nghiệp với mã số thuế này');
      }
    } catch {
      toast.error('Lỗi kết nối khi tra cứu mã số thuế');
    } finally {
      setLookingUp(false);
    }
  };

  return { lookingUp, lookup };
}
